import express, { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { LeadSource, LeadStatus, UserRole } from '@prisma/client';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';
import { calculateFY } from '../utils/calculations';

const router = express.Router();

const LEAD_WRITE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGEMENT,
  UserRole.SALES,
];

function canViewAllLeads(role: UserRole): boolean {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.MANAGEMENT ||
    role === UserRole.OPERATIONS ||
    role === UserRole.FINANCE
  );
}

async function requireLeadAccess(
  req: Request,
  res: Response,
  leadId: string,
): Promise<{ id: string; assignedSalesId: string | null; customerId: string; status: LeadStatus } | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, assignedSalesId: true, customerId: true, status: true },
  });
  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return null;
  }
  const role = req.user!.role as UserRole;
  if (canViewAllLeads(role)) return lead;
  if (role === UserRole.SALES && lead.assignedSalesId === req.user!.id) return lead;
  res.status(403).json({ error: 'Access denied' });
  return null;
}

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

      const where: Record<string, unknown> = {};
      const role = req.user!.role as UserRole;

      if (role === UserRole.SALES) {
        where.assignedSalesId = req.user!.id;
      } else if (assignedSalesId && canViewAllLeads(role)) {
        where.assignedSalesId = assignedSalesId;
      }

      if (status) where.status = status;
      if (source) where.source = source;
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
    const allowed = await requireLeadAccess(req, res, req.params.id);
    if (!allowed) return;

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
  authorize(...LEAD_WRITE_ROLES),
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

      const role = req.user!.role as UserRole;
      const {
        customerId,
        source,
        systemSizeKw,
        roofType,
        city,
        assignedSalesId,
        expectedValue,
      } = req.body as {
        customerId: string;
        source: LeadSource;
        systemSizeKw?: number;
        roofType?: string;
        city?: string;
        assignedSalesId?: string;
        expectedValue?: number;
      };

      let resolvedAssignee = assignedSalesId || null;
      if (role === UserRole.SALES) {
        resolvedAssignee = req.user!.id;
      }

      const lead = await prisma.lead.create({
        data: {
          customerId,
          source,
          status: LeadStatus.NEW,
          ...(systemSizeKw != null ? { systemSizeKw } : {}),
          ...(roofType != null ? { roofType } : {}),
          ...(city != null ? { city } : {}),
          ...(resolvedAssignee ? { assignedSalesId: resolvedAssignee } : {}),
          ...(expectedValue != null ? { expectedValue } : {}),
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
  authorize(...LEAD_WRITE_ROLES),
  [
    body('source').optional().isIn(Object.values(LeadSource)),
    body('status').optional().isIn(Object.values(LeadStatus)),
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

      const existing = await requireLeadAccess(req, res, req.params.id);
      if (!existing) return;

      const role = req.user!.role as UserRole;
      const {
        source,
        status,
        systemSizeKw,
        roofType,
        city,
        assignedSalesId,
        expectedValue,
      } = req.body as {
        source?: LeadSource;
        status?: LeadStatus;
        systemSizeKw?: number;
        roofType?: string;
        city?: string;
        assignedSalesId?: string;
        expectedValue?: number;
      };

      const data: Record<string, unknown> = {};
      if (source !== undefined) data.source = source;
      if (status !== undefined) data.status = status;
      if (systemSizeKw !== undefined) data.systemSizeKw = systemSizeKw;
      if (roofType !== undefined) data.roofType = roofType;
      if (city !== undefined) data.city = city;
      if (expectedValue !== undefined) data.expectedValue = expectedValue;
      if (assignedSalesId !== undefined && role !== UserRole.SALES) {
        data.assignedSalesId = assignedSalesId;
      }

      const lead = await prisma.lead.update({
        where: { id: req.params.id },
        data,
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
  authorize(...LEAD_WRITE_ROLES),
  async (req: Request, res: express.Response) => {
    try {
      const allowed = await requireLeadAccess(req, res, req.params.id);
      if (!allowed) return;

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

      const currentYear =
        calculateFY(new Date()) ||
        `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`;

      const project = await prisma.project.create({
        data: {
          customerId: lead.customerId,
          leadId: lead.id,
          type: 'NON_SUBSIDY',
          year: currentYear,
          systemCapacity:
            lead.systemSizeKw != null ? Math.round(lead.systemSizeKw) : undefined,
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
