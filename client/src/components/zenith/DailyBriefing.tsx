import { useMemo, useState } from 'react'
import { useModalEscape } from '../../contexts/ModalEscapeContext'
import { useMyDayContext } from '../../contexts/MyDayContext'
import { motion } from 'framer-motion'
import { Binoculars, Sun } from 'lucide-react'
import { UserRole } from '../../types'
import MyDayButton from '../my-day/MyDayButton'
import type { MyDayTabId } from '../my-day/types'
import type { MyDaySnapshot } from '../../lib/myDaySnapshot'
import type { ZenithExplorerProject } from '../../types/zenithExplorer'
import {
  formatBriefingCustomerNameList,
  zenithExplorerProjectsMissingLifecycleBrands,
} from '../../utils/zenithBriefingMissingBrands'

type BriefingLine = { icon: string; text: string; color: string }

function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateLine(d: Date): string {
  const weekday = d.toLocaleDateString('en-IN', { weekday: 'long' })
  const day = d.toLocaleDateString('en-IN', { day: '2-digit' })
  const month = d.toLocaleDateString('en-IN', { month: 'long' })
  const year = d.toLocaleDateString('en-IN', { year: 'numeric' })
  return `${weekday}, ${day} ${month} ${year}`
}

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function firstNameOf(fullName: string | undefined | null): string {
  const n = (fullName ?? '').trim()
  if (!n) return 'there'
  return n.split(/\s+/)[0] || 'there'
}

/** Dashboard payloads differ by endpoint: Sales has top-level totalProfit + revenue.*; Management/Admin nests profit under finance.* and revenue under sales.* */
function parseZenithDashboardMetrics(data: Record<string, unknown>): {
  totalPipeline: number
  revenueTotal: number
  totalProfit: number
} {
  const d = data as {
    totalPipeline?: number
    totalProfit?: number
    totalProjectValue?: number
    totalGrossProfit?: number
    revenue?: { totalRevenue?: number }
    sales?: { totalRevenue?: number }
    finance?: { totalProfit?: number }
  }
  const totalPipeline = Number(d.totalPipeline ?? 0)
  const revenueTotal = Number(
    d.revenue?.totalRevenue ?? d.sales?.totalRevenue ?? d.totalProjectValue ?? 0,
  )
  const totalProfit = Number(d.totalProfit ?? d.finance?.totalProfit ?? d.totalGrossProfit ?? 0)
  return { totalPipeline, revenueTotal, totalProfit }
}

function generateBriefing(args: {
  role: UserRole
  currentUserName?: string | null
  data: Record<string, unknown>
}): { greeting: string; firstName: string; lines: BriefingLine[] } {
  const { role, currentUserName, data } = args
  const now = new Date()
  const greeting = greetingForHour(now.getHours())
  const firstName = firstNameOf(currentUserName)

  const { totalPipeline, revenueTotal, totalProfit } = parseZenithDashboardMetrics(data)

  const atRiskCount = Number((data as { pipeline?: { atRisk?: number } })?.pipeline?.atRisk ?? 0)

  const lines: BriefingLine[] = []

  if (role === UserRole.SALES) {
    if (atRiskCount > 0) {
      lines.push({
        icon: '🔴',
        text: `You have ${atRiskCount} open deal${atRiskCount === 1 ? '' : 's'} that need attention today`,
        color: 'var(--accent-red)',
      })
    }
    if (totalPipeline > 0) {
      lines.push({
        icon: '💼',
        text: `Your pipeline for this period is ${formatINR(totalPipeline)}`,
        color: 'var(--accent-gold)',
      })
    }
    if (revenueTotal > 0) {
      lines.push({
        icon: '🏆',
        text: `Revenue booked in this period: ${formatINR(revenueTotal)}`,
        color: 'var(--accent-teal)',
      })
    }
  } else if (role === UserRole.MANAGEMENT || role === UserRole.ADMIN) {
    if (atRiskCount > 0) {
      lines.push({
        icon: '🔴',
        text: `${atRiskCount} open deal${atRiskCount === 1 ? '' : 's'} are at risk — review Hit List for quick actions`,
        color: 'var(--accent-red)',
      })
    }
    lines.push({
      icon: '💰',
      text: `Total pipeline: ${formatINR(totalPipeline)} · Profit: ${formatINR(totalProfit)}`,
      color: 'var(--accent-gold)',
    })
    if (revenueTotal > 0) {
      lines.push({
        icon: '📈',
        text: `Revenue booked: ${formatINR(revenueTotal)}`,
        color: 'var(--text-secondary)',
      })
    }
  } else if (role === UserRole.FINANCE) {
    const outstanding = Number(
      (data as { finance?: { totalOutstanding?: number } })?.finance?.totalOutstanding ?? 0,
    )
    const subsidyPending = Number(
      (data as { finance?: { subsidyPendingCount?: number } })?.finance?.subsidyPendingCount ?? 0,
    )
    if (outstanding > 0) {
      lines.push({
        icon: '🔴',
        text: `Outstanding to collect: ${formatINR(outstanding)}`,
        color: 'var(--accent-red)',
      })
    }
    if (subsidyPending > 0) {
      lines.push({
        icon: '🏛️',
        text: `${subsidyPending} subsidy item${subsidyPending === 1 ? '' : 's'} pending follow-up`,
        color: 'var(--accent-gold)',
      })
    }
    if (revenueTotal > 0) {
      lines.push({
        icon: '✅',
        text: `Revenue booked: ${formatINR(revenueTotal)}`,
        color: 'var(--accent-teal)',
      })
    }
  } else if (role === UserRole.OPERATIONS) {
    const rawPending = (data as { pendingInstallation?: number | { total?: number } }).pendingInstallation
    const pendingInstallation =
      typeof rawPending === 'number'
        ? rawPending
        : Number((rawPending as { total?: number } | undefined)?.total ?? 0)
    if (pendingInstallation > 0) {
      lines.push({
        icon: '⚡',
        text: `${pendingInstallation} project${pendingInstallation === 1 ? '' : 's'} pending installation follow-up`,
        color: 'var(--accent-gold)',
      })
    }
    lines.push({
      icon: '🧭',
      text: `Use Installation Pulse to spot overdue jobs and unblock the team`,
      color: 'var(--text-secondary)',
    })
  }

  if (role === UserRole.ADMIN || role === UserRole.SALES || role === UserRole.OPERATIONS) {
    const explorer = (data as { zenithExplorerProjects?: ZenithExplorerProject[] }).zenithExplorerProjects
    const missing = zenithExplorerProjectsMissingLifecycleBrands(
      Array.isArray(explorer) ? explorer : [],
    )
    if (missing.length > 0) {
      const nameList = formatBriefingCustomerNameList(missing)
      lines.unshift({
        icon: '🏷️',
        text: `${missing.length} project${missing.length === 1 ? '' : 's'} in Under Installation, Completed, or Completed – Subsidy Credited ${
          missing.length === 1 ? 'is' : 'are'
        } missing panel and/or inverter brand${nameList ? `: ${nameList}` : ''}.`,
        color: 'var(--accent-gold)',
      })
    }
  }

  if (lines.length === 0) {
    lines.push({
      icon: '🧠',
      text: 'No briefing data yet for this period — apply filters and check back.',
      color: 'var(--text-muted)',
    })
  }

  return { greeting, firstName, lines: lines.slice(0, 5) }
}

function briefingJumpTabClass(active?: boolean) {
  return [
    'text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors',
    active
      ? 'border-[color:var(--accent-gold)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
      : 'border-[color:var(--border-default)] bg-transparent text-[color:var(--text-secondary)] hover:border-[color:var(--accent-gold-border)] hover:text-[color:var(--text-primary)]',
  ].join(' ')
}

export default function DailyBriefing({
  isVisible,
  onDismiss,
  role,
  currentUserName,
  data,
  myDaySnapshot = null,
  myDaySnapshotLoading = false,
  myDaySnapshotError = false,
}: {
  isVisible: boolean
  onDismiss: (dontShowToday: boolean) => void
  role: UserRole
  currentUserName?: string | null
  data: Record<string, unknown>
  myDaySnapshot?: MyDaySnapshot | null
  myDaySnapshotLoading?: boolean
  myDaySnapshotError?: boolean
}) {
  const { openTab } = useMyDayContext()
  const [dontShowToday, setDontShowToday] = useState(false)
  const today = useMemo(() => new Date(), [])

  const briefing = useMemo(
    () => generateBriefing({ role, currentUserName, data }),
    [role, currentUserName, data],
  )

  const jumpToMyDayTab = (tab: MyDayTabId) => {
    onDismiss(dontShowToday)
    openTab(tab)
  }

  useModalEscape(isVisible, () => onDismiss(false))

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[950] flex items-start sm:items-center justify-center p-3 sm:p-5 backdrop-blur-md"
      style={{ background: 'var(--bg-overlay)' }}
      onClick={() => onDismiss(false)}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-[560px] rounded-[20px] border border-[color:var(--accent-gold-border)] bg-[color:var(--bg-modal)] p-4 sm:p-7 max-h-[calc(100dvh-24px)] overflow-hidden flex flex-col relative"
        style={{ boxShadow: 'var(--shadow-modal)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Smart daily briefing"
      >
        <button
          type="button"
          onClick={() => onDismiss(false)}
          className="absolute z-10"
          style={{
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: 999,
            background: 'var(--bg-badge)',
            color: 'var(--text-secondary)',
          }}
          aria-label="Close briefing"
        >
          ×
        </button>

        <div className="min-h-0 overflow-y-auto pr-1 pb-1">
          <div className="pb-4 mb-5 border-b border-[color:var(--border-default)]">
            <div className="flex items-center gap-2">
              <Binoculars className="w-5 h-5 text-[color:var(--accent-gold)]" aria-hidden />
              <span
                className="font-bold text-[color:var(--accent-gold)]"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Zenith
              </span>
            </div>
            <div
              className="mt-3 text-[22px] font-bold text-[color:var(--text-primary)]"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {briefing.greeting}, {briefing.firstName}.
            </div>
            <div className="mt-1 text-[13px] text-[color:var(--text-muted)]">{formatDateLine(today)}</div>
          </div>

          <div>
            {briefing.lines.map((line, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <div className="flex items-start gap-3 mb-3.5">
                  <span
                    style={{
                      fontSize: 16,
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      background: 'var(--bg-badge)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {line.icon}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: line.color,
                      paddingTop: 3,
                      fontWeight: 600,
                      textShadow: '0 1px 0 rgba(0,0,0,0.12)',
                    }}
                  >
                    {line.text}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-[color:var(--border-default)]">
            <div className="flex items-center gap-2 mb-3">
              <Sun className="w-4 h-4 text-[color:var(--accent-gold)] shrink-0" aria-hidden />
              <span
                className="text-sm font-bold text-[color:var(--accent-gold)]"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Your My Day
              </span>
            </div>

            {myDaySnapshotLoading ? (
              <div className="space-y-2" aria-busy="true">
                <div
                  className="h-3 rounded-lg bg-[color:var(--bg-badge)] animate-pulse"
                  style={{ width: '72%' }}
                />
                <div
                  className="h-3 rounded-lg bg-[color:var(--bg-badge)] animate-pulse"
                  style={{ width: '48%' }}
                />
              </div>
            ) : null}

            {myDaySnapshotError && !myDaySnapshotLoading ? (
              <p className="text-[13px] text-[color:var(--text-secondary)] leading-relaxed">
                Could not load your tasks and reminders. Use{' '}
                <strong className="text-[color:var(--text-secondary)]">Open My Day</strong> below to try again.
              </p>
            ) : null}

            {!myDaySnapshotLoading && !myDaySnapshotError && myDaySnapshot ? (
              <>
                {myDaySnapshot.summaryFragments.length > 0 ? (
                  <p className="text-[13px] font-bold text-[color:var(--text-primary)] leading-snug mb-2">
                    {myDaySnapshot.summaryFragments.join(' · ')}
                  </p>
                ) : null}

                {myDaySnapshot.isQuietPersonal && myDaySnapshot.summaryFragments.length === 0 ? (
                  <p className="text-[13px] text-[color:var(--text-primary)] leading-relaxed">
                    You&apos;re caught up on tasks and reminders. Add items anytime, or start today&apos;s journal
                    note.
                  </p>
                ) : null}

                {!myDaySnapshot.isQuietPersonal && myDaySnapshot.teaserLines.length > 0 ? (
                  <ul className="mt-1 mb-1 space-y-1.5 pr-1">
                    {myDaySnapshot.teaserLines.map((line, i) => (
                      <li
                        key={`${i}-${line.slice(0, 24)}`}
                        className="text-[13px] text-[color:var(--text-primary)] leading-snug pl-3 border-l-2 border-[color:var(--accent-gold-muted)]"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[color:var(--border-default)] shrink-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            {/* Left block: shortcuts + dismissal (desktop/landscape keeps it tidy) */}
            <div className="flex flex-col gap-2 sm:gap-2">
              {!myDaySnapshotLoading && !myDaySnapshotError && myDaySnapshot ? (
                <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                  <button type="button" className={briefingJumpTabClass()} onClick={() => jumpToMyDayTab('tasks')}>
                    Tasks
                  </button>
                  <button
                    type="button"
                    className={briefingJumpTabClass()}
                    onClick={() => jumpToMyDayTab('reminders')}
                  >
                    Reminders
                  </button>
                  <button type="button" className={briefingJumpTabClass()} onClick={() => jumpToMyDayTab('journal')}>
                    Journal
                  </button>
                </div>
              ) : null}

              {/* Mobile: big tap-friendly toggle row */}
              <button
                type="button"
                onClick={() => setDontShowToday((v) => !v)}
                className={[
                  'sm:hidden w-full flex items-center justify-between gap-2',
                  'rounded-xl border px-4 py-3 text-[13px] font-semibold select-none',
                  dontShowToday
                    ? 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--text-primary)]'
                    : 'border-[color:var(--border-default)] bg-transparent text-[color:var(--text-secondary)]',
                ].join(' ')}
                aria-pressed={dontShowToday}
                aria-label="Don't show this briefing again today"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={dontShowToday}
                    onChange={(e) => setDontShowToday(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                  />
                  Don&apos;t show again today
                </span>
                <span className="text-xs font-bold text-[color:var(--text-muted)]">{dontShowToday ? 'ON' : 'OFF'}</span>
              </button>

              {/* Desktop/landscape: single-line checkbox under the shortcuts */}
              <label className="hidden sm:flex items-center gap-2 text-[13px] font-semibold text-[color:var(--text-secondary)] select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontShowToday}
                  onChange={(e) => setDontShowToday(e.target.checked)}
                  style={{ accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                />
                <span className="text-[color:var(--text-primary)]">Don&apos;t show again today</span>
              </label>
            </div>

            {/* Right block: primary actions */}
            <div className="flex items-center gap-2 sm:shrink-0">
              <MyDayButton variant="briefing" onBeforeOpen={() => onDismiss(dontShowToday)} />
              <button
                type="button"
                onClick={() => onDismiss(dontShowToday)}
                className="flex-1 sm:flex-none rounded-xl bg-[color:var(--accent-gold)] px-5 py-2.5 text-sm font-bold text-[color:var(--text-inverse)] whitespace-nowrap"
              >
                Got it →
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

