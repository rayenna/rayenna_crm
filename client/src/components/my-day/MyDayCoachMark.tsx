import { useCallback, useEffect, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  anchorRef: RefObject<HTMLElement | null>
  onDismiss: () => void
  onTryOpen: () => void
}

export default function MyDayCoachMark({ anchorRef, onDismiss, onTryOpen }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'below' | 'above' } | null>(null)

  const updatePosition = useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cardW = Math.min(280, window.innerWidth - 24)
    const left = Math.max(12, Math.min(rect.left + rect.width / 2 - cardW / 2, window.innerWidth - cardW - 12))
    const belowTop = rect.bottom + 10
    const aboveTop = rect.top - 10
    const placement = belowTop + 160 < window.innerHeight ? 'below' : 'above'
    setPos({
      top: placement === 'below' ? belowTop : aboveTop,
      left,
      placement,
    })
  }, [anchorRef])

  useEffect(() => {
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [updatePosition])

  if (!pos) return null

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Dismiss My Day tip"
        className="myday-coach-backdrop"
        onClick={onDismiss}
      />
      <div
        role="dialog"
        aria-label="My Day introduction"
        className="myday-coach-card"
        style={{
          position: 'fixed',
          top: pos.placement === 'below' ? pos.top : undefined,
          bottom: pos.placement === 'above' ? window.innerHeight - pos.top : undefined,
          left: pos.left,
          width: Math.min(280, window.innerWidth - 24),
          zIndex: 2100,
        }}
      >
        <p className="myday-coach-title">Your daily plan ☀</p>
        <p className="myday-coach-body">
          Pin follow-ups from <strong>Zenith Hit List</strong> with <strong>+ My Day</strong>, or add tasks here.
          Shortcut: <strong>Ctrl+Shift+M</strong> (⌘⇧M).
        </p>
        <div className="myday-coach-actions">
          <button type="button" className="myday-coach-dismiss" onClick={onDismiss}>
            Got it
          </button>
          <button
            type="button"
            className="myday-coach-primary"
            onClick={() => {
              onDismiss()
              onTryOpen()
            }}
          >
            Open My Day
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
