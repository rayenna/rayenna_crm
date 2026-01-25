import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Get service tickets for a project
router.get('/project/:projectId', authenticate, async (req: Request, res: express.Response) => {
  try {
    const tickets = await prisma.serviceTicket.findMany({
      where: { projectId: req.params.projectId },
      include: {
        project: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(tickets);
  } catch (error: any) {
    console.error('Error fetching service tickets:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch service tickets' });
  }
});

// Get all service tickets
router.get(
  '/',
  authenticate,
  async (req: Request, res: express.Response) => {
    try {
      const { projectId, status, page = 1, limit = 20 } = req.query;

      const where: any = {};
      if (projectId) where.projectId = projectId as string;
      if (status) where.status = status as string;

      const skip = (Number(page) - 1) * Number(limit);

      const [tickets, total] = await Promise.all([
        prisma.serviceTicket.findMany({
          where,
          include: {
            project: {
              include: {
                customer: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.serviceTicket.count({ where }),
      ]);

      res.json({
        tickets,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      console.error('Error fetching service tickets:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch service tickets' });
    }
  }
);

// Get single service ticket
router.get('/:id', authenticate, async (req: Request, res: express.Response) => {
  try {
    const ticket = await prisma.serviceTicket.findUnique({
      where: { id: req.params.id },
      include: {
        project: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Service ticket not found' });
    }

    res.json(ticket);
  } catch (error: any) {
    console.error('Error fetching service ticket:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch service ticket' });
  }
});

// Create service ticket
router.post(
  '/',
  authenticate,
  [
    body('projectId').isString().notEmpty(),
    body('issue').isString().notEmpty(),
  ],
  async (req: Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const ticket = await prisma.serviceTicket.create({
        data: {
          ...req.body,
          status: 'OPEN',
        },
        include: {
          project: {
            include: {
              customer: true,
            },
          },
        },
      });

      res.status(201).json(ticket);
    } catch (error: any) {
      console.error('Error creating service ticket:', error);
      res.status(500).json({ error: error.message || 'Failed to create service ticket' });
    }
  }
);

// Update service ticket
router.put(
  '/:id',
  authenticate,
  [
    body('issue').optional().isString(),
    body('status').optional().isString(),
  ],
  async (req: Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const updateData: any = { ...req.body };
      if (req.body.status === 'RESOLVED' || req.body.status === 'CLOSED') {
        if (!updateData.resolvedAt) {
          updateData.resolvedAt = new Date();
        }
      }

      const ticket = await prisma.serviceTicket.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          project: {
            include: {
              customer: true,
            },
          },
        },
      });

      res.json(ticket);
    } catch (error: any) {
      console.error('Error updating service ticket:', error);
      res.status(500).json({ error: error.message || 'Failed to update service ticket' });
    }
  }
);

// Delete service ticket
router.delete('/:id', authenticate, async (req: Request, res: express.Response) => {
  try {
    await prisma.serviceTicket.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Service ticket deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting service ticket:', error);
    res.status(500).json({ error: error.message || 'Failed to delete service ticket' });
  }
});

export default router;
