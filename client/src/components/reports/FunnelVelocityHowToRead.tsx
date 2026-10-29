import { useState } from 'react'

const HOWTO_STORAGE_KEY = 'rayenna_funnel_velocity_howto_closed'

export default function FunnelVelocityHowToRead() {
  const [open, setOpen] = useState(() => {
    try {
      return sessionStorage.getItem(HOWTO_STORAGE_KEY) !== '1'
    } catch {
      return false
    }
  })

  const toggle = () => {
    setOpen((v) => {
      const next = !v
      if (!next) {
        try {
          sessionStorage.setItem(HOWTO_STORAGE_KEY, '1')
        } catch {
          // ignore
        }
      }
      return next
    })
  }

  return (
    <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] print:hidden">
      <button
        type="button"
        onClick={toggle}
        className="flex min-h-[40px] w-full touch-manipulation items-center justify-between gap-2 px-3 py-2 text-left"
        aria-expanded={open}
        aria-controls="funnel-velocity-howto"
      >
        <span className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          How to read this report
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-[color:var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
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
          id="funnel-velocity-howto"
          className="space-y-2 border-t border-[color:var(--border-default)] px-3 pb-3 pt-2 text-[11px] leading-snug text-[color:var(--text-secondary)] sm:text-xs"
        >
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">Open funnel</span> is
            Lead, Site survey, and Proposal only. Confirmed jobs belong on Delivery Control. Days in
            stage uses the stage-entered date; if that is missing, the created date is used and the
            row is flagged <strong>Stage date estimated</strong>.
          </p>
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">SLA</span> matches Data
            Sense: Lead 7 days, Site survey 14, Proposal 21. Under 70% of SLA is on track, 70–90% is
            amber, 90%+ is red. Future dates clamp to 0 days.
          </p>
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">Win rate</span> is
            confirmed YTD ÷ (confirmed YTD + lost YTD) for the current Indian FY. Median days to
            confirm / lose is created date → confirmation or lost date — not a full stage-history
            funnel.
          </p>
          <p>
            On laptop, click a column heading to filter and sort. Tap a row to open the project;
            coming back keeps the seller picker and list filters until you click Clear filters.
            Export downloads Excel, PDF, or PowerPoint of the current seller pack (on-screen list
            filters stay in the browser).
          </p>
        </div>
      ) : null}
    </div>
  )
}
