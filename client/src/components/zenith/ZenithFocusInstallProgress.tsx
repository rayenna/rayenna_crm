import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import type { InstallRow } from './zenithFocusRowTypes'
import {
  computeInstallProgress,
  expectedDateBeforeStart,
  getInstallProgressColor,
  installBarWidthPercent,
  installTimelineOverdue,
} from './zenithInstallPulseUtils'

export default function ZenithFocusInstallProgress({ row }: { row: InstallRow }) {
  const progressPct = computeInstallProgress(row)
  const dateInvalid = expectedDateBeforeStart(row.startDate, row.expectedCompletion)
  const overdue = installTimelineOverdue(row, progressPct)
  const fillPct = installBarWidthPercent(row, progressPct, overdue)
  const color = getInstallProgressColor(progressPct, overdue)
  const displayPct = overdue && progressPct < 100 ? 100 : progressPct
  const [w, setW] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(fillPct))
    return () => cancelAnimationFrame(id)
  }, [fillPct])

  let statusLabel: string | null = null
  if (overdue && progressPct < 100) statusLabel = 'OVERDUE'
  else if (progressPct === 0 && !row.startDate) statusLabel = 'NOT STARTED'
  else if (progressPct === 0 && row.startDate) {
    const st = new Date(row.startDate)
    st.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (st > today) statusLabel = `STARTS ${format(st, 'dd MMM yy')}`
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex items-center justify-between gap-1 mb-0.5 min-h-[14px]">
        {statusLabel ? (
          <span
            className="text-[9px] font-bold tracking-wide"
            style={{ color: overdue ? 'var(--accent-red)' : 'var(--text-muted)' }}
          >
            {statusLabel}
          </span>
        ) : (
          <span />
        )}
        {dateInvalid ? (
          <span
            title="Expected date is before start date — please update the project record"
            className="text-[10px] cursor-help"
            style={{ color: 'var(--accent-gold)' }}
          >
            ⚠️
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="flex-1 h-[5px] rounded-[3px] overflow-hidden min-w-0"
          style={{ background: 'var(--bg-ticker)' }}
        >
          <div
            className="h-full rounded-[3px] transition-[width] duration-[800ms] ease-out"
            style={{ width: `${w}%`, background: color }}
          />
        </div>
        <span className="text-[11px] tabular-nums text-[color:var(--text-muted)] shrink-0 w-8 text-right">
          {displayPct}%
        </span>
      </div>
    </div>
  )
}
