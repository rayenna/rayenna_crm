import { useState } from 'react'

const HOWTO_STORAGE_KEY = 'rayenna_sales_review_howto_closed'

export default function SalesReviewHowToRead() {
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
        aria-controls="sales-review-howto"
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
          id="sales-review-howto"
          className="space-y-2 border-t border-[color:var(--border-default)] px-3 pb-3 pt-2 text-[11px] leading-snug text-[color:var(--text-secondary)] sm:text-xs"
        >
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">Achievement</span> is
            confirmed-and-beyond order value (same as Dashboard revenue): Confirmed, Installation,
            Completed. Current FY is year-to-date through today. YoY on the YTD column compares the
            same Apr–today window last year.
          </p>
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">Forecast</span> is open
            pipeline by expected commissioning date. <strong>Weighted</strong> = order value × Sales
            Probability. Overdue dates sit in CQ. Unscheduled deals are called out separately, not
            stuffed into TOTAL.
          </p>
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">Last year actual</span>{' '}
            is closed revenue in that same quarter last year — the bar to beat on the weekly call.
            YoY on forecast is (closed in period + remaining weighted) vs that actual.
          </p>
          <p>
            Deal list is open pipeline only (not Lost / Completed). On laptop, click a column heading
            to filter and sort. Tap a row to open the project. Export downloads Excel, PDF, or
            PowerPoint of the current seller pack.
          </p>
        </div>
      ) : null}
    </div>
  )
}
