import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Sun } from 'lucide-react'
import SolarHubStartHereStrip from './SolarHubStartHereStrip'

const tabs = [
  { to: '/solar-hub/users', label: 'Users', short: 'Users', end: false },
  { to: '/solar-hub/maintenance', label: 'Maintenance', short: 'Maint.', end: true },
  { to: '/solar-hub/provisioning', label: 'Provisioning', short: 'Provision', end: true },
  { to: '/solar-hub/help', label: 'Help Content', short: 'Help', end: false },
] as const

function isListHubPath(pathname: string): boolean {
  if (pathname === '/solar-hub' || pathname === '/solar-hub/') return true
  if (pathname === '/solar-hub/users') return true
  if (pathname === '/solar-hub/maintenance') return true
  if (pathname === '/solar-hub/provisioning') return true
  if (pathname === '/solar-hub/help') return true
  return false
}

export default function SolarHubLayout() {
  const { pathname } = useLocation()
  const showStartHere = isListHubPath(pathname)

  return (
    <div className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] pb-10">
      <div className="zenith-exec-main mx-auto w-full max-w-6xl px-3 sm:px-5">
        <header className="mb-4 flex flex-col gap-4 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
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

        <nav
          className="mb-4 -mx-3 border-b border-[color:var(--border-default)] px-3 sm:mx-0 sm:mb-5 sm:px-0"
          aria-label="Solar Hub sections"
        >
          <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `inline-flex min-h-[44px] shrink-0 touch-manipulation items-center justify-center rounded-xl px-3.5 text-sm font-semibold transition-colors sm:px-4 ${
                    isActive
                      ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)] ring-1 ring-[color:var(--accent-gold-border)]'
                      : 'text-[color:var(--text-muted)] hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]'
                  }`
                }
              >
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {showStartHere ? <SolarHubStartHereStrip /> : null}

        <Outlet />
      </div>
    </div>
  )
}
