import { apiBaseUrl } from '@/utils/axios'

export const HUB_HEALTH_PROBE_MS = 3_000

const isProdHost =
  typeof window !== 'undefined' && !window.location.hostname.includes('localhost')

export function isHubProdApiConfigured(): boolean {
  return isProdHost && Boolean(apiBaseUrl)
}

/** Quick unauthenticated probe — used before login and before session restore. */
export async function probeHubHealthOk(
  baseUrl: string = apiBaseUrl,
  timeoutMs = HUB_HEALTH_PROBE_MS,
): Promise<boolean> {
  if (!baseUrl) return !isProdHost
  const url = `${baseUrl.replace(/\/$/, '')}/api/health`
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
