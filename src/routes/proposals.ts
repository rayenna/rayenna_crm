import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ProposalStatus } from '@prisma/client';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';
import { generateProposalContent } from '../utils/ai';

const router = express.Router();

// Get proposals for a project
router.get('/project/:projectId', authenticate, async (req: Request, res: express.Response) => {
  try {
    const proposals = await prisma.proposal.findMany({
      where: { projectId: req.params.projectId },
      include: {
        project: {
          include: {
            customer: true,
            siteSurveys: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(proposals);
  } catch (error: any) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch proposals' });
  }
});

// Get single proposal
router.get('/:id', authenticate, async (req: Request, res: express.Response) => {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: req.params.id },
      include: {
        project: {
          include: {
            customer: true,
            siteSurveys: true,
          },
        },
      },
    });

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json(proposal);
  } catch (error: any) {
    console.error('Error fetching proposal:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch proposal' });
  }
});

// Create proposal (with AI generation option)
router.post(
  '/',
  authenticate,
  [
    body('projectId').isString().notEmpty(),
    body('price').optional().isFloat({ min: 0 }),
    body('energyOutputKwh').optional().isFloat({ min: 0 }),
    body('annualSavings').optional().isFloat({ min: 0 }),
    body('paybackYears').optional().isFloat({ min: 0 }),
    body('aiGenerated').optional().isBoolean(),
  ],
  async (req: Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId, aiGenerated, ...proposalData } = req.body;

      // Get project with survey data
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          customer: true,
          siteSurveys: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Generate AI proposal if requested
      let proposalContent = '';
      if (aiGenerated && project.siteSurveys.length > 0) {
        try {
          const survey = project.siteSurveys[0];
          proposalContent = await generateProposalContent(
            {
              roofArea: survey.roofArea || undefined,
              shading: survey.shading || undefined,
              discom: survey.discom || undefined,
              meterType: survey.meterType || undefined,
              remarks: survey.remarks || undefined,
            },
            {
              systemCapacity: project.systemCapacity || undefined,
              systemType: project.systemType || undefined,
              panelBrand: project.panelBrand || undefined,
              inverterBrand: project.inverterBrand || undefined,
              projectCost: project.projectCost || undefined,
              customerName: project.customer.customerName,
              city: project.customer.city || undefined,
              state: project.customer.state || undefined,
            }
          );
        } catch (error) {
          console.error('AI generation failed:', error);
          // Continue without AI content
        }
      }

      const proposal = await prisma.proposal.create({
        data: {
          ...proposalData,
          projectId,
          aiGenerated: aiGenerated || false,
          status: 'DRAFT',
        },
        include: {
          project: {
            include: {
              customer: true,
            },
          },
        },
      });

      // If AI generated, you might want to save the content as a document
      // For now, we'll just return it in the response
      res.status(201).json({
        ...proposal,
        aiContent: proposalContent || undefined,
      });
    } catch (error: any) {
      console.error('Error creating proposal:', error);
      res.status(500).json({ error: error.message || 'Failed to create proposal' });
    }
  }
);

// Update proposal
router.put(
  '/:id',
  authenticate,
  [
    body('status').optional().isIn(Object.values(ProposalStatus)),
    body('price').optional().isFloat({ min: 0 }),
    body('energyOutputKwh').optional().isFloat({ min: 0 }),
  ],
  async (req: Request, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const updateData: any = { ...req.body };
      if (req.body.status === 'SENT' && !updateData.sentDate) {
        updateData.sentDate = new Date();
      }

      const proposal = await prisma.proposal.update({
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

      // If approved, update project stage
      if (req.body.status === 'APPROVED') {
        await prisma.project.update({
          where: { id: proposal.projectId },
          data: {
            projectStage: 'APPROVED',
            stageEnteredAt: new Date(),
            slaDays: 5,
            statusIndicator: 'GREEN',
          },
        });
      }

      res.json(proposal);
    } catch (error: any) {
      console.error('Error updating proposal:', error);
      res.status(500).json({ error: error.message || 'Failed to update proposal' });
    }
  }
);

// Delete proposal
router.delete('/:id', authenticate, async (req: Request, res: express.Response) => {
  try {
    await prisma.proposal.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Proposal deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting proposal:', error);
    res.status(500).json({ error: error.message || 'Failed to delete proposal' });
  }
});

export default router;
