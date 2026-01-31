import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import * as Sentry from '@sentry/node';
import prisma from './prisma';

// Import routes
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import documentRoutes from './routes/documents';
import dashboardRoutes from './routes/dashboard';
import dashboardEnhancedRoutes from './routes/dashboard-enhanced';
import wordCloudRoutes from './routes/wordcloud';
import tallyRoutes from './routes/tally';
import userRoutes from './routes/users';
import customerRoutes from './routes/customers';
import leadRoutes from './routes/leads';
import siteSurveyRoutes from './routes/siteSurveys';
import proposalRoutes from './routes/proposals';
import installationRoutes from './routes/installations';
import invoiceRoutes from './routes/invoices';
import amcRoutes from './routes/amc';
import serviceTicketRoutes from './routes/serviceTickets';
import supportTicketsRoutes from './routes/supportTickets';
import salesTeamPerformanceRoutes from './routes/salesTeamPerformance';
import remarksRoutes from './routes/remarks';
import adminAuditRoutes from './routes/adminAudit';
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

// Validate required environment variables at startup
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

// Middleware
// CORS configuration - allow local development and production frontend
const allowedOrigins = [
  'http://localhost:5173', // Local Vite dev server
  'http://localhost:3000', // Local backend (if needed)
  'https://rayenna-crm-kappa.vercel.app', // Production Vercel frontend
  'https://rayenna-crm-frontend.onrender.com', // Production Render frontend (Option B)
  process.env.FRONTEND_URL, // Production frontend from env (if different)
].filter(Boolean) as string[];

const normalizeOrigin = (o: string) => o?.replace(/\/$/, '') ?? '';

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const n = normalizeOrigin(origin);
  if (allowedOrigins.map(normalizeOrigin).includes(n)) return true;
  if (process.env.NODE_ENV === 'development') return true;
  if (origin.includes('render.com') || origin.includes('localhost')) return true;
  return false;
}

// CORS options configuration
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

// Handle preflight OPTIONS first — ensure CORS headers on 204 (avoids 404 without CORS)
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Note: Uploaded files are now served through protected API endpoint /api/documents/:id/download
// This ensures only authorized users (Admin, Management, or uploader) can access files
const uploadsPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
// Removed public static serving - files are now protected via API

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/dashboard-enhanced', dashboardEnhancedRoutes);
app.use('/api/dashboard', wordCloudRoutes);
app.use('/api/tally', tallyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/site-surveys', siteSurveyRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/installations', installationRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/amc', amcRoutes);
app.use('/api/service-tickets', serviceTicketRoutes);
app.use('/api/support-tickets', supportTicketsRoutes);
app.use('/api/sales-team-performance', salesTeamPerformanceRoutes);
app.use('/api/remarks', remarksRoutes);
app.use('/api/admin/audit', adminAuditRoutes);

// Health check (for Render and monitoring)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Sentry test: hit GET /api/sentry-test to trigger an error and verify rayenna-backend in Sentry. Remove after verifying.
app.get('/api/sentry-test', () => {
  throw new Error('Sentry backend test');
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

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
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

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default app;
