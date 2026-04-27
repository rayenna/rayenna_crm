import React from 'react'

const PARTS = [
  { label: 'Activity', maxLabel: '30' },
  { label: 'Momentum', maxLabel: '25' },
  { label: 'Deal value', maxLabel: '20' },
  { label: 'Close date', maxLabel: '15' },
  { label: 'Source', maxLabel: '10' },
] as const

/**
 * Help-only visual for Deal Health = sum of five capped parts (replaces ASCII box in markdown).
 */
export default function DealHealthScoreHelpIllustration() {
  return (
    <div
      className="mb-4 rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-input)] px-3 py-4 shadow-inner ring-1 ring-[color:var(--border-default)] sm:px-5 sm:py-5"
      role="img"
      aria-label="Deal Health equals Activity plus Momentum plus Deal value plus Close date plus Source. Maximum points are thirty, twenty-five, twenty, fifteen, and ten. Total capped at zero to one hundred."
    >
      <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-3 text-center sm:gap-x-2">
        <span className="text-sm font-bold tracking-tight text-[color:var(--accent-teal)] sm:text-base">DEAL HEALTH</span>
        <span className="text-sm font-medium text-[color:var(--text-muted)] sm:text-base" aria-hidden>
          =
        </span>
        {PARTS.map((p, i) => (
          <React.Fragment key={p.label}>
            {i > 0 ? (
              <span className="text-sm font-medium text-[color:var(--text-muted)] sm:text-base" aria-hidden>
                +
              </span>
            ) : null}
            <div className="flex min-w-[4.5rem] flex-col items-center gap-0.5 sm:min-w-[5rem]">
              <span className="text-xs font-semibold leading-tight text-[color:var(--text-primary)] sm:text-sm">{p.label}</span>
              <span className="whitespace-nowrap text-[10px] font-medium tabular-nums text-[color:var(--text-muted)] sm:text-[11px]">
                (max {p.maxLabel})
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>
      <p className="mt-4 border-t border-[color:var(--border-default)] pt-3 text-center text-xs leading-snug text-[color:var(--text-secondary)] sm:text-sm">
        All five add together →{' '}
        <span className="font-semibold tabular-nums text-[color:var(--text-primary)]">0–100</span>
      </p>
    </div>
  )
}
