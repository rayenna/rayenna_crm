import express, { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Debug: Test endpoint to verify route is accessible
router.get('/test', authenticate, (req: Request, res: Response) => {
  res.json({ message: 'Remarks API is working', userId: req.user?.id });
});

// Get all remarks for a project
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

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

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
      const projectId = req.params.projectId;
      console.error('[REMARKS API] Error fetching remarks:', error);
      console.error('[REMARKS API] Error details:', {
        projectId,
        errorMessage: error.message,
        errorCode: error.code,
      });
      res.status(500).json({ error: error.message || 'Failed to fetch remarks' });
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
        console.error('[REMARKS API] No userId found');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
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
      const { projectId } = req.params;
      const { remark } = req.body;
      const userId = req.user?.id;
      
      console.error('[REMARKS API] Error creating remark:', error);
      console.error('[REMARKS API] Error details:', {
        projectId,
        userId,
        remark: remark?.substring?.(0, 50),
        errorMessage: error.message,
        errorCode: error.code,
        errorStack: error.stack?.substring(0, 500),
      });
      
      // Provide more detailed error message
      let errorMessage = 'Failed to create remark';
      if (error.code === 'P2003') {
        errorMessage = 'Invalid project or user reference';
      } else if (error.code === 'P2002') {
        errorMessage = 'Duplicate entry';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ error: errorMessage });
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
      res.status(500).json({ error: error.message });
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
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
