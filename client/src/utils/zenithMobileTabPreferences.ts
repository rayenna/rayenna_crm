/**
 * Remember last Zenith mobile bottom tab per user (UX only).
 */
import { reportStorageFailure } from '../lib/safeLocalStorage'
import type { ZenithMobileTab } from '../components/zenith/zenithMobileNav'

const STORAGE_KEY = 'rayenna_zenith_mobile_tab_v1'

const VALID: ZenithMobileTab[] = ['overview', 'pipeline', 'charts', 'more']

function userKey(userId: string): string {
  return `${STORAGE_KEY}_${userId}`
}

export function readZenithMobileTab(userId: string | undefined | null): ZenithMobileTab | null {
  if (!userId || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(userKey(userId))
    if (!raw) return null
    const tab = raw as ZenithMobileTab
    return VALID.includes(tab) ? tab : null
  } catch {
    return null
  }
}

export function writeZenithMobileTab(userId: string | undefined | null, tab: ZenithMobileTab): void {
  if (!userId || typeof localStorage === 'undefined') return
  if (!VALID.includes(tab)) return
  try {
    localStorage.setItem(userKey(userId), tab)
  } catch (error) {
    reportStorageFailure(userKey(userId), error)
  }
}
