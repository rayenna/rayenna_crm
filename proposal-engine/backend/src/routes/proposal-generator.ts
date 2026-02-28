import { Router, Request, Response } from 'express';
import { generateProposal } from '../services/proposal-generator.service';

const router = Router({ mergeParams: true });

// ─────────────────────────────────────────────
// POST /api/proposal/:id/generate
//
// Generate a full proposal document from stored data.
// Reads: Proposal, CostingItems, BOMItems, ROI from DB.
// Returns: structured JSON with all sections.
//
// If OPENAI_API_KEY is set in .env → AI-enhanced narrative
// Otherwise → template-only mode (always works offline)
// ─────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Proposal id must be a number' });
    return;
  }

  try {
    const proposal = await generateProposal({ proposalId: id });
    res.status(201).json({
      proposalId: id,
      mode: proposal.mode,
      data: proposal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to generate proposal';
    const status = msg.includes('not found') ? 404 : 500;
    res.status(status).json({ error: msg });
  }
});

// ─────────────────────────────────────────────
// GET /api/proposal/:id/generate
//
// Same as POST but via GET — for quick browser testing.
// ─────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Proposal id must be a number' });
    return;
  }

  try {
    const proposal = await generateProposal({ proposalId: id });
    res.json({
      proposalId: id,
      mode: proposal.mode,
      data: proposal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to generate proposal';
    const status = msg.includes('not found') ? 404 : 500;
    res.status(status).json({ error: msg });
  }
});

export default router;
