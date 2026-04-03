import type { ZenithExplorerProject } from '../types/zenithExplorer'
import { ProjectStatus } from '../types'

export type LeaderboardPeriod = 'month' | 'quarter' | 'fy'

const WINNING_STATUSES: ProjectStatus[] = [
  ProjectStatus.CONFIRMED,
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.COMPLETED,
  ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
]

export function isLeaderboardWinningStatus(s: string): boolean {
  return (WINNING_STATUSES as string[]).includes(s)
}

/**
 * Prefer stage entry / confirmation over `updated_at` (updated on any field save — breaks Month vs Quarter vs FY).
 */
function closedDateRaw(p: ZenithExplorerProject): string | undefined {
  const a = p.stage_entered_at
  const b = p.confirmation_date
  const c = p.updated_at
  if (a) return a
  if (b) return b
  if (c) return c
  return undefined
}

function dealInPeriod(p: ZenithExplorerProject, start: Date, end: Date): boolean {
  if (!isLeaderboardWinningStatus(p.projectStatus)) return false
  const raw = closedDateRaw(p)
  if (!raw) return false
  const t = new Date(raw).getTime()
  if (Number.isNaN(t)) return false
  return t >= start.getTime() && t <= end.getTime()
}

export function getPeriodRange(period: LeaderboardPeriod): { start: Date; end: Date } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  if (period === 'month') {
    return {
      start: new Date(y, m, 1),
      end: new Date(y, m + 1, 0, 23, 59, 59, 999),
    }
  }

  if (period === 'quarter') {
    const qMap = [
      { start: [3, 1] as const, end: [5, 30] as const },
      { start: [6, 1] as const, end: [8, 30] as const },
      { start: [9, 1] as const, end: [11, 31] as const },
      { start: [0, 1] as const, end: [2, 31] as const },
    ]
    let qi: number
    if (m >= 3 && m <= 5) qi = 0
    else if (m >= 6 && m <= 8) qi = 1
    else if (m >= 9 && m <= 11) qi = 2
    else qi = 3
    const qy = qi === 3 && m <= 2 ? y : y
    const sm = qMap[qi]!.start[0]
    const sd = qMap[qi]!.start[1]
    const em = qMap[qi]!.end[0]
    const ed = qMap[qi]!.end[1]
    return {
      start: new Date(qy, sm, sd),
      end: new Date(qy, em, ed, 23, 59, 59, 999),
    }
  }

  if (period === 'fy') {
    const fyYear = m >= 3 ? y : y - 1
    return {
      start: new Date(fyYear, 3, 1),
      end: new Date(fyYear + 1, 2, 31, 23, 59, 59, 999),
    }
  }

  return getPeriodRange('month')
}

export function getPeriodLabel(period: LeaderboardPeriod): string {
  const now = new Date()
  const m = now.getMonth()
  const y = now.getFullYear()

  if (period === 'month') {
    return now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  }

  if (period === 'quarter') {
    const q = m >= 3 && m <= 5 ? 'Q1' : m >= 6 && m <= 8 ? 'Q2' : m >= 9 && m <= 11 ? 'Q3' : 'Q4'
    const fy = m >= 3 ? y : y - 1
    return `${q} FY${String(fy).slice(2)}-${String(fy + 1).slice(2)}`
  }

  if (period === 'fy') {
    const fy = m >= 3 ? y : y - 1
    return `FY ${fy}-${String(fy + 1).slice(2)}`
  }

  return getPeriodLabel('month')
}

export function getNextResetDate(period: LeaderboardPeriod): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  if (period === 'month') {
    const d = new Date(y, m + 1, 1)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (period === 'quarter') {
    let nextQStart: Date
    if (m < 3) nextQStart = new Date(y, 3, 1)
    else if (m < 6) nextQStart = new Date(y, 6, 1)
    else if (m < 9) nextQStart = new Date(y, 9, 1)
    else nextQStart = new Date(y + 1, 0, 1)
    return nextQStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (period === 'fy') {
    const fy = m >= 3 ? y : y - 1
    return new Date(fy + 1, 3, 1).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return ''
}

export function leaderboardSalespersonName(p: ZenithExplorerProject): string {
  const name = p.assigned_to_name?.trim()
  return name && name.length > 0 ? name : 'Unassigned'
}

/** Drawer title aligned with chart drill-down style */
export function buildLeaderboardDrawerLabel(period: LeaderboardPeriod, salespersonName?: string): string {
  const pLabel = getPeriodLabel(period)
  if (salespersonName != null && salespersonName !== '') {
    return `${salespersonName} — The Board (${pLabel})`
  }
  return `The Board — ${pLabel} (all)`
}

export function getLeaderboardDealsInPeriod(
  projects: ZenithExplorerProject[],
  period: LeaderboardPeriod,
): ZenithExplorerProject[] {
  const { start, end } = getPeriodRange(period)
  return projects.filter((p) => dealInPeriod(p, start, end))
}

export function getLeaderboardDealsForSalesperson(
  projects: ZenithExplorerProject[],
  period: LeaderboardPeriod,
  salespersonDisplayName: string,
): ZenithExplorerProject[] {
  const target = salespersonDisplayName.trim() || 'Unassigned'
  return getLeaderboardDealsInPeriod(projects, period).filter((p) => leaderboardSalespersonName(p) === target)
}

export type LeaderboardEntry = {
  name: string
  revenue: number
  deals: number
  rank: number
}

export function computeLeaderboard(projects: ZenithExplorerProject[], period: LeaderboardPeriod) {
  const { start, end } = getPeriodRange(period)

  const closedDeals = projects.filter((p) => dealInPeriod(p, start, end))

  const grouped: Record<string, { name: string; revenue: number; deals: number }> = {}
  closedDeals.forEach((p) => {
    const name = leaderboardSalespersonName(p)
    const value = Number(p.deal_value ?? 0)
    if (!grouped[name]) grouped[name] = { name, revenue: 0, deals: 0 }
    grouped[name]!.revenue += value
    grouped[name]!.deals += 1
  })

  const ranked: LeaderboardEntry[] = Object.values(grouped)
    .sort((a, b) => (b.revenue !== a.revenue ? b.revenue - a.revenue : b.deals - a.deals))
    .map((e, i) => ({
      ...e,
      rank: i + 1,
      revenue: Math.round(e.revenue),
    }))

  const topRevenue = ranked[0]?.revenue ?? 1
  const periodRevenue = Math.round(ranked.reduce((s, r) => s + r.revenue, 0))
  const periodDeals = ranked.reduce((s, r) => s + r.deals, 0)

  return { ranked, topRevenue, periodRevenue, periodDeals }
}

export function getInitials(name: string): string {
  return (name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const AVATAR_COLORS = [
  '#F5A623',
  '#00D4B4',
  '#8B5CF6',
  '#3B8BFF',
  '#FF6B6B',
  '#10B981',
  '#F59E0B',
  '#6366F1',
]

export function getAvatarColor(name: string): string {
  let h = 0
  const s = name ?? ''
  for (let i = 0; i < s.length; i++) {
    h = (s.charCodeAt(i) + ((h << 5) - h)) | 0
  }
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]!
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value ?? 0)
}

/** Mobile stats: ≥1L → ₹XL; else ₹XK (K = thousands). */
export function formatINRCompact(value: number): string {
  const n = Math.round(value ?? 0)
  if (n >= 100000) {
    const l = n / 100000
    const s = l >= 10 ? l.toFixed(0) : l.toFixed(1).replace(/\.0$/, '')
    return `₹${s}L`
  }
  if (n >= 1000) {
    const k = n / 1000
    const s = k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, '')
    return `₹${s}K`
  }
  return `₹${n}`
}
