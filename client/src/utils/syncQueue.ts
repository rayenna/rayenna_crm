const DB_NAME = 'zenith-sync-queue'
const DB_VERSION = 1
const STORE_NAME = 'pending-actions'

export type SyncActionType = 'STAGE_CHANGE' | 'LOG_NOTE' | 'UPDATE_VALUE' | 'UPDATE_DATE'

export type QueuedAction = {
  id?: number
  type: SyncActionType
  projectId: string
  payload: unknown
  endpoint: string
  method: 'PUT' | 'POST' | 'PATCH'
  timestamp: string
  status: 'pending' | 'syncing' | 'done' | 'error'
  retries: number
}

const MAX_AUTO_RETRIES = 8

export const ZENITH_SYNC_QUEUE_CHANGED = 'zenith:sync-queue:changed'

export function notifySyncQueueChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(ZENITH_SYNC_QUEUE_CHANGED))
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        store.createIndex('timestamp', 'timestamp')
        store.createIndex('status', 'status')
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueueAction(
  action: Omit<QueuedAction, 'timestamp' | 'status' | 'retries' | 'id'>,
): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.add({
      ...action,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retries: 0,
    } as QueuedAction)
    req.onsuccess = () => {
      notifySyncQueueChanged()
      resolve(req.result as number)
    }
    req.onerror = () => reject(req.error)
  })
}

/** Pending items plus failed items that are still eligible for auto-retry. */
export async function getActionsToSync(): Promise<QueuedAction[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onsuccess = () => {
      const all = (req.result as QueuedAction[]).filter(
        (a) =>
          a.status === 'pending' ||
          (a.status === 'error' && (a.retries ?? 0) < MAX_AUTO_RETRIES),
      )
      all.sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0))
      resolve(all)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function markActionDone(id: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const record = getReq.result as QueuedAction | undefined
      if (!record) {
        resolve()
        return
      }
      record.status = 'done'
      const putReq = store.put(record)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

export async function markActionError(id: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const record = getReq.result as QueuedAction | undefined
      if (!record) {
        resolve()
        return
      }
      record.status = 'error'
      record.retries = (record.retries ?? 0) + 1
      const putReq = store.put(record)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

export async function clearDoneActions(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const idx = store.index('status')
    const req = idx.openCursor(IDBKeyRange.only('done'))
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        resolve()
      }
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getQueuedCount(): Promise<number> {
  const actions = await getActionsToSync()
  return actions.length
}
