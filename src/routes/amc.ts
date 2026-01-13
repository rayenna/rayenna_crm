import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get AMC contracts for a project
router.get('/project/:projectId', authenticate, async (req: AuthRequest, res: express.Response) => {
  try {
    const contracts = await prisma.aMCContract.findMany({
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

    res.json(contracts);
  } catch (error: any) {
    console.error('Error fetching AMC contracts:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch AMC contracts' });
  }
});

// Get all AMC contracts
router.get('/', authenticate, async (req: AuthRequest, res: express.Response) => {
  try {
    const { projectId, active } = req.query;

    const where: any = {};
    if (projectId) where.projectId = projectId as string;
    if (active === 'true') {
      where.endDate = { gte: new Date() };
    }

    const contracts = await prisma.aMCContract.findMany({
      where,
      include: {
        project: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(contracts);
  } catch (error: any) {
    console.error('Error fetching AMC contracts:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch AMC contracts' });
  }
});

// Get single AMC contract
router.get('/:id', authenticate, async (req: AuthRequest, res: express.Response) => {
  try {
    const contract = await prisma.aMCContract.findUnique({
      where: { id: req.params.id },
      include: {
        project: {
          include: {
            customer: true,
            serviceTickets: true,
          },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({ error: 'AMC contract not found' });
    }

    res.json(contract);
  } catch (error: any) {
    console.error('Error fetching AMC contract:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch AMC contract' });
  }
});

// Create AMC contract
router.post(
  '/',
  authenticate,
  [
    body('projectId').isString().notEmpty(),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('annualFee').optional().isFloat({ min: 0 }),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const contract = await prisma.aMCContract.create({
        data: {
          ...req.body,
          startDate: new Date(req.body.startDate),
          endDate: new Date(req.body.endDate),
        },
        include: {
          project: {
            include: {
              customer: true,
            },
          },
        },
      });

      // Update project stage to AMC
      await prisma.project.update({
        where: { id: req.body.projectId },
        data: {
          projectStage: 'AMC',
          stageEnteredAt: new Date(),
          slaDays: 365,
          statusIndicator: 'GREEN',
        },
      });

      res.status(201).json(contract);
    } catch (error: any) {
      console.error('Error creating AMC contract:', error);
      res.status(500).json({ error: error.message || 'Failed to create AMC contract' });
    }
  }
);

// Update AMC contract
router.put(
  '/:id',
  authenticate,
  [
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('annualFee').optional().isFloat({ min: 0 }),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const updateData: any = { ...req.body };
      if (req.body.startDate) updateData.startDate = new Date(req.body.startDate);
      if (req.body.endDate) updateData.endDate = new Date(req.body.endDate);

      const contract = await prisma.aMCContract.update({
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

      res.json(contract);
    } catch (error: any) {
      console.error('Error updating AMC contract:', error);
      res.status(500).json({ error: error.message || 'Failed to update AMC contract' });
    }
  }
);

// Delete AMC contract
router.delete('/:id', authenticate, async (req: AuthRequest, res: express.Response) => {
  try {
    await prisma.aMCContract.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'AMC contract deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting AMC contract:', error);
    res.status(500).json({ error: error.message || 'Failed to delete AMC contract' });
  }
});

export default router;
