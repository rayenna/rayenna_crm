import { useState } from 'react'

const HOWTO_STORAGE_KEY = 'rayenna_solar_hub_howto_closed'

/**
 * Collapsible plant / status legend for Solar Hub Users list.
 * Defaults open until collapsed once in the session.
 */
export default function SolarHubListHowToRead() {
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
    <div className="mb-3 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] ring-1 ring-[color:var(--border-default)]">
      <button
        type="button"
        onClick={toggle}
        className="flex min-h-[40px] w-full items-center justify-between gap-2 px-3 py-2 text-left touch-manipulation"
        aria-expanded={open}
        aria-controls="solar-hub-howto-read"
      >
        <span className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          How to read this list
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
          id="solar-hub-howto-read"
          className="border-t border-[color:var(--border-default)] px-3 pb-3 pt-2 text-[11px] leading-snug text-[color:var(--text-secondary)] sm:text-xs"
        >
          <p className="mb-2 font-semibold text-[color:var(--text-primary)]">Cloud plant</p>
          <ul className="m-0 list-none space-y-1.5 p-0">
            <li className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[color:var(--accent-teal-muted)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--accent-teal)]">
                Solis
              </span>
              <span>SolisCloud plant linked on the CRM project</span>
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[color:var(--accent-teal-muted)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--accent-teal)]">
                Deye
              </span>
              <span>Deye Cloud plant linked on the CRM project</span>
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-2 py-0.5 text-[10px] font-bold uppercase text-[color:var(--accent-gold)]">
                Unlinked
              </span>
              <span>No OEM plant ID yet — open the user to link Solis or Deye</span>
            </li>
          </ul>
          <p className="mt-3 text-[color:var(--text-secondary)]">
            <span className="font-semibold text-[color:var(--text-primary)]">Active</span>
            {' / '}
            <span className="font-semibold text-[color:var(--text-primary)]">Inactive</span>
            {' — '}whether the homeowner can sign in to the Hub app.
          </p>
        </div>
      ) : null}
    </div>
  )
}
