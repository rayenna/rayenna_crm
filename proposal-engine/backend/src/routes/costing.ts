import { Router, Request, Response } from 'express';
import {
  addCostingItem,
  deleteCostingItem,
  validateCostingItemInput,
  type AddCostingItemInput,
} from '../services/costing.service';

const router = Router();

// ─────────────────────────────────────────────
// POST /api/costing-item
// Add a costing line item to a proposal
//
// Body: { proposalId, category, itemName, quantity, unitCost }
// totalCost is derived: quantity × unitCost
// ─────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const body = req.body as Partial<AddCostingItemInput>;

  const validationError = validateCostingItemInput(body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const result = await addCostingItem(body as AddCostingItemInput);
    res.status(201).json({ data: result.item });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add costing item';
    const status = message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/costing-item/:id
// ─────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'id must be a number' });
    return;
  }

  try {
    await deleteCostingItem(id);
    res.json({ message: 'Costing item deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete costing item' });
  }
});

export default router;
