import express, { Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient, ProjectStatus, ProjectType, UserRole } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';
import { calculatePayments, calculateExpectedProfit } from '../utils/calculations';

const router = express.Router();
const prisma = new PrismaClient();

// Get all projects with filters
router.get(
  '/',
  authenticate,
  [
    query('status').optional().isIn(Object.values(ProjectStatus)),
    query('type').optional().isIn(Object.values(ProjectType)),
    query('salespersonId').optional().isString(),
    query('year').optional().isString(),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        status,
        type,
        salespersonId,
        year,
        search,
        page = '1',
        limit = '50',
      } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = {};

      if (status) where.projectStatus = status;
      if (type) where.type = type;
      if (salespersonId) where.salespersonId = salespersonId;
      if (year) where.year = year;
      if (search) {
        where.OR = [
          { customerName: { contains: search as string, mode: 'insensitive' } },
          { consumerNumber: { contains: search as string, mode: 'insensitive' } },
          { contactNumbers: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      // Role-based filtering
      if (req.user?.role === UserRole.SALES) {
        where.salespersonId = req.user.id;
      }

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          include: {
            createdBy: {
              select: { id: true, name: true, email: true },
            },
            salesperson: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        prisma.project.count({ where }),
      ]);

      res.json({
        projects,
        pagination: {
          page: parseInt(page as string),
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get single project
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        salesperson: {
          select: { id: true, name: true, email: true },
        },
        documents: {
          include: {
            uploadedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Role-based access
    if (
      req.user?.role === UserRole.SALES &&
      project.salespersonId !== req.user.id
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create project
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SALES),
  [
    body('customerName').notEmpty().trim(),
    body('type').isIn(Object.values(ProjectType)),
    body('year').notEmpty().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        customerName,
        address,
        contactNumbers,
        consumerNumber,
        type,
        leadSource,
        leadBroughtBy,
        salespersonId,
        year,
        systemCapacity,
        projectCost,
        confirmationDate,
        loanDetails,
        incentiveEligible,
      } = req.body;

      // Auto-calculate expected profit
      const expectedProfit = calculateExpectedProfit(projectCost, systemCapacity);

      // Calculate payments
      const paymentCalculations = calculatePayments({
        advanceReceived: 0,
        payment1: 0,
        payment2: 0,
        payment3: 0,
        lastPayment: 0,
        projectCost,
      });

      const project = await prisma.project.create({
        data: {
          customerName,
          address,
          contactNumbers: contactNumbers ? JSON.stringify(contactNumbers) : null,
          consumerNumber,
          type,
          leadSource,
          leadBroughtBy,
          salespersonId: salespersonId || (req.user?.role === UserRole.SALES ? req.user.id : null),
          year,
          systemCapacity,
          projectCost,
          confirmationDate: confirmationDate ? new Date(confirmationDate) : null,
          loanDetails: loanDetails ? JSON.stringify(loanDetails) : null,
          incentiveEligible: incentiveEligible || false,
          expectedProfit,
          ...paymentCalculations,
          createdById: req.user!.id,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          salesperson: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Create audit log
      await createAuditLog({
        projectId: project.id,
        userId: req.user!.id,
        action: 'created',
        remarks: 'Project created',
      });

      res.status(201).json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update project
router.put(
  '/:id',
  authenticate,
  [
    body('customerName').optional().notEmpty().trim(),
    body('type').optional().isIn(Object.values(ProjectType)),
    body('projectStatus').optional().isIn(Object.values(ProjectStatus)),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Role-based access control
      let updateData: any = {};

      if (req.user?.role === UserRole.FINANCE) {
        // Finance can only update payment fields
        const allowedFields = [
          'advanceReceived',
          'advanceReceivedDate',
          'payment1',
          'payment1Date',
          'payment2',
          'payment2Date',
          'payment3',
          'payment3Date',
          'lastPayment',
          'lastPaymentDate',
        ];
        for (const field of allowedFields) {
          if (req.body[field] !== undefined) {
            if (field.includes('Date')) {
              updateData[field] = req.body[field] ? new Date(req.body[field]) : null;
            } else {
              updateData[field] = req.body[field];
            }
          }
        }
        // Recalculate payments
        const paymentCalculations = calculatePayments({
          advanceReceived: updateData.advanceReceived ?? project.advanceReceived,
          payment1: updateData.payment1 ?? project.payment1,
          payment2: updateData.payment2 ?? project.payment2,
          payment3: updateData.payment3 ?? project.payment3,
          lastPayment: updateData.lastPayment ?? project.lastPayment,
          projectCost: project.projectCost,
        });
        Object.assign(updateData, paymentCalculations);
      } else if (req.user?.role === UserRole.OPERATIONS) {
        // Operations can only update execution fields
        const allowedFields = [
          'mnrePortalRegistrationDate',
          'feasibilityDate',
          'registrationDate',
          'installationCompletionDate',
          'mnreInstallationDetails',
          'subsidyRequestDate',
          'subsidyCreditedDate',
          'projectStatus',
        ];
        for (const field of allowedFields) {
          if (req.body[field] !== undefined) {
            if (field.includes('Date')) {
              updateData[field] = req.body[field] ? new Date(req.body[field]) : null;
            } else {
              updateData[field] = req.body[field];
            }
          }
        }
      } else if (req.user?.role === UserRole.SALES) {
        // Sales can update sales fields and view-only payment status
        if (project.salespersonId !== req.user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
        // Sales can update commercial details, but not payment amounts
        const restrictedFields = [
          'advanceReceived',
          'advanceReceivedDate',
          'payment1',
          'payment1Date',
          'payment2',
          'payment2Date',
          'payment3',
          'payment3Date',
          'lastPayment',
          'lastPaymentDate',
        ];
        for (const [key, value] of Object.entries(req.body)) {
          if (!restrictedFields.includes(key)) {
            if (key.includes('Date')) {
              updateData[key] = value ? new Date(value as string) : null;
            } else if (key === 'contactNumbers' && Array.isArray(value)) {
              updateData[key] = JSON.stringify(value);
            } else if (key === 'loanDetails' && typeof value === 'object') {
              updateData[key] = JSON.stringify(value);
            } else {
              updateData[key] = value;
            }
          }
        }
        // Recalculate expected profit if project cost or capacity changed
        if (updateData.projectCost !== undefined || updateData.systemCapacity !== undefined) {
          updateData.expectedProfit = calculateExpectedProfit(
            updateData.projectCost ?? project.projectCost,
            updateData.systemCapacity ?? project.systemCapacity
          );
        }
      } else if (req.user?.role === UserRole.ADMIN) {
        // Admin can update everything
        updateData = { ...req.body };
        // Handle date fields
        const dateFields = [
          'confirmationDate',
          'advanceReceivedDate',
          'payment1Date',
          'payment2Date',
          'payment3Date',
          'lastPaymentDate',
          'mnrePortalRegistrationDate',
          'feasibilityDate',
          'registrationDate',
          'installationCompletionDate',
          'subsidyRequestDate',
          'subsidyCreditedDate',
        ];
        for (const field of dateFields) {
          if (updateData[field]) {
            updateData[field] = new Date(updateData[field]);
          }
        }
        // Handle JSON fields
        if (updateData.contactNumbers && Array.isArray(updateData.contactNumbers)) {
          updateData.contactNumbers = JSON.stringify(updateData.contactNumbers);
        }
        if (updateData.loanDetails && typeof updateData.loanDetails === 'object') {
          updateData.loanDetails = JSON.stringify(updateData.loanDetails);
        }
        // Recalculate payments if payment fields or project cost changed
        if (
          updateData.advanceReceived !== undefined ||
          updateData.payment1 !== undefined ||
          updateData.payment2 !== undefined ||
          updateData.payment3 !== undefined ||
          updateData.lastPayment !== undefined ||
          updateData.projectCost !== undefined
        ) {
          const paymentCalculations = calculatePayments({
            advanceReceived: updateData.advanceReceived ?? project.advanceReceived,
            payment1: updateData.payment1 ?? project.payment1,
            payment2: updateData.payment2 ?? project.payment2,
            payment3: updateData.payment3 ?? project.payment3,
            lastPayment: updateData.lastPayment ?? project.lastPayment,
            projectCost: updateData.projectCost ?? project.projectCost,
          });
          Object.assign(updateData, paymentCalculations);
        }
        // Recalculate expected profit if project cost or capacity changed
        if (updateData.projectCost !== undefined || updateData.systemCapacity !== undefined) {
          updateData.expectedProfit = calculateExpectedProfit(
            updateData.projectCost ?? project.projectCost,
            updateData.systemCapacity ?? project.systemCapacity
          );
        }
      } else {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const updatedProject = await prisma.project.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          salesperson: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Create audit log for significant changes
      const changedFields = Object.keys(updateData);
      for (const field of changedFields) {
        if (field !== 'updatedAt') {
          await createAuditLog({
            projectId: project.id,
            userId: req.user!.id,
            action: 'updated',
            field,
            oldValue: String(project[field as keyof typeof project] ?? ''),
            newValue: String(updateData[field] ?? ''),
          });
        }
      }

      res.json(updatedProject);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete project (Admin only)
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      await prisma.project.delete({
        where: { id: req.params.id },
      });

      res.json({ message: 'Project deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
