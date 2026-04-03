import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { MouseEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import type { ZenithFunnelStage } from './zenithFunnel'
import type { ZenithDateFilter } from './zenithTypes'

const GOLD = { r: 245, g: 166, b: 35 }
const TEAL = { r: 0, g: 212, b: 180 }

function lerpChannel(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}

/** Gold at first stage → teal by “Completed” (full funnel: index 6 of 8; ops: index 2 of 4). */
function stageColor(i: number, n: number): string {
  const isShort = n <= 4
  const denom = isShort ? Math.max(1, n - 2) : 6
  const t = Math.min(1, i / denom)
  return `rgb(${lerpChannel(GOLD.r, TEAL.r, t)},${lerpChannel(GOLD.g, TEAL.g, t)},${lerpChannel(GOLD.b, TEAL.b, t)})`
}

const SVG_W = 1000
const SVG_H = 180
const TAPER = 16

function trapezoidPoints(i: number, n: number): string {
  const w = SVG_W / n
  const x0 = i * w
  const x1 = (i + 1) * w
  const topLeftX = i === 0 ? x0 : x0 - TAPER
  const trX = x1 - TAPER
  return `${topLeftX},0 ${trX},0 ${x1},${SVG_H} ${x0},${SVG_H}`
}

function conversionPct(stages: ZenithFunnelStage[], index: number): string {
  if (index === 0) return '—'
  const prev = stages[index - 1]!.count
  const cur = stages[index]!.count
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

export default function DealFlowFunnel({
  stages,
  paymentItems,
  dateFilter,
  title = 'Deal Flow',
  badge = 'Pipeline',
  /** When set (Zenith + Quick Action), payment pills open the drawer list instead of /projects. */
  onPaymentStatusClick,
  /** When set, funnel stage tiles open the Quick Action drawer (same filtered list as `stage.to` on Projects). */
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
  const [hovered, setHovered] = useState<number | null>(null)
  const n = stages.length
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

  return (
    <div className="zenith-glass rounded-xl p-3 sm:p-4 overflow-visible w-full">
      <div className="flex items-center justify-between gap-2 mb-2 md:mb-1.5">
        <h3
          className="zenith-display text-lg sm:text-xl font-bold text-white tracking-tight"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          {title}
        </h3>
        <span className="text-[9px] uppercase tracking-[0.14em] text-white/38">{badge}</span>
      </div>

      {/* Desktop / tablet ≥768px: horizontal SVG funnel */}
      <div className="hidden md:block relative w-full h-[180px] overflow-visible">
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
          {stages.map((s, i) => (
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

        {/* Labels + hit targets */}
        <div className="absolute inset-0 flex w-full h-[180px] pointer-events-none">
          {stages.map((s, i) => (
            <div
              key={s.id}
              className="relative flex-1 min-w-0 h-full pointer-events-auto"
              style={{ zIndex: hovered === i ? 30 : 10 }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {onDealFlowStageClick ? (
                <button
                  type="button"
                  className="absolute inset-0 flex flex-col items-center justify-center text-center px-0.5 no-underline group cursor-pointer bg-transparent border-0"
                  onClick={() => onDealFlowStageClick(s)}
                  aria-label={`${s.label}: ${s.count} projects, open quick list`}
                >
                  <span className="text-[9px] sm:text-[10px] font-bold text-white/95 uppercase tracking-wide leading-tight line-clamp-2 drop-shadow-md">
                    {s.label}
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-white tabular-nums leading-none my-0.5 drop-shadow-md">
                    {s.count}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-white/80 tabular-nums drop-shadow">
                    {conversionPct(stages, i)} prev
                  </span>
                </button>
              ) : (
                <Link
                  to={s.to}
                  className="absolute inset-0 flex flex-col items-center justify-center text-center px-0.5 no-underline group"
                >
                  <span className="text-[9px] sm:text-[10px] font-bold text-white/95 uppercase tracking-wide leading-tight line-clamp-2 drop-shadow-md">
                    {s.label}
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-white tabular-nums leading-none my-0.5 drop-shadow-md">
                    {s.count}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-white/80 tabular-nums drop-shadow">
                    {conversionPct(stages, i)} prev
                  </span>
                </Link>
              )}

              <AnimatePresence>
                {hovered === i && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-[min(220px,46vw)] rounded-xl border border-white/15 bg-[#0f0f14]/95 backdrop-blur-xl shadow-2xl px-3 py-2.5 text-left pointer-events-auto z-40"
                  >
                    <p className="text-xs font-bold text-white">{s.label}</p>
                    <p className="text-sm font-extrabold text-[#f5a623] tabular-nums mt-1">{s.count} projects</p>
                    <p className="text-[11px] text-white/70 mt-1">
                      Avg in stage:{' '}
                      <span className="text-white font-semibold">
                        {s.avgDaysInStage != null ? `${s.avgDaysInStage} days` : '—'}
                      </span>
                    </p>
                    <p className="text-[11px] text-white/70">
                      From previous:{' '}
                      <span className="text-white font-semibold">{conversionPct(stages, i)}</span>
                    </p>
                    {onDealFlowStageClick ? (
                      <button
                        type="button"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#00d4b4] hover:text-[#33e0c8] cursor-pointer bg-transparent border-0 p-0"
                        onClick={() => onDealFlowStageClick(s)}
                      >
                        View Projects →
                      </button>
                    ) : (
                      <Link
                        to={s.to}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#00d4b4] hover:text-[#33e0c8]"
                      >
                        View Projects →
                      </Link>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile &lt;768px: vertical stepper */}
      <div className="md:hidden space-y-0">
        {stages.map((s, i) => {
          const conv = conversionPct(stages, i)
          return (
            <div key={s.id} className="flex gap-3">
              <div className="flex flex-col items-center w-8 flex-shrink-0">
                <div
                  className="w-3 h-3 rounded-full border-2 border-white/30 flex-shrink-0"
                  style={{ backgroundColor: stageColor(i, n) }}
                />
                {i < stages.length - 1 && (
                  <div className="w-0.5 flex-1 min-h-[12px] bg-gradient-to-b from-white/25 to-white/10 my-0.5" />
                )}
              </div>
              <motion.div
                className="flex-1 min-w-0 pb-3"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.35 }}
              >
                {onDealFlowStageClick ? (
                  <button
                    type="button"
                    onClick={() => onDealFlowStageClick(s)}
                    className="block w-full text-left rounded-xl px-3 py-2.5 border border-white/10 bg-white/[0.06] active:bg-white/10 cursor-pointer"
                    aria-label={`${s.label}: ${s.count} projects, open quick list`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-white/90">{s.label}</p>
                        <p className="text-[11px] text-white/50 mt-0.5">
                          Avg {s.avgDaysInStage != null ? `${s.avgDaysInStage}d` : '—'} · {conv} prev
                        </p>
                      </div>
                      <span className="text-xl font-extrabold text-white tabular-nums">{s.count}</span>
                    </div>
                  </button>
                ) : (
                  <Link
                    to={s.to}
                    className="block rounded-xl px-3 py-2.5 border border-white/10 bg-white/[0.06] active:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-white/90">{s.label}</p>
                        <p className="text-[11px] text-white/50 mt-0.5">
                          Avg {s.avgDaysInStage != null ? `${s.avgDaysInStage}d` : '—'} · {conv} prev
                        </p>
                      </div>
                      <span className="text-xl font-extrabold text-white tabular-nums">{s.count}</span>
                    </div>
                  </Link>
                )}
              </motion.div>
            </div>
          )
        })}
      </div>

      {/* Payment status pills — single row */}
      <div className="mt-4 pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {orderedPills.map((p) => {
          const out = formatOutstandingPill(p.outstanding)
          const suffix =
            p.outstanding > 0 && (p.status === 'PARTIAL' || p.status === 'PENDING') ? ` ${out}` : ''
          const pillClass =
            'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs sm:text-sm font-semibold border border-white/12 bg-black/25 hover:border-[#f5a623]/45 hover:bg-black/40 transition-colors text-white/90'
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
                <span className="tabular-nums font-bold text-white">{p.count}</span>
                {suffix ? <span className="text-white/70 font-medium tabular-nums">{suffix}</span> : null}
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
              <span className="tabular-nums font-bold text-white">{p.count}</span>
              {suffix ? <span className="text-white/70 font-medium tabular-nums">{suffix}</span> : null}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
