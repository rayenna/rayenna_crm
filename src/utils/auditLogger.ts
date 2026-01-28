/**
 * Admin Audit & Security — async fire-and-forget logging.
 * Never awaited in request path; failures are swallowed (no console, no throw).
 */
import prisma from '../prisma';

function getClientMeta(req?: { ip?: string; get?: (k: string) => string; headers?: Record<string, string | string[] | undefined> }): { ip?: string; userAgent?: string } {
  if (!req) return {};
  const ip = (req as any).ip ?? req.get?.('x-forwarded-for')?.split(',')[0]?.trim() ?? req.get?.('x-real-ip') ?? undefined;
  const ua = req.get?.('user-agent') ?? (req.headers?.['user-agent'] as string);
  return { ip, userAgent: ua ? String(ua).slice(0, 500) : undefined };
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
  req?: { ip?: string; get?: (k: string) => string; headers?: Record<string, string | string[] | undefined> };
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
  req?: { ip?: string; get?: (k: string) => string; headers?: Record<string, string | string[] | undefined> };
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
