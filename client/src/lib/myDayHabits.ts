/**
 * My Day Phase 2 — habit helpers (coach mark, journal nudge, local usage counters).
 * Per-user localStorage only; no server analytics in this slice.
 */
import { setLocalStorageItem } from './safeLocalStorage'

const COACH_KEY = 'rayenna_myday_coach_seen_v1'
const JOURNAL_NUDGE_KEY = 'rayenna_myday_journal_nudge_dismissed'
const USAGE_KEY = 'rayenna_myday_usage_v1'

export type MyDayUsageEvent = 'drawer_open' | 'pin_hit_list' | 'pin_suggestion' | 'task_added'

export type MyDayUsageStats = {
  drawerOpens: number
  pinsFromHitList: number
  pinsFromSuggestion: number
  tasksAdded: number
  lastEventAt: string | null
}

function userKey(base: string, userId: string): string {
  return `${base}_${userId}`
}

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Coach mark ───────────────────────────────────────────────────────────────

export function isMyDayCoachDismissed(userId: string): boolean {
  return readJson<{ seen: boolean }>(userKey(COACH_KEY, userId))?.seen === true
}

export function dismissMyDayCoach(userId: string): void {
  setLocalStorageItem(userKey(COACH_KEY, userId), JSON.stringify({ seen: true, at: new Date().toISOString() }))
}

export function shouldShowMyDayCoach(userId: string | undefined): boolean {
  if (!userId) return false
  return !isMyDayCoachDismissed(userId)
}

// ── Journal nudge (4:30pm+) ──────────────────────────────────────────────────

/** Local time — show after 16:30, hide after 21:00. */
export function isMyDayJournalNudgeWindow(now = new Date()): boolean {
  const mins = now.getHours() * 60 + now.getMinutes()
  return mins >= 16 * 60 + 30 && mins < 21 * 60
}

export function isJournalNudgeDismissedToday(userId: string): boolean {
  const entry = readJson<{ date: string }>(userKey(JOURNAL_NUDGE_KEY, userId))
  return entry?.date === todayDateStr()
}

export function dismissJournalNudgeToday(userId: string): void {
  setLocalStorageItem(userKey(JOURNAL_NUDGE_KEY, userId), JSON.stringify({ date: todayDateStr() }))
}

export function shouldShowJournalNudge(args: {
  userId: string | undefined
  journalStarted: boolean
  drawerOpen: boolean
  activeTab?: string
}): boolean {
  const { userId, journalStarted, drawerOpen, activeTab } = args
  if (!userId) return false
  if (journalStarted) return false
  if (isJournalNudgeDismissedToday(userId)) return false
  if (!isMyDayJournalNudgeWindow()) return false
  if (drawerOpen && activeTab === 'journal') return false
  return true
}

// ── Usage (local counters) ───────────────────────────────────────────────────

function defaultUsage(): MyDayUsageStats {
  return {
    drawerOpens: 0,
    pinsFromHitList: 0,
    pinsFromSuggestion: 0,
    tasksAdded: 0,
    lastEventAt: null,
  }
}

export function getMyDayUsageStats(userId: string): MyDayUsageStats {
  return readJson<MyDayUsageStats>(userKey(USAGE_KEY, userId)) ?? defaultUsage()
}

export function recordMyDayUsage(userId: string, event: MyDayUsageEvent): void {
  const stats = getMyDayUsageStats(userId)
  const now = new Date().toISOString()
  switch (event) {
    case 'drawer_open':
      stats.drawerOpens += 1
      break
    case 'pin_hit_list':
      stats.pinsFromHitList += 1
      break
    case 'pin_suggestion':
      stats.pinsFromSuggestion += 1
      break
    case 'task_added':
      stats.tasksAdded += 1
      break
    default:
      break
  }
  stats.lastEventAt = now
  setLocalStorageItem(userKey(USAGE_KEY, userId), JSON.stringify(stats))
}
