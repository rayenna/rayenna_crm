import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useHoverCapableForTooltip } from '../../hooks/useHoverCapableForTooltip'
import { ZENITH_FLOATING_DISMISS_EVENT } from '../../utils/zenithEvents'

type Props = {
  systemCapacity?: number | null
  panelBrand?: string | null
  inverterBrand?: string | null
  inverterCapacityKw?: number | null
  panelType?: string | null
  panelCapacityW?: number | null
  tooltipZIndex?: number
}

function dash(value: string | number | null | undefined, suffix?: string): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') {
    const t = value.trim()
    return t ? t : '—'
  }
  if (Number.isNaN(value)) return '—'
  return suffix ? `${value} ${suffix}` : String(value)
}

/**
 * Projects list Capacity cell — Deal Health–style popover (hover desktop / tap mobile).
 */
export default function CapacitySpecsPopover({
  systemCapacity,
  panelBrand,
  inverterBrand,
  inverterCapacityKw,
  panelType,
  panelCapacityW,
  tooltipZIndex = 3000,
}: Props) {
  const hoverCapable = useHoverCapableForTooltip()
  const [mouseInside, setMouseInside] = useState(false)
  const [tapOpen, setTapOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; place: 'above' | 'below' } | null>(null)

  const tooltipW = 240
  const tooltipHApprox = 220
  const gutter = 12
  const showCard = hoverCapable ? mouseInside : tapOpen
  const capacityLabel = systemCapacity ? `${systemCapacity} kW` : '—'

  const rows = useMemo(
    () => [
      { label: 'Panel Brand', value: dash(panelBrand) },
      { label: 'Inverter Brand', value: dash(inverterBrand) },
      { label: 'Inverter Capacity', value: dash(inverterCapacityKw, 'kW') },
      { label: 'Panel Type', value: dash(panelType) },
      { label: 'Panel Capacity', value: dash(panelCapacityW, 'W') },
    ],
    [panelBrand, inverterBrand, inverterCapacityKw, panelType, panelCapacityW],
  )

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
        role="tooltip"
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
            alignItems: 'center',
            marginBottom: '10px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--chart-tooltip-divider)',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--chart-tooltip-fg)' }}>
            Capacity
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-gold)' }}>
            {capacityLabel}
          </span>
        </div>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                color: 'var(--chart-tooltip-fg-muted)',
                flexShrink: 0,
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--chart-tooltip-fg)',
                textAlign: 'right',
                lineHeight: 1.35,
                wordBreak: 'break-word',
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
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
  }, [showCard, pos, tooltipZIndex, capacityLabel, rows])

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
      const place: 'above' | 'below' = r.top >= tooltipHApprox + 16 ? 'above' : 'below'
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
  }, [showCard, rows])

  return (
    <button
      type="button"
      ref={anchorRef}
      className="text-xs font-bold text-[color:var(--accent-gold)] transition-colors group-hover:opacity-90 lg:text-[13px]"
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
        textAlign: 'inherit',
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
          ? (e) => e.stopPropagation()
          : (e) => {
              e.preventDefault()
              e.stopPropagation()
              setTapOpen((v) => !v)
            }
      }
      aria-expanded={hoverCapable ? undefined : tapOpen}
      aria-label={
        hoverCapable
          ? `System capacity ${capacityLabel}. Hover for panel and inverter details.`
          : `System capacity ${capacityLabel}. Tap for panel and inverter details.`
      }
    >
      {capacityLabel}
      {tooltipNode ? createPortal(tooltipNode, document.body) : null}
    </button>
  )
}
