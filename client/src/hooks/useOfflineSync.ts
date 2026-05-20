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
import { probeZenithReachability } from '../utils/zenithConnectivity'

export const ZENITH_DATA_SYNCED = 'zenith:data:synced'

export function useOfflineSync() {
  const [browserOnline, setBrowserOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [apiReachable, setApiReachable] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const syncingRef = useRef(false)
  const browserOnlineRef = useRef(browserOnline)

  const isOnline = browserOnline && apiReachable

  const refreshPendingCount = useCallback(async () => {
    const count = await getQueuedCount()
    setPendingCount(count)
  }, [])

  const runReachabilityProbe = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined') return true
    if (!navigator.onLine) {
      setApiReachable(false)
      return false
    }
    const ok = await probeZenithReachability()
    setApiReachable(ok)
    return ok
  }, [])

  const syncPendingActions = useCallback(async () => {
    if (syncingRef.current || typeof navigator === 'undefined') return

    if (!navigator.onLine) return
    const reachable = await runReachabilityProbe()
    if (!reachable) return

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
  }, [refreshPendingCount, runReachabilityProbe])

  useEffect(() => {
    browserOnlineRef.current = browserOnline
  }, [browserOnline])

  useEffect(() => {
    const handleBrowserOnline = () => {
      setBrowserOnline(true)
      void runReachabilityProbe().then((ok) => {
        if (ok) void syncPendingActions()
      })
    }
    const handleBrowserOffline = () => {
      setBrowserOnline(false)
      setApiReachable(false)
    }

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      void runReachabilityProbe().then((ok) => {
        if (ok && browserOnlineRef.current) void syncPendingActions()
      })
    }

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) handleVisibility()
    }

    window.addEventListener('online', handleBrowserOnline)
    window.addEventListener('offline', handleBrowserOffline)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pageshow', handlePageShow)
    void refreshPendingCount()
    void runReachabilityProbe()

    const onQueueChanged = () => {
      void refreshPendingCount()
    }
    window.addEventListener(ZENITH_SYNC_QUEUE_CHANGED, onQueueChanged)

    const probeInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void runReachabilityProbe()
    }, 60_000)

    return () => {
      window.removeEventListener('online', handleBrowserOnline)
      window.removeEventListener('offline', handleBrowserOffline)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener(ZENITH_SYNC_QUEUE_CHANGED, onQueueChanged)
      window.clearInterval(probeInterval)
    }
  }, [syncPendingActions, refreshPendingCount, runReachabilityProbe])

  return {
    isOnline,
    browserOnline,
    apiReachable,
    isSyncing,
    pendingCount,
    lastSynced,
    syncError,
    syncNow: syncPendingActions,
    refreshPendingCount,
    probeReachability: runReachabilityProbe,
  }
}
