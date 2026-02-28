import { Router, Request, Response } from 'express';
import { getBom, saveBom } from '../services/bom.service';

const router = Router({ mergeParams: true }); // inherits :id from parent

// ─────────────────────────────────────────────
// GET /api/proposal/:id/bom
//
// Returns BOM rows for the proposal.
// - If saved overrides exist → returns them (source: "saved")
// - Otherwise → auto-generates from costing items (source: "generated")
//   without writing to DB, so the user can review before saving.
// ─────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Proposal id must be a number' });
    return;
  }

  try {
    const result = await getBom(id);
    res.json({
      proposalId: id,
      source: result.source,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch BOM';
    res.status(500).json({ error: msg });
  }
});

// ─────────────────────────────────────────────
// PUT /api/proposal/:id/bom
//
// Save (or replace) the BOM with user-edited rows.
// Body: { rows: [{ itemName, specification, quantity, brand, warranty }] }
// ─────────────────────────────────────────────
router.put('/', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Proposal id must be a number' });
    return;
  }

  const { rows } = req.body as {
    rows?: Array<{
      itemName: string;
      specification: string;
      quantity: number;
      brand: string;
      warranty: string;
    }>;
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: 'rows must be a non-empty array' });
    return;
  }

  // Validate each row minimally
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.itemName?.trim()) {
      res.status(400).json({ error: `rows[${i}].itemName is required` });
      return;
    }
    if (r.quantity == null || r.quantity <= 0) {
      res.status(400).json({ error: `rows[${i}].quantity must be > 0` });
      return;
    }
  }

  try {
    const saved = await saveBom({ proposalId: id, rows });
    res.json({
      proposalId: id,
      source: 'saved',
      count: saved.length,
      data: saved,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to save BOM';
    const status = msg.includes('not found') ? 404 : 500;
    res.status(status).json({ error: msg });
  }
});

export default router;
