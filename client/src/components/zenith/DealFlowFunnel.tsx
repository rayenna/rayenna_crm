import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { ZenithFunnelStage } from './zenithFunnel'

export default function DealFlowFunnel({ stages }: { stages: ZenithFunnelStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.count))

  return (
    <div className="zenith-glass rounded-2xl p-4 sm:p-6 overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="zenith-display text-lg font-bold text-white tracking-tight">Deal Flow</h3>
        <span className="text-[10px] uppercase tracking-widest text-white/40">Pipeline</span>
      </div>

      {/* Desktop / tablet: horizontal funnel */}
      <div className="hidden md:flex flex-row items-stretch gap-1 lg:gap-0 min-h-[120px]">
        {stages.map((s, i) => {
          const prev = i > 0 ? stages[i - 1]!.count : null
          const conv =
            prev != null && prev > 0 ? ((s.count / prev) * 100).toFixed(1) : '—'
          const w = 8 + (s.count / max) * 22
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, scaleX: 0.85 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="flex-1 min-w-0 flex flex-col justify-end"
              style={{ flex: `${w} 1 0%` }}
            >
              <Link
                to={s.to}
                className="block group relative rounded-lg overflow-hidden border border-white/[0.08] hover:border-[#f5a623]/40 transition-colors"
                title={`${s.label}: ${s.count} projects · ${conv}% from prior stage`}
              >
                <div
                  className={`h-24 lg:h-28 bg-gradient-to-b ${s.gradient} opacity-90 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2`}
                  style={{
                    clipPath: 'polygon(8% 0, 92% 0, 100% 100%, 0% 100%)',
                  }}
                >
                  <span className="text-[10px] font-bold text-white/90 uppercase tracking-wide truncate">
                    {s.label}
                  </span>
                  <span className="text-xl font-extrabold text-white tabular-nums">{s.count}</span>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {/* Mobile: vertical stepper */}
      <div className="md:hidden space-y-2">
        {stages.map((s, i) => {
          const prev = i > 0 ? stages[i - 1]!.count : null
          const conv =
            prev != null && prev > 0 ? ((s.count / prev) * 100).toFixed(1) : '—'
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={s.to}
                className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 bg-gradient-to-r ${s.gradient} bg-opacity-20 border border-white/10 hover:border-[#f5a623]/35`}
              >
                <span className="text-sm font-semibold text-white">{s.label}</span>
                <span className="text-sm text-white/70 tabular-nums">
                  {s.count}{' '}
                  <span className="text-white/40 text-xs ml-1">({conv}%)</span>
                </span>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
