import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts'
import axiosInstance from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole, ProjectStatus } from '../../types'
import type { ZenithDateFilter } from './zenithTypes'
import type { ZenithAutoFocusSection } from '../../hooks/useQuickAction'
import type { ZenithExplorerProject } from '../../types/zenithExplorer'
import HealthBadge from './HealthBadge'
import { computeDealHealth, pipelineRowToHealthProject } from '../../utils/dealHealthScore'
import ReminderModal from './ReminderModal'
import ZenithChartTouchReset from './ZenithChartTouchReset'
import ZenithFocusCollapsible from './ZenithFocusCollapsible'
import ZenithProposalEngineCard from './ZenithProposalEngineCard'
import type { ReminderTemplateProject } from '../../utils/reminderTemplates'
import {
  formatZenithDealInrParts,
  zenithDealRowStagePillClass,
  zenithLastActivityTone,
  ZENITH_DEAL_OPEN_BUTTON_CLASS,
} from './zenithDealCardUi'

type SalesPipelineRow = {
  projectId: string
  customerName: string
  stage: string
  dealValue: number
  daysSinceActivity: number
  /** Extra fields from zenith-focus for Today’s Hit List (same API, no extra fetch). */
  expectedCloseDate?: string | null
  confirmationDate?: string | null
  advanceReceived?: number
  createdAt?: string
  updatedAt?: string
  salespersonId?: string
  /** Display name from zenith-focus (assigned project salesperson). */
  salespersonName?: string | null
  leadSource?: string | null
}

type FinanceOverdueRow = {
  projectId: string
  customerName: string
  amount: number
  dueSince: string
  daysOverdue: number
  customerPhone?: string | null
  customerEmail?: string | null
  orderValue?: number
  amountPaid?: number
  projectStatus?: string
  /** Prisma PaymentStatus from zenith-focus overdue list */
  paymentStatus?: string
  salespersonId?: string | null
  salespersonName?: string | null
}

/** Installation pulse: customer name colour by project stage (confirmed vs under installation). */
const INSTALL_PULSE_NAME_CONFIRMED = '#7dd3fc'
const INSTALL_PULSE_NAME_UNDER_INSTALLATION = '#f5a623'

function installPulseProjectNameColor(projectStatus: string | undefined): string {
  if (projectStatus === ProjectStatus.CONFIRMED) return INSTALL_PULSE_NAME_CONFIRMED
  if (projectStatus === ProjectStatus.UNDER_INSTALLATION) return INSTALL_PULSE_NAME_UNDER_INSTALLATION
  return 'rgba(255,255,255,0.9)'
}

const INSTALL_PULSE_STAGE_LABEL: Partial<Record<ProjectStatus, string>> = {
  [ProjectStatus.CONFIRMED]: 'Confirmed Order',
  [ProjectStatus.UNDER_INSTALLATION]: 'Under Installation',
}

function installPulseStageLabel(projectStatus: string | undefined): string {
  if (!projectStatus) return '—'
  const ps = projectStatus as ProjectStatus
  return INSTALL_PULSE_STAGE_LABEL[ps] ?? projectStatus
}

/** Payment radar table: project name colour by Prisma payment status (overdue list is PENDING / PARTIAL only). */
const PAYMENT_RADAR_NAME_PENDING = '#7dd3fc'
const PAYMENT_RADAR_NAME_PARTIAL = '#f5a623'

function paymentRadarProjectNameColor(paymentStatus: string | undefined): string {
  const s = String(paymentStatus ?? 'PENDING').toUpperCase()
  if (s === 'PARTIAL') return PAYMENT_RADAR_NAME_PARTIAL
  if (s === 'PENDING') return PAYMENT_RADAR_NAME_PENDING
  return 'rgba(255,255,255,0.9)'
}

type AgeingBucket = {
  id: '0-30' | '31-60' | '61-90' | '90+'
  label: string
  count: number
  amount: number
}

type MonthlyCollectionPoint = { label: string; collected: number; outstanding: number }

type InstallRow = {
  projectId: string
  customerName: string
  kW: number | null
  salespersonName: string
  startDate: string | null
  expectedCompletion: string | null
  percentComplete: number | null
  overdue: boolean
  projectStatus?: string
  lastNote?: string | null
}

function isInstallDoneStatus(s: string | undefined): boolean {
  if (!s) return false
  return (
    s === ProjectStatus.COMPLETED ||
    s === ProjectStatus.SUBMITTED_FOR_SUBSIDY ||
    s === ProjectStatus.COMPLETED_SUBSIDY_CREDITED
  )
}

function expectedDateBeforeStart(startStr: string | null, expectedStr: string | null): boolean {
  if (!startStr || !expectedStr) return false
  const start = new Date(startStr)
  const expected = new Date(expectedStr)
  if (Number.isNaN(start.getTime()) || Number.isNaN(expected.getTime())) return false
  return expected.getTime() < start.getTime()
}

function computeInstallProgress(row: InstallRow): number {
  if (isInstallDoneStatus(row.projectStatus)) return 100

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const startStr = row.startDate
  const expectedStr = row.expectedCompletion

  if (!startStr) return 0

  const start = new Date(startStr)
  start.setHours(0, 0, 0, 0)

  let target: Date
  if (expectedStr) {
    target = new Date(expectedStr)
    target.setHours(0, 0, 0, 0)
  } else {
    target = new Date(start)
    target.setDate(target.getDate() + 45)
  }

  if (start > today) return 0
  if (target < start) return 0

  const totalDays = Math.max(1, (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const elapsedDays = Math.max(0, (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const pct = Math.round((elapsedDays / totalDays) * 100)
  return Math.min(pct, 100)
}

function installTimelineOverdue(row: InstallRow, progressPct: number): boolean {
  if (!row.expectedCompletion || progressPct >= 100) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(row.expectedCompletion)
  exp.setHours(0, 0, 0, 0)
  return today.getTime() > exp.getTime()
}

function getProgressColor(pct: number, isOverdue: boolean): string {
  if (isOverdue) return '#FF4757'
  if (pct >= 80) return '#F5A623'
  if (pct >= 40) return '#00D4B4'
  return '#3B8BFF'
}

function barWidthPercent(_row: InstallRow, progressPct: number, overdue: boolean): number {
  if (overdue && progressPct < 100) return 100
  return progressPct
}

function overdueRowToReminderProject(row: FinanceOverdueRow): ReminderTemplateProject {
  return {
    customerName: row.customerName,
    customerPhone: row.customerPhone ?? undefined,
    customerEmail: row.customerEmail ?? undefined,
    amount: row.amount,
    dueSince: row.dueSince,
    daysOverdue: row.daysOverdue,
    orderValue: row.orderValue ?? row.amount,
    amountPaid: row.amountPaid ?? 0,
  }
}

type ZenithFocusResponse =
  | { focusKind: 'NONE' }
  | { focusKind: 'SALES'; salesPipeline: { rows: SalesPipelineRow[]; followUpNeeded: number } }
  | {
      focusKind: 'FINANCE'
      financeRadar: {
        totalOutstanding: number
        avgCollectionDays: number | null
        subsidyPendingCount: number
        overdueTop5: FinanceOverdueRow[]
        ageingBuckets?: AgeingBucket[]
        monthlyCollections?: MonthlyCollectionPoint[]
        donut: { collected: number; outstanding: number; subsidyPending: number }
      }
    }
  | {
      focusKind: 'OPERATIONS'
      installPulse: { rows: InstallRow[]; avgInstallationDays: number | null; delayedCount: number }
    }
  | {
      focusKind: 'MANAGEMENT'
      salesPipeline: { rows: SalesPipelineRow[]; followUpNeeded: number }
      financeRadar: {
        totalOutstanding: number
        avgCollectionDays: number | null
        subsidyPendingCount: number
        overdueTop5: FinanceOverdueRow[]
        ageingBuckets?: AgeingBucket[]
        monthlyCollections?: MonthlyCollectionPoint[]
        donut: { collected: number; outstanding: number; subsidyPending: number }
      }
      installPulse: { rows: InstallRow[]; avgInstallationDays: number | null; delayedCount: number }
    }

function SalesPipelineBlock({
  title,
  data,
  accentClass,
  onOpenDrawer,
  embedded = false,
}: {
  title: string
  data: { rows: SalesPipelineRow[]; followUpNeeded: number }
  accentClass: string
  onOpenDrawer?: (p: { id: string; customerName?: string; stageLabel?: string }, section?: ZenithAutoFocusSection) => void
  /** Inside ZenithFocusCollapsible: drop outer card chrome and section title (title is on the collapsible header). */
  embedded?: boolean
}) {
  const [sortField, setSortField] = useState<
    'customerName' | 'stage' | 'salespersonName' | 'dealValue' | 'lastActivity' | 'health' | null
  >(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [stageFilter, setStageFilter] = useState<string>('ALL')
  const [salesPersonFilter, setSalesPersonFilter] = useState<string>('ALL')
  const [customerFilter, setCustomerFilter] = useState<string>('')

  const salesPersonOptions = useMemo(() => {
    const labels = new Set<string>()
    for (const r of data.rows) {
      const n = (r.salespersonName ?? '').trim() || 'Unassigned'
      labels.add(n)
    }
    return Array.from(labels).sort((a, b) => a.localeCompare(b))
  }, [data.rows])

  const handleSort = (field: NonNullable<typeof sortField>) => {
    if (sortField !== field) {
      setSortField(field)
      setSortDir(field === 'health' ? 'desc' : 'asc')
      return
    }
    setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
  }

  const displayRows = useMemo(() => {
    const q = customerFilter.trim().toLowerCase()
    let rows = [...data.rows]
    if (stageFilter !== 'ALL') rows = rows.filter((r) => r.stage === stageFilter)
    if (salesPersonFilter !== 'ALL') {
      rows = rows.filter((r) => {
        const n = (r.salespersonName ?? '').trim() || 'Unassigned'
        return n === salesPersonFilter
      })
    }
    if (q) rows = rows.filter((r) => (r.customerName || '').toLowerCase().includes(q))

    if (!sortField) return rows

    const dir = sortDir === 'asc' ? 1 : -1

    rows.sort((a, b) => {
      switch (sortField) {
        case 'customerName': {
          return (a.customerName || '').localeCompare(b.customerName || '') * dir
        }
        case 'stage': {
          return (a.stage || '').localeCompare(b.stage || '') * dir
        }
        case 'salespersonName': {
          const na = (a.salespersonName ?? '').trim() || 'Unassigned'
          const nb = (b.salespersonName ?? '').trim() || 'Unassigned'
          return na.localeCompare(nb) * dir
        }
        case 'dealValue': {
          return ((a.dealValue ?? 0) - (b.dealValue ?? 0)) * dir
        }
        case 'lastActivity': {
          return ((a.daysSinceActivity ?? 0) - (b.daysSinceActivity ?? 0)) * dir
        }
        case 'health': {
          const sa = computeDealHealth(pipelineRowToHealthProject(a))?.score ?? -1
          const sb = computeDealHealth(pipelineRowToHealthProject(b))?.score ?? -1
          return (sa - sb) * dir
        }
        default:
          return 0
      }
    })

    return rows
  }, [customerFilter, data.rows, salesPersonFilter, sortDir, sortField, stageFilter])

  const shellClass = embedded
    ? 'overflow-hidden max-lg:overflow-visible lg:overflow-hidden'
    : `zenith-pipeline-block-shell rounded-2xl border border-white/[0.08] bg-white/[0.03] ${accentClass} pl-4`

  return (
    <section className={shellClass}>
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          {!embedded ? <h3 className="zenith-display text-base font-bold text-white">{title}</h3> : null}
          <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
            <input
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              placeholder="Filter customer…"
              className="zenith-native-filter-input h-9 rounded-lg px-3 text-xs focus:outline-none"
            />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="zenith-native-select h-9 rounded-lg px-2.5 text-xs focus:outline-none"
              aria-label="Filter by stage"
            >
              <option value="ALL">All stages</option>
              {Array.from(new Set(data.rows.map((r) => r.stage))).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={salesPersonFilter}
              onChange={(e) => setSalesPersonFilter(e.target.value)}
              className="zenith-native-select h-9 rounded-lg px-2.5 text-xs focus:outline-none max-w-[200px]"
              aria-label="Filter by sales person"
            >
              <option value="ALL">All salespeople</option>
              {salesPersonOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          {data.followUpNeeded > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-500/20 text-red-200 text-xs font-bold px-2.5 py-1 border border-red-400/30">
              Follow-up needed: {data.followUpNeeded}
            </span>
          )}
        </div>
        <div className="zenith-scroll-x overflow-x-auto -mx-1 max-lg:pb-1">
          <table className="w-full text-left text-xs sm:text-sm min-w-[760px]">
            <thead>
              <tr className="text-white/45 border-b border-white/10">
                <th
                  className="py-2 pr-3 font-semibold cursor-pointer select-none"
                  onClick={() => handleSort('customerName')}
                >
                  Customer {sortField === 'customerName' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
                <th
                  className="py-2 pr-3 font-semibold cursor-pointer select-none"
                  onClick={() => handleSort('stage')}
                >
                  Stage {sortField === 'stage' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
                <th
                  className="py-2 pr-3 font-semibold cursor-pointer select-none min-w-[7rem]"
                  onClick={() => handleSort('salespersonName')}
                >
                  Sales person {sortField === 'salespersonName' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
                <th
                  className="py-2 pr-3 font-semibold text-right cursor-pointer select-none"
                  onClick={() => handleSort('dealValue')}
                >
                  Deal value {sortField === 'dealValue' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
                <th
                  className="py-2 pr-3 font-semibold cursor-pointer select-none"
                  onClick={() => handleSort('lastActivity')}
                >
                  Last activity {sortField === 'lastActivity' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
                <th
                  className="py-2 align-middle"
                  style={{
                    width: '90px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.4)',
                    fontWeight: 500,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => handleSort('health')}
                >
                  Health{' '}
                  {sortField === 'health' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
                <th className="py-2 pl-2 font-semibold w-[120px]"> </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-white/40">
                    No pipeline rows for this period.
                  </td>
                </tr>
              ) : (
                displayRows.map((r) => {
                  const tone = zenithLastActivityTone(r.daysSinceActivity)
                  const sp = (r.salespersonName ?? '').trim() || 'Unassigned'
                  const dealParts = formatZenithDealInrParts(r.dealValue)
                  return (
                    <tr key={r.projectId} className="group border-b border-white/[0.06] hover:bg-white/[0.04]">
                      <td className="py-2.5 pr-3">
                        <span className="text-white font-medium">{r.customerName}</span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={zenithDealRowStagePillClass(r.stage)}
                          style={{ fontFamily: 'var(--zenith-font-body)' }}
                        >
                          {r.stage}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-white/80 truncate max-w-[10rem]" title={sp}>
                        {sp}
                      </td>
                      <td
                        className={`py-2.5 pr-3 text-right tabular-nums font-medium ${
                          dealParts.muted ? 'text-white/30' : 'text-[#F5A623]'
                        }`}
                        style={{ fontFamily: 'var(--zenith-font-body)' }}
                      >
                        {dealParts.text}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${tone.className} ${tone.text}`}>
                          {r.daysSinceActivity}d ago
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '0 12px' }}>
                        <HealthBadge project={pipelineRowToHealthProject(r)} size="sm" showLabel={false} />
                      </td>
                      <td className="py-2.5 pl-2">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => onOpenDrawer?.({ id: r.projectId, customerName: r.customerName, stageLabel: r.stage })}
                            className={ZENITH_DEAL_OPEN_BUTTON_CLASS}
                            style={{ fontFamily: 'var(--zenith-font-body)' }}
                            aria-label={`Open quick actions for ${r.customerName}`}
                          >
                            Open →
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

const AGEING_STYLES: Record<
  AgeingBucket['id'],
  { labelColor: string; bar: string; borderActive: string; bgActive: string }
> = {
  '0-30': {
    labelColor: 'rgba(255,255,255,0.4)',
    bar: 'rgba(255,255,255,0.4)',
    borderActive: 'rgba(255,255,255,0.4)',
    bgActive: 'rgba(255,255,255,0.08)',
  },
  '31-60': {
    labelColor: '#F5A623',
    bar: '#F5A623',
    borderActive: 'rgba(245,166,35,0.55)',
    bgActive: 'rgba(245,166,35,0.08)',
  },
  '61-90': {
    labelColor: '#FF6B6B',
    bar: '#FF6B6B',
    borderActive: 'rgba(255,107,107,0.55)',
    bgActive: 'rgba(255,107,107,0.08)',
  },
  '90+': {
    labelColor: '#FF4757',
    bar: '#FF4757',
    borderActive: 'rgba(255,71,87,0.55)',
    bgActive: 'rgba(255,71,87,0.08)',
  },
}

function rowMatchesAgeFilter(row: FinanceOverdueRow, f: AgeingBucket['id'] | null): boolean {
  if (f == null) return true
  const d = row.daysOverdue ?? 0
  if (f === '0-30') return d <= 30
  if (f === '31-60') return d >= 31 && d <= 60
  if (f === '61-90') return d >= 61 && d <= 90
  return d > 90
}

function FinanceRadarBlock({
  data,
  accentClass,
  embedded = false,
  onOpenFinanceDrawer,
}: {
  data: {
    totalOutstanding: number
    avgCollectionDays: number | null
    subsidyPendingCount: number
    overdueTop5: FinanceOverdueRow[]
    ageingBuckets?: AgeingBucket[]
    monthlyCollections?: MonthlyCollectionPoint[]
    donut: { collected: number; outstanding: number; subsidyPending: number }
  }
  accentClass: string
  embedded?: boolean
  /** Finance / Admin / Management: open payment quick drawer instead of navigating away. */
  onOpenFinanceDrawer?: (projectId: string) => void
}) {
  const [sortField, setSortField] = useState<'amount' | 'days' | 'customer' | 'salesperson' | null>('amount')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [customerFilter, setCustomerFilter] = useState<string>('')
  const [salesPersonFilter, setSalesPersonFilter] = useState<string>('ALL')
  const [ageFilter, setAgeFilter] = useState<AgeingBucket['id'] | null>(null)
  const [reminderProject, setReminderProject] = useState<FinanceOverdueRow | null>(null)
  /** Recharts pie Legend is absolutely positioned; with global mobile `overflow:visible` it bleeds into the next section — hide legend on narrow widths (footnote + bar key still explain colours). */
  const [narrowPaymentCharts, setNarrowPaymentCharts] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setNarrowPaymentCharts(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const ageingBuckets = data.ageingBuckets ?? []
  const monthlyCollections = data.monthlyCollections ?? []
  const totalOut = Math.max(1, data.totalOutstanding)

  const overdueSalesPersonOptions = useMemo(() => {
    const labels = new Set<string>()
    for (const r of data.overdueTop5) {
      const n = (r.salespersonName ?? '').trim() || 'Unassigned'
      labels.add(n)
    }
    return Array.from(labels).sort((a, b) => a.localeCompare(b))
  }, [data.overdueTop5])

  const overdueRows = useMemo(() => {
    const q = customerFilter.trim().toLowerCase()
    let rows = [...data.overdueTop5]
    if (q) rows = rows.filter((r) => (r.customerName || '').toLowerCase().includes(q))
    if (salesPersonFilter !== 'ALL') {
      rows = rows.filter((r) => {
        const n = (r.salespersonName ?? '').trim() || 'Unassigned'
        return n === salesPersonFilter
      })
    }
    rows = rows.filter((r) => rowMatchesAgeFilter(r, ageFilter))
    if (!sortField) return rows
    const dir = sortDir === 'asc' ? 1 : -1
    rows.sort((a, b) => {
      switch (sortField) {
        case 'amount':
          return ((a.amount ?? 0) - (b.amount ?? 0)) * dir
        case 'days':
          return ((a.daysOverdue ?? 0) - (b.daysOverdue ?? 0)) * dir
        case 'customer':
          return (a.customerName || '').localeCompare(b.customerName || '') * dir
        case 'salesperson': {
          const na = (a.salespersonName ?? '').trim() || 'Unassigned'
          const nb = (b.salespersonName ?? '').trim() || 'Unassigned'
          return na.localeCompare(nb) * dir
        }
        default:
          return 0
      }
    })
    return rows
  }, [ageFilter, customerFilter, data.overdueTop5, salesPersonFilter, sortDir, sortField])

  const toggleSort = (f: NonNullable<typeof sortField>) => {
    if (sortField !== f) {
      setSortField(f)
      setSortDir(f === 'customer' || f === 'salesperson' ? 'asc' : 'desc')
      return
    }
    setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
  }

  const pieData = [
    { name: 'Collected', value: data.donut.collected, fill: '#00d4b4' },
    { name: 'Outstanding', value: data.donut.outstanding, fill: '#f5a623' },
    { name: 'Subsidy pending', value: data.donut.subsidyPending, fill: '#a78bfa' },
  ].filter((d) => d.value > 0)

  const latestM = monthlyCollections.length >= 2 ? monthlyCollections[monthlyCollections.length - 1] : null
  const prevM = monthlyCollections.length >= 2 ? monthlyCollections[monthlyCollections.length - 2] : null
  const trendDelta =
    latestM && prevM ? (latestM.collected ?? 0) - (prevM.collected ?? 0) : 0

  const shellClass = embedded
    ? 'overflow-hidden max-lg:overflow-visible lg:overflow-hidden'
    : `zenith-finance-radar-section rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden max-lg:overflow-visible lg:overflow-hidden ${accentClass} pl-4`

  return (
    <section className={shellClass}>
      <div className="p-4 sm:p-5">
        {!embedded ? (
          <h3 className="zenith-display text-base font-bold text-white mb-4">Payment radar</h3>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl bg-black/25 border border-white/10 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/45 font-bold">Total outstanding</p>
            <p className="text-lg font-extrabold text-[#f5a623] tabular-nums mt-1">
              ₹{Math.round(data.totalOutstanding).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="rounded-xl bg-black/25 border border-white/10 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/45 font-bold">Avg collection days</p>
            <p className="text-lg font-extrabold text-white tabular-nums mt-1">
              {data.avgCollectionDays != null ? `${data.avgCollectionDays}d` : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-black/25 border border-white/10 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/45 font-bold">Subsidy pending</p>
            <p className="text-lg font-extrabold text-white tabular-nums mt-1">{data.subsidyPendingCount}</p>
          </div>
        </div>

        {ageingBuckets.length > 0 ? (
          <div className="my-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <p
                className="text-[10px] uppercase tracking-widest font-bold m-0"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Payment ageing
              </p>
              {ageFilter ? (
                <button
                  type="button"
                  onClick={() => setAgeFilter(null)}
                  className="text-[11px] font-semibold shrink-0 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1 text-white/55 hover:text-white hover:border-[#00d4b4]/40 hover:bg-[#00d4b4]/10 transition-colors"
                >
                  Reset ageing filter
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ageingBuckets.map((b) => {
                const st = AGEING_STYLES[b.id]
                const active = ageFilter === b.id
                const barPct = Math.min(100, (b.amount / totalOut) * 100)
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setAgeFilter(active ? null : b.id)}
                    className="text-left rounded-[10px] px-3.5 py-3 transition-all duration-200 cursor-pointer hover:-translate-y-px"
                    style={{
                      background: active ? st.bgActive : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? st.borderActive : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    <div className="text-[11px] font-medium" style={{ color: st.labelColor }}>
                      {b.label}
                    </div>
                    <div className="text-[22px] font-bold tabular-nums mt-0.5" style={{ color: st.labelColor }}>
                      {b.count}
                    </div>
                    <div className="text-[12px] tabular-nums mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      ₹{Math.round(b.amount).toLocaleString('en-IN')}
                    </div>
                    {active ? (
                      <div className="text-[9px] font-bold tracking-widest mt-1" style={{ color: st.labelColor }}>
                        Active filter
                      </div>
                    ) : null}
                    <div
                      className="mt-2 h-[3px] rounded-sm overflow-hidden w-full"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="h-full rounded-sm transition-[width] duration-[600ms] ease-out"
                        style={{ width: `${barPct}%`, background: st.bar }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* lg: row at least ~620px so chart column never collapses when few overdue rows; table body scrolls inside */}
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-stretch lg:[grid-auto-rows:minmax(640px,auto)] gap-8 lg:gap-6 xl:gap-8">
          <div className="min-w-0 flex flex-col lg:h-full lg:min-h-0">
            <div className="flex flex-wrap items-end justify-between gap-2 mb-2">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest shrink-0">
                  Top overdue
                </h4>
                {ageFilter ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#00d4b4]/35 bg-[#00d4b4]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#00d4b4]"
                    title="Filtered by payment ageing bucket"
                  >
                    {ageingBuckets.find((b) => b.id === ageFilter)?.label ?? ageFilter}
                    <button
                      type="button"
                      aria-label="Clear ageing filter"
                      onClick={() => setAgeFilter(null)}
                      className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/15 text-[#00d4b4] border-0 bg-transparent cursor-pointer p-0 leading-none"
                    >
                      ×
                    </button>
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {ageFilter || customerFilter.trim() || salesPersonFilter !== 'ALL' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAgeFilter(null)
                      setCustomerFilter('')
                      setSalesPersonFilter('ALL')
                    }}
                    className="h-8 rounded-lg border border-white/15 bg-transparent px-3 text-[11px] font-semibold text-white/45 hover:text-white hover:border-white/25 transition-colors"
                  >
                    Reset filters
                  </button>
                ) : null}
                <select
                  value={salesPersonFilter}
                  onChange={(e) => setSalesPersonFilter(e.target.value)}
                  className="zenith-native-select h-8 rounded-lg px-2.5 text-xs focus:outline-none min-w-[7.5rem] max-w-[11rem]"
                  aria-label="Filter by sales person"
                >
                  <option value="ALL">All salespeople</option>
                  {overdueSalesPersonOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <input
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  placeholder="Filter customer…"
                  className="zenith-native-filter-input h-8 rounded-lg px-3 text-xs focus:outline-none min-w-[120px] lg:max-w-[9rem]"
                />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden flex-1 flex flex-col min-h-[240px] lg:min-h-0">
              <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 max-h-[min(70vh,520px)] lg:max-h-none zenith-scroll-x">
                <table className="w-full min-w-[520px] text-left text-[11px] sm:text-xs">
                  <thead>
                    <tr className="text-white/45 border-b border-white/10">
                      <th
                        className="py-2 px-2 sm:px-2.5 font-semibold cursor-pointer select-none max-w-[7rem] sm:max-w-[9rem]"
                        onClick={() => toggleSort('customer')}
                      >
                        Projects {sortField === 'customer' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                      </th>
                      <th
                        className="py-2 px-2 font-semibold cursor-pointer select-none min-w-[6.5rem] max-w-[9rem]"
                        onClick={() => toggleSort('salesperson')}
                      >
                        Sales person {sortField === 'salesperson' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                      </th>
                      <th
                        className="py-2 px-2 font-semibold text-right cursor-pointer select-none whitespace-nowrap"
                        onClick={() => toggleSort('amount')}
                      >
                        Amt {sortField === 'amount' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                      </th>
                      <th className="py-2 px-2 font-semibold whitespace-nowrap">Since</th>
                      <th
                        className="py-2 px-2 font-semibold text-right cursor-pointer select-none"
                        onClick={() => toggleSort('days')}
                      >
                        Days {sortField === 'days' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                      </th>
                      <th className="py-2 px-2 font-semibold text-right w-10"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 px-2 text-center text-white/40">
                          {ageFilter
                            ? 'No overdue rows in this ageing bucket (adjust filter or customer search).'
                            : 'No overdue rows in top slice.'}
                        </td>
                      </tr>
                    ) : (
                      overdueRows.map((r) => {
                        const sp = (r.salespersonName ?? '').trim() || 'Unassigned'
                        const nameColor = paymentRadarProjectNameColor(r.paymentStatus)
                        return (
                        <tr key={r.projectId} className="border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.04]">
                          <td className="py-2 px-2 sm:px-2.5 max-w-[7rem] sm:max-w-[9rem]">
                            {onOpenFinanceDrawer ? (
                              <button
                                type="button"
                                onClick={() => onOpenFinanceDrawer(r.projectId)}
                                className="font-semibold block truncate text-left w-full bg-transparent border-0 cursor-pointer p-0 transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623]/50 rounded-sm"
                                style={{ color: nameColor }}
                                title={r.customerName}
                              >
                                {r.customerName}
                              </button>
                            ) : (
                              <Link
                                to={`/projects/${r.projectId}`}
                                className="font-semibold block truncate transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623]/50 rounded-sm"
                                style={{ color: nameColor }}
                                title={r.customerName}
                              >
                                {r.customerName}
                              </Link>
                            )}
                          </td>
                          <td className="py-2 px-2 text-white/70 truncate max-w-[9rem]" title={sp}>
                            {sp}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums text-white/85 whitespace-nowrap">
                            ₹{Math.round(r.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-2 text-white/55 whitespace-nowrap">
                            {format(parseISO(r.dueSince), 'dd MMM yy')}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <span className="inline-flex items-center rounded-md bg-red-500/25 text-red-200 text-[10px] font-bold px-1 py-0.5 tabular-nums">
                              {r.daysOverdue}d
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => setReminderProject(r)}
                              className="text-[10px] sm:text-[11px] font-bold text-[#00d4b4] hover:underline whitespace-nowrap bg-transparent border-0 cursor-pointer p-0"
                            >
                              Remind
                            </button>
                          </td>
                        </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <p
                className="shrink-0 border-t border-white/[0.06] px-2 sm:px-2.5 py-2 m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] leading-snug text-white/45"
                role="note"
              >
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: PAYMENT_RADAR_NAME_PENDING }}
                    aria-hidden
                  />
                  <span>Project name — pending payment</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: PAYMENT_RADAR_NAME_PARTIAL }}
                    aria-hidden
                  />
                  <span>Project name — partial payment</span>
                </span>
              </p>
            </div>
          </div>

          <div
            className="zenith-payment-radar-charts min-w-0 flex flex-col rounded-xl border border-white/10 bg-black/20 overflow-visible lg:overflow-hidden lg:h-full lg:min-h-0"
            aria-label="Payment mix and collections trend"
          >
            <div className="flex flex-col max-lg:h-auto lg:h-full min-h-0 lg:min-h-[320px]">
              {/* Upper: on lg split height with bar; on mobile natural height so the bar block keeps room */}
              <div className="flex flex-col flex-none lg:flex-1 lg:min-h-0 lg:basis-0 border-b border-white/[0.07] p-3 sm:p-4">
                <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2 shrink-0">
                  Collected vs outstanding
                </h4>
                <div className="zenith-chart-slot zenith-payment-radar-pie-slot w-full max-lg:h-[200px] max-lg:flex-none lg:flex-1 lg:min-h-[160px] relative">
                  {pieData.length === 0 ? (
                    <p className="text-sm text-white/40 flex items-center justify-center h-full text-left px-1">
                      No payment mix data
                    </p>
                  ) : (
                    <ZenithChartTouchReset className="h-full w-full min-w-0 min-h-[160px] max-lg:min-h-[200px]">
                      {(rk) => (
                        <ResponsiveContainer
                          key={rk}
                          width="100%"
                          height="100%"
                          minWidth={0}
                          minHeight={narrowPaymentCharts ? 200 : 160}
                        >
                          <PieChart
                            margin={{
                              top: 4,
                              right: 8,
                              bottom: narrowPaymentCharts ? 4 : 8,
                              left: 8,
                            }}
                          >
                            <Pie
                              data={pieData}
                              dataKey="value"
                              cx="50%"
                              cy={narrowPaymentCharts ? '50%' : '44%'}
                              innerRadius="54%"
                              outerRadius="78%"
                              paddingAngle={2}
                            >
                              {pieData.map((e, i) => (
                                <Cell key={i} fill={e.fill} stroke="rgba(0,0,0,0.2)" />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`}
                              contentStyle={{
                                background: 'rgba(10,10,15,0.96)',
                                border: '1px solid rgba(255,255,255,0.14)',
                                borderRadius: 10,
                                color: '#f8fafc',
                              }}
                              labelStyle={{ color: '#ffffff', fontWeight: 600 }}
                              itemStyle={{ color: '#f1f5f9' }}
                            />
                            {!narrowPaymentCharts ? (
                              <Legend
                                layout="horizontal"
                                verticalAlign="bottom"
                                align="center"
                                wrapperStyle={{ paddingTop: 4 }}
                                formatter={(value) => (
                                  <span className="text-white/80 text-[10px] sm:text-[11px]">{value}</span>
                                )}
                              />
                            ) : null}
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </ZenithChartTouchReset>
                  )}
                </div>
                <p className="text-[9px] sm:text-[10px] text-left text-white/35 mt-1.5 shrink-0 leading-relaxed">
                  Amounts in ₹ · Collected, outstanding, subsidy pending
                </p>
              </div>

              {/* Lower half: bars */}
              {monthlyCollections.length > 0 ? (
                <div className="flex flex-col flex-none lg:flex-1 lg:min-h-0 lg:basis-0 p-3 sm:p-4 max-lg:pb-4">
                <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2 shrink-0 max-lg:leading-snug">
                  <span className="max-lg:block lg:inline">Collections</span>
                  <span className="max-lg:hidden"> — </span>
                  <span className="max-lg:block lg:inline max-lg:mt-0.5">last 6 months</span>
                </h4>
                  <div className="zenith-chart-slot zenith-payment-radar-bar-slot w-full max-lg:h-[240px] max-lg:flex-none lg:flex-1 lg:min-h-[140px] relative">
                    <ZenithChartTouchReset className="h-full w-full min-w-0 min-h-[140px] max-lg:min-h-[240px]">
                      {(rk) => (
                        <ResponsiveContainer
                          key={rk}
                          width="100%"
                          height="100%"
                          minWidth={0}
                          minHeight={narrowPaymentCharts ? 240 : 140}
                        >
                          <BarChart
                            data={monthlyCollections}
                            margin={{
                              top: 4,
                              right: 4,
                              bottom: narrowPaymentCharts ? 22 : 0,
                              left: 0,
                            }}
                          >
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.35)' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis hide />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null
                                const col = payload.find((p) => p.dataKey === 'collected')
                                const out = payload.find((p) => p.dataKey === 'outstanding')
                                return (
                                  <div
                                    style={{
                                      background: '#1A1A2E',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      borderRadius: 8,
                                      padding: '8px 12px',
                                      fontFamily: 'DM Sans, sans-serif',
                                      fontSize: 12,
                                    }}
                                  >
                                    <div style={{ color: '#fff', marginBottom: 4 }}>{label}</div>
                                    <div style={{ color: '#00D4B4' }}>
                                      Collected: ₹{Math.round(Number(col?.value ?? 0)).toLocaleString('en-IN')}
                                    </div>
                                    <div style={{ color: '#F5A623' }}>
                                      Outstanding: ₹{Math.round(Number(out?.value ?? 0)).toLocaleString('en-IN')}
                                    </div>
                                  </div>
                                )
                              }}
                            />
                            <Bar dataKey="collected" fill="#00D4B4" radius={[3, 3, 0, 0]} maxBarSize={28} />
                            <Bar dataKey="outstanding" fill="#F5A623" opacity={0.6} radius={[3, 3, 0, 0]} maxBarSize={28} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </ZenithChartTouchReset>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[10px] shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#00D4B4]" />
                      Collected
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623] opacity-80" />
                      Outstanding
                    </span>
                  </div>
                  {latestM && prevM ? (
                    <p className="text-[10px] mt-1.5 shrink-0" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      {trendDelta > 0 ? (
                        <span style={{ color: '#00D4B4' }}>
                          ▲ Collections up ₹{Math.abs(Math.round(trendDelta)).toLocaleString('en-IN')} vs last month
                        </span>
                      ) : trendDelta < 0 ? (
                        <span style={{ color: '#FF4757' }}>
                          ▼ Collections down ₹{Math.abs(Math.round(trendDelta)).toLocaleString('en-IN')} vs last month
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>Collections steady vs last month</span>
                      )}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col flex-1 min-h-0 basis-0 items-center justify-center p-4 text-white/30 text-xs border-t border-white/[0.06]">
                  No monthly collections trend for this period.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {reminderProject ? (
        <ReminderModal
          key={reminderProject.projectId}
          project={overdueRowToReminderProject(reminderProject)}
          onClose={() => setReminderProject(null)}
        />
      ) : null}
    </section>
  )
}

function InstallationProgressCell({ row }: { row: InstallRow }) {
  const progressPct = computeInstallProgress(row)
  const dateInvalid = expectedDateBeforeStart(row.startDate, row.expectedCompletion)
  const overdue = installTimelineOverdue(row, progressPct)
  const fillPct = barWidthPercent(row, progressPct, overdue)
  const color = getProgressColor(progressPct, overdue)
  const displayPct = overdue && progressPct < 100 ? 100 : progressPct
  const [w, setW] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(fillPct))
    return () => cancelAnimationFrame(id)
  }, [fillPct])

  let statusLabel: string | null = null
  if (overdue && progressPct < 100) statusLabel = 'OVERDUE'
  else if (progressPct === 0 && !row.startDate) statusLabel = 'NOT STARTED'
  else if (progressPct === 0 && row.startDate) {
    const st = new Date(row.startDate)
    st.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (st > today) statusLabel = `STARTS ${format(st, 'dd MMM yy')}`
  }

  return (
    <div className="min-w-[7.5rem] sm:min-w-[8.5rem]">
      <div className="flex items-center justify-end gap-1 mb-0.5 min-h-[14px]">
        {statusLabel ? (
          <span
            className="text-[9px] font-bold tracking-wide"
            style={{ color: overdue ? '#FF4757' : 'rgba(255,255,255,0.3)' }}
          >
            {statusLabel}
          </span>
        ) : null}
        {dateInvalid ? (
          <span
            title="Expected date is before start date — please update the project record"
            className="text-[10px] cursor-help"
            style={{ color: '#F5A623' }}
          >
            ⚠️
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="flex-1 h-[5px] rounded-[3px] overflow-hidden min-w-[48px] sm:min-w-[64px]"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        >
          <div
            className="h-full rounded-[3px] transition-[width] duration-[800ms] ease-out"
            style={{ width: `${w}%`, background: color }}
          />
        </div>
        <span className="text-[11px] tabular-nums text-white/55 shrink-0 w-8 sm:w-9 text-right">{displayPct}%</span>
      </div>
    </div>
  )
}

function InstallationPulseBlock({
  data,
  accentClass,
  onOpenDrawer,
  onOpenOperationsDrawer,
  embedded = false,
}: {
  data: { rows: InstallRow[]; avgInstallationDays: number | null; delayedCount: number }
  accentClass: string
  onOpenDrawer?: (p: { id: string; customerName?: string; stageLabel?: string }, section?: ZenithAutoFocusSection) => void
  /** Installation / admin / management Zenith: log updates open the operations lifecycle drawer. */
  onOpenOperationsDrawer?: (projectId: string) => void
  embedded?: boolean
}) {
  const [sortField, setSortField] = useState<
    'customerName' | 'kW' | 'salespersonName' | 'startDate' | 'expectedCompletion' | 'percentComplete' | null
  >(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [overdueOnly, setOverdueOnly] = useState(false)

  const handleSort = (field: NonNullable<typeof sortField>) => {
    if (sortField !== field) {
      setSortField(field)
      setSortDir(field === 'percentComplete' || field === 'kW' ? 'desc' : 'asc')
      return
    }
    setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
  }

  const displayRows = useMemo(() => {
    let rows = [...data.rows]
    if (overdueOnly) rows = rows.filter((r) => r.overdue)
    if (!sortField) return rows
    const dir = sortDir === 'asc' ? 1 : -1
    const ts = (s: string | null) => {
      if (!s) return 0
      const t = Date.parse(s)
      return Number.isFinite(t) ? t : 0
    }
    rows.sort((a, b) => {
      switch (sortField) {
        case 'customerName':
          return (a.customerName || '').localeCompare(b.customerName || '') * dir
        case 'kW':
          return (((a.kW ?? -1) - (b.kW ?? -1)) || 0) * dir
        case 'salespersonName':
          return (a.salespersonName || '').localeCompare(b.salespersonName || '') * dir
        case 'startDate':
          return (ts(a.startDate) - ts(b.startDate)) * dir
        case 'expectedCompletion':
          return (ts(a.expectedCompletion) - ts(b.expectedCompletion)) * dir
        case 'percentComplete':
          return (computeInstallProgress(a) - computeInstallProgress(b)) * dir
        default:
          return 0
      }
    })
    return rows
  }, [data.rows, overdueOnly, sortDir, sortField])

  const shellClass = embedded
    ? 'overflow-hidden'
    : `rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden ${accentClass} pl-4`

  return (
    <section className={shellClass}>
      <div className="p-4 sm:p-5">
        <div
          className={`flex flex-wrap items-center gap-2 mb-3 ${embedded ? 'justify-end' : 'justify-between'}`}
        >
          {!embedded ? <h3 className="zenith-display text-base font-bold text-white">Installation pulse</h3> : null}
          <button
            type="button"
            onClick={() => setOverdueOnly((v) => !v)}
            className={`h-9 px-3 rounded-lg border text-xs font-bold transition-colors ${
              overdueOnly
                ? 'bg-red-500/20 text-red-200 border-red-400/30'
                : 'bg-black/25 text-white/70 border-white/10 hover:bg-white/[0.05]'
            }`}
            title="Toggle: show only overdue rows"
          >
            {overdueOnly ? 'Overdue only ✓' : 'Overdue only'}
          </button>
        </div>
        <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-white/70 mb-4">
          <span>
            Avg install days:{' '}
            <strong className="text-white">{data.avgInstallationDays != null ? `${data.avgInstallationDays}d` : '—'}</strong>
          </span>
          <span>
            Delayed:{' '}
            <strong className={data.delayedCount > 0 ? 'text-red-300' : 'text-emerald-300'}>{data.delayedCount}</strong>
          </span>
        </div>
        <div
          className="zenith-scroll-x zenith-install-pulse-scroll overflow-x-auto overscroll-x-contain -mx-1 px-1 sm:px-0 rounded-lg sm:rounded-none"
          role="region"
          aria-label="Installation projects table, scroll horizontally on small screens"
        >
          <table className="w-full min-w-[960px] md:min-w-[1020px] xl:min-w-[1080px] text-left text-xs sm:text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-white/45 border-b border-white/10">
                <th
                  className="py-2.5 pr-3 sm:pr-4 font-semibold align-bottom cursor-pointer select-none"
                  onClick={() => handleSort('customerName')}
                >
                  Customer {sortField === 'customerName' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
                <th
                  className="py-2.5 pl-2 pr-5 sm:pr-8 font-semibold text-right align-bottom tabular-nums cursor-pointer select-none"
                  onClick={() => handleSort('kW')}
                >
                  kW {sortField === 'kW' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
                <th
                  className="py-2.5 pl-3 sm:pl-5 pr-3 sm:pr-4 font-semibold align-bottom cursor-pointer select-none"
                  onClick={() => handleSort('salespersonName')}
                >
                  Sales person {sortField === 'salespersonName' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
                <th
                  className="py-2.5 px-3 sm:px-4 font-semibold align-bottom whitespace-nowrap cursor-pointer select-none"
                  onClick={() => handleSort('startDate')}
                >
                  Start {sortField === 'startDate' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
                <th
                  className="py-2.5 px-3 sm:px-4 font-semibold align-bottom whitespace-nowrap cursor-pointer select-none"
                  onClick={() => handleSort('expectedCompletion')}
                >
                  Expected {sortField === 'expectedCompletion' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
                <th
                  className="hidden md:table-cell py-2.5 px-3 font-semibold align-bottom w-[200px]"
                  style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.4)',
                    fontWeight: 500,
                  }}
                >
                  Last note
                </th>
                <th
                  className="py-2.5 pl-3 font-semibold align-bottom min-w-[7.5rem] sm:min-w-[8.5rem] cursor-pointer select-none"
                  onClick={() => handleSort('percentComplete')}
                >
                  Progress {sortField === 'percentComplete' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
                <th className="py-2.5 pl-2 w-[120px] font-semibold align-bottom" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-white/40">
                    No confirmed or under-installation projects for this period.
                  </td>
                </tr>
              ) : (
                displayRows.map((r) => {
                  const note = r.lastNote?.trim() || ''
                  const nameColor = installPulseProjectNameColor(r.projectStatus)
                  return (
                    <tr
                      key={r.projectId}
                      className={`border-b border-white/[0.06] ${r.overdue ? 'bg-red-500/5' : 'hover:bg-white/[0.04]'}`}
                    >
                      <td className="py-2.5 pr-3 sm:pr-4 align-middle">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`h-2 w-2 rounded-full flex-shrink-0 ${r.overdue ? 'bg-red-400' : 'bg-emerald-400'}`}
                            title={r.overdue ? 'Overdue' : 'On track'}
                          />
                          <span
                            className="font-medium truncate sm:whitespace-normal sm:break-words"
                            style={{ color: nameColor }}
                            title={r.customerName}
                          >
                            {r.customerName}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pl-2 pr-5 sm:pr-8 text-right tabular-nums text-white/85 align-middle whitespace-nowrap">
                        {r.kW != null ? r.kW.toFixed(2) : '—'}
                      </td>
                      <td className="py-2.5 pl-3 sm:pl-5 pr-3 sm:pr-4 text-white/75 align-middle whitespace-nowrap">
                        {r.salespersonName}
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-white/60 align-middle whitespace-nowrap">
                        {r.startDate ? format(parseISO(r.startDate), 'dd MMM yy') : '—'}
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-white/60 align-middle whitespace-nowrap">
                        {r.expectedCompletion ? format(parseISO(r.expectedCompletion), 'dd MMM yy') : '—'}
                      </td>
                      <td className="hidden md:table-cell py-2.5 px-3 align-top max-w-[200px]">
                        {note ? (
                          <div>
                            <p
                              className="text-[12px] m-0 overflow-hidden"
                              style={{
                                color: 'rgba(255,255,255,0.65)',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                lineHeight: 1.5,
                                maxWidth: 200,
                              }}
                              title={note}
                            >
                              {note}
                            </p>
                            {note.length > 80 ? (
                              <span
                                className="text-[10px] block mt-0.5"
                                style={{ color: 'rgba(255,255,255,0.25)' }}
                                title={note}
                              >
                                … hover to read more
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[12px] italic" style={{ color: 'rgba(255,255,255,0.2)' }}>
                            No notes yet
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pl-3 align-middle">
                        <InstallationProgressCell row={r} />
                      </td>
                      <td className="py-2.5 pl-2 align-middle whitespace-nowrap">
                        {onOpenOperationsDrawer || onOpenDrawer ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenOperationsDrawer) {
                                onOpenOperationsDrawer(r.projectId)
                                return
                              }
                              onOpenDrawer?.(
                                {
                                  id: r.projectId,
                                  customerName: r.customerName,
                                  stageLabel: installPulseStageLabel(r.projectStatus),
                                },
                                'note',
                              )
                            }}
                            className="rounded-lg px-3 py-1 text-[12px] transition-all duration-200 bg-transparent cursor-pointer"
                            style={{
                              border: '1px solid rgba(0,212,180,0.25)',
                              color: '#00D4B4',
                              fontFamily: 'DM Sans, sans-serif',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(0,212,180,0.1)'
                              e.currentTarget.style.borderColor = 'rgba(0,212,180,0.5)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                              e.currentTarget.style.borderColor = 'rgba(0,212,180,0.25)'
                            }}
                          >
                            + Log update
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <p
          className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] leading-snug text-white/45 mt-3 mb-1 max-w-3xl"
          role="note"
        >
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: INSTALL_PULSE_NAME_CONFIRMED }}
              aria-hidden
            />
            <span>Customer — confirmed order</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: INSTALL_PULSE_NAME_UNDER_INSTALLATION }}
              aria-hidden
            />
            <span>Customer — under installation</span>
          </span>
        </p>
        <p className="text-[11px] sm:text-xs text-white/45 leading-relaxed mt-4 max-w-3xl">
          <span className="text-white/55 font-semibold">Data sources: </span>
          <strong className="text-white/70">Sales person</strong> is the project’s assigned{' '}
          <strong className="text-white/70">salesperson</strong>. Rows are <strong className="text-white/70">confirmed order</strong>{' '}
          and <strong className="text-white/70">under installation</strong>. Start uses installation start date, then{' '}
          <strong className="text-white/70">stage entered</strong> or <strong className="text-white/70">order confirmation</strong>{' '}
          date. <strong className="text-white/70">Expected</strong> uses <strong className="text-white/70">expected commissioning</strong>{' '}
          on the project when set; otherwise <strong className="text-white/70">installation completion date</strong> (same field as
          Project Lifecycle). Progress uses start vs that target (or 100% if install is marked complete).
        </p>
      </div>
    </section>
  )
}

type PeBucketListClickArgs = {
  row: {
    key: string
    label: string
    count: number
    crmOrderValue: number
    peOrderValueExGst: number
    projectIds: string[]
  }
  filteredProjects: ZenithExplorerProject[]
}

export default function ZenithYourFocus({
  role,
  dateFilter,
  zenithMainLoading,
  onOpenDrawer,
  onOpenFinanceDrawer,
  onOpenOperationsDrawer,
  showProposalEngine = false,
  zenithExplorerProjects,
  onPeBucketListClick,
}: {
  role: UserRole
  dateFilter: ZenithDateFilter
  /** When Zenith dashboard payload is still loading, skip focus fetch to avoid duplicate empty state. */
  zenithMainLoading: boolean
  onOpenDrawer?: (p: { id: string; customerName?: string; stageLabel?: string }, section?: ZenithAutoFocusSection) => void
  /** Payment radar: Finance / Admin / Management payment quick drawer. */
  onOpenFinanceDrawer?: (projectId: string) => void
  /** Installation pulse: Operations / Admin / Management lifecycle drawer. */
  onOpenOperationsDrawer?: (projectId: string) => void
  /** Executive Zenith only: fourth collapsible under Your focus (sales / admin / management). */
  showProposalEngine?: boolean
  /** Same slice as main Zenith dashboard; used to populate PE bucket quick drawer. */
  zenithExplorerProjects?: ZenithExplorerProject[]
  /** Opens quick drawer for a PE table row; footer uses `buildProjectsUrl({ peBucket })`. */
  onPeBucketListClick?: (args: PeBucketListClickArgs) => void
}) {
  const { user } = useAuth()
  const effFYs = dateFilter.selectedFYs
  const effQ = dateFilter.selectedQuarters
  const effM = dateFilter.selectedMonths

  const showForRole =
    role === UserRole.SALES ||
    role === UserRole.FINANCE ||
    role === UserRole.OPERATIONS ||
    role === UserRole.MANAGEMENT ||
    role === UserRole.ADMIN

  const { data, isLoading, isError } = useQuery({
    queryKey: ['zenith-focus', user?.id, effFYs, effQ, effM],
    queryFn: async () => {
      const params = new URLSearchParams()
      effFYs.forEach((fy) => params.append('fy', fy))
      effQ.forEach((q) => params.append('quarter', q))
      effM.forEach((m) => params.append('month', m))
      const res = await axiosInstance.get(`/api/dashboard/zenith-focus?${params.toString()}`)
      return res.data as ZenithFocusResponse
    },
    enabled: !!user?.id && showForRole && !zenithMainLoading,
  })

  if (!showForRole) return null

  if (zenithMainLoading || isLoading) {
    return (
      <div className="zenith-skeleton rounded-2xl h-36 w-full" aria-hidden />
    )
  }

  if (isError || !data || data.focusKind === 'NONE') {
    return null
  }

  return (
    <div className="space-y-5 w-full">
      <header className="px-0.5">
        <h2
          className="zenith-display text-lg sm:text-xl font-bold text-white tracking-tight"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Your focus
        </h2>
        {role !== UserRole.FINANCE && role !== UserRole.OPERATIONS ? (
          <p
            className="mt-1.5 text-[11px] text-white/45 leading-snug max-w-2xl"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Click on each of the sections to open and work on them.
          </p>
        ) : null}
      </header>

      <div className="space-y-4 w-full">
        {data.focusKind === 'SALES' && (
          <>
            <ZenithFocusCollapsible title="Your pipeline today" accent="gold" defaultOpen={false}>
              <SalesPipelineBlock
                title="Your pipeline today"
                data={data.salesPipeline}
                accentClass="border-l-4 border-[#F5A623]"
                onOpenDrawer={onOpenDrawer}
                embedded
              />
            </ZenithFocusCollapsible>
            {showProposalEngine ? (
              <ZenithFocusCollapsible
                id="zenith-proposal-engine"
                title="Proposal Engine"
                accent="gold"
                defaultOpen={false}
                subtitle="PE readiness by project bucket"
              >
                <ZenithProposalEngineCard
                  selectedFYs={dateFilter.selectedFYs}
                  selectedQuarters={dateFilter.selectedQuarters}
                  selectedMonths={dateFilter.selectedMonths}
                  embedded
                  zenithExplorerProjects={zenithExplorerProjects}
                  onPeBucketClick={
                    onPeBucketListClick
                      ? (args) => onPeBucketListClick(args)
                      : undefined
                  }
                />
              </ZenithFocusCollapsible>
            ) : null}
          </>
        )}

        {data.focusKind === 'FINANCE' && (
          <FinanceRadarBlock
            data={data.financeRadar}
            accentClass="border-l-4 border-[#00D4B4]"
            onOpenFinanceDrawer={onOpenFinanceDrawer}
          />
        )}

        {data.focusKind === 'OPERATIONS' && (
          <InstallationPulseBlock
            data={data.installPulse}
            accentClass="border-l-4 border-sky-400"
            onOpenDrawer={onOpenDrawer}
            onOpenOperationsDrawer={onOpenOperationsDrawer}
          />
        )}

        {data.focusKind === 'MANAGEMENT' && (
          <>
            <ZenithFocusCollapsible title="Company pipeline today" accent="gold" defaultOpen={false}>
              <SalesPipelineBlock
                title="Company pipeline today"
                data={data.salesPipeline}
                accentClass="border-l-4 border-[#F5A623]"
                onOpenDrawer={onOpenDrawer}
                embedded
              />
            </ZenithFocusCollapsible>
            <ZenithFocusCollapsible title="Payment radar" accent="teal" defaultOpen={false}>
              <FinanceRadarBlock
                data={data.financeRadar}
                accentClass="border-l-4 border-[#00D4B4]"
                embedded
                onOpenFinanceDrawer={onOpenFinanceDrawer}
              />
            </ZenithFocusCollapsible>
            <ZenithFocusCollapsible title="Installation pulse" accent="sky" defaultOpen={false}>
              <InstallationPulseBlock
                data={data.installPulse}
                accentClass="border-l-4 border-sky-400"
                onOpenDrawer={onOpenDrawer}
                onOpenOperationsDrawer={onOpenOperationsDrawer}
                embedded
              />
            </ZenithFocusCollapsible>
            {showProposalEngine ? (
              <ZenithFocusCollapsible
                id="zenith-proposal-engine"
                title="Proposal Engine"
                accent="gold"
                defaultOpen={false}
                subtitle="PE readiness by project bucket"
              >
                <ZenithProposalEngineCard
                  selectedFYs={dateFilter.selectedFYs}
                  selectedQuarters={dateFilter.selectedQuarters}
                  selectedMonths={dateFilter.selectedMonths}
                  embedded
                  zenithExplorerProjects={zenithExplorerProjects}
                  onPeBucketClick={
                    onPeBucketListClick
                      ? (args) => onPeBucketListClick(args)
                      : undefined
                  }
                />
              </ZenithFocusCollapsible>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
