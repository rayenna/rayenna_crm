/**
 * Once-per-calendar-day intro highlight for Zenith “Things needing attention”.
 * Per-user localStorage only — resets next day so login mornings get the pulse again.
 */
import { reportStorageFailure } from '../lib/safeLocalStorage'

const STORAGE_KEY = 'rayenna_zenith_attention_intro_v1'

function userKey(userId: string): string {
  return `${STORAGE_KEY}_${userId}`
}

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function shouldPlayZenithAttentionIntro(userId: string): boolean {
  if (!userId) return false
  try {
    if (typeof localStorage === 'undefined') return false
    const raw = localStorage.getItem(userKey(userId))
    if (!raw) return true
    const parsed = JSON.parse(raw) as { date?: string }
    return parsed.date !== todayDateStr()
  } catch {
    return true
  }
}

export function markZenithAttentionIntroPlayed(userId: string): void {
  if (!userId) return
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(userKey(userId), JSON.stringify({ date: todayDateStr() }))
  } catch (error) {
    reportStorageFailure(userKey(userId), error)
  }
}
