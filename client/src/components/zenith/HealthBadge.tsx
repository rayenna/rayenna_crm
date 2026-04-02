import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type TouchEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { computeDealHealth } from '../../utils/dealHealthScore'
import { ZENITH_FLOATING_DISMISS_EVENT } from '../../utils/zenithEvents'

type HealthBadgeProps = {
  project: Record<string, unknown>
  size?: 'sm' | 'md'
  showLabel?: boolean
}

/** True when device is suited to hover tooltips (laptop + mouse/trackpad). */
function useHoverCapableForTooltip(): boolean {
  const [ok, setOk] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
  })
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const fn = () => setOk(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return ok
}

const HealthBadge = ({ project, size = 'sm', showLabel = false }: HealthBadgeProps) => {
  const health = computeDealHealth(project)
  const hoverCapable = useHoverCapableForTooltip()
  const [mouseInside, setMouseInside] = useState(false)
  const [tapOpen, setTapOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; place: 'above' | 'below' } | null>(null)

  const isSmall = size === 'sm'
  const circleSize = isSmall ? 18 : 22
  const circleFontSize = isSmall ? 10 : 11
  const scoreFontSize = isSmall ? 12 : 13
  const tooltipW = 240
  const tooltipHApprox = 260
  const gutter = 12

  const showCard = hoverCapable ? mouseInside : tapOpen

  const toggleTap = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (hoverCapable) return
      e.preventDefault()
      e.stopPropagation()
      setTapOpen((v) => !v)
    },
    [hoverCapable],
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
    if (!health || !showCard || !pos) return null
    return (
      <div
        style={{
          position: 'fixed',
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          transform: 'translateX(-50%)',
          background: '#1A1A2E',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '10px',
          padding: '12px 14px',
          width: `${tooltipW}px`,
          zIndex: 3000,
          pointerEvents: 'none',
          fontFamily: 'DM Sans, sans-serif',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            paddingBottom: '8px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: '#fff',
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
                  color: 'rgba(255,255,255,0.6)',
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
                        ? '#FF4757'
                        : 'rgba(255,255,255,0.5)',
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
                background: 'rgba(255,255,255,0.08)',
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
            borderTop: '1px solid rgba(255,255,255,0.08)',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.45)',
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
            background: '#1A1A2E',
            border: '1px solid rgba(255,255,255,0.12)',
            transform: `translateX(-50%) rotate(45deg)`,
            ...(pos.place === 'above'
              ? { bottom: '-5px', borderTop: 'none', borderLeft: 'none' }
              : { top: '-5px', borderBottom: 'none', borderRight: 'none' }),
          }}
        />
      </div>
    )
  }, [health, showCard, pos])

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
  }, [health, showCard])

  if (!health) return null

  return (
    <div
      ref={anchorRef}
      style={{ position: 'relative', display: 'inline-flex', touchAction: 'manipulation' }}
      onMouseEnter={() => hoverCapable && setMouseInside(true)}
      onMouseLeave={() => hoverCapable && setMouseInside(false)}
      onClick={hoverCapable ? undefined : toggleTap}
      onKeyDown={
        hoverCapable
          ? undefined
          : (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setTapOpen((v) => !v)
              }
            }
      }
      role={hoverCapable ? undefined : 'button'}
      tabIndex={hoverCapable ? undefined : 0}
      aria-expanded={hoverCapable ? undefined : tapOpen}
      aria-label={hoverCapable ? undefined : 'Deal health, tap for details'}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          background: `${health.color}18`,
          border: `1px solid ${health.color}40`,
          borderRadius: '20px',
          padding: isSmall ? '2px 8px' : '3px 10px',
          cursor: hoverCapable ? 'default' : 'pointer',
          transition: 'all 0.2s ease',
          pointerEvents: 'auto',
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
            color: '#0A0A0F',
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
      </div>

      {tooltipNode ? createPortal(tooltipNode, document.body) : null}
    </div>
  )
}

export default HealthBadge
