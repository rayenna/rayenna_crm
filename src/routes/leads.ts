import express, { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient, LeadSource, LeadStatus, UserRole } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { calculateFY } from '../utils/calculations';

const router = express.Router();
const prisma = new PrismaClient();

// Get all leads
router.get(
  '/',
  authenticate,
  [
    query('status').optional().isIn(Object.values(LeadStatus)),
    query('source').optional().isIn(Object.values(LeadSource)),
    query('assignedSalesId').optional().isString(),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        status,
        source,
        assignedSalesId,
        search,
        page = 1,
        limit = 20,
      } = req.query;

      const where: any = {};

      if (status) where.status = status;
      if (source) where.source = source;
      if (assignedSalesId) where.assignedSalesId = assignedSalesId;
      if (search) {
        where.OR = [
          { customer: { customerName: { contains: search as string, mode: 'insensitive' } } },
          { city: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          include: {
            customer: true,
            assignedSales: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.lead.count({ where }),
      ]);

      res.json({
        leads,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch leads' });
    }
  }
);

// Get single lead
router.get('/:id', authenticate, async (req: Request, res: express.Response) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        assignedSales: true,
        projects: true,
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error: any) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch lead' });
  }
});

// Create lead
router.post(
  '/',
  authenticate,
  [
    body('customerId').isString().notEmpty(),
    body('source').isIn(Object.values(LeadSource)),
    body('systemSizeKw').optional().isFloat({ min: 0 }),
    body('roofType').optional().isString(),
    body('city').optional().isString(),
    body('assignedSalesId').optional().isString(),
    body('expectedValue').optional().isFloat({ min: 0 }),
  ],
  async (req: Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const lead = await prisma.lead.create({
        data: {
          ...req.body,
          status: 'NEW',
        },
        include: {
          customer: true,
          assignedSales: true,
        },
      });

      res.status(201).json(lead);
    } catch (error: any) {
      console.error('Error creating lead:', error);
      res.status(500).json({ error: error.message || 'Failed to create lead' });
    }
  }
);

// Update lead
router.put(
  '/:id',
  authenticate,
  [
    body('source').optional().isIn(Object.values(LeadSource)),
    body('status').optional().isIn(Object.values(LeadStatus)),
    body('systemSizeKw').optional().isFloat({ min: 0 }),
    body('expectedValue').optional().isFloat({ min: 0 }),
  ],
  async (req: Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const lead = await prisma.lead.update({
        where: { id: req.params.id },
        data: req.body,
        include: {
          customer: true,
          assignedSales: true,
        },
      });

      res.json(lead);
    } catch (error: any) {
      console.error('Error updating lead:', error);
      res.status(500).json({ error: error.message || 'Failed to update lead' });
    }
  }
);

// Convert lead to project
router.post(
  '/:id/convert',
  authenticate,
  async (req: Request, res: express.Response) => {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: req.params.id },
        include: { customer: true },
      });

      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      if (lead.status === 'CONVERTED') {
        return res.status(400).json({ error: 'Lead already converted' });
      }

      // Create project from lead
      // Calculate FY from current date (since confirmationDate is not available at lead conversion)
      const currentYear = calculateFY(new Date()) || `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`;
      
      const project = await prisma.project.create({
        data: {
          customerId: lead.customerId,
          leadId: lead.id,
          type: lead.customer.customerType === 'COMMERCIAL' ? 'COMMERCIAL_INDUSTRIAL' : 'RESIDENTIAL_NON_SUBSIDY',
          year: currentYear,
          systemCapacity: lead.systemSizeKw || undefined,
          salespersonId: lead.assignedSalesId || undefined,
          projectStage: 'SURVEY',
          stageEnteredAt: new Date(),
          slaDays: 7,
          statusIndicator: 'GREEN',
          createdById: req.user!.id,
        },
        include: {
          customer: true,
          lead: true,
        },
      });

      // Update lead status
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'CONVERTED' },
      });

      res.status(201).json(project);
    } catch (error: any) {
      console.error('Error converting lead:', error);
      res.status(500).json({ error: error.message || 'Failed to convert lead' });
    }
  }
);

// Delete lead
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), async (req: Request, res: express.Response) => {
  try {
    await prisma.lead.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Lead deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: error.message || 'Failed to delete lead' });
  }
});

export default router;
