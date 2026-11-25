import { UserRole } from '@prisma/client';

export type AuthSessionUser = {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  tokenVersion: number;
};

type CacheEntry = AuthSessionUser & { expiresAt: number };

/** Short TTL — cuts DB hits on parallel Zenith/dashboard fan-out without stale sessions. */
const AUTH_SESSION_CACHE_TTL_MS = 30_000;

const cache = new Map<string, CacheEntry>();

export function getCachedAuthSession(userId: string): AuthSessionUser | null {
  const entry = cache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(userId);
    return null;
  }
  return {
    id: entry.id,
    email: entry.email,
    role: entry.role,
    isActive: entry.isActive,
    tokenVersion: entry.tokenVersion,
  };
}

export function setCachedAuthSession(user: AuthSessionUser): void {
  cache.set(user.id, {
    ...user,
    expiresAt: Date.now() + AUTH_SESSION_CACHE_TTL_MS,
  });
}

/** Call whenever isActive / tokenVersion / role may change for a user. */
export function invalidateAuthSessionCache(userId?: string): void {
  if (userId) {
    cache.delete(userId);
    return;
  }
  cache.clear();
}
