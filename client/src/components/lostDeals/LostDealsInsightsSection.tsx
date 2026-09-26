import type { ReactNode } from 'react'
import { useState } from 'react'

type Props = {
  /** When true, charts stay always expanded (desktop). When false, accordion. */
  alwaysOpen: boolean
  children: ReactNode
  /** Optional count of chart panels for the summary line. */
  chartCount?: number
}

/**
 * Mobile: collapsible Insights so Lost projects sit above the fold.
 * Desktop: always show children (typically a 2×2 chart grid).
 */
export default function LostDealsInsightsSection({
  alwaysOpen,
  children,
  chartCount = 4,
}: Props) {
  const [open, setOpen] = useState(false)

  if (alwaysOpen) {
    return <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div>
  }

  return (
    <div className="rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] ring-1 ring-[color:var(--border-default)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[44px] w-full touch-manipulation items-center justify-between gap-2 px-3 py-2.5 text-left sm:px-4"
        aria-expanded={open}
        aria-controls="lost-deals-insights"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[color:var(--text-primary)]">
            Insights
          </span>
          <span className="mt-0.5 block text-[11px] text-[color:var(--text-muted)]">
            {open ? 'Hide' : 'Show'} reason, competition, sales & FY — tap charts to filter the list (
            {chartCount})
          </span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-[color:var(--text-muted)] transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open ? (
        <div
          id="lost-deals-insights"
          className="grid grid-cols-1 gap-4 border-t border-[color:var(--border-default)] px-3 pb-3 pt-3 sm:px-4"
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
