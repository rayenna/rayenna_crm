import { useState } from 'react'

const HOWTO_STORAGE_KEY = 'rayenna_margin_mix_howto_closed'

export default function MarginMixHowToRead() {
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
        aria-controls="margin-mix-howto"
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
          id="margin-mix-howto"
          className="space-y-2 border-t border-[color:var(--border-default)] px-3 pb-3 pt-2 text-[11px] leading-snug text-[color:var(--text-secondary)] sm:text-xs"
        >
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">Won book</span> is
            Confirmed, Installation, Submitted for subsidy, and Completed. Use the FY and quarter
            pickers (next to seller) to change the window. Quarter uses confirmation date (Q1 Apr–Jun
            through Q4 Jan–Mar). Jobs with no confirmation date stay in All quarters only. Lead /
            Survey / Proposal / Lost are off this pack.
          </p>
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">Gross profit</span> uses
            CRM GP, then expected profit (flagged estimated), then order value minus total project cost.
            <strong> GP %</strong> is profit ÷ order value, weighted in mix tables. Thin is under 10%.
          </p>
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">Missing cost</span> means
            no CRM total project cost. <strong>PE vs CRM</strong> flags a latest Proposal Engine costing
            sheet that is 10%+ away from CRM cost, or PE cost with no CRM cost yet.
          </p>
          <p>
            On laptop, click a column heading to filter and sort. Tap a row to open the project.
            Export downloads Excel, PDF, or PowerPoint of the current seller and period pack
            (on-screen list filters stay in the browser). YoY is versus the same FY or quarter last
            year.
          </p>
        </div>
      ) : null}
    </div>
  )
}
