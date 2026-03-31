import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Binoculars } from 'lucide-react'
import { UserRole } from '../../types'

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

function generateBriefing(args: {
  role: UserRole
  currentUserName?: string | null
  data: Record<string, unknown>
}): { greeting: string; firstName: string; lines: BriefingLine[] } {
  const { role, currentUserName, data } = args
  const now = new Date()
  const greeting = greetingForHour(now.getHours())
  const firstName = firstNameOf(currentUserName)

  const totalPipeline = Number((data as { totalPipeline?: number })?.totalPipeline ?? 0)
  const revenueTotal = Number((data as { revenue?: { totalRevenue?: number } })?.revenue?.totalRevenue ?? 0)
  const totalProfit = Number((data as { totalProfit?: number })?.totalProfit ?? 0)

  const atRiskCount =
    Number((data as { pipeline?: { atRisk?: number } })?.pipeline?.atRisk ?? 0) ||
    Number((data as { pipeline?: { atRisk?: number } })?.pipeline?.atRisk ?? 0)

  const lines: BriefingLine[] = []

  if (role === UserRole.SALES) {
    if (atRiskCount > 0) {
      lines.push({
        icon: '🔴',
        text: `You have ${atRiskCount} open deal${atRiskCount === 1 ? '' : 's'} that need attention today`,
        color: '#FF4757',
      })
    }
    if (totalPipeline > 0) {
      lines.push({
        icon: '💼',
        text: `Your pipeline for this period is ${formatINR(totalPipeline)}`,
        color: '#F5A623',
      })
    }
    if (revenueTotal > 0) {
      lines.push({
        icon: '🏆',
        text: `Revenue booked in this period: ${formatINR(revenueTotal)}`,
        color: '#00D4B4',
      })
    }
  } else if (role === UserRole.MANAGEMENT || role === UserRole.ADMIN) {
    if (atRiskCount > 0) {
      lines.push({
        icon: '🔴',
        text: `${atRiskCount} open deal${atRiskCount === 1 ? '' : 's'} are at risk — review Hit List for quick actions`,
        color: '#FF4757',
      })
    }
    lines.push({
      icon: '💰',
      text: `Total pipeline: ${formatINR(totalPipeline)} · Profit: ${formatINR(totalProfit)}`,
      color: '#F5A623',
    })
    if (revenueTotal > 0) {
      lines.push({
        icon: '📈',
        text: `Revenue booked: ${formatINR(revenueTotal)}`,
        color: 'rgba(255,255,255,0.7)',
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
        color: '#FF4757',
      })
    }
    if (subsidyPending > 0) {
      lines.push({
        icon: '🏛️',
        text: `${subsidyPending} subsidy item${subsidyPending === 1 ? '' : 's'} pending follow-up`,
        color: '#F5A623',
      })
    }
    if (revenueTotal > 0) {
      lines.push({
        icon: '✅',
        text: `Revenue booked: ${formatINR(revenueTotal)}`,
        color: '#00D4B4',
      })
    }
  } else if (role === UserRole.OPERATIONS) {
    const pendingInstallation = Number(
      (data as { pendingInstallation?: { total?: number } })?.pendingInstallation?.total ?? 0,
    )
    if (pendingInstallation > 0) {
      lines.push({
        icon: '⚡',
        text: `${pendingInstallation} project${pendingInstallation === 1 ? '' : 's'} pending installation follow-up`,
        color: '#F5A623',
      })
    }
    lines.push({
      icon: '🧭',
      text: `Use Installation Pulse to spot overdue jobs and unblock the team`,
      color: 'rgba(255,255,255,0.7)',
    })
  }

  if (lines.length === 0) {
    lines.push({
      icon: '🧠',
      text: 'No briefing data yet for this period — apply filters and check back.',
      color: 'rgba(255,255,255,0.45)',
    })
  }

  return { greeting, firstName, lines: lines.slice(0, 5) }
}

export default function DailyBriefing({
  isVisible,
  onDismiss,
  role,
  currentUserName,
  data,
}: {
  isVisible: boolean
  onDismiss: (dontShowToday: boolean) => void
  role: UserRole
  currentUserName?: string | null
  data: Record<string, unknown>
}) {
  const [dontShowToday, setDontShowToday] = useState(false)
  const today = useMemo(() => new Date(), [])

  const briefing = useMemo(
    () => generateBriefing({ role, currentUserName, data }),
    [role, currentUserName, data],
  )

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[950] flex items-center justify-center p-5 bg-black/60 backdrop-blur-md"
      onClick={() => onDismiss(false)}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-[520px] rounded-[20px] border border-[#f5a623]/25 bg-[#0F0F1A] p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Smart daily briefing"
      >
        <button
          type="button"
          onClick={() => onDismiss(false)}
          className="absolute"
          style={{
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.7)',
          }}
          aria-label="Close briefing"
        >
          ×
        </button>

        <div className="pb-4 mb-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <Binoculars className="w-5 h-5 text-[#f5a623]" aria-hidden />
            <span className="text-[#f5a623] font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
              Zenith
            </span>
          </div>
          <div className="mt-3 text-[22px] font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            {briefing.greeting}, {briefing.firstName}.
          </div>
          <div className="mt-1 text-[13px] text-white/35">{formatDateLine(today)}</div>
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
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {line.icon}
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.6, color: line.color, paddingTop: 3 }}>{line.text}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-white/[0.07] flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[13px] text-white/45 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowToday}
              onChange={(e) => setDontShowToday(e.target.checked)}
              style={{ accentColor: '#F5A623', cursor: 'pointer' }}
            />
            Don&apos;t show again today
          </label>
          <button
            type="button"
            onClick={() => onDismiss(dontShowToday)}
            className="rounded-xl bg-[#f5a623] px-6 py-2.5 text-sm font-bold text-[#0a0a0f]"
          >
            Got it →
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

