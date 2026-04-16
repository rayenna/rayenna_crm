import { useEffect, useRef } from 'react'
import { RotateCcw } from 'lucide-react'
import { ZENITH_MONTHS, ZENITH_QUARTER_MONTHS, ZENITH_QUARTERS } from './zenithFilterConstants'

const MULTI = '__multi__'

const selectBase =
  'zenith-filter-mobile-select min-w-0 flex-1 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-2 py-1.5 text-[11px] font-semibold text-[color:var(--text-primary)] ' +
  'focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)] focus:border-[color:var(--accent-gold-border)] ' +
  'disabled:opacity-45 disabled:cursor-not-allowed'

interface Props {
  availableFYs: string[]
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
  onFYChange: (fys: string[]) => void
  onQuarterChange: (q: string[]) => void
  onMonthChange: (m: string[]) => void
  onResetAll: () => void
}

export default function ZenithFilterMobileRow({
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

  const fyValue =
    selectedFYs.length === 1 ? selectedFYs[0]! : selectedFYs.length === 0 ? '' : MULTI

  const qValue =
    selectedQuarters.length === 1
      ? selectedQuarters[0]!
      : selectedQuarters.length === 0
        ? ''
        : MULTI

  const mValue =
    selectedMonths.length === 1
      ? selectedMonths[0]!
      : selectedMonths.length === 0
        ? ''
        : MULTI

  const allowedMonths = ZENITH_MONTHS.filter((m) => {
    if (selectedQuarters.length === 0) return true
    return selectedQuarters.some((q) => (ZENITH_QUARTER_MONTHS[q] ?? []).includes(m.value))
  })

  return (
    <div className="flex w-full min-w-0 items-center gap-1.5">
      <label className="sr-only" htmlFor="zenith-mobile-fy">
        Financial year
      </label>
      <select
        id="zenith-mobile-fy"
        className={selectBase}
        value={fyValue}
        onChange={(e) => {
          const v = e.target.value
          if (v === '' || v === MULTI) onFYChange([])
          else onFYChange([v])
        }}
      >
        {selectedFYs.length > 1 ? (
          <option value={MULTI} disabled>
            {selectedFYs.length} FYs
          </option>
        ) : null}
        <option value="">All FYs</option>
        {fySorted.map((fy) => (
          <option key={fy} value={fy}>
            {fy}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="zenith-mobile-qtr">
        Quarter
      </label>
      <select
        id="zenith-mobile-qtr"
        className={selectBase}
        disabled={!singleFY}
        value={!singleFY ? '' : qValue}
        onChange={(e) => {
          const v = e.target.value
          if (v === '' || v === MULTI) onQuarterChange([])
          else onQuarterChange([v])
        }}
      >
        {!singleFY ? (
          <option value="">Qtr</option>
        ) : (
          <>
            {selectedQuarters.length > 1 ? (
              <option value={MULTI} disabled>
                {selectedQuarters.length} Qtrs
              </option>
            ) : null}
            <option value="">All Qtr</option>
            {ZENITH_QUARTERS.map((q) => (
              <option key={q.value} value={q.value}>
                {q.label}
              </option>
            ))}
          </>
        )}
      </select>

      <label className="sr-only" htmlFor="zenith-mobile-mo">
        Month
      </label>
      <select
        id="zenith-mobile-mo"
        className={selectBase}
        disabled={!singleFY}
        value={!singleFY ? '' : mValue}
        onChange={(e) => {
          const v = e.target.value
          if (v === '' || v === MULTI) onMonthChange([])
          else onMonthChange([v])
        }}
      >
        {!singleFY ? (
          <option value="">Mo</option>
        ) : (
          <>
            {selectedMonths.length > 1 ? (
              <option value={MULTI} disabled>
                {selectedMonths.length} Mo
              </option>
            ) : null}
            <option value="">All Mo</option>
            {allowedMonths.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </>
        )}
      </select>

      {hasAnyFilter ? (
        <button
          type="button"
          onClick={onResetAll}
          title="Clear all date filters"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--border-default)] text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--accent-teal-border)] hover:bg-[color:var(--accent-teal-muted)] hover:text-[color:var(--text-primary)] touch-manipulation"
          aria-label="Reset date filters"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
