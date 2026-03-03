import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ProjectStatus, UserRole } from '@prisma/client';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';

const router = express.Router();

function getOperationsAllowedStatuses(): ProjectStatus[] {
  return [
    ProjectStatus.CONFIRMED,
    ProjectStatus.UNDER_INSTALLATION,
    ProjectStatus.COMPLETED,
    ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
  ];
}

function ensureProjectAccess(project: any, req: Request, res: Response): boolean {
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return false;
  }

  if (
    req.user?.role === UserRole.SALES &&
    project.salespersonId !== req.user.id &&
    project.createdById !== req.user.id
  ) {
    res.status(403).json({ error: 'Access denied' });
    return false;
  }

  if (req.user?.role === UserRole.OPERATIONS) {
    const allowedStatuses = getOperationsAllowedStatuses();
    if (!allowedStatuses.includes(project.projectStatus)) {
      res.status(403).json({
        error:
          'Access denied. Operations users can only access projects with status: Confirmed, Installation, Completed, or Completed - Subsidy Credited.',
      });
      return false;
    }
  }

  return true;
}

router.get('/projects', authenticate, async (req: Request, res: Response) => {
  try {
    const where: any = {};

    if (req.user?.role === UserRole.SALES) {
      where.OR = [
        { salespersonId: req.user.id },
        { createdById: req.user.id },
      ];
    } else if (req.user?.role === UserRole.OPERATIONS) {
      where.projectStatus = { in: getOperationsAllowedStatuses() };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    res.json(projects);
  } catch (error: any) {
    console.error('Error fetching proposal engine projects:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.get('/projects/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        siteSurveys: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!ensureProjectAccess(project, req, res)) {
      return;
    }

    const [costing, bom, roi, proposal] = await Promise.all([
      prisma.pECostingSheet.findFirst({
        where: { projectId: req.params.id },
        orderBy: { savedAt: 'desc' },
      }),
      prisma.pEBomSheet.findFirst({
        where: { projectId: req.params.id },
        orderBy: { savedAt: 'desc' },
      }),
      prisma.pERoiResult.findFirst({
        where: { projectId: req.params.id },
        orderBy: { savedAt: 'desc' },
      }),
      prisma.pEProposal.findFirst({
        where: { projectId: req.params.id },
        orderBy: { savedAt: 'desc' },
      }),
    ]);

    res.json({
      project,
      artifacts: {
        costing,
        bom,
        roi,
        proposal,
      },
    });
  } catch (error: any) {
    console.error('Error fetching proposal engine project details:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.get('/projects/:id/costing', authenticate, async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!ensureProjectAccess(project, req, res)) {
      return;
    }

    const costing = await prisma.pECostingSheet.findFirst({
      where: { projectId: req.params.id },
      orderBy: { savedAt: 'desc' },
    });

    res.json(costing || null);
  } catch (error: any) {
    console.error('Error fetching costing sheet:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch costing sheet' });
  }
});

router.put(
  '/projects/:id/costing',
  authenticate,
  [
    body('sheetName').isString().notEmpty(),
    body('items').exists(),
    body('grandTotal').isFloat(),
    body('showGst').optional().isBoolean(),
    body('marginPct').optional().isFloat(),
    body('systemSizeKw').optional().isFloat(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!ensureProjectAccess(project, req, res)) {
        return;
      }

      const existing = await prisma.pECostingSheet.findFirst({
        where: { projectId: req.params.id },
        orderBy: { savedAt: 'desc' },
      });

      const data = {
        projectId: req.params.id,
        sheetName: req.body.sheetName,
        items: req.body.items,
        showGst: req.body.showGst ?? true,
        marginPct: req.body.marginPct ?? 0,
        grandTotal: req.body.grandTotal,
        systemSizeKw: req.body.systemSizeKw ?? 0,
      };

      let costing;
      if (existing) {
        costing = await prisma.pECostingSheet.update({
          where: { id: existing.id },
          data,
        });
      } else {
        costing = await prisma.pECostingSheet.create({
          data: {
            ...data,
            createdById: req.user!.id,
          },
        });
      }

      res.json(costing);
    } catch (error: any) {
      console.error('Error saving costing sheet:', error);
      res.status(500).json({ error: error.message || 'Failed to save costing sheet' });
    }
  }
);

router.get('/projects/:id/bom', authenticate, async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!ensureProjectAccess(project, req, res)) {
      return;
    }

    const bom = await prisma.pEBomSheet.findFirst({
      where: { projectId: req.params.id },
      orderBy: { savedAt: 'desc' },
    });

    res.json(bom || null);
  } catch (error: any) {
    console.error('Error fetching BOM sheet:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch BOM sheet' });
  }
});

router.put(
  '/projects/:id/bom',
  authenticate,
  [body('rows').exists()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!ensureProjectAccess(project, req, res)) {
        return;
      }

      const existing = await prisma.pEBomSheet.findFirst({
        where: { projectId: req.params.id },
        orderBy: { savedAt: 'desc' },
      });

      const data = {
        projectId: req.params.id,
        rows: req.body.rows,
      };

      let bom;
      if (existing) {
        bom = await prisma.pEBomSheet.update({
          where: { id: existing.id },
          data,
        });
      } else {
        bom = await prisma.pEBomSheet.create({
          data: {
            ...data,
            createdById: req.user!.id,
          },
        });
      }

      res.json(bom);
    } catch (error: any) {
      console.error('Error saving BOM sheet:', error);
      res.status(500).json({ error: error.message || 'Failed to save BOM sheet' });
    }
  }
);

router.get('/projects/:id/roi', authenticate, async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!ensureProjectAccess(project, req, res)) {
      return;
    }

    const roi = await prisma.pERoiResult.findFirst({
      where: { projectId: req.params.id },
      orderBy: { savedAt: 'desc' },
    });

    res.json(roi || null);
  } catch (error: any) {
    console.error('Error fetching ROI result:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch ROI result' });
  }
});

router.put(
  '/projects/:id/roi',
  authenticate,
  [body('result').exists()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!ensureProjectAccess(project, req, res)) {
        return;
      }

      const existing = await prisma.pERoiResult.findFirst({
        where: { projectId: req.params.id },
        orderBy: { savedAt: 'desc' },
      });

      const data = {
        projectId: req.params.id,
        result: req.body.result,
      };

      let roi;
      if (existing) {
        roi = await prisma.pERoiResult.update({
          where: { id: existing.id },
          data,
        });
      } else {
        roi = await prisma.pERoiResult.create({
          data: {
            ...data,
            createdById: req.user!.id,
          },
        });
      }

      res.json(roi);
    } catch (error: any) {
      console.error('Error saving ROI result:', error);
      res.status(500).json({ error: error.message || 'Failed to save ROI result' });
    }
  }
);

router.get('/projects/:id/proposal', authenticate, async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!ensureProjectAccess(project, req, res)) {
      return;
    }

    const proposal = await prisma.pEProposal.findFirst({
      where: { projectId: req.params.id },
      orderBy: { savedAt: 'desc' },
    });

    res.json(proposal || null);
  } catch (error: any) {
    console.error('Error fetching saved proposal:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch saved proposal' });
  }
});

router.put(
  '/projects/:id/proposal',
  authenticate,
  [
    body('refNumber').isString().notEmpty(),
    body('generatedAt').isISO8601(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!ensureProjectAccess(project, req, res)) {
        return;
      }

      const existing = await prisma.pEProposal.findFirst({
        where: { projectId: req.params.id },
        orderBy: { savedAt: 'desc' },
      });

      const data = {
        projectId: req.params.id,
        refNumber: req.body.refNumber,
        generatedAt: new Date(req.body.generatedAt),
        bomComments: req.body.bomComments ?? null,
        editedHtml: req.body.editedHtml ?? null,
        textOverrides: req.body.textOverrides ?? null,
        summary: req.body.summary ?? null,
      };

      let proposal;
      if (existing) {
        proposal = await prisma.pEProposal.update({
          where: { id: existing.id },
          data,
        });
      } else {
        proposal = await prisma.pEProposal.create({
          data: {
            ...data,
            createdById: req.user!.id,
          },
        });
      }

      res.json(proposal);
    } catch (error: any) {
      console.error('Error saving proposal artifact:', error);
      res.status(500).json({ error: error.message || 'Failed to save proposal artifact' });
    }
  }
);

export default router;

