import { buildAbsoluteApiUrl } from './axios'

const PROBE_TIMEOUT_MS = 4500

/**
 * Real reachability check — mobile browsers often keep `navigator.onLine === true` on flaky LTE/Wi‑Fi.
 */
export async function probeZenithReachability(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false
  }
  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    const res = await fetch(buildAbsoluteApiUrl('/api/health'), {
      method: 'HEAD',
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    })
    window.clearTimeout(timer)
    return res.ok
  } catch {
    return false
  }
}
