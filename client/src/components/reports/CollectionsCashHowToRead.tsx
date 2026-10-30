import { useState } from 'react'

const HOWTO_STORAGE_KEY = 'rayenna_collections_cash_howto_closed'

export default function CollectionsCashHowToRead() {
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
        aria-controls="collections-cash-howto"
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
          id="collections-cash-howto"
          className="space-y-2 border-t border-[color:var(--border-default)] px-3 pb-3 pt-2 text-[11px] leading-snug text-[color:var(--text-secondary)] sm:text-xs"
        >
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">Outstanding</span> is
            customer balance on <strong>confirmed-and-beyond</strong> jobs only (Confirmed, Installation,
            Submitted for subsidy, Completed). Lead / Site survey / Proposal are pipeline — they are
            not collectible until the order is confirmed. Lost jobs are off this book.
          </p>
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">Staged collections</span>
            : after confirmation, money is due in stages.{' '}
            <strong>Advance due</strong> = nothing received yet (clock from confirmation).{' '}
            <strong>Next installment</strong> = Partial (clock from last payment). Aging buckets are
            0–30 / 31–60 / 61–90 / 90+ days.
          </p>
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">Cash vs loan</span> splits
            the same outstanding ₹. They add up to Outstanding. <strong>Subsidy in flight</strong> is
            a separate chase list (requested or submitted / completed, not yet credited). It uses
            order value, not customer balance — a job can be fully paid by the customer and still sit
            here waiting on the scheme.
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
