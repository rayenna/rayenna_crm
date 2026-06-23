import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ConsumerMaintenanceRequestType } from '@prisma/client';
import { authenticateConsumer } from '../middleware/consumerAuth';
import {
  createMaintenanceRequest,
  getMaintenanceSchedule,
  getWarrantyPayload,
  listMaintenanceRequests,
} from '../services/consumerMaintainService';

const router = express.Router();

router.get('/warranty', authenticateConsumer, async (req: Request, res: Response) => {
  try {
    const payload = await getWarrantyPayload(req.consumer!.id);
    return res.json(payload);
  } catch (err) {
    console.error('Consumer warranty GET error:', err);
    return res.status(500).json({ error: 'Failed to load warranty data' });
  }
});

router.get('/maintenance-schedule', authenticateConsumer, async (req: Request, res: Response) => {
  try {
    const items = await getMaintenanceSchedule(req.consumer!.id);
    return res.json({ items });
  } catch (err) {
    console.error('Consumer maintenance schedule GET error:', err);
    return res.status(500).json({ error: 'Failed to load maintenance schedule' });
  }
});

router.get('/maintenance-requests', authenticateConsumer, async (req: Request, res: Response) => {
  try {
    const items = await listMaintenanceRequests(req.consumer!.id);
    return res.json({ items });
  } catch (err) {
    console.error('Consumer maintenance requests GET error:', err);
    return res.status(500).json({ error: 'Failed to load maintenance requests' });
  }
});

router.post(
  '/maintenance-requests',
  authenticateConsumer,
  [
    body('requestType')
      .isIn([ConsumerMaintenanceRequestType.SCHEDULE_SERVICE, ConsumerMaintenanceRequestType.REPORT_ISSUE]),
    body('title').trim().notEmpty().isLength({ max: 500 }),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('preferredDate').optional().isISO8601().toDate(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { requestType, title, description, preferredDate } = req.body as {
        requestType: ConsumerMaintenanceRequestType;
        title: string;
        description?: string;
        preferredDate?: string;
      };

      const created = await createMaintenanceRequest(req.consumer!.id, {
        requestType,
        title,
        description,
        preferredDate: preferredDate
          ? typeof preferredDate === 'string'
            ? preferredDate.slice(0, 10)
            : new Date(preferredDate).toISOString().slice(0, 10)
          : undefined,
      });

      return res.status(201).json(created);
    } catch (err) {
      console.error('Consumer maintenance request POST error:', err);
      return res.status(500).json({ error: 'Failed to submit request' });
    }
  },
);

export default router;
