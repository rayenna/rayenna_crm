import { useCallback, useEffect, useState } from 'react'
import { calendarYmdInTimeZone } from '../utils/istCalendar'
import { setLocalStorageItem } from '../lib/safeLocalStorage'

/** Legacy key from before per-user + IST dating — still honoured for today. */
export const BRIEFING_DISMISSED_LEGACY_KEY = 'zenith_briefing_dismissed_date'

export function briefingStorageKey(userId: string): string {
  return `zenith_briefing_dismissed_date:${userId}`
}

export function briefingTodayYmd(now = new Date()): string {
  return calendarYmdInTimeZone(now)
}

export function shouldAutoOpenBriefing(dismissedYmd: string | null, todayYmd: string): boolean {
  return dismissedYmd !== todayYmd
}

function readLocal(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function removeLocal(key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function readBriefingDismissedYmd(userId: string): string | null {
  return readLocal(briefingStorageKey(userId)) ?? readLocal(BRIEFING_DISMISSED_LEGACY_KEY)
}

export function rememberBriefingDismissedToday(userId: string, now = new Date()): void {
  const today = briefingTodayYmd(now)
  setLocalStorageItem(briefingStorageKey(userId), today)
  // Keep legacy key in sync so an older tab still sees today's dismiss.
  setLocalStorageItem(BRIEFING_DISMISSED_LEGACY_KEY, today)
}

export function forgetBriefingDismissedToday(userId: string, now = new Date()): void {
  const today = briefingTodayYmd(now)
  if (readLocal(briefingStorageKey(userId)) === today) {
    removeLocal(briefingStorageKey(userId))
  }
  if (readLocal(BRIEFING_DISMISSED_LEGACY_KEY) === today) {
    removeLocal(BRIEFING_DISMISSED_LEGACY_KEY)
  }
}

export function useDailyBriefing(userId?: string | null) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!userId) return
    const today = briefingTodayYmd()
    const dismissedDate = readBriefingDismissedYmd(userId)
    if (!shouldAutoOpenBriefing(dismissedDate, today)) return
    const t = window.setTimeout(() => setIsVisible(true), 800)
    return () => window.clearTimeout(t)
  }, [userId])

  const rememberToday = useCallback(
    (on: boolean) => {
      if (!userId) return
      if (on) rememberBriefingDismissedToday(userId)
      else forgetBriefingDismissedToday(userId)
    },
    [userId],
  )

  const dismiss = useCallback(
    (dontShowToday = false) => {
      if (dontShowToday && userId) rememberBriefingDismissedToday(userId)
      setIsVisible(false)
    },
    [userId],
  )

  const showBriefing = useCallback(() => setIsVisible(true), [])

  return { isVisible, dismiss, rememberToday, showBriefing }
}
