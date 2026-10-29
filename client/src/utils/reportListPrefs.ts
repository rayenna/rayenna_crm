import { useEffect, useState } from 'react'
import { setSessionStorageItem } from '../lib/safeLocalStorage'

/** sessionStorage keys — same pattern as Projects list filters (survive view → back). */
export const REPORT_FILTERS_KEYS = {
  salesReview: 'rayenna_sales_review_filters',
  funnelVelocity: 'rayenna_funnel_velocity_filters',
  deliveryControl: 'rayenna_delivery_control_filters',
  collectionsCash: 'rayenna_collections_cash_filters',
  marginMix: 'rayenna_margin_mix_filters',
} as const

function readSessionJson(key: string): unknown {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

/** Keep known keys; ignore junk so an old stored blob cannot break the page. */
export function mergeReportPrefs<T extends Record<string, unknown>>(defaults: T, saved: unknown): T {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return { ...defaults }
  const src = saved as Record<string, unknown>
  const out = { ...defaults }
  for (const key of Object.keys(defaults) as Array<keyof T>) {
    const fallback = defaults[key]
    const next = src[key as string]
    if (next === undefined) continue
    if (typeof fallback === 'string') {
      if (typeof next !== 'string') continue
      if (fallback === 'asc' || fallback === 'desc') {
        if (next === 'asc' || next === 'desc') out[key] = next as T[keyof T]
        continue
      }
      out[key] = next as T[keyof T]
      continue
    }
    if (typeof fallback === 'boolean' && typeof next === 'boolean') {
      out[key] = next as T[keyof T]
      continue
    }
    if (Array.isArray(fallback) && isStringArray(next)) {
      out[key] = next as T[keyof T]
    }
  }
  return out
}

export function usePersistedReportPrefs<T extends Record<string, unknown>>(
  storageKey: string,
  defaults: T,
): [T, (patch: Partial<T>) => void] {
  const [state, setState] = useState<T>(() => mergeReportPrefs(defaults, readSessionJson(storageKey)))

  useEffect(() => {
    setSessionStorageItem(storageKey, JSON.stringify(state))
  }, [storageKey, state])

  const patch = (next: Partial<T>) => {
    setState((prev) => ({ ...prev, ...next }))
  }

  return [state, patch]
}
