/**
 * Admin-only Audit & Security — read-only APIs.
 * No business logic changes; paginated and date-bounded.
 */
import express, { Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { UserRole } from '@prisma/client';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MAX_DAYS_RANGE = 93; // ~3 months

function parseDate(s: string | undefined): Date | null {
  if (!s || typeof s !== 'string') return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * GET /api/admin/audit/logs
 * Paginated security audit logs. Filters: actionType, entityType, userId, dateFrom, dateTo.
 */
router.get(
  '/logs',
  authenticate,
  authorize(UserRole.ADMIN),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }).toInt(),
    query('actionType').optional().isString(),
    query('entityType').optional().isString(),
    query('userId').optional().isString(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const page = Math.min(Number(req.query.page) || DEFAULT_PAGE, 9999);
      const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
      const skip = (page - 1) * limit;
      const actionType = typeof req.query.actionType === 'string' ? req.query.actionType.trim() || undefined : undefined;
      const entityType = typeof req.query.entityType === 'string' ? req.query.entityType.trim() || undefined : undefined;
      const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() || undefined : undefined;
      const dateFrom = parseDate(req.query.dateFrom as string);
      const dateTo = parseDate(req.query.dateTo as string);

      const where: any = {};
      if (actionType) where.actionType = actionType;
      if (entityType) where.entityType = entityType;
      if (userId) where.userId = userId;
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }
      if (dateFrom && dateTo) {
        const days = (dateTo.getTime() - dateFrom.getTime()) / (24 * 60 * 60 * 1000);
        if (days > MAX_DAYS_RANGE) {
          return res.status(400).json({ error: `Date range must not exceed ${MAX_DAYS_RANGE} days` });
        }
      }

      const [logs, total] = await Promise.all([
        prisma.securityAuditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.securityAuditLog.count({ where }),
      ]);

      res.json({
        logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
);

/**
 * GET /api/admin/audit/security-summary
 * Aggregates for Admin dashboard: recent failed logins, counts by actionType, etc.
 */
router.get(
  '/security-summary',
  authenticate,
  authorize(UserRole.ADMIN),
  [
    query('days').optional().isInt({ min: 1, max: 31 }).toInt(),
  ],
  async (req: Request, res: Response) => {
    try {
      const days = Math.min(Number(req.query.days) || 7, 31);
      const since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);

      const [failedLogins, loginSuccessCount, auditByAction, accessByAction] = await Promise.all([
        prisma.accessLog.count({
          where: { actionType: 'login_failure', createdAt: { gte: since } },
        }),
        prisma.accessLog.count({
          where: { actionType: 'login_success', createdAt: { gte: since } },
        }),
        prisma.securityAuditLog.groupBy({
          by: ['actionType'],
          where: { createdAt: { gte: since } },
          _count: { id: true },
        }),
        prisma.accessLog.groupBy({
          by: ['actionType'],
          where: { createdAt: { gte: since } },
          _count: { id: true },
        }),
      ]);

      res.json({
        since: since.toISOString(),
        days,
        failedLogins,
        loginSuccessCount,
        auditByAction: auditByAction.map((r) => ({ actionType: r.actionType, count: r._count.id })),
        accessByAction: accessByAction.map((r) => ({ actionType: r.actionType, count: r._count.id })),
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch security summary' });
    }
  }
);

/**
 * GET /api/admin/audit/access-logs
 * Paginated access logs (login success/failure, auth_failure). Same filters and limits as /logs.
 */
router.get(
  '/access-logs',
  authenticate,
  authorize(UserRole.ADMIN),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }).toInt(),
    query('actionType').optional().isString(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const page = Math.min(Number(req.query.page) || DEFAULT_PAGE, 9999);
      const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
      const skip = (page - 1) * limit;
      const actionType = typeof req.query.actionType === 'string' ? req.query.actionType.trim() || undefined : undefined;
      const dateFrom = parseDate(req.query.dateFrom as string);
      const dateTo = parseDate(req.query.dateTo as string);

      const where: any = {};
      if (actionType) where.actionType = actionType;
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }

      const [logs, total] = await Promise.all([
        prisma.accessLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.accessLog.count({ where }),
      ]);

      res.json({
        logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch access logs' });
    }
  }
);

export default router;
