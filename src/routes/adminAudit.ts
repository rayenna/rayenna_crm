/**
 * Admin-only Audit & Security — read-only APIs.
 * No business logic changes; paginated and date-bounded.
 */
import express, { Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { Prisma, UserRole } from '@prisma/client';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MAX_DAYS_RANGE = 93; // ~3 months

const ACTION_TYPES_FOR_DISTRIBUTION = [
  'login',
  'password_reset_initiated',
  'password_reset_completed',
  'user_created',
  'user_role_changed',
  'project_created',
  'project_status_changed',
  'support_ticket_created',
  'support_ticket_closed',
  'proposal_generated',
] as const;

function parseDate(s: string | undefined): Date | null {
  if (!s || typeof s !== 'string') return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function isPrivateIp(ip: string): boolean {
  const v = ip.trim();
  if (!v) return true;
  if (v === '127.0.0.1' || v === '::1') return true;
  if (v.startsWith('10.')) return true;
  if (v.startsWith('192.168.')) return true;
  // 172.16.0.0 – 172.31.255.255
  if (v.startsWith('172.')) {
    const second = Number(v.split('.')[1]);
    if (!Number.isNaN(second) && second >= 16 && second <= 31) return true;
  }
  if (v.startsWith('169.254.')) return true; // link-local
  if (v.startsWith('fc') || v.startsWith('fd')) return true; // IPv6 ULA (very rough)
  return false;
}

type IpLocation = { ip: string; location: string | null };
const ipLocationCache = new Map<string, { v: IpLocation; expiresAt: number }>();
const IP_LOCATION_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const IP_LOCATION_CACHE_MAX = 1500;

function cacheGet(ip: string): IpLocation | null {
  const hit = ipLocationCache.get(ip);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    ipLocationCache.delete(ip);
    return null;
  }
  return hit.v;
}

function cacheSet(ip: string, v: IpLocation): void {
  if (ipLocationCache.size >= IP_LOCATION_CACHE_MAX) {
    // cheap eviction: remove first inserted item
    const firstKey = ipLocationCache.keys().next().value as string | undefined;
    if (firstKey) ipLocationCache.delete(firstKey);
  }
  ipLocationCache.set(ip, { v, expiresAt: Date.now() + IP_LOCATION_CACHE_TTL_MS });
}

function toLocationString(city?: string | null, region?: string | null, country?: string | null): string | null {
  const parts = [city, region, country].map((x) => (x ? String(x).trim() : '')).filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

async function lookupIpLocation(ip: string): Promise<IpLocation> {
  const cached = cacheGet(ip);
  if (cached) return cached;

  if (isPrivateIp(ip)) {
    const v = { ip, location: 'Private network' };
    cacheSet(ip, v);
    return v;
  }

  // Best-effort public IP geolocation. If it fails, we return null location.
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      const v = { ip, location: null };
      cacheSet(ip, v);
      return v;
    }
    const data: any = await res.json();
    // ipapi.co returns { error: true, reason, message } on failure
    if (data?.error) {
      const v = { ip, location: null };
      cacheSet(ip, v);
      return v;
    }
    const location = toLocationString(data?.city, data?.region, data?.country_name) ?? null;
    const v = { ip, location };
    cacheSet(ip, v);
    return v;
  } catch {
    const v = { ip, location: null };
    cacheSet(ip, v);
    return v;
  }
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function ymd(d: Date): string {
  // Always return YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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

      // Enrich with email (read-only) for UI display.
      const userIds = Array.from(new Set(logs.map((l) => l.userId).filter(Boolean)));
      const users = userIds.length
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true },
          })
        : [];
      const emailByUserId = new Map(users.map((u) => [u.id, u.email]));

      res.json({
        logs: logs.map((l) => ({ ...l, email: emailByUserId.get(l.userId) ?? null })),
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

/**
 * GET /api/admin/audit/login-trend?days=7|30|90
 * Time-series of login_success and login_failure counts by date.
 */
router.get(
  '/login-trend',
  authenticate,
  authorize(UserRole.ADMIN),
  [query('days').optional().isInt({ min: 1, max: 90 }).toInt()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const days = Math.min(Number(req.query.days) || 7, 90);
      const today = startOfDay(new Date());
      const since = startOfDay(new Date());
      since.setDate(since.getDate() - (days - 1));

      // Postgres: group by date-truncated createdAt.
      const rows = await prisma.$queryRaw<Array<{ day: Date; actionType: string; count: bigint }>>`
        SELECT date_trunc('day', "createdAt")::date AS day,
               "actionType" AS "actionType",
               COUNT(*)::bigint AS count
        FROM access_logs
        WHERE "createdAt" >= ${since}
          AND "createdAt" < ${new Date(today.getTime() + 24 * 60 * 60 * 1000)}
          AND "actionType" IN ('login_success', 'login_failure')
        GROUP BY 1, 2
        ORDER BY 1 ASC;
      `;

      const byDay: Record<string, { success: number; failure: number }> = {};
      for (let i = 0; i < days; i++) {
        const d = new Date(since);
        d.setDate(since.getDate() + i);
        byDay[ymd(d)] = { success: 0, failure: 0 };
      }

      for (const r of rows) {
        const key = ymd(new Date(r.day));
        const n = Number(r.count ?? 0);
        if (!byDay[key]) byDay[key] = { success: 0, failure: 0 };
        if (r.actionType === 'login_success') byDay[key].success += n;
        if (r.actionType === 'login_failure') byDay[key].failure += n;
      }

      const series = Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, success: v.success, failure: v.failure }));

      return res.json({ since: since.toISOString(), days, series });
    } catch {
      return res.status(500).json({ error: 'Failed to fetch login trend' });
    }
  }
);

/**
 * GET /api/admin/audit/action-distribution?days=7|30|90
 * Counts of security audit events grouped by actionType and entityType (for stacked bars).
 */
router.get(
  '/action-distribution',
  authenticate,
  authorize(UserRole.ADMIN),
  [query('days').optional().isInt({ min: 1, max: 90 }).toInt()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const days = Math.min(Number(req.query.days) || 7, 90);
      const since = startOfDay(new Date());
      since.setDate(since.getDate() - (days - 1));

      const rows = await prisma.$queryRaw<Array<{ actionType: string; entityType: string | null; count: bigint }>>`
        SELECT "actionType" AS "actionType",
               COALESCE("entityType", 'Other') AS "entityType",
               COUNT(*)::bigint AS count
        FROM security_audit_logs
        WHERE "createdAt" >= ${since}
          AND "actionType" IN (${Prisma.join(ACTION_TYPES_FOR_DISTRIBUTION as unknown as string[])})
        GROUP BY 1, 2
        ORDER BY 1 ASC;
      `;

      const series = rows.map((r) => ({
        actionType: r.actionType,
        entityType: r.entityType ?? 'Other',
        count: Number(r.count ?? 0),
      }));

      return res.json({ since: since.toISOString(), days, series });
    } catch {
      return res.status(500).json({ error: 'Failed to fetch action distribution' });
    }
  }
);

/**
 * GET /api/admin/audit/ip-locations?ips=1.1.1.1,8.8.8.8
 * Best-effort IP -> location resolution (cached). Admin-only.
 */
router.get(
  '/ip-locations',
  authenticate,
  authorize(UserRole.ADMIN),
  [query('ips').optional().isString()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const ipsRaw = typeof req.query.ips === 'string' ? req.query.ips : '';
      const ips = Array.from(
        new Set(
          ipsRaw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 60)
        )
      );

      if (!ips.length) return res.json({ locations: {} });

      const results = await Promise.all(ips.map((ip) => lookupIpLocation(ip)));
      const locations: Record<string, { location: string | null }> = {};
      for (const r of results) locations[r.ip] = { location: r.location };

      return res.json({ locations });
    } catch {
      return res.status(500).json({ error: 'Failed to resolve IP locations' });
    }
  }
);

export default router;
