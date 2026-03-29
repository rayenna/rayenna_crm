import { motion } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { useCountUp } from '../../hooks/useCountUp'
import type { ZenithKpiItem } from './zenithKpi'
import type { LucideIcon } from 'lucide-react'

const GOLD = '#f5a623'
const CRIMSON = '#dc2626'
const TEAL = '#2dd4bf'

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
}: {
  item: ZenithKpiItem
  index: number
  icon: LucideIcon
}) {
  const target =
    item.format === 'percent' && item.key === 'conversion' ? item.value : item.value

  const animated = useCountUp(target, 1200, item.format === 'percent' ? 1 : 0)

  const spark = item.sparkline.length ? item.sparkline : [0, 0, 0, 0, 0, 0, 0]
  const sparkData = spark.map((v, i) => ({ i, v }))
  const up = sparklineTrendUp(spark)
  const lineColor = up === false ? CRIMSON : GOLD

  const change = item.changePct
  const showBadge = change != null && !Number.isNaN(change)
  const positive = showBadge && change! > 0
  const negative = showBadge && change! < 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative zenith-glass rounded-2xl p-4 w-full min-w-0 h-full overflow-hidden group shadow-none transition-[box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(245,166,35,0.3)]"
    >
      <div
        className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-25 blur-2xl transition-opacity duration-300 group-hover:opacity-35"
        style={{ background: 'radial-gradient(circle, rgba(245,166,35,0.45) 0%, transparent 70%)' }}
      />

      {showBadge ? (
        <div
          className="absolute top-3 right-3 z-10 text-[10px] font-bold tabular-nums tracking-tight"
          style={{ color: positive ? TEAL : negative ? CRIMSON : 'rgba(255,255,255,0.45)' }}
        >
          {positive ? '▲' : negative ? '▼' : '—'} {Math.abs(change!).toFixed(1)}%
        </div>
      ) : (
        <div className="absolute top-3 right-3 z-10 text-[10px] font-semibold text-white/35">n/a</div>
      )}

      <div className="relative flex items-start gap-2 mb-2 pr-16">
        <div className="p-2 rounded-xl bg-gradient-to-br from-[#f5a623]/25 to-[#00d4b4]/10 border border-white/10 shrink-0">
          <Icon className="w-5 h-5 text-[#f5a623]" strokeWidth={2} />
        </div>
      </div>

      <p className="zenith-kpi-value text-xl sm:text-2xl text-white tabular-nums relative">
        {formatDisplay(item, animated)}
      </p>
      <p className="text-[11px] font-medium text-white/45 mt-1 uppercase tracking-wider">{item.label}</p>

      <div className="h-10 mt-3 w-full opacity-90 group-hover:opacity-100 transition-opacity duration-300">
        <ResponsiveContainer width="100%" height={40} minWidth={0}>
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
}
