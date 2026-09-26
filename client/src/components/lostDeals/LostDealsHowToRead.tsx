import { useState } from 'react'

const HOWTO_STORAGE_KEY = 'rayenna_lost_deals_howto_closed'

/**
 * Collapsible reason legend for Lost projects list.
 */
export default function LostDealsHowToRead() {
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
    <div className="mb-3 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)]">
      <button
        type="button"
        onClick={toggle}
        className="flex min-h-[40px] w-full touch-manipulation items-center justify-between gap-2 px-3 py-2 text-left"
        aria-expanded={open}
        aria-controls="lost-deals-howto-read"
      >
        <span className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          How to read this list
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
          id="lost-deals-howto-read"
          className="border-t border-[color:var(--border-default)] px-3 pb-3 pt-2 text-[11px] leading-snug text-[color:var(--text-secondary)] sm:text-xs"
        >
          <ul className="m-0 list-none space-y-1.5 p-0">
            <li className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-2 py-0.5 text-[10px] font-bold uppercase text-[color:var(--accent-gold)]">
                Uncategorized
              </span>
              <span>No Lost reason set on Edit Project — tag these first</span>
            </li>
            <li>
              <span className="font-semibold text-[color:var(--text-primary)]">Lost to Competition</span>
              {' — '}
              subtypes (Price, Features, Timeline, …) live under that reason; tap the competition
              chart to filter them.
            </li>
            <li>
              <span className="font-semibold text-[color:var(--text-primary)]">Value</span>
              {' — '}
              project cost (₹). Win rate compares won stages vs Lost in the same FY filter.
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  )
}
