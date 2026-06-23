import express, { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { authenticateConsumer } from '../middleware/consumerAuth';
import {
  getAnnualReadings,
  getOrCreateMonthlyReading,
  upsertManualReading,
} from '../services/consumerEnergyService';

const router = express.Router();

function parseYearMonth(req: Request): { year: number; month: number } | null {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

router.get(
  '/',
  authenticateConsumer,
  [
    query('year').isInt({ min: 2000, max: 2100 }),
    query('month').isInt({ min: 1, max: 12 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const parsed = parseYearMonth(req);
      if (!parsed) {
        return res.status(400).json({ error: 'Invalid year or month' });
      }

      const reading = await getOrCreateMonthlyReading(
        req.consumer!.id,
        parsed.year,
        parsed.month,
      );
      return res.json(reading);
    } catch (err) {
      console.error('Consumer energy GET error:', err);
      return res.status(500).json({ error: 'Failed to load energy data' });
    }
  },
);

router.get(
  '/annual',
  authenticateConsumer,
  [query('year').isInt({ min: 2000, max: 2100 })],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const year = Number(req.query.year);
      if (!Number.isInteger(year)) {
        return res.status(400).json({ error: 'Invalid year' });
      }

      const annual = await getAnnualReadings(req.consumer!.id, year);
      return res.json(annual);
    } catch (err) {
      console.error('Consumer energy annual GET error:', err);
      return res.status(500).json({ error: 'Failed to load annual energy data' });
    }
  },
);

router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  [
    body('consumerUserId').notEmpty(),
    body('year').isInt({ min: 2000, max: 2100 }),
    body('month').isInt({ min: 1, max: 12 }),
    body('totalGenerated').isFloat({ min: 0 }),
    body('totalConsumed').isFloat({ min: 0 }),
    body('gridExport').isFloat({ min: 0 }),
    body('totalSavings').isFloat({ min: 0 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        consumerUserId,
        year,
        month,
        totalGenerated,
        totalConsumed,
        gridExport,
        totalSavings,
      } = req.body;

      const reading = await upsertManualReading(consumerUserId, year, month, {
        totalGenerated,
        totalConsumed,
        gridExport,
        totalSavings,
      });
      return res.status(201).json(reading);
    } catch (err) {
      console.error('Consumer energy admin POST error:', err);
      return res.status(500).json({ error: 'Failed to save energy data' });
    }
  },
);

export default router;
