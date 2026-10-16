/**
 * Persist Zenith Ask history per user (same browser). Cross-device sync is out of scope for this slice.
 */
import { reportStorageFailure } from '../lib/safeLocalStorage'
import type { ZenithAskHistoryItem } from '../types/zenithNlQuery'

const STORAGE_KEY = 'rayenna_zenith_ask_history_v1'
const MAX_ITEMS = 12

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
    return parsed.filter(isHistoryItem).slice(0, MAX_ITEMS)
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
    localStorage.setItem(userKey(userId), JSON.stringify(items.slice(0, MAX_ITEMS)))
  } catch (error) {
    reportStorageFailure(userKey(userId), error)
  }
}
