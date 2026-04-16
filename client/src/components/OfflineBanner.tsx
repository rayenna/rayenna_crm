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
        className="flex w-full items-center gap-2 border-b border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] px-5 py-[7px] text-xs text-[color:var(--banner-subtext)]"
      >
        <WifiOff className="shrink-0 text-[color:var(--accent-red)]" size={14} aria-hidden />
        <div className="min-w-0 flex-1">
          <span>You&apos;re offline — changes will sync when reconnected</span>
          {pendingCount > 0 ? (
            <span className="ml-1 text-[color:var(--text-muted)]">
              + {pendingCount} action{pendingCount > 1 ? 's' : ''} queued
            </span>
          ) : null}
        </div>
      </div>
    )
  } else if (syncError && !isSyncing) {
    inner = (
      <div
        className="flex w-full flex-wrap items-center gap-2 border-b border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] px-5 py-[7px] text-xs text-[color:var(--accent-red)]"
      >
        <AlertTriangle className="shrink-0" size={14} aria-hidden />
        <span className="min-w-0 flex-1">{syncError}</span>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--accent-red)] hover:opacity-90"
          onClick={() => void onSyncNow()}
        >
          Retry
        </button>
      </div>
    )
  } else if (isSyncing) {
    inner = (
      <div
        className="flex w-full items-center gap-2 border-b border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-5 py-[7px] text-xs text-[color:var(--accent-gold)]"
      >
        <RefreshCw className="sync-spin shrink-0 text-[color:var(--accent-gold)]" size={14} aria-hidden />
        <span>
          Syncing {pendingCount} queued action{pendingCount !== 1 ? 's' : ''}…
        </span>
      </div>
    )
  } else if (showOnlineAck && pendingCount === 0) {
    inner = (
      <div
        className="flex w-full items-center gap-2 border-b border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] px-5 py-[7px] text-xs text-[color:var(--accent-teal)]"
      >
        <CheckCircle2 className="shrink-0 text-[color:var(--accent-teal)]" size={14} aria-hidden />
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
