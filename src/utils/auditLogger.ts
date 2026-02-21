/**
 * Admin Audit & Security — async fire-and-forget logging.
 * Never awaited in request path; failures are swallowed (no console, no throw).
 */
import type { Request } from 'express';
import prisma from '../prisma';

function getClientMeta(req?: Request): { ip?: string; userAgent?: string } {
  if (!req) return {};
  const forwarded = req.get('x-forwarded-for');
  const ip = (req as Request & { ip?: string }).ip ?? (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ?? req.get('x-real-ip') ?? undefined;
  const ua = req.get('user-agent');
  const uaStr = ua != null ? String(ua).slice(0, 500) : undefined;
  return { ip, userAgent: uaStr };
}

function run(fn: () => Promise<void>): void {
  (async () => {
    try {
      await fn();
    } catch {
      /* fail silently; no console */
    }
  })();
}

export interface AccessLogPayload {
  userId?: string | null;
  email?: string | null;
  role?: string | null;
  actionType: 'login_success' | 'login_failure' | 'auth_failure';
  success?: boolean;
  req?: Request;
}

export function logAccess(payload: AccessLogPayload): void {
  const { ip, userAgent } = getClientMeta(payload.req);
  run(async () => {
    await prisma.accessLog.create({
      data: {
        userId: payload.userId ?? null,
        email: payload.email ?? null,
        role: payload.role ?? null,
        actionType: payload.actionType,
        success: payload.success ?? null,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      },
    });
  });
}

export interface SecurityAuditPayload {
  userId: string;
  role: string;
  actionType: string;
  entityType?: string | null;
  entityId?: string | null;
  summary?: string | null;
  req?: Request;
}

export function logSecurityAudit(payload: SecurityAuditPayload): void {
  const { ip, userAgent } = getClientMeta(payload.req);
  run(async () => {
    await prisma.securityAuditLog.create({
      data: {
        userId: payload.userId,
        role: payload.role,
        actionType: payload.actionType,
        entityType: payload.entityType ?? null,
        entityId: payload.entityId ?? null,
        summary: payload.summary ?? null,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      },
    });
  });
}
