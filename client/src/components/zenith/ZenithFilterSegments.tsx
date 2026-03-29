import { useEffect, useRef } from 'react'
import { RotateCcw } from 'lucide-react'
import { ZENITH_MONTHS, ZENITH_QUARTER_MONTHS, ZENITH_QUARTERS } from './zenithFilterConstants'

interface Props {
  availableFYs: string[]
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
  onFYChange: (fys: string[]) => void
  onQuarterChange: (q: string[]) => void
  onMonthChange: (m: string[]) => void
  /** Clear FY, quarter, and month (same as classic dashboard “all periods”). */
  onResetAll: () => void
}

export default function ZenithFilterSegments({
  availableFYs,
  selectedFYs,
  selectedQuarters,
  selectedMonths,
  onFYChange,
  onQuarterChange,
  onMonthChange,
  onResetAll,
}: Props) {
  const prevFYCountRef = useRef<number | null>(null)

  useEffect(() => {
    const currentCount = selectedFYs.length
    const prevCount = prevFYCountRef.current
    if (prevCount === 1 && currentCount !== 1) {
      onQuarterChange([])
      onMonthChange([])
    }
    prevFYCountRef.current = currentCount
  }, [selectedFYs, onQuarterChange, onMonthChange])

  useEffect(() => {
    if (selectedQuarters.length > 0 && selectedMonths.length > 0) {
      const allowed = new Set(selectedQuarters.flatMap((q) => ZENITH_QUARTER_MONTHS[q] ?? []))
      const valid = selectedMonths.filter((m) => allowed.has(m))
      if (valid.length !== selectedMonths.length) onMonthChange(valid)
    }
  }, [selectedQuarters, selectedMonths, onMonthChange])

  const singleFY = selectedFYs.length === 1
  const fySorted = [...availableFYs].sort()
  const hasAnyFilter =
    selectedFYs.length > 0 || selectedQuarters.length > 0 || selectedMonths.length > 0

  const toggle = (arr: string[], v: string, set: (x: string[]) => void) => {
    if (arr.includes(v)) set(arr.filter((x) => x !== v))
    else set([...arr, v])
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-white/40 w-full text-center sm:w-auto sm:mr-2">
          FY
        </span>
        {fySorted.map((fy) => {
          const on = selectedFYs.includes(fy)
          return (
            <button
              key={fy}
              type="button"
              onClick={() => toggle(selectedFYs, fy, onFYChange)}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all tabular-nums tracking-tight ${
                on
                  ? 'bg-[#f5a623]/25 text-[#f5a623] border-[#f5a623]/50 shadow-[0_0_16px_rgba(245,166,35,0.2)]'
                  : 'bg-white/5 text-white/60 border-white/10 hover:border-white/25'
              }`}
            >
              {fy}
            </button>
          )
        })}
        {hasAnyFilter ? (
          <button
            type="button"
            onClick={onResetAll}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border border-white/20 text-white/80 hover:text-white hover:border-[#00d4b4]/50 hover:bg-[#00d4b4]/10 transition-all"
            title="Clear all date filters (show all periods)"
          >
            <RotateCcw className="w-3.5 h-3.5 opacity-80" aria-hidden />
            Reset
          </button>
        ) : null}
      </div>

      {singleFY ? (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-white/40 w-full text-center sm:w-auto sm:mr-2">
            Qtr
          </span>
          {ZENITH_QUARTERS.map((q) => {
            const on = selectedQuarters.includes(q.value)
            return (
              <button
                key={q.value}
                type="button"
                onClick={() => toggle(selectedQuarters, q.value, onQuarterChange)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  on
                    ? 'bg-[#00d4b4]/20 text-[#00d4b4] border-[#00d4b4]/40'
                    : 'bg-white/5 text-white/60 border-white/10 hover:border-white/25'
                }`}
              >
                {q.label}
              </button>
            )
          })}
        </div>
      ) : null}

      {singleFY ? (
        <div className="flex flex-wrap items-center justify-center gap-1 max-h-[72px] overflow-y-auto sm:max-h-none">
          <span className="text-[10px] uppercase tracking-widest text-white/40 w-full text-center sm:w-auto sm:mr-2">
            Mo
          </span>
          {ZENITH_MONTHS.map((m) => {
            const allowed =
              selectedQuarters.length === 0
                ? true
                : selectedQuarters.some((q) => (ZENITH_QUARTER_MONTHS[q] ?? []).includes(m.value))
            const on = selectedMonths.includes(m.value)
            if (!allowed) return null
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => toggle(selectedMonths, m.value, onMonthChange)}
                className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                  on
                    ? 'bg-white/15 text-white border-white/30'
                    : 'bg-white/5 text-white/50 border-white/10 hover:border-white/25'
                }`}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
