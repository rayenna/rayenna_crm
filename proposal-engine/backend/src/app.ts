import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health';
import proposalsRouter from './routes/proposals';
import costingRouter from './routes/costing';
import bomRouter from './routes/bom';
import roiRouter from './routes/roi';
import proposalGeneratorRouter from './routes/proposal-generator';

const app = express();

app.use(cors({ origin: 'http://localhost:5174' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────
app.use('/health', healthRouter);
app.use('/api/proposal', proposalsRouter);
app.use('/api/costing-item', costingRouter);
app.use('/api/proposal/:id/bom', bomRouter);   // nested: GET + PUT
app.use('/api/proposal/:id/roi', roiRouter);          // nested: GET + POST + POST /preview
app.use('/api/proposal/:id/generate', proposalGeneratorRouter); // GET + POST

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found', module: 'proposal-engine' });
});

export default app;
