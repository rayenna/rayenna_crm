import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateConsumer } from '../middleware/consumerAuth';
import { rateLimit } from '../middleware/rateLimit';
import {
  deletePushSubscription,
  getVapidPublicKey,
  savePushSubscription,
} from '../services/consumerPushService';

const router = express.Router();
const subscribeLimiter = rateLimit(30, 15 * 60 * 1000);

router.get('/push/config', authenticateConsumer, async (_req: Request, res: Response) => {
  const publicKey = getVapidPublicKey();
  return res.json({ enabled: Boolean(publicKey), publicKey });
});

router.post(
  '/push/subscriptions',
  authenticateConsumer,
  subscribeLimiter,
  [
    body('endpoint').trim().notEmpty().isLength({ max: 2048 }),
    body('keys.p256dh').trim().notEmpty().isLength({ max: 255 }),
    body('keys.auth').trim().notEmpty().isLength({ max: 255 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!getVapidPublicKey()) {
      return res.status(503).json({ error: 'Web Push is not configured' });
    }
    try {
      await savePushSubscription(req.consumer!.id, {
        endpoint: req.body.endpoint,
        p256dh: req.body.keys.p256dh,
        auth: req.body.keys.auth,
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
      });
      return res.status(201).json({ ok: true });
    } catch (err) {
      console.error('Hub push subscribe error:', err);
      return res.status(500).json({ error: 'Failed to save push subscription' });
    }
  },
);

router.delete(
  '/push/subscriptions',
  authenticateConsumer,
  [body('endpoint').trim().notEmpty().isLength({ max: 2048 })],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      await deletePushSubscription(req.consumer!.id, req.body.endpoint);
      return res.json({ ok: true });
    } catch (err) {
      console.error('Hub push unsubscribe error:', err);
      return res.status(500).json({ error: 'Failed to remove push subscription' });
    }
  },
);

export default router;
