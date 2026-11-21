import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type HubModalProps = {
  open: boolean
  onClose?: () => void
  children: ReactNode
  /** Extra classes on the panel (size, flex layout, etc.). */
  panelClassName?: string
  /** Called when backdrop is clicked. Defaults to onClose. */
  onBackdropClick?: () => void
}

/**
 * Portal overlay above the Hub shell + bottom nav.
 * Fixed dialogs rendered inside `main` are clipped by overflow on iOS Safari/PWA.
 */
export default function HubModal({
  open,
  onClose,
  children,
  panelClassName = '',
  onBackdropClick,
}: HubModalProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.classList.add('hub-modal-open')
    return () => {
      document.body.style.overflow = prev
      document.documentElement.classList.remove('hub-modal-open')
    }
  }, [open])

  if (!open) return null
  if (typeof document === 'undefined') return null

  const handleBackdrop = () => {
    ;(onBackdropClick ?? onClose)?.()
  }

  return createPortal(
    <div
      className="hub-modal-root"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleBackdrop()
      }}
    >
      <div
        className={`hub-modal-panel ${panelClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
