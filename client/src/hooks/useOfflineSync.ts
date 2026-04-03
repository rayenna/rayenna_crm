import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getActionsToSync,
  markActionDone,
  markActionError,
  clearDoneActions,
  getQueuedCount,
  ZENITH_SYNC_QUEUE_CHANGED,
} from '../utils/syncQueue'
import { buildAbsoluteApiUrl } from '../utils/axios'

export const ZENITH_DATA_SYNCED = 'zenith:data:synced'

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const syncingRef = useRef(false)

  const refreshPendingCount = useCallback(async () => {
    const count = await getQueuedCount()
    setPendingCount(count)
  }, [])

  const syncPendingActions = useCallback(async () => {
    if (syncingRef.current || typeof navigator === 'undefined' || !navigator.onLine) return

    const pending = await getActionsToSync()
    if (pending.length === 0) return

    syncingRef.current = true
    setIsSyncing(true)
    setSyncError(null)

    let successCount = 0
    let errorCount = 0

    for (const action of pending) {
      if (action.id == null) continue
      try {
        const url = buildAbsoluteApiUrl(action.endpoint)
        const response = await fetch(url, {
          method: action.method ?? 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.payload),
        })

        if (response.ok) {
          await markActionDone(action.id)
          successCount++
        } else {
          await markActionError(action.id)
          errorCount++
        }
      } catch {
        await markActionError(action.id)
        errorCount++
      }
    }

    await clearDoneActions()
    await refreshPendingCount()

    syncingRef.current = false
    setIsSyncing(false)
    setLastSynced(new Date())

    if (errorCount > 0) {
      setSyncError(`${errorCount} action${errorCount > 1 ? 's' : ''} failed to sync`)
    }

    window.dispatchEvent(
      new CustomEvent(ZENITH_DATA_SYNCED, {
        detail: { successCount, errorCount },
      }),
    )
  }, [refreshPendingCount])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      void syncPendingActions()
    }
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    void refreshPendingCount()

    const onQueueChanged = () => {
      void refreshPendingCount()
    }
    window.addEventListener(ZENITH_SYNC_QUEUE_CHANGED, onQueueChanged)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener(ZENITH_SYNC_QUEUE_CHANGED, onQueueChanged)
    }
  }, [syncPendingActions, refreshPendingCount])

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSynced,
    syncError,
    syncNow: syncPendingActions,
    refreshPendingCount,
  }
}
