import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const COLORS = ['#f5a623', '#00d4b4', '#a78bfa', '#38bdf8', '#fb7185', '#fbbf24']

export interface SegmentSlice {
  name: string
  value: number
  percentage?: string
}

export default function SegmentDonut({
  title,
  data,
}: {
  title: string
  data: SegmentSlice[]
}) {
  const chartData = useMemo(
    () => data.filter((d) => d.value > 0).map((d) => ({ name: d.name, value: d.value, pct: d.percentage })),
    [data],
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="zenith-glass rounded-2xl p-4 sm:p-5 min-h-[340px] flex flex-col"
    >
      <h3 className="zenith-display text-base sm:text-lg font-bold text-white mb-4">{title}</h3>
      <div className="flex-1 min-h-[260px] w-full min-w-0">
        {chartData.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-16">No data for this period</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius="58%"
                outerRadius="82%"
                paddingAngle={2}
                dataKey="value"
                animationBegin={0}
                animationDuration={900}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgba(0,0,0,0.2)" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, _n, p) => {
                  const pct = (p?.payload as { pct?: string })?.pct
                  return [`₹${value.toLocaleString('en-IN')}${pct ? ` (${pct}%)` : ''}`, '']
                }}
                contentStyle={{
                  background: 'rgba(10,10,15,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                }}
              />
              <Legend
                verticalAlign="bottom"
                formatter={(value, entry) => {
                  const pct = (entry.payload as { pct?: string })?.pct
                  return (
                    <span className="text-white/80 text-xs">
                      {value}
                      {pct ? ` · ${pct}%` : ''}
                    </span>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  )
}
