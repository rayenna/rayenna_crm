import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

type HelpTopicsDrawerProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export default function HelpTopicsDrawer({ open, onClose, children }: HelpTopicsDrawerProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close help topics"
            className="fixed inset-0 z-[45] bg-black/50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            id="help-topics-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Help topics"
            className="fixed inset-y-0 left-0 z-[46] flex w-[min(20rem,92vw)] max-w-full flex-col border-r border-[color:var(--border-default)] bg-[color:var(--bg-modal)] shadow-2xl lg:hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-4 py-3">
              <div className="min-w-0">
                <h2 className="zenith-display text-base font-bold tracking-tight text-[color:var(--text-primary)]">
                  Help topics
                </h2>
                <p className="mt-0.5 text-[11px] text-[color:var(--text-secondary)]">
                  Browse sections or search
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] touch-manipulation"
                aria-label="Close topics"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">{children}</div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
