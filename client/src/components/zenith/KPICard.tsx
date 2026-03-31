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
      className="relative zenith-glass rounded-xl p-3 sm:p-3.5 w-full min-w-0 h-full overflow-hidden group transition-[box-shadow,transform,border-color] duration-200 ease-out hover:-translate-y-px hover:border-[color:rgba(255,255,255,0.11)] hover:shadow-md hover:shadow-black/30"
    >
      <div
        className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-[0.12] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.18]"
        style={{ background: 'radial-gradient(circle, rgba(245,166,35,0.5) 0%, transparent 70%)' }}
      />

      {showBadge ? (
        <div
          className="absolute top-2.5 right-2.5 z-10 text-[9px] font-bold tabular-nums tracking-tight"
          style={{ color: positive ? TEAL : negative ? CRIMSON : 'rgba(255,255,255,0.45)' }}
        >
          {positive ? '▲' : negative ? '▼' : '—'} {Math.abs(change!).toFixed(1)}%
        </div>
      ) : null}

      <div className={`relative flex items-start gap-2 mb-1.5 ${showBadge ? 'pr-14' : 'pr-2'}`}>
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#f5a623]/18 to-[#00d4b4]/08 border border-white/[0.08] shrink-0">
          <Icon className="w-[18px] h-[18px] text-[#f5a623]" strokeWidth={2} />
        </div>
      </div>

      <p className="zenith-kpi-value text-lg sm:text-xl text-white tabular-nums relative leading-tight">
        {formatDisplay(item, animated)}
      </p>
      <p className="text-[10px] font-medium text-white/40 mt-1 uppercase tracking-wider leading-tight line-clamp-2">
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
}
