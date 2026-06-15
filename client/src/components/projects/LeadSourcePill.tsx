import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useHoverCapableForTooltip } from '../../hooks/useHoverCapableForTooltip'
import { LeadSource } from '../../types'
import { ZENITH_FLOATING_DISMISS_EVENT } from '../../utils/zenithEvents'
import {
  getLeadSourceDetailAccent,
  getLeadSourceDetailFieldLabel,
  getLeadSourceDetailInsight,
  getLeadSourceDetailValue,
  getLeadSourceLabel,
  getLeadSourcePillClasses,
  getLeadSourcePillCompactLabel,
  leadSourceRequiresDetails,
} from '../../utils/leadSourceDisplay'

const PILL_BASE =
  'inline-flex max-w-full items-center truncate rounded px-1.5 py-0.5 text-[10px] font-medium lg:text-[11px]'

type Props = {
  leadSource?: string | null
  leadSourceDetails?: string | null
  tooltipZIndex?: number
}

function LeadSourcePillContent({ leadSource }: { leadSource: string }) {
  const compact = getLeadSourcePillCompactLabel(leadSource)
  const label = getLeadSourceLabel(leadSource) ?? leadSource

  if (compact) {
    return (
      <>
        <span className="lg:hidden">{label}</span>
        <span className="hidden lg:inline">{compact}</span>
      </>
    )
  }

  if (leadSource === LeadSource.DIGITAL_MARKETING) {
    return <>Digital Mktg</>
  }

  return <>{label}</>
}

export default function LeadSourcePill({
  leadSource,
  leadSourceDetails,
  tooltipZIndex = 3000,
}: Props) {
  if (!leadSource) {
    return <span className="inline-block text-[11px] text-[color:var(--text-muted)]">—</span>
  }

  const detailValue = getLeadSourceDetailValue(leadSource, leadSourceDetails)
  const showPopover = leadSourceRequiresDetails(leadSource) && !!detailValue

  if (!showPopover) {
    return (
      <span className={`${PILL_BASE} ${getLeadSourcePillClasses(leadSource)}`}>
        <LeadSourcePillContent leadSource={leadSource} />
      </span>
    )
  }

  return (
    <LeadSourcePillWithPopover
      leadSource={leadSource as LeadSource}
      detailValue={detailValue}
      tooltipZIndex={tooltipZIndex}
    />
  )
}

function LeadSourcePillWithPopover({
  leadSource,
  detailValue,
  tooltipZIndex,
}: {
  leadSource: LeadSource
  detailValue: string
  tooltipZIndex: number
}) {
  const hoverCapable = useHoverCapableForTooltip()
  const [mouseInside, setMouseInside] = useState(false)
  const [tapOpen, setTapOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; place: 'above' | 'below' } | null>(null)

  const tooltipW = 240
  const tooltipHApprox = 132
  const gutter = 12
  const showCard = hoverCapable ? mouseInside : tapOpen

  const fieldLabel = getLeadSourceDetailFieldLabel(leadSource)
  const insight = getLeadSourceDetailInsight(leadSource)
  const accent = getLeadSourceDetailAccent(leadSource)
  const sourceLabel = getLeadSourceLabel(leadSource) ?? leadSource

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
            {fieldLabel}
          </span>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: accent,
              textAlign: 'right',
              lineHeight: 1.35,
              wordBreak: 'break-word',
            }}
          >
            {detailValue}
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
          {insight}
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
  }, [showCard, pos, tooltipZIndex, fieldLabel, detailValue, accent, insight])

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
  }, [showCard, detailValue])

  return (
    <button
      type="button"
      ref={anchorRef}
      className={`${PILL_BASE} ${getLeadSourcePillClasses(leadSource)}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        touchAction: 'manipulation',
        cursor: hoverCapable ? 'default' : 'pointer',
        margin: 0,
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
          ? `${sourceLabel}: ${detailValue}. Hover for details.`
          : `${sourceLabel}: ${detailValue}. Tap for details.`
      }
    >
      <LeadSourcePillContent leadSource={leadSource} />
      {tooltipNode ? createPortal(tooltipNode, document.body) : null}
    </button>
  )
}
