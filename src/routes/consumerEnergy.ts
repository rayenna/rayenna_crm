import express, { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { authenticateConsumer } from '../middleware/consumerAuth';
import {
  EnergyPeriodError,
  getAnnualReadings,
  getOrCreateMonthlyReading,
  upsertLoggedGeneration,
  upsertManualReading,
} from '../services/consumerEnergyService';
import { derivedTotalsFromGeneration } from '../utils/consumerEnergyEstimate';

const router = express.Router();

function parseYearMonth(req: Request): { year: number; month: number } | null {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function sendEnergyError(res: Response, err: unknown, fallback: string) {
  if (err instanceof EnergyPeriodError) {
    return res.status(400).json({ error: err.message });
  }
  console.error(fallback, err);
  return res.status(500).json({ error: fallback });
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
      return sendEnergyError(res, err, 'Failed to load energy data');
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
      return sendEnergyError(res, err, 'Failed to load annual energy data');
    }
  },
);

router.post(
  '/log',
  authenticateConsumer,
  [
    body('year').isInt({ min: 2000, max: 2100 }),
    body('month').isInt({ min: 1, max: 12 }),
    body('totalGenerated').isFloat({ min: 0, max: 50000 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const reading = await upsertLoggedGeneration(
        req.consumer!.id,
        Number(req.body.year),
        Number(req.body.month),
        Number(req.body.totalGenerated),
      );
      return res.status(201).json(reading);
    } catch (err) {
      return sendEnergyError(res, err, 'Failed to save energy data');
    }
  },
);

router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.OPERATIONS),
  [
    body('consumerUserId').notEmpty(),
    body('year').isInt({ min: 2000, max: 2100 }),
    body('month').isInt({ min: 1, max: 12 }),
    body('totalGenerated').isFloat({ min: 0, max: 50000 }),
    body('totalConsumed').optional().isFloat({ min: 0, max: 50000 }),
    body('gridExport').optional().isFloat({ min: 0, max: 50000 }),
    body('totalSavings').optional().isFloat({ min: 0, max: 5_000_000 }),
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

      const derived = derivedTotalsFromGeneration(Number(totalGenerated));
      const data = {
        totalGenerated: derived.totalGenerated,
        totalConsumed:
          totalConsumed === undefined || totalConsumed === null || totalConsumed === ''
            ? derived.totalConsumed
            : Number(totalConsumed),
        gridExport:
          gridExport === undefined || gridExport === null || gridExport === ''
            ? derived.gridExport
            : Number(gridExport),
        totalSavings:
          totalSavings === undefined || totalSavings === null || totalSavings === ''
            ? derived.totalSavings
            : Number(totalSavings),
      };

      const reading = await upsertManualReading(consumerUserId, year, month, data);
      return res.status(201).json(reading);
    } catch (err) {
      return sendEnergyError(res, err, 'Failed to save energy data');
    }
  },
);

export default router;
