import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FaUniversity } from 'react-icons/fa'
import { useHoverCapableForTooltip } from '../../hooks/useHoverCapableForTooltip'
import { ZENITH_FLOATING_DISMISS_EVENT } from '../../utils/zenithEvents'
import { FINANCING_BANK_ACCENT } from '../../utils/financingBankDisplay'

type Props = {
  bankDisplayName: string
  tooltipZIndex?: number
}

/**
 * Bank icon on Projects list with Deal Health–style popover (hover desktop / tap mobile).
 */
export default function FinancingBankPopoverIcon({
  bankDisplayName,
  tooltipZIndex = 3000,
}: Props) {
  const hoverCapable = useHoverCapableForTooltip()
  const [mouseInside, setMouseInside] = useState(false)
  const [tapOpen, setTapOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; place: 'above' | 'below' } | null>(null)

  const tooltipW = 240
  const tooltipHApprox = 132
  const gutter = 12
  const showCard = hoverCapable ? mouseInside : tapOpen

  useEffect(() => {
    const dismissFloating = () => {
      setTapOpen(false)
      setMouseInside(false)
    }
    window.addEventListener(ZENITH_FLOATING_DISMISS_EVENT, dismissFloating)
    return () => window.removeEventListener(ZENITH_FLOATING_DISMISS_EVENT, dismissFloating)
  }, [])

  useEffect(() => {
    if (hoverCapable || !tapOpen) return
    const close = (e: Event) => {
      const el = anchorRef.current
      const t = e.target
      if (el && t instanceof Node && el.contains(t)) return
      setTapOpen(false)
    }
    document.addEventListener('touchstart', close, { capture: true })
    document.addEventListener('mousedown', close, { capture: true })
    return () => {
      document.removeEventListener('touchstart', close, { capture: true })
      document.removeEventListener('mousedown', close, { capture: true })
    }
  }, [hoverCapable, tapOpen])

  const tooltipNode = useMemo(() => {
    if (!showCard || !pos) return null
    return (
      <div
        style={{
          position: 'fixed',
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          transform: 'translateX(-50%)',
          background: 'var(--chart-tooltip-bg)',
          border: '1px solid var(--chart-tooltip-border)',
          borderRadius: '10px',
          padding: '12px 14px',
          width: `${tooltipW}px`,
          zIndex: tooltipZIndex,
          pointerEvents: 'none',
          fontFamily: 'DM Sans, sans-serif',
          boxShadow: 'var(--chart-tooltip-shadow)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '10px',
            marginBottom: '10px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--chart-tooltip-divider)',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--chart-tooltip-fg)', flexShrink: 0 }}>
            Financing Bank
          </span>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: FINANCING_BANK_ACCENT,
              textAlign: 'right',
              lineHeight: 1.35,
              wordBreak: 'break-word',
            }}
          >
            {bankDisplayName}
          </span>
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--chart-tooltip-insight)',
            fontStyle: 'italic',
            lineHeight: '1.5',
          }}
        >
          Customer is availing loan / financing for this project.
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            width: '8px',
            height: '8px',
            background: 'var(--chart-tooltip-bg)',
            border: '1px solid var(--chart-tooltip-border)',
            transform: 'translateX(-50%) rotate(45deg)',
            ...(pos.place === 'above'
              ? { bottom: '-5px', borderTop: 'none', borderLeft: 'none' }
              : { top: '-5px', borderBottom: 'none', borderRight: 'none' }),
          }}
        />
      </div>
    )
  }, [showCard, pos, tooltipZIndex, bankDisplayName])

  useEffect(() => {
    if (!showCard) {
      setPos(null)
      return
    }

    const compute = () => {
      const el = anchorRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      let left = r.left + r.width / 2
      const half = tooltipW / 2
      left = Math.max(gutter + half, Math.min(window.innerWidth - gutter - half, left))
      const place: 'above' | 'below' =
        r.top >= tooltipHApprox + 16 ? 'above' : 'below'
      const top =
        place === 'above'
          ? Math.max(gutter, r.top - 8 - tooltipHApprox)
          : Math.min(window.innerHeight - gutter - tooltipHApprox, r.bottom + 8)
      setPos({ left, top, place })
    }

    compute()
    let raf = 0
    const scheduleReposition = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        compute()
      })
    }
    window.addEventListener('scroll', scheduleReposition, { capture: true, passive: true })
    window.addEventListener('resize', scheduleReposition)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', scheduleReposition, true)
      window.removeEventListener('resize', scheduleReposition)
    }
  }, [showCard, bankDisplayName])

  return (
    <button
      type="button"
      ref={anchorRef}
      className="text-emerald-700"
      style={{
        position: 'relative',
        display: 'inline-flex',
        touchAction: 'manipulation',
        cursor: hoverCapable ? 'default' : 'pointer',
        border: 'none',
        margin: 0,
        padding: 0,
        background: 'transparent',
        font: 'inherit',
        verticalAlign: 'middle',
        WebkitTapHighlightColor: 'transparent',
        ...(showCard && { opacity: 0.95 }),
      }}
      onMouseEnter={() => hoverCapable && setMouseInside(true)}
      onMouseLeave={() => hoverCapable && setMouseInside(false)}
      onTouchStart={(e) => {
        if (!hoverCapable) e.stopPropagation()
      }}
      onClick={
        hoverCapable
          ? undefined
          : (e) => {
              e.preventDefault()
              e.stopPropagation()
              setTapOpen((v) => !v)
            }
      }
      aria-expanded={hoverCapable ? undefined : tapOpen}
      aria-label={
        hoverCapable
          ? `Financing bank: ${bankDisplayName}. Hover for details.`
          : `Financing bank: ${bankDisplayName}. Tap for details.`
      }
    >
      <FaUniversity className="w-3.5 h-3.5 shrink-0" />
      {tooltipNode ? createPortal(tooltipNode, document.body) : null}
    </button>
  )
}
