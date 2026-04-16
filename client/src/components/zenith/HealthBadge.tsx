import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useHoverCapableForTooltip } from '../../hooks/useHoverCapableForTooltip'
import { computeDealHealth } from '../../utils/dealHealthScore'
import { ZENITH_FLOATING_DISMISS_EVENT } from '../../utils/zenithEvents'

type HealthBadgeProps = {
  project: Record<string, unknown>
  size?: 'sm' | 'md'
  showLabel?: boolean
  /** Portal tooltip stacking (e.g. quick drawer panel z-[6001]). */
  tooltipZIndex?: number
}

const HealthBadge = ({
  project,
  size = 'sm',
  showLabel = false,
  tooltipZIndex = 3000,
}: HealthBadgeProps) => {
  // computeDealHealth returns a new object each call; memoize so positioning effect deps stay stable.
  const health = useMemo(() => computeDealHealth(project), [project])
  const hoverCapable = useHoverCapableForTooltip()
  const [mouseInside, setMouseInside] = useState(false)
  const [tapOpen, setTapOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; place: 'above' | 'below' } | null>(null)

  const isSmall = size === 'sm'
  const circleSize = isSmall ? 18 : 22
  const circleFontSize = isSmall ? 10 : 11
  const scoreFontSize = isSmall ? 12 : 13
  const tooltipW = 240
  const tooltipHApprox = 260
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
    if (!health || !showCard || !pos) return null
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
            alignItems: 'center',
            marginBottom: '10px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--chart-tooltip-divider)',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--chart-tooltip-fg)',
            }}
          >
            Deal Health
          </span>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: health.color,
            }}
          >
            {health.score}/100 — {health.label}
          </span>
        </div>
        {health.factors.map((f) => (
          <div key={f.name} style={{ marginBottom: '8px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '3px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--chart-tooltip-fg-muted)',
                }}
              >
                {f.name}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color:
                    f.score === f.max
                      ? health.color
                      : f.score === 0
                        ? 'var(--accent-red)'
                        : 'var(--chart-tooltip-fg-muted)',
                }}
              >
                {f.score}/{f.max}
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '3px',
                borderRadius: '2px',
                background: 'var(--chart-tooltip-track)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(f.score / f.max) * 100}%`,
                  height: '100%',
                  background: health.color,
                  borderRadius: '2px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        ))}
        <div
          style={{
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid var(--chart-tooltip-divider)',
            fontSize: '11px',
            color: 'var(--chart-tooltip-insight)',
            fontStyle: 'italic',
            lineHeight: '1.5',
          }}
        >
          {health.insight}
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            width: '8px',
            height: '8px',
            background: 'var(--chart-tooltip-bg)',
            border: '1px solid var(--chart-tooltip-border)',
            transform: `translateX(-50%) rotate(45deg)`,
            ...(pos.place === 'above'
              ? { bottom: '-5px', borderTop: 'none', borderLeft: 'none' }
              : { top: '-5px', borderBottom: 'none', borderRight: 'none' }),
          }}
        />
      </div>
    )
  }, [health, showCard, pos, tooltipZIndex])

  useEffect(() => {
    if (!health || !showCard) {
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
        place === 'above' ? Math.max(gutter, r.top - 8 - tooltipHApprox) : Math.min(window.innerHeight - gutter - tooltipHApprox, r.bottom + 8)

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
  }, [showCard, health?.score, health?.grade])

  if (!health) return null

  return (
    <button
      type="button"
      ref={anchorRef}
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
      aria-label={hoverCapable ? 'Deal health, hover for details' : 'Deal health, tap for details'}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          background: `${health.color}18`,
          border: `1px solid ${health.color}40`,
          borderRadius: '20px',
          padding: isSmall ? '2px 8px' : '3px 10px',
          transition: 'all 0.2s ease',
          ...(showCard && {
            background: `${health.color}28`,
            border: `1px solid ${health.color}70`,
          }),
        }}
      >
        <span
          style={{
            width: `${circleSize}px`,
            height: `${circleSize}px`,
            borderRadius: '50%',
            background: health.color,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${circleFontSize}px`,
            fontWeight: 700,
            color: 'var(--text-inverse)',
            fontFamily: 'DM Sans, sans-serif',
            flexShrink: 0,
          }}
        >
          {health.grade}
        </span>
        <span
          style={{
            fontSize: `${scoreFontSize}px`,
            fontWeight: 500,
            color: health.color,
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          {health.score}
        </span>
        {(showLabel || size === 'md') && (
          <span
            style={{
              fontSize: '11px',
              color: health.color,
              opacity: 0.85,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {health.label}
          </span>
        )}
      </span>

      {tooltipNode ? createPortal(tooltipNode, document.body) : null}
    </button>
  )
}

export default HealthBadge
