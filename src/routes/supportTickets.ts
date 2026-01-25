import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { SupportTicketStatus, UserRole } from '@prisma/client';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * Generate unique ticket number in format RE######## (8-digit random number)
 * Ensures uniqueness by checking database
 */
async function generateTicketNumber(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Generate 8-digit random number
    const randomNum = Math.floor(10000000 + Math.random() * 90000000); // 10000000 to 99999999
    const ticketNumber = `RE${randomNum.toString()}`;

    // Check if it exists
    const existing = await prisma.supportTicket.findUnique({
      where: { ticketNumber },
    });

    if (!existing) {
      return ticketNumber;
    }

    attempts++;
  }

  // Fallback: use timestamp-based approach if random generation fails
  const timestamp = Date.now().toString().slice(-8);
  return `RE${timestamp}`;
}

/**
 * POST /api/support-tickets
 * Create a new support ticket for a project
 * Auth: SALES, OPERATIONS, ADMIN
 */
router.post(
  '/',
  authenticate,
  [
    body('projectId').isString().notEmpty().withMessage('Project ID is required'),
    body('title').isString().notEmpty().trim().isLength({ max: 500 }).withMessage('Title is required (max 500 characters)'),
    body('description').optional().isString().trim(),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check permissions - SALES, OPERATIONS, ADMIN can create tickets
      const userRole = req.user?.role;
      const allowedRoles: UserRole[] = [UserRole.SALES, UserRole.OPERATIONS, UserRole.ADMIN];
      if (!userRole || !allowedRoles.includes(userRole as UserRole)) {
        return res.status(403).json({ error: 'Only SALES, OPERATIONS, and ADMIN users can create support tickets' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId, title, description } = req.body;
      const createdById = req.user!.id;

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Generate unique ticket number
      const ticketNumber = await generateTicketNumber();

      // Create ticket
      const ticket = await prisma.supportTicket.create({
        data: {
          ticketNumber,
          projectId,
          title: title.trim(),
          description: description?.trim() || null,
          status: SupportTicketStatus.OPEN,
          createdById,
        },
        include: {
          project: {
            include: {
              customer: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          activities: {
            orderBy: { createdAt: 'desc' },
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      res.status(201).json(ticket);
    } catch (error: any) {
      console.error('Error creating support ticket:', error);
      res.status(500).json({ error: error.message || 'Failed to create support ticket' });
    }
  }
);

/**
 * GET /api/support-tickets/project/:projectId
 * Get all support tickets for a project
 */
router.get('/project/:projectId', authenticate, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const tickets = await prisma.supportTicket.findMany({
      where: { projectId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get latest activity for list view
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(tickets);
  } catch (error: any) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch support tickets' });
  }
});

/**
 * GET /api/support-tickets/:ticketId
 * Get a single support ticket with all activities
 */
router.get('/:ticketId', authenticate, async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        project: {
          include: {
            customer: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    res.json(ticket);
  } catch (error: any) {
    console.error('Error fetching support ticket:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch support ticket' });
  }
});

/**
 * POST /api/support-tickets/:ticketId/activity
 * Add a follow-up activity to a support ticket
 * Auth: SALES, OPERATIONS, ADMIN
 */
router.post(
  '/:ticketId/activity',
  authenticate,
  [
    body('note').isString().notEmpty().trim().withMessage('Note is required'),
    body('followUpDate').optional().isISO8601().toDate().withMessage('Follow-up date must be a valid date'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check permissions - SALES, OPERATIONS, ADMIN can add activities
      const userRole = req.user?.role;
      const allowedRoles: UserRole[] = [UserRole.SALES, UserRole.OPERATIONS, UserRole.ADMIN];
      if (!userRole || !allowedRoles.includes(userRole as UserRole)) {
        return res.status(403).json({ error: 'Only SALES, OPERATIONS, and ADMIN users can add follow-ups' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { ticketId } = req.params;
      const { note, followUpDate } = req.body;
      const createdById = req.user!.id;

      // Verify ticket exists
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Support ticket not found' });
      }

      // If ticket is closed, prevent adding activities (only ADMIN can override)
      if (ticket.status === SupportTicketStatus.CLOSED && userRole !== UserRole.ADMIN) {
        return res.status(403).json({ error: 'Cannot add activities to closed tickets' });
      }

      // Create activity
      const activity = await prisma.supportTicketActivity.create({
        data: {
          supportTicketId: ticketId,
          note: note.trim(),
          followUpDate: followUpDate ? new Date(followUpDate) : null,
          createdById,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update ticket status to IN_PROGRESS if it was OPEN
      if (ticket.status === SupportTicketStatus.OPEN) {
        await prisma.supportTicket.update({
          where: { id: ticketId },
          data: { status: SupportTicketStatus.IN_PROGRESS },
        });
      }

      res.status(201).json(activity);
    } catch (error: any) {
      console.error('Error adding support ticket activity:', error);
      res.status(500).json({ error: error.message || 'Failed to add follow-up' });
    }
  }
);

/**
 * PATCH /api/support-tickets/:ticketId/close
 * Close a support ticket (set status to CLOSED and closedAt timestamp)
 * Auth: SALES, OPERATIONS, ADMIN
 */
router.patch(
  '/:ticketId/close',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      // Check permissions - SALES, OPERATIONS, ADMIN can close tickets
      const userRole = req.user?.role;
      const allowedRoles: UserRole[] = [UserRole.SALES, UserRole.OPERATIONS, UserRole.ADMIN];
      if (!userRole || !allowedRoles.includes(userRole as UserRole)) {
        return res.status(403).json({ error: 'Only SALES, OPERATIONS, and ADMIN users can close tickets' });
      }

      const { ticketId } = req.params;

      // Verify ticket exists
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Support ticket not found' });
      }

      // Check if already closed
      if (ticket.status === SupportTicketStatus.CLOSED) {
        return res.status(400).json({ error: 'Ticket is already closed' });
      }

      // Close ticket
      const updatedTicket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: SupportTicketStatus.CLOSED,
          closedAt: new Date(),
        },
        include: {
          project: {
            include: {
              customer: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          activities: {
            orderBy: { createdAt: 'desc' },
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      res.json(updatedTicket);
    } catch (error: any) {
      console.error('Error closing support ticket:', error);
      res.status(500).json({ error: error.message || 'Failed to close ticket' });
    }
  }
);

/**
 * DELETE /api/support-tickets/:ticketId
 * Delete a support ticket completely
 * Auth: ADMIN only
 */
router.delete(
  '/:ticketId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      // Check permissions - Only ADMIN can delete tickets
      const userRole = req.user?.role;
      if (userRole !== UserRole.ADMIN) {
        return res.status(403).json({ error: 'Only ADMIN users can delete support tickets' });
      }

      const { ticketId } = req.params;

      // Verify ticket exists
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Support ticket not found' });
      }

      // Delete ticket (cascade will delete all activities)
      await prisma.supportTicket.delete({
        where: { id: ticketId },
      });

      res.json({ message: 'Support ticket deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting support ticket:', error);
      res.status(500).json({ error: error.message || 'Failed to delete ticket' });
    }
  }
);

/**
 * GET /api/support-tickets
 * Get all support tickets with optional filters and statistics
 * Returns tickets with project info and statistics
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { status, projectId } = req.query;

      // Build where clause
      const where: any = {};

      // Role-based filtering - Sales users only see tickets for their projects
      if (req.user?.role === UserRole.SALES) {
        where.project = {
          salespersonId: req.user.id,
        };
      }

      // Apply status filter if provided
      if (status) {
        const statusArray = Array.isArray(status) ? status : [status];
        where.status = { in: statusArray as SupportTicketStatus[] };
      }

      // Apply project filter if provided
      if (projectId) {
        where.projectId = projectId as string;
      }

      // Get tickets
      const tickets = await prisma.supportTicket.findMany({
        where,
        include: {
          project: {
            include: {
              customer: {
                select: {
                  id: true,
                  customerName: true,
                  firstName: true,
                  middleName: true,
                  lastName: true,
                  prefix: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Get latest activity for list view
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate statistics (always use base where clause without status filter)
      const statsWhere: any = {};

      // Role-based filtering for stats
      if (req.user?.role === UserRole.SALES) {
        statsWhere.project = {
          salespersonId: req.user.id,
        };
      }

      const [openCount, inProgressCount, closedCount] = await Promise.all([
        prisma.supportTicket.count({
          where: { ...statsWhere, status: SupportTicketStatus.OPEN },
        }),
        prisma.supportTicket.count({
          where: { ...statsWhere, status: SupportTicketStatus.IN_PROGRESS },
        }),
        prisma.supportTicket.count({
          where: { ...statsWhere, status: SupportTicketStatus.CLOSED },
        }),
      ]);

      // Calculate overdue tickets (OPEN or IN_PROGRESS with follow-up date in the past)
      const overdueTickets = await prisma.supportTicket.findMany({
        where: {
          ...statsWhere,
          status: {
            in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS],
          },
          activities: {
            some: {
              followUpDate: {
                lte: new Date(),
              },
            },
          },
        },
        select: { id: true },
      });

      const overdueCount = overdueTickets.length;

      res.json({
        tickets,
        statistics: {
          open: openCount,
          inProgress: inProgressCount,
          closed: closedCount,
          overdue: overdueCount,
          total: openCount + inProgressCount + closedCount,
        },
      });
    } catch (error: any) {
      console.error('Error fetching support tickets:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch support tickets' });
    }
  }
);

export default router;
