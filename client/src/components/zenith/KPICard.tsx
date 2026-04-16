import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { useCountUp } from '../../hooks/useCountUp'
import { useChartColors } from '../../hooks/useChartColors'
import type { ZenithKpiItem } from './zenithKpi'
import type { LucideIcon } from 'lucide-react'

function formatDisplay(item: ZenithKpiItem, animated: number): string {
  switch (item.format) {
    case 'currency':
      return `₹${Math.round(animated).toLocaleString('en-IN')}`
    case 'capacity':
      return `${Math.round(animated)} kW`
    case 'percent':
      return `${animated.toFixed(1)}%`
    default:
      return Math.round(animated).toLocaleString('en-IN')
  }
}

function sparklineTrendUp(sparkline: number[]): boolean | null {
  if (sparkline.length < 2) return null
  const a = sparkline[0] ?? 0
  const b = sparkline[sparkline.length - 1] ?? 0
  return b >= a
}

export default function KPICard({
  item,
  index,
  icon: Icon,
  to,
  onClick,
}: {
  item: ZenithKpiItem
  index: number
  icon: LucideIcon
  /** When set, the whole tile navigates (e.g. legacy deep links) */
  to?: string
  /** When set, opens quick drawer / in-app action instead of navigating (takes precedence over `to`) */
  onClick?: () => void
}) {
  const c = useChartColors()
  const target =
    item.format === 'percent' && item.key === 'conversion' ? item.value : item.value

  const animated = useCountUp(target, 1200, item.format === 'percent' ? 1 : 0)

  const spark = item.sparkline.length ? item.sparkline : [0, 0, 0, 0, 0, 0, 0]
  const sparkData = spark.map((v, i) => ({ i, v }))
  const up = sparklineTrendUp(spark)
  const lineColor = up === false ? c.red : c.gold

  const change = item.changePct
  const showBadge = change != null && !Number.isNaN(change)
  const positive = showBadge && change! > 0
  const negative = showBadge && change! < 0

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`relative rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-3.5 w-full min-w-0 h-full overflow-hidden group transition-[box-shadow,transform,border-color] duration-200 ease-out hover:-translate-y-px hover:border-[color:var(--border-strong)]${to || onClick ? ' cursor-pointer' : ''}`}
    >
      <div
        className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-[0.12] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.18]"
        style={{ background: 'radial-gradient(circle, color-mix(in_srgb,var(--accent-gold) 55%, transparent) 0%, transparent 70%)' }}
      />

      {showBadge ? (
        <div
          className="absolute top-2.5 right-2.5 z-10 text-[9px] font-bold tabular-nums tracking-tight"
          style={{ color: positive ? c.teal : negative ? c.red : c.axisText }}
        >
          {positive ? '▲' : negative ? '▼' : '—'} {Math.abs(change!).toFixed(1)}%
        </div>
      ) : null}

      <div className={`relative flex items-start gap-2 mb-1.5 ${showBadge ? 'pr-14' : 'pr-2'}`}>
        <div className="p-1.5 rounded-lg bg-[color:var(--bg-surface)] border border-[color:var(--border-default)] shrink-0">
          <Icon className="w-[18px] h-[18px] text-[color:var(--accent-gold)]" strokeWidth={2} />
        </div>
      </div>

      <p className="zenith-kpi-value relative text-lg tabular-nums leading-tight text-[color:var(--text-primary)] sm:text-xl">
        {formatDisplay(item, animated)}
      </p>
      <p className="mt-1 line-clamp-2 text-[10px] font-medium uppercase leading-tight tracking-wider text-[color:var(--text-muted)]">
        {item.label}
      </p>

      <div className="h-8 sm:h-9 mt-2 w-full opacity-[0.88] group-hover:opacity-100 transition-opacity duration-200">
        <ResponsiveContainer width="100%" height={36} minWidth={0}>
          <LineChart data={sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <Line
              type="monotone"
              dataKey="v"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block h-full min-w-0 w-full rounded-xl border-0 bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-page)]"
        aria-label={`Open list: ${item.label}`}
      >
        {inner}
      </button>
    )
  }

  if (to) {
    return (
      <Link
        to={to}
        className="block h-full min-w-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-page)]"
        aria-label={`View projects: ${item.label}`}
      >
        {inner}
      </Link>
    )
  }

  return inner
}
