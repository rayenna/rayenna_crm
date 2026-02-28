import { Router, Request, Response } from 'express';
import { calculateAndSaveROI, getSavedROI, calculateROI } from '../services/roi.service';

const router = Router({ mergeParams: true });

// ─────────────────────────────────────────────
// POST /api/proposal/:id/roi
//
// Calculate ROI and persist the result.
// Body (all optional — defaults are applied for missing fields):
//   { generationFactor?, escalationPercent?, projectCost? }
//
// systemSizeKw and tariff are always read from the Proposal record.
// ─────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Proposal id must be a number' });
    return;
  }

  const { generationFactor, escalationPercent, projectCost } = req.body as {
    generationFactor?: number;
    escalationPercent?: number;
    projectCost?: number;
  };

  // Validate optional inputs when provided
  if (generationFactor !== undefined && (generationFactor <= 0 || generationFactor > 3000)) {
    res.status(400).json({ error: 'generationFactor must be between 1 and 3000 kWh/kW/year' });
    return;
  }
  if (escalationPercent !== undefined && (escalationPercent < 0 || escalationPercent > 50)) {
    res.status(400).json({ error: 'escalationPercent must be between 0 and 50' });
    return;
  }
  if (projectCost !== undefined && projectCost < 0) {
    res.status(400).json({ error: 'projectCost must be >= 0' });
    return;
  }

  try {
    const result = await calculateAndSaveROI(id, {
      generationFactor,
      escalationPercent,
      projectCost,
    });
    res.status(201).json({ proposalId: id, data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to calculate ROI';
    const status = msg.includes('not found') ? 404 : 500;
    res.status(status).json({ error: msg });
  }
});

// ─────────────────────────────────────────────
// GET /api/proposal/:id/roi
//
// Returns the saved ROI result with full yearly breakdown.
// Returns 404 if ROI has not been calculated yet.
// ─────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Proposal id must be a number' });
    return;
  }

  try {
    const result = await getSavedROI(id);
    if (!result) {
      res.status(404).json({
        error: 'ROI not calculated yet. POST to /api/proposal/:id/roi first.',
      });
      return;
    }
    res.json({ proposalId: id, data: result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ROI' });
  }
});

// ─────────────────────────────────────────────
// POST /api/proposal/:id/roi/preview
//
// Calculate ROI without saving — useful for live UI previews
// as the user adjusts sliders.
// Body: { systemSizeKw, tariff, generationFactor, escalationPercent, projectCost }
// ─────────────────────────────────────────────
router.post('/preview', async (req: Request, res: Response) => {
  const { systemSizeKw, tariff, generationFactor, escalationPercent, projectCost } =
    req.body as {
      systemSizeKw?: number;
      tariff?: number;
      generationFactor?: number;
      escalationPercent?: number;
      projectCost?: number;
    };

  if (!systemSizeKw || systemSizeKw <= 0) {
    res.status(400).json({ error: 'systemSizeKw is required and must be > 0' });
    return;
  }
  if (!tariff || tariff <= 0) {
    res.status(400).json({ error: 'tariff is required and must be > 0' });
    return;
  }

  try {
    const result = calculateROI({
      systemSizeKw,
      tariff,
      generationFactor:  generationFactor  ?? 1500,
      escalationPercent: escalationPercent ?? 5,
      projectCost:       projectCost       ?? 0,
    });
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate ROI preview' });
  }
});

export default router;
