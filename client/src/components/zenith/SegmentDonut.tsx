import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { ZENITH_DONUT_CHART_HEIGHT_PX, ZENITH_DONUT_PIE_ONLY_MOBILE_PX } from './zenithDonutConstants'
import ZenithChartTouchReset from './ZenithChartTouchReset'
import { ZENITH_CHART_CUSTOM_TOOLTIP_SHELL } from '../dashboard/zenithRechartsTooltipStyles'

const COLORS = [
  'var(--accent-gold)',
  'var(--accent-teal)',
  'var(--accent-purple)',
  'var(--accent-blue)',
  'var(--accent-red)',
  'color-mix(in_srgb,var(--accent-gold) 70%, var(--accent-teal))',
]

function formatSliceInr(value: number): string {
  return `₹${Math.round(value || 0).toLocaleString('en-IN')}`
}

export interface SegmentSlice {
  name: string
  value: number
  percentage?: string
}

function useZenithNarrowLayout(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const u = () => setNarrow(mq.matches)
    u()
    mq.addEventListener('change', u)
    return () => mq.removeEventListener('change', u)
  }, [])
  return narrow
}

export default function SegmentDonut({
  title,
  data,
  onSegmentClick,
  showExploreHint,
  /**
   * Fill a stretched grid cell (e.g. Finance segment + profitability row): card and chart area grow with the row
   * while keeping a minimum chart height. Matches Executive Zenith loans + word cloud alignment.
   */
  stretchToRowHeight = false,
}: {
  title: string
  data: SegmentSlice[]
  onSegmentClick?: (segmentName: string) => void
  showExploreHint?: boolean
  stretchToRowHeight?: boolean
}) {
  const chartData = useMemo(
    () =>
      data
        .filter((d) => Number(d.value) > 0)
        .map((d) => ({
          name: d.name,
          value: Number(d.value),
          pct: d.percentage,
        })),
    [data],
  )

  const narrow = useZenithNarrowLayout()

  const pieSlotHeightPx = narrow ? ZENITH_DONUT_PIE_ONLY_MOBILE_PX : ZENITH_DONUT_CHART_HEIGHT_PX
  const pieMargin = narrow ? { top: 6, bottom: 6, left: 6, right: 6 } : undefined

  const cardClass =
    'zenith-segment-donut-card rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] p-3 sm:p-4 flex flex-col max-lg:overflow-visible ' +
    (stretchToRowHeight ? 'h-full min-h-0' : 'shrink-0')

  const cardBody = (
    <>
      <div className="flex items-start justify-between gap-2 mb-3 shrink-0">
        <h3 className="zenith-display text-sm sm:text-[15px] font-semibold text-[color:var(--text-primary)] min-w-0">
          {title}
        </h3>
        {showExploreHint ? (
          <span
            className="shrink-0 pt-0.5 italic text-[10px] text-[color:var(--text-muted)]"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Click to explore →
          </span>
        ) : null}
      </div>
      <div
        className={
          stretchToRowHeight
            ? 'zenith-chart-slot w-full min-w-0 flex-1 min-h-0'
            : 'zenith-chart-slot w-full min-w-0 shrink-0'
        }
        style={stretchToRowHeight ? { minHeight: pieSlotHeightPx } : { height: pieSlotHeightPx }}
      >
        {chartData.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)] text-center flex items-center justify-center h-full">
            No data for this period
          </p>
        ) : (
          <ZenithChartTouchReset
            className={stretchToRowHeight ? 'h-full min-h-0 w-full min-w-0' : 'w-full min-w-0'}
          >
            {(rk) => (
              <ResponsiveContainer
                key={rk}
                width="100%"
                height={stretchToRowHeight ? '100%' : pieSlotHeightPx}
                minWidth={0}
              >
                <PieChart margin={pieMargin}>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={narrow ? '48%' : '58%'}
                    outerRadius={narrow ? '64%' : '82%'}
                    paddingAngle={2}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={900}
                    cursor={onSegmentClick ? 'pointer' : 'default'}
                    onClick={(slice) => {
                      const name = (slice as { name?: string })?.name
                      if (name && onSegmentClick) onSegmentClick(String(name))
                    }}
                  >
                    {chartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={COLORS[i % COLORS.length]}
                        stroke="var(--border-default)"
                        style={{
                          cursor: onSegmentClick ? 'pointer' : 'default',
                          filter: 'brightness(1)',
                          transition: 'filter 0.15s, transform 0.15s',
                          transformOrigin: 'center',
                        }}
                        onMouseEnter={
                          narrow
                            ? undefined
                            : (e) => {
                                const el = e.currentTarget as SVGElement
                                el.style.filter = 'brightness(1.25)'
                                el.style.transform = 'scale(1.04)'
                              }
                        }
                        onMouseLeave={
                          narrow
                            ? undefined
                            : (e) => {
                                const el = e.currentTarget as SVGElement
                                el.style.filter = 'brightness(1)'
                                el.style.transform = 'scale(1)'
                              }
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const p = payload[0]
                      const v = Number(p.value)
                      const pct = (p.payload as { pct?: string } | undefined)?.pct
                      return (
                        <div style={ZENITH_CHART_CUSTOM_TOOLTIP_SHELL}>
                          <div style={{ color: 'var(--chart-tooltip-fg)', fontSize: 13, fontWeight: 500 }}>
                            {p.name}: ₹{v.toLocaleString('en-IN')}
                            {pct ? ` (${pct}%)` : ''}
                          </div>
                          {onSegmentClick ? (
                            <div style={{ color: 'var(--accent-gold)', fontSize: 11, marginTop: 4 }}>
                              Click to view projects →
                            </div>
                          ) : null}
                        </div>
                      )
                    }}
                  />
                  {!narrow ? (
                    <Legend
                      verticalAlign="bottom"
                      formatter={(value, entry) => {
                        const pct = (entry?.payload as { pct?: string } | undefined)?.pct
                        return (
                          <span className="text-[color:var(--text-secondary)] text-xs">
                            {value}
                            {pct ? ` · ${pct}%` : ''}
                          </span>
                        )
                      }}
                    />
                  ) : null}
                </PieChart>
              </ResponsiveContainer>
            )}
          </ZenithChartTouchReset>
        )}
      </div>
      {narrow && chartData.length > 0 ? (
        <ul className="mt-3 w-full list-none space-y-2 p-0 m-0 shrink-0" aria-label={`${title} breakdown`}>
          {chartData.map((d, i) => (
            <li
              key={d.name}
              className="flex items-start justify-between gap-2 rounded-lg bg-[color:var(--bg-input)] px-2.5 py-2 border border-[color:var(--border-default)]"
            >
              <span className="flex min-w-0 flex-1 items-start gap-2">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  aria-hidden
                />
                <span className="text-left text-[12px] font-medium leading-snug text-[color:var(--text-primary)]">
                  {d.name}
                </span>
              </span>
              <span className="shrink-0 text-right text-[12px] font-semibold tabular-nums text-[color:var(--accent-gold)]">
                {formatSliceInr(d.value)}
                {d.pct ? (
                  <span className="mt-0.5 block text-[11px] font-medium text-[color:var(--text-muted)]">
                    {String(d.pct).includes('%') ? String(d.pct) : `${d.pct}%`}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )

  if (narrow) {
    return <div className={cardClass}>{cardBody}</div>
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cardClass}>
      {cardBody}
    </motion.div>
  )
}
