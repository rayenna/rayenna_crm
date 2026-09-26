import { useState } from 'react'
import { FiPaperclip } from 'react-icons/fi'
import { FaTicketAlt, FaUniversity } from 'react-icons/fa'
import {
  getCustomerTypeLegendLabel,
  getProjectNameCustomerTypeColorClass,
} from '../../utils/customerTypeStyles'
import type { CustomerType } from '../../utils/customerRecord'

const HOWTO_STORAGE_KEY = 'rayenna_projects_howto_closed'

type Props = {
  /** When true, include Health column tip (first-time adoption). */
  includeHealthTip?: boolean
}

/**
 * Collapsible “How to read this list” — near results summary so it is not below the fold.
 * Defaults open until the user collapses once (session), then stays closed.
 */
export default function ProjectsListHowToRead({ includeHealthTip = true }: Props) {
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
        aria-controls="projects-howto-read"
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
          id="projects-howto-read"
          className="border-t border-[color:var(--border-default)] px-3 pb-3 pt-2"
        >
          {includeHealthTip ? (
            <p className="mb-2 text-[11px] leading-snug text-[color:var(--text-secondary)]">
              <span className="font-semibold text-[color:var(--text-primary)]">DH</span> is Deal Health
              (hover or long-press the column header; tap or hover the badge for score factors).
            </p>
          ) : null}
          <div className="grid grid-cols-2 items-center gap-x-4 gap-y-2 text-[11px] leading-relaxed text-[color:var(--text-secondary)] sm:grid-cols-3 sm:text-xs lg:grid-cols-6">
            <span className="col-span-2 inline-flex items-center gap-1.5 font-semibold text-[color:var(--text-primary)] sm:col-span-3 lg:col-span-6">
              Project name colour (customer type)
            </span>
            {(['RESIDENTIAL', 'APARTMENT', 'COMMERCIAL'] as CustomerType[]).map((ct) => (
              <span key={ct} className="inline-flex shrink-0 items-center gap-1.5">
                <span className={`text-sm font-semibold ${getProjectNameCustomerTypeColorClass(ct)}`}>
                  # · {getCustomerTypeLegendLabel(ct)}
                </span>
                {ct === 'RESIDENTIAL' ? (
                  <span className="text-[color:var(--text-muted)]">(default)</span>
                ) : null}
              </span>
            ))}
            <span className="col-span-2 inline-flex items-center gap-1.5 font-semibold text-[color:var(--text-primary)] sm:col-span-3 lg:col-span-6 lg:mt-1">
              Icons &amp; list totals
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5">
              <span className="text-[color:var(--accent-teal)]">
                <FiPaperclip className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              Has attachment(s)
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5">
              <span className="text-emerald-300">
                <FaUniversity className="h-3.5 w-3.5" />
              </span>
              Availing Loan + bank
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5">
              <span className="text-[color:var(--accent-gold)]">
                <FaTicketAlt className="h-3.5 w-3.5" />
              </span>
              Open/In progress ticket(s)
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)]" />
              Capacity total
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded border border-emerald-400/50 bg-emerald-500/25" />
              Order total
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded border border-sky-400/50 bg-sky-500/25" />
              Balance total
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
