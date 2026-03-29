import { motion } from 'framer-motion'

export interface ProfitRow {
  text: string
  value: number
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase()
}

export default function CustomerProfitabilityRank({ rows }: { rows: ProfitRow[] }) {
  const sorted = [...rows].sort((a, b) => b.value - a.value).slice(0, 15)
  const max = sorted[0]?.value ?? 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="zenith-glass rounded-2xl p-4 sm:p-5 min-h-[340px] flex flex-col"
    >
      <h3 className="zenith-display text-base sm:text-lg font-bold text-white mb-1">
        Top customers by profitability
      </h3>
      <p className="text-xs text-white/45 mb-4">Ranked by profitability index from CRM</p>
      <div className="space-y-2 flex-1 overflow-y-auto max-h-[280px] pr-1">
        {sorted.length === 0 ? (
          <p className="text-sm text-white/40 py-8 text-center">No profitability data</p>
        ) : (
          sorted.map((r, i) => (
            <div
              key={`${r.text}-${i}`}
              className="flex items-center gap-3 p-2 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f5a623]/40 to-[#00d4b4]/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {initials(r.text)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate" title={r.text}>
                  {r.text}
                </p>
                <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#f5a623] to-[#00d4b4]"
                    style={{ width: `${Math.max(8, (r.value / max) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-xs font-bold text-[#00d4b4] tabular-nums flex-shrink-0">
                ₹{Math.round(r.value).toLocaleString('en-IN')}
              </span>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}
