import { NavLink, Outlet } from 'react-router-dom'
import { Sun } from 'lucide-react'

const tabs = [
  { to: '/solar-hub/users', label: 'Users', end: false },
  { to: '/solar-hub/maintenance', label: 'Maintenance', end: false },
  { to: '/solar-hub/provisioning', label: 'Provisioning', end: false },
  { to: '/solar-hub/help', label: 'Help Content', end: false },
] as const

export default function SolarHubLayout() {
  return (
    <div className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] pb-10">
      <div className="zenith-exec-main mx-auto w-full max-w-6xl px-3 sm:px-5">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)]">
              <Sun className="h-5 w-5 text-[color:var(--accent-gold)]" />
            </div>
            <div>
              <h1 className="zenith-display text-2xl font-bold text-[color:var(--text-primary)]">Solar Hub</h1>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                Homeowner app — accounts, maintenance, and provisioning
              </p>
            </div>
          </div>
        </header>

        <nav className="mb-6 flex flex-wrap gap-2 border-b border-[color:var(--border-default)] pb-3">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                    : 'text-[color:var(--text-muted)] hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </div>
  )
}
