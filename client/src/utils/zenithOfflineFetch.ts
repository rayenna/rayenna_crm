import { isTimeoutOrNetworkError } from './axios'
import {
  getZenithQuerySnapshot,
  saveZenithQuerySnapshot,
  tagZenithOfflineSnapshot,
} from './zenithOfflineCache'

export function isZenithOfflineFetchError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  return isTimeoutOrNetworkError(error)
}

/** Fetch Zenith/dashboard data; on network failure return last successful snapshot if any. */
export async function fetchZenithWithOfflineCache<T extends Record<string, unknown>>(
  cacheKey: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const data = await fetcher()
    await saveZenithQuerySnapshot(cacheKey, data)
    return data
  } catch (error) {
    if (!isZenithOfflineFetchError(error)) throw error
    const snap = await getZenithQuerySnapshot(cacheKey)
    if (snap?.data && typeof snap.data === 'object') {
      return tagZenithOfflineSnapshot(snap.data as T, snap.savedAt)
    }
    throw error
  }
}
