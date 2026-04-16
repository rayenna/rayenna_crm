import { useState, useRef, useEffect } from 'react'
import { useModalEscape } from '../../contexts/ModalEscapeContext'

export type ErrorModalType = 'error' | 'warning' | 'info' | 'fatal'

export interface ErrorModalAction {
  label: string
  variant: 'primary' | 'ghost'
  onClick: () => void
}

export interface ErrorModalProps {
  open: boolean
  onClose: () => void
  type: ErrorModalType
  message: string
  technical?: string
  actions: ErrorModalAction[]
  /** When 'parent', modal is positioned relative to parent (use a wrapper with position: relative). Default 'viewport' centers on screen. */
  anchor?: 'viewport' | 'parent'
  /** Optional seconds countdown to show prominently (e.g. for inactivity timeout). */
  countdown?: number
  /** Dark glass styling for Zenith-style pages (default unchanged for other call sites). */
  surface?: 'default' | 'zenith'
}

const typeConfig: Record<ErrorModalType, { title: string; icon: string }> = {
  error: {
    title: 'Error',
    icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  warning: {
    title: 'Warning',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  },
  info: {
    title: 'Information',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  fatal: {
    title: 'Critical',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  },
}

export function ErrorModal({
  open,
  onClose,
  type,
  message,
  technical,
  actions,
  anchor: _anchor = 'viewport',
  countdown,
  surface = 'default',
}: ErrorModalProps) {
  const [showTechnical, setShowTechnical] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstActionRef = useRef<HTMLButtonElement>(null)

  useModalEscape(open, onClose)

  useEffect(() => {
    if (!open) return
    // Put focus on the modal so user focus is on the modal message (works on all pages including New Project)
    const focusDialog = () => dialogRef.current?.focus()
    const id = requestAnimationFrame(focusDialog)
    // Re-apply focus after a short delay so we win over form libraries or other focus logic (e.g. ProjectForm)
    const timeoutId = window.setTimeout(focusDialog, 50)
    return () => {
      cancelAnimationFrame(id)
      window.clearTimeout(timeoutId)
    }
  }, [open])

  // Keep focus inside the modal while open (focus trap)
  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return

    const getFocusable = () => {
      const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      return Array.from(dialog.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1
      )
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusable = getFocusable()
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null
      // If focus is on the dialog (message area) or another non-focusable inside, send Tab to first, Shift+Tab to last
      if (active && dialog.contains(active) && !focusable.includes(active)) {
        e.preventDefault()
        if (e.shiftKey) last.focus()
        else first.focus()
        return
      }
      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [open])

  if (!open) return null

  /** Some call sites pass `\n` as two characters (literal backslash + n); normalize for line breaks. */
  const displayMessage = message.replace(/\\n/g, '\n')

  const config = typeConfig[type]
  // Make the default modal fully theme-aware as well. Keeping `surface` for compatibility,
  // but both variants now use tokenized styling so the app looks consistent everywhere.
  void surface

  const zenithHeaderClass: Record<ErrorModalType, string> = {
    error: 'bg-[color:var(--accent-red-muted)] border-b border-[color:var(--accent-red-border)]',
    warning: 'bg-[color:var(--accent-gold-muted)] border-b border-[color:var(--accent-gold-border)]',
    info: 'bg-[color:var(--accent-teal-muted)] border-b border-[color:var(--accent-teal-border)]',
    fatal: 'bg-[color:var(--accent-red-muted)] border-b border-[color:var(--accent-red-border)]',
  }

  const iconToneByType: Record<ErrorModalType, string> = {
    error: 'text-[color:var(--accent-red)]',
    warning: 'text-[color:var(--accent-gold)]',
    info: 'text-[color:var(--accent-teal)]',
    fatal: 'text-[color:var(--accent-red)]',
  }

  // Always use fixed overlay with safe-area padding so modal is visible on mobile/iPad portrait and landscape (no clipping)
  const overlayStyle: React.CSSProperties = {
    paddingTop: 'max(1rem, env(safe-area-inset-top))',
    paddingRight: 'max(1rem, env(safe-area-inset-right))',
    paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
    paddingLeft: 'max(1rem, env(safe-area-inset-left))',
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={overlayStyle}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'var(--bg-overlay)' }}
        role="presentation"
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative bg-[color:var(--bg-modal)] border border-[color:var(--border-default)] rounded-2xl shadow-[var(--shadow-modal)] w-full max-w-md min-h-0 overflow-hidden flex flex-col outline-none m-auto"
        style={{
          // Portrait/landscape: stay within safe height (dvh = dynamic viewport on mobile)
          maxHeight: 'min(90vh, 90dvh)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="error-modal-title"
        aria-describedby="error-modal-message"
      >
        <div
          className={`${zenithHeaderClass[type]} px-4 sm:px-6 py-3 sm:py-4 shrink-0`}
        >
          <h2
            id="error-modal-title"
            className="text-lg sm:text-xl font-bold flex items-center gap-2 text-[color:var(--text-primary)] tracking-tight"
          >
            <svg
              className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 ${iconToneByType[type]}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
            </svg>
            {config.title}
          </h2>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden flex-1 min-h-0 overscroll-contain">
          {countdown != null && (
            <div
              className="flex flex-col items-center justify-center py-4 mb-4 rounded-xl bg-[color:var(--bg-badge)] border border-[color:var(--border-default)]"
            >
              <span
                className="text-4xl sm:text-5xl font-bold tabular-nums text-[color:var(--text-primary)]"
                aria-live="polite"
              >
                {countdown}
              </span>
              <span className="text-sm font-medium mt-1 text-[color:var(--text-secondary)]">seconds</span>
            </div>
          )}
          <p
            id="error-modal-message"
            className="text-sm sm:text-base whitespace-pre-wrap mb-4 text-[color:var(--text-secondary)]"
          >
            {displayMessage}
          </p>
          {technical != null && technical !== '' && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowTechnical(!showTechnical)}
                className="text-xs text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)] underline min-h-[44px] min-w-[44px] -ml-2 pl-2 touch-manipulation"
              >
                {showTechnical ? 'Hide' : 'Show'} technical details
              </button>
              {showTechnical && (
                <pre
                  className="mt-2 p-3 bg-[color:var(--bg-badge)] border border-[color:var(--border-default)] rounded-lg text-xs text-[color:var(--text-secondary)] overflow-x-auto max-h-32 overflow-y-auto overscroll-contain"
                >
                  {technical}
                </pre>
              )}
            </div>
          )}
        </div>
        <div
          className="flex flex-wrap gap-3 p-4 sm:p-6 pt-0 justify-end border-t border-[color:var(--border-default)] shrink-0"
        >
          {actions.map((action, i) => (
            <button
              key={i}
              ref={i === 0 ? firstActionRef : undefined}
              type="button"
              onClick={() => {
                action.onClick()
                if (action.variant === 'ghost') onClose()
              }}
              className={
                action.variant === 'primary'
                  ? 'min-h-[44px] px-4 py-3 rounded-xl font-semibold bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)] hover:opacity-95 active:opacity-95 touch-manipulation'
                  : 'min-h-[44px] px-4 py-3 rounded-xl font-semibold border border-[color:var(--border-strong)] text-[color:var(--text-primary)] bg-[color:var(--bg-input)] hover:bg-[color:var(--bg-card-hover)] active:opacity-95 touch-manipulation'
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
