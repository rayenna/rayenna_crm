import express, { Request, Response } from 'express';
import { authenticateConsumer } from '../middleware/consumerAuth';
import {
  getConsumerHelpArticle,
  getConsumerHelpPayload,
} from '../services/consumerHelpService';
import { getConsumerHelpContext } from '../services/consumerHelpContextService';
import type { HelpContextScreen } from '../utils/consumerHelpContext';

const HELP_CONTEXT_SCREENS: HelpContextScreen[] = ['home', 'track', 'maintain', 'help', 'all'];

const router = express.Router();

router.get('/help', authenticateConsumer, async (_req: Request, res: Response) => {
  try {
    const payload = await getConsumerHelpPayload();
    return res.json(payload);
  } catch (err) {
    console.error('Consumer help GET error:', err);
    return res.status(500).json({ error: 'Failed to load help content' });
  }
});

router.get('/help/context', authenticateConsumer, async (req: Request, res: Response) => {
  try {
    const raw = String(req.query.screen ?? 'all').trim().toLowerCase();
    const screen = (HELP_CONTEXT_SCREENS.includes(raw as HelpContextScreen)
      ? raw
      : 'all') as HelpContextScreen;
    const payload = await getConsumerHelpContext(req.consumer!.id, screen);
    return res.json(payload);
  } catch (err) {
    console.error('Consumer help context GET error:', err);
    return res.status(500).json({ error: 'Failed to load contextual help' });
  }
});

router.get('/help/articles/:articleId', authenticateConsumer, async (req: Request, res: Response) => {
  try {
    const articleId = String(req.params.articleId ?? '').trim();
    const article = await getConsumerHelpArticle(articleId);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    return res.json(article);
  } catch (err) {
    console.error('Consumer help article GET error:', err);
    return res.status(500).json({ error: 'Failed to load article' });
  }
});

export default router;
