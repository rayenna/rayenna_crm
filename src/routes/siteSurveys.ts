import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get surveys for a project
router.get('/project/:projectId', authenticate, async (req: AuthRequest, res: express.Response) => {
  try {
    const surveys = await prisma.siteSurvey.findMany({
      where: { projectId: req.params.projectId },
      include: {
        completedBy: { select: { id: true, name: true, email: true } },
        project: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(surveys);
  } catch (error: any) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch surveys' });
  }
});

// Get single survey
router.get('/:id', authenticate, async (req: AuthRequest, res: express.Response) => {
  try {
    const survey = await prisma.siteSurvey.findUnique({
      where: { id: req.params.id },
      include: {
        completedBy: true,
        project: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    res.json(survey);
  } catch (error: any) {
    console.error('Error fetching survey:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch survey' });
  }
});

// Create survey
router.post(
  '/',
  authenticate,
  [
    body('projectId').isString().notEmpty(),
    body('roofArea').optional().isFloat({ min: 0 }),
    body('shading').optional().isString(),
    body('panelLayoutUrl').optional().isString(),
    body('discom').optional().isString(),
    body('meterType').optional().isString(),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const survey = await prisma.siteSurvey.create({
        data: {
          ...req.body,
          completedById: req.user!.id,
          completedAt: new Date(),
        },
        include: {
          completedBy: true,
          project: {
            include: {
              customer: true,
            },
          },
        },
      });

      // Update project stage if this is the first survey
      const project = await prisma.project.findUnique({
        where: { id: req.body.projectId },
      });

      if (project && project.projectStage === 'SURVEY') {
        await prisma.project.update({
          where: { id: req.body.projectId },
          data: {
            projectStage: 'PROPOSAL',
            stageEnteredAt: new Date(),
            slaDays: 14,
            statusIndicator: 'GREEN',
          },
        });
      }

      res.status(201).json(survey);
    } catch (error: any) {
      console.error('Error creating survey:', error);
      res.status(500).json({ error: error.message || 'Failed to create survey' });
    }
  }
);

// Update survey
router.put(
  '/:id',
  authenticate,
  [
    body('roofArea').optional().isFloat({ min: 0 }),
    body('shading').optional().isString(),
    body('panelLayoutUrl').optional().isString(),
    body('discom').optional().isString(),
    body('meterType').optional().isString(),
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const survey = await prisma.siteSurvey.update({
        where: { id: req.params.id },
        data: req.body,
        include: {
          completedBy: true,
          project: true,
        },
      });

      res.json(survey);
    } catch (error: any) {
      console.error('Error updating survey:', error);
      res.status(500).json({ error: error.message || 'Failed to update survey' });
    }
  }
);

// Delete survey
router.delete('/:id', authenticate, async (req: AuthRequest, res: express.Response) => {
  try {
    await prisma.siteSurvey.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Survey deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting survey:', error);
    res.status(500).json({ error: error.message || 'Failed to delete survey' });
  }
});

export default router;
