import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateConsumer } from '../middleware/consumerAuth';
import { rateLimit } from '../middleware/rateLimit';
import {
  isConsumerSupportBotEnabled,
  replyConsumerChat,
} from '../services/consumerChatService';

const router = express.Router();

const chatLimiter = rateLimit(20, 10 * 60 * 1000);

router.post(
  '/chat',
  authenticateConsumer,
  chatLimiter,
  [
    body('message').trim().notEmpty().isLength({ max: 2000 }),
    body('sessionId').optional().isString().isLength({ max: 64 }),
  ],
  async (req: Request, res: Response) => {
    if (!isConsumerSupportBotEnabled()) {
      return res.status(503).json({ error: 'Support chat is not enabled' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const result = await replyConsumerChat(req.consumer!.id, {
        message: String(req.body.message),
        sessionId: typeof req.body.sessionId === 'string' ? req.body.sessionId : undefined,
      });
      return res.json(result);
    } catch (err) {
      console.error('Consumer chat POST error:', err);
      return res.status(500).json({ error: 'Failed to send chat message' });
    }
  },
);

export default router;
