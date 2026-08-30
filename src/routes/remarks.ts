import express, { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';
import { requireProjectAccess } from '../utils/staffAccess';
import { sendErrorResponse } from '../utils/publicApiError';

const router = express.Router();

router.get(
  '/project/:projectId',
  authenticate,
  [param('projectId').notEmpty().trim()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId } = req.params;
      if (!(await requireProjectAccess(req, res, projectId))) return;

      const remarks = await prisma.projectRemark.findMany({
        where: { projectId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(remarks);
    } catch (error: any) {
      console.error('[REMARKS API] Error fetching remarks:', error);
      sendErrorResponse(res, 500, error);
    }
  }
);

// Create a new remark
router.post(
  '/project/:projectId',
  authenticate,
  [
    param('projectId').notEmpty().trim(),
    body('remark').notEmpty().trim().isLength({ min: 1, max: 10000 }),
  ],
  async (req: Request, res: Response) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[REMARKS API] POST request received:', {
          projectId: req.params.projectId,
          body: req.body,
          userId: req.user?.id,
        });
      }
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('[REMARKS API] Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId } = req.params;
      const { remark } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!(await requireProjectAccess(req, res, projectId))) return;
      if (process.env.NODE_ENV === 'development') {
        console.log('[REMARKS API] Creating remark:', { projectId, userId, remarkLength: remark?.length });
      }
      const newRemark = await prisma.projectRemark.create({
        data: {
          projectId,
          userId,
          remark: remark.trim(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
      if (process.env.NODE_ENV === 'development') console.log('[REMARKS API] Remark created successfully:', newRemark.id);
      res.status(201).json(newRemark);
    } catch (error: any) {
      console.error('[REMARKS API] Error creating remark:', error);
      sendErrorResponse(res, 500, error);
    }
  }
);

// Update a remark (only by owner)
router.put(
  '/:id',
  authenticate,
  [
    param('id').notEmpty().trim(),
    body('remark').notEmpty().trim().isLength({ min: 1, max: 10000 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { remark } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Find the remark
      const existingRemark = await prisma.projectRemark.findUnique({
        where: { id },
      });

      if (!existingRemark) {
        return res.status(404).json({ error: 'Remark not found' });
      }

      // Check if user owns the remark
      if (existingRemark.userId !== userId) {
        return res.status(403).json({ error: 'You can only edit your own remarks' });
      }

      const updatedRemark = await prisma.projectRemark.update({
        where: { id },
        data: {
          remark: remark.trim(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      res.json(updatedRemark);
    } catch (error: any) {
      sendErrorResponse(res, 500, error);
    }
  }
);

// Delete a remark (only by owner)
router.delete(
  '/:id',
  authenticate,
  [param('id').notEmpty().trim()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Find the remark
      const existingRemark = await prisma.projectRemark.findUnique({
        where: { id },
      });

      if (!existingRemark) {
        return res.status(404).json({ error: 'Remark not found' });
      }

      // Check if user owns the remark
      if (existingRemark.userId !== userId) {
        return res.status(403).json({ error: 'You can only delete your own remarks' });
      }

      await prisma.projectRemark.delete({
        where: { id },
      });

      res.json({ message: 'Remark deleted successfully' });
    } catch (error: any) {
      sendErrorResponse(res, 500, error);
    }
  }
);

export default router;
