import { motion } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { useCountUp } from '../../hooks/useCountUp'
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

export default function KPICard({
  item,
  index,
  icon: Icon,
}: {
  item: ZenithKpiItem
  index: number
  icon: LucideIcon
}) {
  const end =
    item.format === 'percent' && item.key === 'conversion'
      ? item.value
      : item.value
  const animated = useCountUp(end, { durationMs: 1000, decimals: item.format === 'percent' ? 1 : 0 })

  const sparkData = item.sparkline.map((v, i) => ({ i, v }))
  const change = item.changePct
  const changeColor =
    change == null ? 'text-white/40' : change > 0 ? 'text-[#00d4b4]' : change < 0 ? 'text-[#ff4757]' : 'text-white/50'

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45 }}
      whileHover={{
        y: -4,
        boxShadow: '0 0 32px rgba(245, 166, 35, 0.12)',
      }}
      className="relative zenith-glass rounded-2xl p-4 w-full min-w-0 h-full overflow-hidden group"
    >
      <div
        className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-30 blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(245,166,35,0.45) 0%, transparent 70%)' }}
      />
      <div className="relative flex items-start justify-between gap-2 mb-2">
        <div className="p-2 rounded-xl bg-gradient-to-br from-[#f5a623]/25 to-[#00d4b4]/10 border border-white/10">
          <Icon className="w-5 h-5 text-[#f5a623]" strokeWidth={2} />
        </div>
        {change != null ? (
          <span className={`text-[10px] font-bold uppercase tracking-wide ${changeColor}`}>
            {change > 0 ? '+' : ''}
            {change.toFixed(1)}%
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-white/35">YoY n/a</span>
        )}
      </div>
      <p className="zenith-kpi-value text-xl sm:text-2xl text-white tabular-nums">
        {formatDisplay(item, animated)}
      </p>
      <p className="text-[11px] font-medium text-white/45 mt-1 uppercase tracking-wider">{item.label}</p>
      <div className="h-12 mt-3 opacity-80 group-hover:opacity-100 transition-opacity">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <Tooltip
              contentStyle={{
                background: 'rgba(10,10,15,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 11,
              }}
              labelStyle={{ display: 'none' }}
              formatter={(v: number) => [v.toFixed(item.format === 'percent' ? 1 : 0), '']}
            />
            <Line
              type="monotone"
              dataKey="v"
              stroke="#f5a623"
              strokeWidth={2}
              dot={false}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
