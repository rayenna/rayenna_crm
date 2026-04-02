import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { ZENITH_DONUT_CHART_HEIGHT_MOBILE_PX, ZENITH_DONUT_CHART_HEIGHT_PX } from './zenithDonutConstants'
import ZenithChartTouchReset from './ZenithChartTouchReset'

const COLORS = ['#f5a623', '#00d4b4', '#a78bfa', '#38bdf8', '#fb7185', '#fbbf24']

export interface SegmentSlice {
  name: string
  value: number
  percentage?: string
}

export default function SegmentDonut({
  title,
  data,
  onSegmentClick,
  showExploreHint,
}: {
  title: string
  data: SegmentSlice[]
  onSegmentClick?: (segmentName: string) => void
  showExploreHint?: boolean
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

  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const u = () => setNarrow(mq.matches)
    u()
    mq.addEventListener('change', u)
    return () => mq.removeEventListener('change', u)
  }, [])

  const chartHeightPx = narrow ? ZENITH_DONUT_CHART_HEIGHT_MOBILE_PX : ZENITH_DONUT_CHART_HEIGHT_PX
  const pieMargin = narrow ? { top: 10, bottom: 14, left: 6, right: 6 } : undefined

  const cardClass = 'zenith-segment-donut-card zenith-glass rounded-xl p-3 sm:p-4 flex flex-col'

  const cardBody = (
    <>
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="zenith-display text-sm sm:text-[15px] font-semibold text-white/95 min-w-0">
          {title}
        </h3>
        {showExploreHint ? (
          <span
            className="shrink-0 pt-0.5 italic text-[10px] text-white/[0.25]"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Click to explore →
          </span>
        ) : null}
      </div>
      <div className="zenith-chart-slot w-full min-w-0" style={{ height: chartHeightPx }}>
        {chartData.length === 0 ? (
          <p className="text-sm text-white/40 text-center flex items-center justify-center h-full">
            No data for this period
          </p>
        ) : (
          <ZenithChartTouchReset>
            {(rk) => (
              <ResponsiveContainer key={rk} width="100%" height={chartHeightPx} minWidth={0}>
                <PieChart margin={pieMargin}>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy={narrow ? '48%' : '45%'}
                    innerRadius={narrow ? '52%' : '58%'}
                    outerRadius={narrow ? '70%' : '82%'}
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
                        stroke="rgba(0,0,0,0.2)"
                        style={{
                          cursor: onSegmentClick ? 'pointer' : 'default',
                          filter: 'brightness(1)',
                          transition: 'filter 0.15s, transform 0.15s',
                          transformOrigin: 'center',
                        }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as SVGElement
                          el.style.filter = 'brightness(1.25)'
                          el.style.transform = 'scale(1.04)'
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget as SVGElement
                          el.style.filter = 'brightness(1)'
                          el.style.transform = 'scale(1)'
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const p = payload[0]
                      const v = Number(p.value)
                      const pct = (p.payload as { pct?: string })?.pct
                      return (
                        <div
                          style={{
                            background: '#1A1A2E',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8,
                            padding: '8px 12px',
                            fontFamily: 'DM Sans, sans-serif',
                          }}
                        >
                          <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
                            {p.name}: ₹{v.toLocaleString('en-IN')}
                            {pct ? ` (${pct}%)` : ''}
                          </div>
                          {onSegmentClick ? (
                            <div style={{ color: '#F5A623', fontSize: 11, marginTop: 4 }}>
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
                          <span className="text-white/80 text-xs">
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
        <p
          className="mt-2 text-center text-[10px] leading-snug text-white/45 px-1"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          {chartData.map((d) => (d.pct ? `${d.name} · ${d.pct}%` : d.name)).join(' · ')}
        </p>
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
