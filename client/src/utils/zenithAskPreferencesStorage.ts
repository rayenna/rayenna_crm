/**
 * Zenith Ask preferences — local cache; server is source of truth (cross-device).
 */
import { reportStorageFailure } from '../lib/safeLocalStorage'

export const ASK_DEFAULT_PERIODS = [
  'current_fy',
  'current_quarter',
  'current_month',
  'last_fy',
  'last_quarter',
  'all_time',
] as const

export type AskDefaultPeriod = (typeof ASK_DEFAULT_PERIODS)[number]

export type ZenithAskPreferences = {
  defaultPeriod: AskDefaultPeriod
  favoriteQuestions: string[]
}

export const DEFAULT_ASK_PREFERENCES: ZenithAskPreferences = {
  defaultPeriod: 'current_fy',
  favoriteQuestions: [],
}

const STORAGE_KEY = 'rayenna_zenith_ask_prefs_v1'
const FAVORITE_MAX = 8

function userKey(userId: string): string {
  return `${STORAGE_KEY}_${userId}`
}

export function isAskDefaultPeriod(v: unknown): v is AskDefaultPeriod {
  return typeof v === 'string' && (ASK_DEFAULT_PERIODS as readonly string[]).includes(v)
}

export function normalizeAskPreferences(raw: unknown): ZenithAskPreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ASK_PREFERENCES }
  const o = raw as Record<string, unknown>
  const defaultPeriod = isAskDefaultPeriod(o.defaultPeriod)
    ? o.defaultPeriod
    : DEFAULT_ASK_PREFERENCES.defaultPeriod
  const favorites = Array.isArray(o.favoriteQuestions)
    ? o.favoriteQuestions
        .filter((q): q is string => typeof q === 'string')
        .map((q) => q.trim().replace(/\s+/g, ' '))
        .filter((q) => q.length >= 4 && q.length <= 160)
    : []
  const seen = new Set<string>()
  const favoriteQuestions: string[] = []
  for (const q of favorites) {
    const key = q.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    favoriteQuestions.push(q)
    if (favoriteQuestions.length >= FAVORITE_MAX) break
  }
  return { defaultPeriod, favoriteQuestions }
}

export function readZenithAskPreferences(
  userId: string | undefined | null,
): ZenithAskPreferences {
  if (!userId || typeof localStorage === 'undefined') return { ...DEFAULT_ASK_PREFERENCES }
  try {
    const raw = localStorage.getItem(userKey(userId))
    if (!raw) return { ...DEFAULT_ASK_PREFERENCES }
    return normalizeAskPreferences(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_ASK_PREFERENCES }
  }
}

export function writeZenithAskPreferences(
  userId: string | undefined | null,
  prefs: ZenithAskPreferences,
): void {
  if (!userId || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(userKey(userId), JSON.stringify(normalizeAskPreferences(prefs)))
  } catch (error) {
    reportStorageFailure(userKey(userId), error)
  }
}

export function mergeFavoriteAskChips(
  favorites: string[],
  roleChips: string[],
  limit = 8,
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const q of [...favorites, ...roleChips]) {
    const t = q.trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
    if (out.length >= limit) break
  }
  return out
}

export const ASK_DEFAULT_PERIOD_LABELS: Record<AskDefaultPeriod, string> = {
  current_fy: 'This FY',
  current_quarter: 'This quarter',
  current_month: 'This month',
  last_fy: 'Last FY',
  last_quarter: 'Last quarter',
  all_time: 'All time',
}
