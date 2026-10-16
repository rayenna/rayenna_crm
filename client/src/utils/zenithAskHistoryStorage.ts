/**
 * Zenith Ask history — local cache + server hydrate for cross-device continuity.
 */
import { reportStorageFailure } from '../lib/safeLocalStorage'
import type { ZenithAskHistoryItem } from '../types/zenithNlQuery'

const STORAGE_KEY = 'rayenna_zenith_ask_history_v1'
export const ZENITH_ASK_HISTORY_MAX = 12

function userKey(userId: string): string {
  return `${STORAGE_KEY}_${userId}`
}

function isHistoryItem(v: unknown): v is ZenithAskHistoryItem {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.question === 'string' &&
    typeof o.insight === 'string' &&
    typeof o.metric === 'string' &&
    typeof o.at === 'number'
  )
}

export function readZenithAskHistory(userId: string | undefined | null): ZenithAskHistoryItem[] {
  if (!userId || typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(userKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isHistoryItem).slice(0, ZENITH_ASK_HISTORY_MAX)
  } catch {
    return []
  }
}

export function writeZenithAskHistory(
  userId: string | undefined | null,
  items: ZenithAskHistoryItem[],
): void {
  if (!userId || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(userKey(userId), JSON.stringify(items.slice(0, ZENITH_ASK_HISTORY_MAX)))
  } catch (error) {
    reportStorageFailure(userKey(userId), error)
  }
}

/**
 * Merge local cache with server rows. Newest first; dedupe by question
 * (prefer newer `at`, then prefer server id when timestamps tie).
 */
export function mergeZenithAskHistory(
  local: ZenithAskHistoryItem[],
  server: ZenithAskHistoryItem[],
): ZenithAskHistoryItem[] {
  const byQuestion = new Map<string, ZenithAskHistoryItem>()
  for (const item of [...server, ...local]) {
    if (!isHistoryItem(item)) continue
    const q = item.question.trim()
    if (!q) continue
    const prev = byQuestion.get(q)
    if (!prev || item.at > prev.at) {
      byQuestion.set(q, item)
    }
  }
  return Array.from(byQuestion.values())
    .sort((a, b) => b.at - a.at)
    .slice(0, ZENITH_ASK_HISTORY_MAX)
}
