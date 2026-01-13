import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import documentRoutes from './routes/documents';
import dashboardRoutes from './routes/dashboard';
import dashboardEnhancedRoutes from './routes/dashboard-enhanced';
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

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
