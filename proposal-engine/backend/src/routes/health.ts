import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Proposal Engine Running',
    module: 'proposal-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
