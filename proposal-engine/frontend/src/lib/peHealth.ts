import { getApiBaseUrl } from './api/core'

export const PE_HEALTH_PROBE_MS = 3_000

const isProdHost =
  typeof window !== 'undefined' && !window.location.hostname.includes('localhost')

/** Production share links always hit the CRM API via VITE_API_BASE_URL. */
export function isPeProdApiConfigured(): boolean {
  return isProdHost && Boolean(getApiBaseUrl())
}

/** Quick unauthenticated probe — used before loading a shared proposal. */
export async function probePeHealthOk(
  baseUrl: string = getApiBaseUrl(),
  timeoutMs = PE_HEALTH_PROBE_MS,
): Promise<boolean> {
  // Local Vite proxies /api → :3000 when base is empty.
  const root = (baseUrl || '').replace(/\/$/, '')
  const url = `${root}/api/health`
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal, cache: 'no-store' })
    return res.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}
