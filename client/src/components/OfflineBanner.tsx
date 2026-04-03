import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'

type Props = {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  syncError: string | null
  onSyncNow: () => void | Promise<void>
  /** Parent sets true briefly after transitioning from offline → online (e.g. 5s window). */
  showOnlineAck: boolean
}

export default function OfflineBanner({
  isOnline,
  isSyncing,
  pendingCount,
  syncError,
  onSyncNow,
  showOnlineAck,
}: Props) {
  let inner: ReactNode = null

  if (!isOnline) {
    inner = (
      <div
        className="flex w-full items-center gap-2 px-5 py-[7px]"
        style={{
          background: 'rgba(255,71,87,0.12)',
          borderBottom: '1px solid rgba(255,71,87,0.25)',
          fontFamily: 'DM Sans, system-ui, sans-serif',
          fontSize: 12,
        }}
      >
        <WifiOff className="shrink-0" size={14} color="#FF4757" aria-hidden />
        <div className="min-w-0 flex-1">
          <span style={{ color: 'rgba(255,255,255,0.88)' }}>
            You&apos;re offline — changes will sync when reconnected
          </span>
          {pendingCount > 0 ? (
            <span className="ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              + {pendingCount} action{pendingCount > 1 ? 's' : ''} queued
            </span>
          ) : null}
        </div>
      </div>
    )
  } else if (syncError && !isSyncing) {
    inner = (
      <div
        className="flex w-full flex-wrap items-center gap-2 px-5 py-[7px]"
        style={{
          background: 'rgba(255,71,87,0.08)',
          borderBottom: '1px solid rgba(255,71,87,0.2)',
          fontFamily: 'DM Sans, system-ui, sans-serif',
          fontSize: 12,
          color: '#FF4757',
        }}
      >
        <AlertTriangle className="shrink-0" size={14} aria-hidden />
        <span className="min-w-0 flex-1">{syncError}</span>
        <button
          type="button"
          className="shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-semibold"
          style={{ border: '1px solid rgba(255,71,87,0.4)', background: 'rgba(255,71,87,0.12)' }}
          onClick={() => void onSyncNow()}
        >
          Retry
        </button>
      </div>
    )
  } else if (isSyncing) {
    inner = (
      <div
        className="flex w-full items-center gap-2 px-5 py-[7px]"
        style={{
          background: 'rgba(245,166,35,0.08)',
          borderBottom: '1px solid rgba(245,166,35,0.2)',
          fontFamily: 'DM Sans, system-ui, sans-serif',
          fontSize: 12,
          color: '#F5A623',
        }}
      >
        <RefreshCw className="sync-spin shrink-0" size={14} color="#F5A623" aria-hidden />
        <span>
          Syncing {pendingCount} queued action{pendingCount !== 1 ? 's' : ''}…
        </span>
      </div>
    )
  } else if (showOnlineAck && pendingCount === 0) {
    inner = (
      <div
        className="flex w-full items-center gap-2 px-5 py-[7px]"
        style={{
          background: 'rgba(0,212,180,0.08)',
          borderBottom: '1px solid rgba(0,212,180,0.2)',
          fontFamily: 'DM Sans, system-ui, sans-serif',
          fontSize: 12,
          color: '#00D4B4',
        }}
      >
        <CheckCircle2 className="shrink-0" size={14} color="#00D4B4" aria-hidden />
        <span>Back online — all changes synced</span>
      </div>
    )
  }

  return (
    <AnimatePresence>
      {inner ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ overflow: 'hidden' }}
        >
          {inner}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
