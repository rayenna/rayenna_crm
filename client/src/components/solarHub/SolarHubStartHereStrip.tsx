import { Link } from 'react-router-dom'
import { useState } from 'react'
import { setLocalStorageItem } from '../../lib/safeLocalStorage'

const START_HERE_KEY = 'rayenna_solar_hub_start_here_dismissed'

const STEPS = [
  {
    n: '1',
    title: 'Provision gaps',
    blurb: 'Create Hub logins for confirmed / install / completed projects',
    to: '/solar-hub/provisioning',
    cta: 'Open Provisioning',
  },
  {
    n: '2',
    title: 'Open the user',
    blurb: 'Link Solis or Deye plant and check Active status',
    to: '/solar-hub/users?plant=none',
    cta: 'Unlinked users',
  },
  {
    n: '3',
    title: 'Install Hub',
    blurb: 'On the visit: sign in on their phone and Add to Home Screen',
    to: '/solar-hub/users#hub-handover',
    cta: 'Handover script',
  },
] as const

/**
 * First-visit workflow cue for Ops — dismissible (localStorage).
 */
export default function SolarHubStartHereStrip() {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(START_HERE_KEY) !== '1'
    } catch {
      return true
    }
  })

  if (!visible) return null

  const dismiss = () => {
    setLocalStorageItem(START_HERE_KEY, '1')
    setVisible(false)
  }

  return (
    <div
      className="mb-4 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] p-3 ring-1 ring-[color:var(--border-default)] sm:p-4"
      role="region"
      aria-label="Solar Hub start here"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
            Start here
          </p>
          <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">
            Typical Ops flow for the homeowner Hub
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex min-h-[36px] shrink-0 touch-manipulation items-center rounded-lg px-2.5 text-[11px] font-semibold text-[color:var(--text-muted)] hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]"
          aria-label="Dismiss start here"
        >
          Dismiss
        </button>
      </div>
      <ol className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-3">
        {STEPS.map((step) => (
          <li
            key={step.n}
            className="flex flex-col rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] p-3"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-gold-muted)] text-[11px] font-bold text-[color:var(--accent-gold)]">
                {step.n}
              </span>
              <span className="text-sm font-semibold text-[color:var(--text-primary)]">{step.title}</span>
            </div>
            <p className="mt-1.5 flex-1 text-[11px] leading-snug text-[color:var(--text-muted)]">
              {step.blurb}
            </p>
            <Link
              to={step.to}
              className="mt-2 inline-flex min-h-[40px] touch-manipulation items-center justify-center rounded-lg border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-2.5 text-[11px] font-bold text-[color:var(--accent-gold)]"
            >
              {step.cta}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
