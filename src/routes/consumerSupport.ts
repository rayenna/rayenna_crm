import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateConsumer } from '../middleware/consumerAuth';
import {
  createConsumerSupportTicket,
  getConsumerFaqPayload,
  getConsumerSupportMeta,
  listConsumerSupportTickets,
} from '../services/consumerSupportService';

const router = express.Router();

router.get('/faq', authenticateConsumer, async (_req: Request, res: Response) => {
  try {
    return res.json(await getConsumerFaqPayload());
  } catch (err) {
    console.error('Consumer FAQ GET error:', err);
    return res.status(500).json({ error: 'Failed to load FAQ' });
  }
});

router.get('/support-meta', authenticateConsumer, async (req: Request, res: Response) => {
  try {
    const meta = await getConsumerSupportMeta(req.consumer!.id);
    return res.json(meta);
  } catch (err) {
    console.error('Consumer support meta GET error:', err);
    return res.status(500).json({ error: 'Failed to load support info' });
  }
});

router.get('/support-tickets', authenticateConsumer, async (req: Request, res: Response) => {
  try {
    const items = await listConsumerSupportTickets(req.consumer!.id);
    return res.json({ items });
  } catch (err) {
    console.error('Consumer support tickets GET error:', err);
    return res.status(500).json({ error: 'Failed to load support tickets' });
  }
});

router.post(
  '/support-tickets',
  authenticateConsumer,
  [
    body('title').trim().notEmpty().isLength({ max: 500 }),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('subject').optional().trim().isLength({ max: 500 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, subject, description } = req.body as {
        title?: string;
        subject?: string;
        description?: string;
      };

      const ticketTitle = (title || subject || '').trim();
      if (!ticketTitle) {
        return res.status(400).json({ error: 'Subject is required' });
      }

      const created = await createConsumerSupportTicket(req.consumer!.id, {
        title: ticketTitle,
        description: description?.trim(),
      });

      return res.status(201).json(created);
    } catch (err) {
      console.error('Consumer support ticket POST error:', err);
      return res.status(500).json({ error: 'Failed to submit query' });
    }
  },
);

export default router;
