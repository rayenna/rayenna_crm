import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { MouseEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sigma } from 'lucide-react'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import {
  formatOpenDealsBreakdown,
  partitionDealFlowStages,
  type ZenithFunnelStage,
} from './zenithFunnel'
import type { ZenithDateFilter } from './zenithTypes'

const GOLD = { r: 245, g: 166, b: 35 }
const TEAL = { r: 0, g: 212, b: 180 }

function lerpChannel(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}

/** Gold at first stage → teal by last segment (7-stage funnel: index 6). */
function stageColor(i: number, n: number): string {
  const isShort = n <= 4
  const denom = isShort ? Math.max(1, n - 2) : Math.max(1, n - 1)
  const t = Math.min(1, i / denom)
  return `rgb(${lerpChannel(GOLD.r, TEAL.r, t)},${lerpChannel(GOLD.g, TEAL.g, t)},${lerpChannel(GOLD.b, TEAL.b, t)})`
}

const SVG_W = 1000
const SVG_H = 180
const TAPER = 16
const OPEN_PIPELINE_COUNT = 3

function trapezoidPoints(i: number, n: number): string {
  const w = SVG_W / n
  const x0 = i * w
  const x1 = (i + 1) * w
  const topLeftX = i === 0 ? x0 : x0 - TAPER
  const trX = x1 - TAPER
  return `${topLeftX},0 ${trX},0 ${x1},${SVG_H} ${x0},${SVG_H}`
}

function conversionPct(pipelineStages: ZenithFunnelStage[], index: number): string {
  if (index === 0) return '—'
  const prev = pipelineStages[index - 1]!.count
  const cur = pipelineStages[index]!.count
  if (prev <= 0) return '—'
  return `${((cur / prev) * 100).toFixed(1)}%`
}

function formatOutstandingPill(n: number): string {
  if (n <= 0) return ''
  if (n >= 100000) return `(₹${(n / 100000).toFixed(1)}L)`
  return `(₹${Math.round(n).toLocaleString('en-IN')})`
}

const PAYMENT_PILL_ORDER: { status: string; emoji: string; label: string }[] = [
  { status: 'FULLY_PAID', emoji: '✅', label: 'Fully Paid' },
  { status: 'PARTIAL', emoji: '🔶', label: 'Partial' },
  { status: 'PENDING', emoji: '⏳', label: 'Pending' },
  { status: 'N/A', emoji: '⬜', label: 'N/A' },
]

export type DealFlowPaymentItem = {
  status: string
  count: number
  outstanding: number
}

function StageTooltip({
  stage,
  pipelineStages,
  stageIndex,
  onDealFlowStageClick,
}: {
  stage: ZenithFunnelStage
  pipelineStages: ZenithFunnelStage[]
  stageIndex: number
  onDealFlowStageClick?: (stage: ZenithFunnelStage) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-[min(220px,46vw)] rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-modal)]/95 backdrop-blur-xl shadow-[var(--shadow-dropdown)] px-3 py-2.5 text-left pointer-events-auto z-40"
    >
      <p className="text-xs font-bold text-[color:var(--text-primary)]">{stage.label}</p>
      <p className="text-sm font-extrabold text-[color:var(--accent-gold)] tabular-nums mt-1">
        {stage.count} projects
      </p>
      <p className="text-[11px] text-[color:var(--text-secondary)] mt-1">
        Avg in stage:{' '}
        <span className="text-[color:var(--text-primary)] font-semibold">
          {stage.avgDaysInStage != null ? `${stage.avgDaysInStage} days` : '—'}
        </span>
      </p>
      <p className="text-[11px] text-[color:var(--text-secondary)]">
        From previous:{' '}
        <span className="text-[color:var(--text-primary)] font-semibold">
          {conversionPct(pipelineStages, stageIndex)}
        </span>
      </p>
      {onDealFlowStageClick ? (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[color:var(--accent-teal)] hover:opacity-90 cursor-pointer bg-transparent border-0 p-0"
          onClick={() => onDealFlowStageClick(stage)}
        >
          View Projects →
        </button>
      ) : (
        <Link
          to={stage.to}
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[color:var(--accent-teal)] hover:opacity-90"
        >
          View Projects →
        </Link>
      )}
    </motion.div>
  )
}

function OpenDealsTooltip({
  aggregate,
  breakdownLong,
  breakdownShort,
  onDealFlowStageClick,
}: {
  aggregate: ZenithFunnelStage
  breakdownLong: string
  breakdownShort: string
  onDealFlowStageClick?: (stage: ZenithFunnelStage) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[min(240px,52vw)] rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--bg-modal)]/95 backdrop-blur-xl shadow-[var(--shadow-dropdown)] px-3 py-2.5 text-left pointer-events-auto z-50"
    >
      <p className="text-xs font-bold text-[color:var(--text-primary)]">Open Deals (total)</p>
      <p className="text-sm font-extrabold text-[color:var(--accent-gold)] tabular-nums mt-1">
        {aggregate.count} projects
      </p>
      <p className="text-[11px] text-[color:var(--text-secondary)] mt-1 leading-snug">{breakdownLong}</p>
      <p className="text-[11px] text-[color:var(--text-muted)] mt-0.5 tabular-nums">Σ {breakdownShort}</p>
      {onDealFlowStageClick ? (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[color:var(--accent-teal)] hover:opacity-90 cursor-pointer bg-transparent border-0 p-0"
          onClick={() => onDealFlowStageClick(aggregate)}
        >
          View all open deals →
        </button>
      ) : (
        <Link
          to={aggregate.to}
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[color:var(--accent-teal)] hover:opacity-90"
        >
          View all open deals →
        </Link>
      )}
    </motion.div>
  )
}

function StageHitTarget({
  stage,
  onDealFlowStageClick,
  metricLabel,
}: {
  stage: ZenithFunnelStage
  onDealFlowStageClick?: (stage: ZenithFunnelStage) => void
  metricLabel: string
}) {
  const body = (
    <>
      <span className="text-[9px] sm:text-[10px] font-bold text-[color:var(--text-inverse)] uppercase tracking-wide leading-tight line-clamp-2 drop-shadow-md opacity-95">
        {stage.label}
      </span>
      <span className="text-lg sm:text-xl font-extrabold text-[color:var(--text-inverse)] tabular-nums leading-none my-0.5 drop-shadow-md">
        {stage.count}
      </span>
      <span className="text-[9px] sm:text-[10px] text-[color:var(--text-inverse)] tabular-nums drop-shadow opacity-80">
        {metricLabel}
      </span>
    </>
  )

  if (onDealFlowStageClick) {
    return (
      <button
        type="button"
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-0.5 no-underline group cursor-pointer bg-transparent border-0"
        onClick={() => onDealFlowStageClick(stage)}
        aria-label={`${stage.label}: ${stage.count} projects, open quick list`}
      >
        {body}
      </button>
    )
  }

  return (
    <Link
      to={stage.to}
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-0.5 no-underline group"
    >
      {body}
    </Link>
  )
}

function OpenDealsRibbon({
  aggregate,
  breakdownShort,
  breakdownLong,
  widthPct,
  hovered,
  onHover,
  onDealFlowStageClick,
}: {
  aggregate: ZenithFunnelStage
  breakdownShort: string
  breakdownLong: string
  widthPct: number
  hovered: boolean
  onHover: (active: boolean) => void
  onDealFlowStageClick?: (stage: ZenithFunnelStage) => void
}) {
  const aria = `Open Deals, ${aggregate.count} total: ${breakdownLong}`

  const inner = (
    <>
      <Sigma className="h-3.5 w-3.5 shrink-0 text-[color:var(--accent-gold)]" aria-hidden />
      <div className="min-w-0 flex-1 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[color:var(--accent-gold)] leading-none">
          Open Deals
        </p>
        <p className="text-base sm:text-lg font-extrabold tabular-nums text-[color:var(--text-primary)] leading-tight mt-0.5">
          {aggregate.count}
        </p>
        <p className="text-[9px] text-[color:var(--text-muted)] tabular-nums truncate mt-0.5">
          {breakdownShort}
        </p>
      </div>
    </>
  )

  const shellClass =
    'relative flex w-full items-center gap-2 rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)]/90 px-3 py-1.5 shadow-sm backdrop-blur-sm transition-colors hover:bg-[color:var(--accent-gold-muted)]'

  return (
    <div
      className="absolute top-0 z-20 px-1"
      style={{ left: 0, width: `${widthPct}%` }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Bracket arms */}
      <div
        className="pointer-events-none absolute bottom-0 left-3 right-3 h-3 border-l-2 border-r-2 border-t-2 border-[color:var(--accent-gold-border)] rounded-t-lg opacity-70"
        aria-hidden
      />
      <div className="relative mx-auto max-w-[min(100%,18rem)] pt-0.5">
        {onDealFlowStageClick ? (
          <button type="button" className={`${shellClass} cursor-pointer`} aria-label={aria} onClick={() => onDealFlowStageClick(aggregate)}>
            {inner}
          </button>
        ) : (
          <Link to={aggregate.to} className={`${shellClass} no-underline`} aria-label={aria}>
            {inner}
          </Link>
        )}
        <AnimatePresence>
          {hovered ? (
            <OpenDealsTooltip
              aggregate={aggregate}
              breakdownLong={breakdownLong}
              breakdownShort={breakdownShort}
              onDealFlowStageClick={onDealFlowStageClick}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

function MobileStageCard({
  stage,
  pipelineStages,
  stageIndex,
  dotColor,
  showConnector,
  onDealFlowStageClick,
}: {
  stage: ZenithFunnelStage
  pipelineStages: ZenithFunnelStage[]
  stageIndex: number
  dotColor: string
  showConnector: boolean
  onDealFlowStageClick?: (stage: ZenithFunnelStage) => void
}) {
  const conv = conversionPct(pipelineStages, stageIndex)
  const card = (
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-xs font-bold text-[color:var(--text-primary)]">{stage.label}</p>
        <p className="text-[11px] text-[color:var(--text-muted)] mt-0.5">
          Avg {stage.avgDaysInStage != null ? `${stage.avgDaysInStage}d` : '—'} · {conv} prev
        </p>
      </div>
      <span className="text-xl font-extrabold text-[color:var(--text-primary)] tabular-nums">{stage.count}</span>
    </div>
  )

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center w-8 flex-shrink-0">
        <div
          className="w-3 h-3 rounded-full border-2 border-[color:var(--border-default)] flex-shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        {showConnector ? (
          <div className="w-0.5 flex-1 min-h-[12px] bg-gradient-to-b from-white/25 to-white/10 my-0.5" />
        ) : null}
      </div>
      <motion.div
        className="flex-1 min-w-0 pb-3"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: stageIndex * 0.08, duration: 0.35 }}
      >
        {onDealFlowStageClick ? (
          <button
            type="button"
            onClick={() => onDealFlowStageClick(stage)}
            className="block w-full text-left rounded-xl px-3 py-2.5 border border-[color:var(--border-default)] bg-[color:var(--bg-input)] active:bg-[color:var(--bg-card-hover)] cursor-pointer"
            aria-label={`${stage.label}: ${stage.count} projects, open quick list`}
          >
            {card}
          </button>
        ) : (
          <Link
            to={stage.to}
            className="block rounded-xl px-3 py-2.5 border border-[color:var(--border-default)] bg-[color:var(--bg-input)] active:bg-[color:var(--bg-card-hover)]"
          >
            {card}
          </Link>
        )}
      </motion.div>
    </div>
  )
}

function MobileOpenZone({
  openPipelineStages,
  openAggregate,
  breakdownShort,
  breakdownLong,
  onDealFlowStageClick,
}: {
  openPipelineStages: ZenithFunnelStage[]
  openAggregate: ZenithFunnelStage
  breakdownShort: string
  breakdownLong: string
  onDealFlowStageClick?: (stage: ZenithFunnelStage) => void
}) {
  const summaryInner = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Sigma className="h-4 w-4 shrink-0 text-[color:var(--accent-gold)]" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-bold text-[color:var(--text-primary)]">Open Deals</p>
          <p className="text-[10px] text-[color:var(--text-muted)] mt-0.5 truncate">{breakdownLong}</p>
        </div>
      </div>
      <span className="text-2xl font-extrabold tabular-nums text-[color:var(--accent-gold)]">{openAggregate.count}</span>
    </div>
  )

  return (
    <section className="mb-1" aria-label="Open pipeline">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)] mb-2 px-0.5">
        Open pipeline
      </p>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {openPipelineStages.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
          >
            {onDealFlowStageClick ? (
              <button
                type="button"
                onClick={() => onDealFlowStageClick(s)}
                className="w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-2 py-2 text-center active:bg-[color:var(--bg-card-hover)]"
              >
                <p className="text-[10px] font-semibold text-[color:var(--text-muted)] leading-tight line-clamp-2">{s.label}</p>
                <p className="text-lg font-extrabold tabular-nums text-[color:var(--text-primary)] mt-0.5">{s.count}</p>
              </button>
            ) : (
              <Link
                to={s.to}
                className="block rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-2 py-2 text-center no-underline active:bg-[color:var(--bg-card-hover)]"
              >
                <p className="text-[10px] font-semibold text-[color:var(--text-muted)] leading-tight line-clamp-2">{s.label}</p>
                <p className="text-lg font-extrabold tabular-nums text-[color:var(--text-primary)] mt-0.5">{s.count}</p>
              </Link>
            )}
          </motion.div>
        ))}
      </div>
      <div className="rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-3 py-2.5">
        {onDealFlowStageClick ? (
          <button
            type="button"
            onClick={() => onDealFlowStageClick(openAggregate)}
            className="w-full text-left cursor-pointer bg-transparent border-0 p-0"
            aria-label={`Open Deals, ${openAggregate.count} total: ${breakdownLong}`}
          >
            {summaryInner}
            <p className="text-[10px] text-[color:var(--text-muted)] mt-1.5 tabular-nums">Σ {breakdownShort}</p>
          </button>
        ) : (
          <Link to={openAggregate.to} className="block no-underline" aria-label={`Open Deals, ${openAggregate.count} total: ${breakdownLong}`}>
            {summaryInner}
            <p className="text-[10px] text-[color:var(--text-muted)] mt-1.5 tabular-nums">Σ {breakdownShort}</p>
          </Link>
        )}
      </div>
      <div className="flex items-center gap-2 my-3 px-1" aria-hidden>
        <div className="flex-1 border-t border-[color:var(--border-default)]" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">Execution</span>
        <div className="flex-1 border-t border-[color:var(--border-default)]" />
      </div>
    </section>
  )
}

export default function DealFlowFunnel({
  stages,
  paymentItems,
  dateFilter,
  title = 'Deal Flow',
  badge = 'Pipeline',
  onPaymentStatusClick,
  onDealFlowStageClick,
}: {
  stages: ZenithFunnelStage[]
  paymentItems: DealFlowPaymentItem[]
  dateFilter: ZenithDateFilter
  title?: string
  badge?: string
  onPaymentStatusClick?: (paymentUrlParam: string, pillLabel: string) => void
  onDealFlowStageClick?: (stage: ZenithFunnelStage) => void
}) {
  const [hoveredStageId, setHoveredStageId] = useState<string | null>(null)
  const [openRibbonHovered, setOpenRibbonHovered] = useState(false)

  const { openAggregate, openPipelineStages, executionStages, pipelineStages, hasOpenZone } =
    useMemo(() => partitionDealFlowStages(stages), [stages])

  const n = pipelineStages.length
  const openZoneWidthPct = hasOpenZone ? (OPEN_PIPELINE_COUNT / n) * 100 : 0
  const gatewayLeftPct = hasOpenZone ? openZoneWidthPct : 0

  const breakdownShort = useMemo(
    () => formatOpenDealsBreakdown(openPipelineStages, 'short'),
    [openPipelineStages],
  )
  const breakdownLong = useMemo(
    () => formatOpenDealsBreakdown(openPipelineStages, 'long'),
    [openPipelineStages],
  )

  const tile = {
    selectedFYs: dateFilter.selectedFYs,
    selectedQuarters: dateFilter.selectedQuarters,
    selectedMonths: dateFilter.selectedMonths,
  }

  const paymentMap = new Map(paymentItems.map((p) => [p.status, p]))
  const orderedPills = PAYMENT_PILL_ORDER.map((spec) => {
    const row = paymentMap.get(spec.status)
    return {
      ...spec,
      count: row?.count ?? 0,
      outstanding: row?.outstanding ?? 0,
      param: spec.status === 'N/A' ? 'NA' : spec.status,
    }
  })

  const mobileStages = hasOpenZone ? executionStages : pipelineStages

  const desktopHeight = hasOpenZone ? 228 : 180

  return (
    <div className="rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-4 overflow-visible w-full">
      <div className="flex items-center justify-between gap-2 mb-2 md:mb-1.5">
        <h3
          className="zenith-display text-lg sm:text-xl font-bold text-[color:var(--text-primary)] tracking-tight"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          {title}
        </h3>
        <span className="text-[9px] uppercase tracking-[0.14em] text-[color:var(--text-muted)] opacity-80">{badge}</span>
      </div>

      {/* Desktop / tablet ≥768px */}
      <div
        className="hidden md:block relative w-full overflow-visible"
        style={{ height: desktopHeight }}
      >
        {hasOpenZone && openAggregate ? (
          <OpenDealsRibbon
            aggregate={openAggregate}
            breakdownShort={breakdownShort}
            breakdownLong={breakdownLong}
            widthPct={openZoneWidthPct}
            hovered={openRibbonHovered}
            onHover={setOpenRibbonHovered}
            onDealFlowStageClick={onDealFlowStageClick}
          />
        ) : null}

        {hasOpenZone ? (
          <div
            className="pointer-events-none absolute z-30 flex flex-col items-center"
            style={{ left: `${gatewayLeftPct}%`, top: 52, bottom: 0, transform: 'translateX(-50%)' }}
            aria-hidden
          >
            <div className="h-full w-px bg-gradient-to-b from-[color:var(--accent-gold-border)] via-[color:var(--border-default)] to-transparent opacity-80" />
            <span className="absolute top-[42%] -translate-y-1/2 rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-1 py-0.5 text-[10px] font-bold text-[color:var(--accent-gold)] shadow-sm">
              ›
            </span>
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 h-[180px]">
          <svg
            className="absolute inset-0 w-full h-[180px] block"
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <filter id="zenith-funnel-inner-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.35" />
              </filter>
            </defs>
            {pipelineStages.map((s, i) => (
              <motion.polygon
                key={s.id}
                points={trapezoidPoints(i, n)}
                fill={stageColor(i, n)}
                filter="url(#zenith-funnel-inner-shadow)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: i * 0.1,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            ))}
          </svg>

          <div className="absolute inset-0 flex w-full h-[180px] pointer-events-none">
            {pipelineStages.map((s, i) => (
              <div
                key={s.id}
                className="relative flex-1 min-w-0 h-full pointer-events-auto"
                style={{ zIndex: hoveredStageId === s.id ? 30 : 10 }}
                onMouseEnter={() => setHoveredStageId(s.id)}
                onMouseLeave={() => setHoveredStageId(null)}
              >
                <StageHitTarget
                  stage={s}
                  onDealFlowStageClick={onDealFlowStageClick}
                  metricLabel={`${conversionPct(pipelineStages, i)} prev`}
                />

                <AnimatePresence>
                  {hoveredStageId === s.id ? (
                    <StageTooltip
                      stage={s}
                      pipelineStages={pipelineStages}
                      stageIndex={i}
                      onDealFlowStageClick={onDealFlowStageClick}
                    />
                  ) : null}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile <768px */}
      <div className="md:hidden space-y-0">
        {hasOpenZone && openAggregate ? (
          <MobileOpenZone
            openPipelineStages={openPipelineStages}
            openAggregate={openAggregate}
            breakdownShort={breakdownShort}
            breakdownLong={breakdownLong}
            onDealFlowStageClick={onDealFlowStageClick}
          />
        ) : null}
        {mobileStages.map((s, i) => {
          const stageIndex = pipelineStages.findIndex((p) => p.id === s.id)
          return (
            <MobileStageCard
              key={s.id}
              stage={s}
              pipelineStages={pipelineStages}
              stageIndex={stageIndex >= 0 ? stageIndex : i}
              dotColor={stageColor(stageIndex >= 0 ? stageIndex : i, n)}
              showConnector={i < mobileStages.length - 1}
              onDealFlowStageClick={onDealFlowStageClick}
            />
          )
        })}
      </div>

      {/* Payment status pills */}
      <div className="mt-4 pt-3 border-t border-[color:var(--border-default)] flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {orderedPills.map((p) => {
          const out = formatOutstandingPill(p.outstanding)
          const suffix =
            p.outstanding > 0 && (p.status === 'PARTIAL' || p.status === 'PENDING') ? ` ${out}` : ''
          const pillClass =
            'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs sm:text-sm font-semibold border border-[color:var(--border-default)] bg-[color:var(--bg-input)] hover:border-[color:var(--accent-gold-border)] hover:bg-[color:var(--bg-card-hover)] transition-colors text-[color:var(--text-primary)]'
          const projectsHref = buildProjectsUrl({ paymentStatus: [p.param] }, tile)

          if (onPaymentStatusClick) {
            const open = (e: MouseEvent) => {
              e.preventDefault()
              onPaymentStatusClick(p.param, p.label)
            }
            return (
              <button
                key={p.status}
                type="button"
                onClick={open}
                className={`${pillClass} cursor-pointer`}
              >
                <span aria-hidden>{p.emoji}</span>
                <span>{p.label}:</span>
                <span className="tabular-nums font-bold text-[color:var(--text-primary)]">{p.count}</span>
                {suffix ? <span className="text-[color:var(--text-muted)] font-medium tabular-nums">{suffix}</span> : null}
              </button>
            )
          }

          return (
            <Link
              key={p.status}
              to={projectsHref}
              className={`${pillClass} no-underline`}
            >
              <span aria-hidden>{p.emoji}</span>
              <span>{p.label}:</span>
              <span className="tabular-nums font-bold text-[color:var(--text-primary)]">{p.count}</span>
              {suffix ? <span className="text-[color:var(--text-muted)] font-medium tabular-nums">{suffix}</span> : null}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
