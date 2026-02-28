import { Router, Request, Response } from 'express';
import {
  createProposal,
  getProposalWithCosting,
  listProposals,
  deleteProposal,
} from '../services/proposal.service';

const router = Router();

// ─────────────────────────────────────────────
// POST /api/proposal
// Create a new solar proposal
// ─────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const { customerName, systemSizeKw, location, tariff } = req.body as {
    customerName?: string;
    systemSizeKw?: number;
    location?: string;
    tariff?: number;
  };

  if (!customerName || systemSizeKw == null || !location || tariff == null) {
    res.status(400).json({
      error: 'customerName, systemSizeKw, location, and tariff are required',
    });
    return;
  }

  try {
    const proposal = await createProposal({ customerName, systemSizeKw, location, tariff });
    res.status(201).json({ data: proposal });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// ─────────────────────────────────────────────
// GET /api/proposal/:id
// Fetch proposal + costing items + calculated summary
// ─────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'id must be a number' });
    return;
  }

  try {
    const result = await getProposalWithCosting(id);
    if (!result) {
      res.status(404).json({ error: 'Proposal not found' });
      return;
    }
    res.json({ data: result.proposal, summary: result.summary });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

// ─────────────────────────────────────────────
// GET /api/proposal
// List all proposals (lightweight, no relations)
// ─────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const proposals = await listProposals();
    res.json({ data: proposals });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list proposals' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/proposal/:id
// ─────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'id must be a number' });
    return;
  }

  try {
    await deleteProposal(id);
    res.json({ message: 'Proposal deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete proposal' });
  }
});

export default router;
