/**
 * Per-user Zenith Weighted pipeline UI prefs (localStorage only — deal data stays on server).
 */
import { reportStorageFailure } from '../lib/safeLocalStorage'
import type { ForecastBand, ForecastBreakdownDimension, ForecastTiming } from './revenueForecast'

const STORAGE_KEY = 'rayenna_zenith_forecast_prefs_v1'

export type ZenithForecastPrefs = {
  band: ForecastBand
  timing: ForecastTiming
  activeTab: ForecastBreakdownDimension
  adjustOpen: boolean
}

const DEFAULTS: ZenithForecastPrefs = {
  band: 'all',
  timing: 'all',
  activeTab: 'source',
  adjustOpen: false,
}

function userKey(userId: string): string {
  return `${STORAGE_KEY}_${userId}`
}

const BANDS: ForecastBand[] = ['all', 'early', 'committed']
const TIMINGS: ForecastTiming[] = ['all', 'month', 'quarter', 'rest_of_fy']
const TABS: ForecastBreakdownDimension[] = ['source', 'sales', 'segment', 'stage']

function isBand(v: unknown): v is ForecastBand {
  return typeof v === 'string' && BANDS.includes(v as ForecastBand)
}

function isTiming(v: unknown): v is ForecastTiming {
  return typeof v === 'string' && TIMINGS.includes(v as ForecastTiming)
}

function isTab(v: unknown): v is ForecastBreakdownDimension {
  return typeof v === 'string' && TABS.includes(v as ForecastBreakdownDimension)
}

export function readZenithForecastPrefs(userId: string | undefined | null): ZenithForecastPrefs {
  if (!userId || typeof localStorage === 'undefined') return { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(userKey(userId))
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<ZenithForecastPrefs>
    return {
      band: isBand(parsed.band) ? parsed.band : DEFAULTS.band,
      timing: isTiming(parsed.timing) ? parsed.timing : DEFAULTS.timing,
      activeTab: isTab(parsed.activeTab) ? parsed.activeTab : DEFAULTS.activeTab,
      adjustOpen: typeof parsed.adjustOpen === 'boolean' ? parsed.adjustOpen : DEFAULTS.adjustOpen,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function writeZenithForecastPrefs(
  userId: string | undefined | null,
  prefs: ZenithForecastPrefs,
): void {
  if (!userId || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(userKey(userId), JSON.stringify(prefs))
  } catch (error) {
    reportStorageFailure(userKey(userId), error)
  }
}
