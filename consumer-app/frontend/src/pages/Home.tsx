import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Headphones,
  IndianRupee,
  LineChart,
  Sparkles,
  Sun,
  Wrench,
  Zap,
} from 'lucide-react'
import NotificationsModal from '@/components/NotificationsModal'
import HelpContextSuggestions from '@/components/HelpContextSuggestions'
import { useConsumerHome } from '@/hooks/useConsumerHome'
import { formatKwh, formatRupee } from '@/utils/energyCharts'
import type { ProjectStep } from '@/types/home'

function healthStyles(status: string) {
  if (status === 'CRITICAL') {
    return {
      border: 'border-[color:var(--accent-red-border)]',
      bg: 'bg-[color:var(--accent-red-muted)]',
      icon: 'text-[color:var(--accent-red)]',
    }
  }
  if (status === 'WARNING') {
    return {
      border: 'border-[color:var(--accent-gold-border)]',
      bg: 'bg-[color:var(--accent-gold-muted)]',
      icon: 'text-[color:var(--accent-gold)]',
    }
  }
  return {
    border: 'border-[color:var(--accent-green-border)]',
    bg: 'bg-[color:var(--accent-green-muted)]',
    icon: 'text-[color:var(--accent-green)]',
  }
}

function ProjectStepper({ steps }: { steps: ProjectStep[] }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-0.5">
      {steps.map((step, idx) => (
        <div key={step.key} className="flex flex-1 flex-col items-center">
          <div className="flex w-full items-center">
            {idx > 0 ? (
              <div
                className={`h-0.5 flex-1 ${
                  step.state !== 'upcoming' ? 'bg-[color:var(--accent-gold)]' : 'bg-[color:var(--border-default)]'
                }`}
              />
            ) : (
              <div className="flex-1" />
            )}
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${
                step.state === 'complete'
                  ? 'bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)]'
                  : step.state === 'current'
                    ? 'border-2 border-[color:var(--accent-gold)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                    : 'border border-[color:var(--border-default)] bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)]'
              }`}
            >
              {step.state === 'complete' ? '✓' : idx + 1}
            </div>
            {idx < steps.length - 1 ? (
              <div
                className={`h-0.5 flex-1 ${
                  steps[idx + 1]?.state !== 'upcoming'
                    ? 'bg-[color:var(--accent-gold)]'
                    : 'bg-[color:var(--border-default)]'
                }`}
              />
            ) : (
              <div className="flex-1" />
            )}
          </div>
          <span
            className={`mt-1 hidden text-[8px] font-medium leading-tight sm:block ${
              step.state === 'current'
                ? 'text-[color:var(--accent-gold)]'
                : 'text-[color:var(--text-tertiary)]'
            }`}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  const homeQuery = useConsumerHome()
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const home = homeQuery.data
  const loading = homeQuery.isLoading

  const unread = home?.unreadNotifications ?? 0

  return (
    <div className="px-4 py-6">
      {loading || !home ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--accent-gold)] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Header with notification bell */}
          <header className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[color:var(--text-secondary)]">{home.greeting},</p>
              <h1 className="zenith-display text-2xl font-bold text-[color:var(--text-primary)]">
                {home.displayName}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)]"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-[color:var(--text-secondary)]" />
              {unread > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--accent-gold)] px-1 text-[9px] font-bold text-[color:var(--text-inverse)]">
                  {unread > 9 ? '9+' : unread}
                </span>
              ) : null}
            </button>
          </header>

          {/* Project status */}
          <section className="zenith-glass mb-4 overflow-hidden rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent-teal-muted)]">
                {home.project.isLive ? (
                  <Sun className="h-5 w-5 text-[color:var(--accent-teal)]" />
                ) : (
                  <Sparkles className="h-5 w-5 text-[color:var(--accent-teal)]" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-[color:var(--text-primary)]">
                  {home.project.headline}
                </h2>
                {home.project.subline ? (
                  <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
                    {home.project.subline}
                  </p>
                ) : null}
                {home.project.equipmentSummary ? (
                  <p className="mt-1.5 text-[11px] leading-snug text-[color:var(--text-tertiary)]">
                    {home.project.equipmentSummary}
                  </p>
                ) : null}
                {home.project.siteAddress ? (
                  <p className="mt-1 truncate text-[10px] text-[color:var(--text-tertiary)]">
                    {home.project.siteAddress}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs font-bold text-[color:var(--accent-gold)]">
                {home.project.systemKw} kW
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--bg-muted)]">
              <div
                className="h-full rounded-full bg-[color:var(--accent-gold)] transition-all"
                style={{ width: `${home.project.progressPercent}%` }}
              />
            </div>
            <ProjectStepper steps={home.project.steps} />
          </section>

          {/* Energy summary */}
          <section className="mb-4 overflow-hidden rounded-2xl border border-[color:var(--accent-green-border)] bg-gradient-to-br from-[color:var(--accent-green-muted)] to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[color:var(--accent-green)]" />
                <h2 className="text-sm font-bold text-[color:var(--text-primary)]">Energy</h2>
              </div>
              <Link
                to="/track"
                className="flex items-center gap-0.5 text-xs font-semibold text-[color:var(--accent-green)]"
              >
                Track
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <p className="mt-0.5 text-[10px] text-[color:var(--text-tertiary)]">
              {home.energy.monthLabel}
              {home.energy.isEstimated ? ' · estimated' : ''}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] text-[color:var(--text-tertiary)]">Today (avg)</p>
                <p className="zenith-kpi-value text-base font-bold text-[color:var(--text-primary)]">
                  {formatKwh(home.energy.estimatedTodayKwh)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[color:var(--text-tertiary)]">This month</p>
                <p className="zenith-kpi-value text-base font-bold text-[color:var(--text-primary)]">
                  {formatKwh(home.energy.totalGenerated)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[color:var(--text-tertiary)]">Savings</p>
                <p className="zenith-kpi-value flex items-center gap-0.5 text-base font-bold text-[color:var(--accent-green)]">
                  <IndianRupee className="h-3.5 w-3.5" aria-hidden />
                  {formatRupee(home.energy.totalSavings).replace('₹', '')}
                </p>
              </div>
            </div>
          </section>

          {/* System health */}
          <section
            className={`mb-4 flex items-start gap-3 rounded-2xl border p-4 ${healthStyles(home.systemHealth.status).border} ${healthStyles(home.systemHealth.status).bg}`}
          >
            {home.systemHealth.status === 'OPTIMAL' ? (
              <CheckCircle2
                className={`mt-0.5 h-5 w-5 shrink-0 ${healthStyles(home.systemHealth.status).icon}`}
              />
            ) : (
              <AlertTriangle
                className={`mt-0.5 h-5 w-5 shrink-0 ${healthStyles(home.systemHealth.status).icon}`}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[color:var(--text-primary)]">
                System health: {home.systemHealth.label}
              </p>
              <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
                {home.systemHealth.message}
              </p>
              {home.nextMaintenance ? (
                <Link
                  to="/maintain"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent-teal)]"
                >
                  {home.nextMaintenance.title} — {home.nextMaintenance.statusLabel}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          </section>

          <HelpContextSuggestions screen="home" className="mb-4" />

          {/* Member strip */}
          <Link
            to="/profile"
            className="zenith-glass mb-4 flex items-center justify-between rounded-2xl p-4 transition hover:opacity-95"
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--accent-gold)]">
                {home.member.tierLabel} member
              </p>
              <p className="mt-0.5 text-sm font-bold text-[color:var(--text-primary)]">
                {home.member.points} reward points
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-[color:var(--text-tertiary)]" />
          </Link>

          {/* Quick links */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
              Quick actions
            </h2>
            <Link
              to="/track"
              className="zenith-glass flex items-center gap-3 rounded-2xl p-4 transition hover:opacity-95"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]">
                <LineChart className="h-5 w-5" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-[color:var(--text-primary)]">
                  Track energy
                </span>
                <span className="text-xs text-[color:var(--text-muted)]">
                  Charts, savings & exports
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-[color:var(--text-tertiary)]" />
            </Link>
            <Link
              to="/maintain"
              className="zenith-glass flex items-center gap-3 rounded-2xl p-4 transition hover:opacity-95"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)]">
                <Wrench className="h-5 w-5" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-[color:var(--text-primary)]">
                  Maintain
                </span>
                <span className="text-xs text-[color:var(--text-muted)]">Warranty & service</span>
              </span>
              <ChevronRight className="h-4 w-4 text-[color:var(--text-tertiary)]" />
            </Link>
            <Link
              to="/support"
              className="zenith-glass flex items-center gap-3 rounded-2xl p-4 transition hover:opacity-95"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--accent-green-muted)] text-[color:var(--accent-green)]">
                <Headphones className="h-5 w-5" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-[color:var(--text-primary)]">
                  Support
                </span>
                <span className="text-xs text-[color:var(--text-muted)]">Help & referrals</span>
              </span>
              <ChevronRight className="h-4 w-4 text-[color:var(--text-tertiary)]" />
            </Link>
          </section>

          <NotificationsModal
            open={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
          />
        </>
      )}
    </div>
  )
}
