import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { InstallationStatus } from '@prisma/client';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Get installations for a project
router.get('/project/:projectId', authenticate, async (req: Request, res: express.Response) => {
  try {
    const installations = await prisma.installation.findMany({
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

    res.json(installations);
  } catch (error: any) {
    console.error('Error fetching installations:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch installations' });
  }
});

// Get single installation
router.get('/:id', authenticate, async (req: Request, res: express.Response) => {
  try {
    const installation = await prisma.installation.findUnique({
      where: { id: req.params.id },
      include: {
        project: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!installation) {
      return res.status(404).json({ error: 'Installation not found' });
    }

    res.json(installation);
  } catch (error: any) {
    console.error('Error fetching installation:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch installation' });
  }
});

// Create installation
router.post(
  '/',
  authenticate,
  [
    body('projectId').isString().notEmpty(),
    body('installerName').optional().isString(),
    body('startDate').optional().isISO8601(),
  ],
  async (req: Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const installation = await prisma.installation.create({
        data: {
          ...req.body,
          status: 'PENDING',
        },
        include: {
          project: {
            include: {
              customer: true,
            },
          },
        },
      });

      // Update project stage if starting installation
      if (req.body.startDate) {
        await prisma.project.update({
          where: { id: req.body.projectId },
          data: {
            projectStage: 'INSTALLATION',
            stageEnteredAt: new Date(),
            slaDays: 30,
            statusIndicator: 'GREEN',
          },
        });
      }

      res.status(201).json(installation);
    } catch (error: any) {
      console.error('Error creating installation:', error);
      res.status(500).json({ error: error.message || 'Failed to create installation' });
    }
  }
);

// Update installation
router.put(
  '/:id',
  authenticate,
  [
    body('status').optional().isIn(Object.values(InstallationStatus)),
    body('installerName').optional().isString(),
    body('startDate').optional().isISO8601(),
    body('completionDate').optional().isISO8601(),
  ],
  async (req: Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const installation = await prisma.installation.update({
        where: { id: req.params.id },
        data: req.body,
        include: {
          project: {
            include: {
              customer: true,
            },
          },
        },
      });

      // If completed, update project stage
      if (req.body.status === 'COMPLETED' && req.body.completionDate) {
        await prisma.project.update({
          where: { id: installation.projectId },
          data: {
            projectStage: 'BILLING',
            stageEnteredAt: new Date(),
            slaDays: 7,
            statusIndicator: 'GREEN',
            installationCompletionDate: new Date(req.body.completionDate),
          },
        });
      }

      res.json(installation);
    } catch (error: any) {
      console.error('Error updating installation:', error);
      res.status(500).json({ error: error.message || 'Failed to update installation' });
    }
  }
);

// Delete installation
router.delete('/:id', authenticate, async (req: Request, res: express.Response) => {
  try {
    await prisma.installation.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Installation deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting installation:', error);
    res.status(500).json({ error: error.message || 'Failed to delete installation' });
  }
});

export default router;
