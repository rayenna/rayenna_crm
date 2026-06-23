import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateConsumer } from '../middleware/consumerAuth';
import {
  getConsumerProfile,
  listConsumerNotifications,
  markConsumerNotificationRead,
  updateConsumerProfile,
} from '../services/consumerProfileService';

const router = express.Router();

router.get('/profile', authenticateConsumer, async (req: Request, res: Response) => {
  try {
    const profile = await getConsumerProfile(req.consumer!.id);
    return res.json(profile);
  } catch (err) {
    console.error('Consumer profile GET error:', err);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.put(
  '/profile',
  authenticateConsumer,
  [
    body('firstName').optional().trim().isLength({ max: 100 }),
    body('lastName').optional().trim().isLength({ max: 100 }),
    body('phone').optional().trim().isLength({ max: 30 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName, phone } = req.body as {
        firstName?: string;
        lastName?: string;
        phone?: string;
      };

      const profile = await updateConsumerProfile(req.consumer!.id, {
        firstName,
        lastName,
        phone,
      });
      return res.json(profile);
    } catch (err) {
      console.error('Consumer profile PUT error:', err);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  },
);

router.get('/notifications', authenticateConsumer, async (req: Request, res: Response) => {
  try {
    const payload = await listConsumerNotifications(req.consumer!.id);
    return res.json(payload);
  } catch (err) {
    console.error('Consumer notifications GET error:', err);
    return res.status(500).json({ error: 'Failed to load notifications' });
  }
});

router.put(
  '/notifications/:id/read',
  authenticateConsumer,
  async (req: Request, res: Response) => {
    try {
      const notification = await markConsumerNotificationRead(
        req.consumer!.id,
        req.params.id,
      );
      return res.json(notification);
    } catch (err) {
      if (err instanceof Error && err.message === 'Notification not found') {
        return res.status(404).json({ error: 'Notification not found' });
      }
      console.error('Consumer notification read PUT error:', err);
      return res.status(500).json({ error: 'Failed to update notification' });
    }
  },
);

export default router;
