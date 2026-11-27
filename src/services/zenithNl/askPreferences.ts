/**
 * Cross-device Zenith Ask preferences (default period + favorite chips).
 */
import type { Prisma } from '@prisma/client';
import prisma from '../../prisma';

export const ASK_DEFAULT_PERIODS = [
  'current_fy',
  'current_quarter',
  'current_month',
  'last_fy',
  'last_quarter',
  'all_time',
] as const;

export type AskDefaultPeriod = (typeof ASK_DEFAULT_PERIODS)[number];

export type ZenithAskPreferences = {
  /** Applied when command bar is empty and the question has no relative period. */
  defaultPeriod: AskDefaultPeriod;
  /** Exact chip phrases (max 8), prepended on Zenith / Dock. */
  favoriteQuestions: string[];
};

export const DEFAULT_ASK_PREFERENCES: ZenithAskPreferences = {
  defaultPeriod: 'current_fy',
  favoriteQuestions: [],
};

const FAVORITE_MAX = 8;

export function isAskDefaultPeriod(v: unknown): v is AskDefaultPeriod {
  return typeof v === 'string' && (ASK_DEFAULT_PERIODS as readonly string[]).includes(v);
}

export function normalizeAskPreferences(raw: unknown): ZenithAskPreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ASK_PREFERENCES };
  const o = raw as Record<string, unknown>;
  const defaultPeriod = isAskDefaultPeriod(o.defaultPeriod)
    ? o.defaultPeriod
    : DEFAULT_ASK_PREFERENCES.defaultPeriod;
  const favorites = Array.isArray(o.favoriteQuestions)
    ? o.favoriteQuestions
        .filter((q): q is string => typeof q === 'string')
        .map((q) => q.trim().replace(/\s+/g, ' '))
        .filter((q) => q.length >= 4 && q.length <= 160)
    : [];
  const seen = new Set<string>();
  const favoriteQuestions: string[] = [];
  for (const q of favorites) {
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    favoriteQuestions.push(q);
    if (favoriteQuestions.length >= FAVORITE_MAX) break;
  }
  return { defaultPeriod, favoriteQuestions };
}

export async function getUserAskPreferences(userId: string): Promise<ZenithAskPreferences> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { askPreferences: true },
  });
  return normalizeAskPreferences(row?.askPreferences ?? null);
}

export async function upsertUserAskPreferences(
  userId: string,
  patch: Partial<ZenithAskPreferences>,
): Promise<ZenithAskPreferences> {
  const current = await getUserAskPreferences(userId);
  const next = normalizeAskPreferences({
    defaultPeriod: patch.defaultPeriod ?? current.defaultPeriod,
    favoriteQuestions:
      patch.favoriteQuestions !== undefined
        ? patch.favoriteQuestions
        : current.favoriteQuestions,
  });
  await prisma.user.update({
    where: { id: userId },
    data: { askPreferences: next as Prisma.InputJsonValue },
  });
  return next;
}

/** Merge favorites ahead of role chips (dedupe case-insensitive). */
export function mergeFavoriteAskChips(
  favorites: string[],
  roleChips: string[],
  limit = 8,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const q of [...favorites, ...roleChips]) {
    const t = q.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}
