import express, { Request, Response } from 'express';
import { authenticateConsumer } from '../middleware/consumerAuth';
import { getConsumerHome } from '../services/consumerHomeService';

const router = express.Router();

router.get('/home', authenticateConsumer, async (req: Request, res: Response) => {
  try {
    const home = await getConsumerHome(req.consumer!.id);
    return res.json(home);
  } catch (err) {
    console.error('Consumer home GET error:', err);
    return res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

export default router;
