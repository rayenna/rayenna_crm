import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

// In-memory fallback (single process / if DB rate table unavailable)
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

function clientKey(req: Request): string {
  return req.consumer?.id || req.user?.id || req.ip || 'anonymous';
}

/**
 * In-memory rate limiting (per process). Prefer sharedRateLimit for auth.
 */
export const rateLimit = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.path}:${clientKey(req)}`;
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    store[key].count += 1;

    if (store[key].count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
      });
    }

    next();
  };
};

/**
 * Neon-backed rate limit shared across API instances (login / password reset).
 * Falls back to in-memory if the DB write fails so auth is not bricked.
 */
export const sharedRateLimit = (maxRequests: number, windowMs: number) => {
  const memoryFallback = rateLimit(maxRequests, windowMs);

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.path}:${clientKey(req)}`;
    const now = new Date();
    const resetAt = new Date(now.getTime() + windowMs);

    try {
      const rows = await prisma.$queryRaw<Array<{ count: number; reset_at: Date }>>`
        INSERT INTO rate_limit_buckets (key, count, reset_at, updated_at)
        VALUES (${key}, 1, ${resetAt}, ${now})
        ON CONFLICT (key) DO UPDATE SET
          count = CASE
            WHEN rate_limit_buckets.reset_at < ${now} THEN 1
            ELSE rate_limit_buckets.count + 1
          END,
          reset_at = CASE
            WHEN rate_limit_buckets.reset_at < ${now} THEN ${resetAt}
            ELSE rate_limit_buckets.reset_at
          END,
          updated_at = ${now}
        RETURNING count, reset_at
      `;

      const row = rows[0];
      if (row && Number(row.count) > maxRequests) {
        const retryAfter = Math.max(
          1,
          Math.ceil((new Date(row.reset_at).getTime() - now.getTime()) / 1000),
        );
        return res.status(429).json({
          error: 'Too many requests. Please try again later.',
          retryAfter,
        });
      }
      return next();
    } catch (err) {
      console.warn('[rateLimit] shared store unavailable, using in-memory:', (err as Error)?.message);
      return memoryFallback(req, res, next);
    }
  };
};
