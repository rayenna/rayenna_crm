const DB_NAME = 'zenith-offline'
const DB_VERSION = 1
const STORE = 'query-snapshots'

export type ZenithQuerySnapshot = {
  key: string
  data: unknown
  savedAt: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function zenithQueryCacheKey(parts: readonly unknown[]): string {
  return JSON.stringify(parts)
}

export async function saveZenithQuerySnapshot(key: string, data: unknown): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const record: ZenithQuerySnapshot = {
      key,
      data,
      savedAt: new Date().toISOString(),
    }
    const req = store.put(record)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getZenithQuerySnapshot(key: string): Promise<ZenithQuerySnapshot | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req = store.get(key)
    req.onsuccess = () => resolve((req.result as ZenithQuerySnapshot | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export const ZENITH_OFFLINE_SNAPSHOT_FLAG = '__zenithOfflineSnapshot'
export const ZENITH_OFFLINE_SNAPSHOT_AT = '__zenithSnapshotAt'

export function tagZenithOfflineSnapshot<T extends Record<string, unknown>>(
  data: T,
  savedAt: string,
): T & { __zenithOfflineSnapshot: true; __zenithSnapshotAt: string } {
  return {
    ...data,
    [ZENITH_OFFLINE_SNAPSHOT_FLAG]: true as const,
    [ZENITH_OFFLINE_SNAPSHOT_AT]: savedAt,
  }
}

export function stripZenithOfflineSnapshotMeta(
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {}
  const out = { ...data }
  delete out[ZENITH_OFFLINE_SNAPSHOT_FLAG]
  delete out[ZENITH_OFFLINE_SNAPSHOT_AT]
  return out
}

export function isZenithOfflineSnapshotPayload(
  data: Record<string, unknown> | null | undefined,
): boolean {
  return Boolean(data?.[ZENITH_OFFLINE_SNAPSHOT_FLAG])
}
