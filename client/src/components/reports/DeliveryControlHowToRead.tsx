import { useState } from 'react'

const HOWTO_STORAGE_KEY = 'rayenna_delivery_control_howto_closed'

export default function DeliveryControlHowToRead() {
  const [open, setOpen] = useState(false)

  const toggle = () => {
    setOpen((v) => !v)
    try {
      sessionStorage.setItem(HOWTO_STORAGE_KEY, '1')
    } catch {
      // ignore
    }
  }

  return (
    <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] print:hidden">
      <button
        type="button"
        onClick={toggle}
        className="flex min-h-[40px] w-full touch-manipulation items-center justify-between gap-2 px-3 py-2 text-left"
        aria-expanded={open}
        aria-controls="delivery-control-howto"
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
          id="delivery-control-howto"
          className="space-y-2 border-t border-[color:var(--border-default)] px-3 pb-3 pt-2 text-[11px] leading-snug text-[color:var(--text-secondary)] sm:text-xs"
        >
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">In delivery</span> is
            Confirmed, Under Installation, and Submitted for Subsidy. Completed jobs are off this
            board — they already left the factory.
          </p>
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">Commissioning board</span>{' '}
            buckets jobs by expected commissioning into CQ / NQ / NQ+1 / NQ+2 (same windows as Sales
            Review). Overdue dates sit in CQ. Jobs with no date are unscheduled, not stuffed into
            TOTAL.
          </p>
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">Blockers</span> are
            exceptions: overdue or missing commissioning date, unassigned ops, KSEB feasibility /
            registration gaps, MNRE portal or completion report after install, missing KSEB / MNRE
            documents. Subsidy-only flags stay off non-subsidy jobs.
          </p>
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">Subsidy clock</span> is
            subsidy-segment jobs from Confirmed until credit. Current step is the first missing date
            (KSEB feasibility → registration → install → MNRE portal → completion report → request →
            awaiting credit). Completed jobs that are not yet credited stay on this clock. Pipeline
            (Lead / Survey / Proposal) is not collectible subsidy work.
          </p>
          <p>
            On laptop, click a column heading to filter and sort. Tap a row to open the project;
            coming back keeps the ops picker and list filters until you click Clear filters.
            Export downloads Excel, PDF, or PowerPoint of the current ops pack (on-screen job-list
            filters stay in the browser).
          </p>
        </div>
      ) : null}
    </div>
  )
}
