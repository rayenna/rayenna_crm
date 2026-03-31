import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { computeDealHealth } from '../../utils/dealHealthScore'

type HealthBadgeProps = {
  project: Record<string, unknown>
  size?: 'sm' | 'md'
  showLabel?: boolean
}

const HealthBadge = ({ project, size = 'sm', showLabel = false }: HealthBadgeProps) => {
  const health = computeDealHealth(project)
  const [hovered, setHovered] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; place: 'above' | 'below' } | null>(null)

  const isSmall = size === 'sm'
  const circleSize = isSmall ? 18 : 22
  const circleFontSize = isSmall ? 10 : 11
  const scoreFontSize = isSmall ? 12 : 13
  const tooltipW = 240
  const tooltipHApprox = 260
  const gutter = 12

  const tooltipNode = useMemo(() => {
    if (!health || !hovered || !pos) return null
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
  }, [health, hovered, pos])

  useEffect(() => {
    if (!health || !hovered) {
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
    window.addEventListener('scroll', compute, true)
    window.addEventListener('resize', compute)
    return () => {
      window.removeEventListener('scroll', compute, true)
      window.removeEventListener('resize', compute)
    }
  }, [health, hovered])

  if (!health) return null

  return (
    <div
      ref={anchorRef}
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
          cursor: 'default',
          transition: 'all 0.2s ease',
          ...(hovered && {
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
