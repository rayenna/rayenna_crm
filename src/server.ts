import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import * as Sentry from '@sentry/node';
// Prisma and route modules are loaded after listen() so /health can respond within Render's 5s timeout

import { scrubSentryEvent } from './utils/sentryScrub';

dotenv.config();

// Sentry (optional – only when SENTRY_DSN is set)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    beforeSend(event) {
      scrubSentryEvent(event as unknown as Record<string, unknown>);
      return event;
    },
  });
}

// Validate required environment variables at startup (fast; no I/O)
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  console.warn("FRONTEND_URL is not set in production – password reset emails may use the wrong link. Set FRONTEND_URL to your frontend base URL.");
}

const app = express();

// CORS origin check (defined early so health routes can use it)
const allowedOrigins = [
  'http://localhost:5173', // Local Vite dev server (CRM)
  'http://localhost:5174', // Proposal Engine dev
  'http://localhost:3000', // Local backend (if needed)
  'https://rayenna-crm-kappa.vercel.app', // Vercel (legacy)
  'https://rayennacrm.vercel.app', // Vercel production frontend
  'https://rayenna-crm-frontend.onrender.com', // Render static frontend
  'https://rayenna-proposal-engine.onrender.com', // Proposal Engine frontend
  process.env.FRONTEND_URL, // Production frontend from env (if different)
].filter(Boolean) as string[];

const normalizeOrigin = (o: string) => o?.replace(/\/$/, '') ?? '';

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const n = normalizeOrigin(origin);
  if (allowedOrigins.map(normalizeOrigin).includes(n)) return true;
  if (process.env.NODE_ENV === 'development') return true;
  if (origin.includes('render.com') || origin.includes('localhost')) return true;
  try {
    const u = new URL(origin);
    if (u.hostname.endsWith('.vercel.app')) return true;
  } catch {
    // ignore invalid origin
  }
  return false;
}

function setCorsHeaders(req: express.Request, res: express.Response): void {
  const origin = req.headers.origin as string | undefined;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// Health check FIRST — before heavy middleware, for Render deploy health checks (5s timeout).
// Must set CORS here because these routes run before the CORS middleware.
app.get('/health', (req, res) => {
  setCorsHeaders(req, res);
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  setCorsHeaders(req, res);
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware (lightweight; no DB or heavy imports)

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    console.warn('CORS: origin not allowed:', origin);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type'],
};

app.use((req, res, next) => {
  if (req.method !== 'OPTIONS') return next();
  const origin = req.headers.origin as string | undefined;
  if (!isOriginAllowed(origin)) {
    return res.status(403).end();
  }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  return res.status(204).end();
});

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Proposal Engine sync sends large proposal payloads (editedHtml); allow up to 10MB
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const uploadsPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// API router: routes are mounted here after listen (see below)
const apiRouter = express.Router();
app.use('/api', apiRouter);

// Until routes are loaded, non-health requests get 503 so clients can retry. After load, next().
let routesLoaded = false;
app.use((req, res, next) => {
  if (routesLoaded) return next();
  res.status(503).set('Retry-After', '15').json({
    error: 'Service starting up',
    retryAfter: 15,
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 3000;

// Listen immediately so /health responds within Render's 5s health check timeout.
// Then load Prisma and routes asynchronously.
const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    const prisma = (await import('./prisma')).default;
    (global as any).__prisma = prisma;

    const authRoutes = (await import('./routes/auth')).default;
    const projectRoutes = (await import('./routes/projects')).default;
    const documentRoutes = (await import('./routes/documents')).default;
    const dashboardRoutes = (await import('./routes/dashboard')).default;
    const dashboardEnhancedRoutes = (await import('./routes/dashboard-enhanced')).default;
    const wordCloudRoutes = (await import('./routes/wordcloud')).default;
    const tallyRoutes = (await import('./routes/tally')).default;
    const userRoutes = (await import('./routes/users')).default;
    const customerRoutes = (await import('./routes/customers')).default;
    const leadRoutes = (await import('./routes/leads')).default;
    const siteSurveyRoutes = (await import('./routes/siteSurveys')).default;
    const proposalRoutes = (await import('./routes/proposals')).default;
    const installationRoutes = (await import('./routes/installations')).default;
    const invoiceRoutes = (await import('./routes/invoices')).default;
    const amcRoutes = (await import('./routes/amc')).default;
    const serviceTicketRoutes = (await import('./routes/serviceTickets')).default;
    const supportTicketsRoutes = (await import('./routes/supportTickets')).default;
    const salesTeamPerformanceRoutes = (await import('./routes/salesTeamPerformance')).default;
    const remarksRoutes = (await import('./routes/remarks')).default;
    const adminAuditRoutes = (await import('./routes/adminAudit')).default;
    const proposalEngineRoutes = (await import('./routes/proposalEngine')).default;

    apiRouter.use('/auth', authRoutes);
    apiRouter.use('/projects', projectRoutes);
    apiRouter.use('/documents', documentRoutes);
    apiRouter.use('/dashboard', dashboardRoutes);
    apiRouter.use('/dashboard-enhanced', dashboardEnhancedRoutes);
    apiRouter.use('/dashboard', wordCloudRoutes);
    apiRouter.use('/tally', tallyRoutes);
    apiRouter.use('/users', userRoutes);
    apiRouter.use('/customers', customerRoutes);
    apiRouter.use('/leads', leadRoutes);
    apiRouter.use('/site-surveys', siteSurveyRoutes);
    apiRouter.use('/proposals', proposalRoutes);
    apiRouter.use('/installations', installationRoutes);
    apiRouter.use('/invoices', invoiceRoutes);
    apiRouter.use('/amc', amcRoutes);
    apiRouter.use('/service-tickets', serviceTicketRoutes);
    apiRouter.use('/support-tickets', supportTicketsRoutes);
    apiRouter.use('/sales-team-performance', salesTeamPerformanceRoutes);
    apiRouter.use('/remarks', remarksRoutes);
    apiRouter.use('/admin/audit', adminAuditRoutes);
    apiRouter.use('/proposal-engine', proposalEngineRoutes);

    routesLoaded = true;
    console.log('API routes ready');
  } catch (err) {
    console.error('Failed to load API routes:', err);
    process.exit(1);
  }
});

// Handle port already in use error gracefully
server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!\n`);
    console.error('Please either:');
    console.error(`  1. Kill the process using port ${PORT}:`);
    console.error(`     netstat -ano | findstr :${PORT}`);
    console.error(`     taskkill /PID <PID_NUMBER> /F`);
    console.error(`  2. Or run: powershell -ExecutionPolicy Bypass -File kill-port-3000.ps1`);
    console.error(`  3. Or set a different port: set PORT=3001 && npm run dev\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

// Graceful shutdown (prisma is set when routes load)
process.on('beforeExit', async () => {
  const prisma = (global as any).__prisma;
  if (prisma) await prisma.$disconnect();
});

export default app;
