import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import axiosInstance from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import type { ZenithDateFilter } from './zenithTypes'
import HealthBadge from './HealthBadge'
import { computeDealHealth, pipelineRowToHealthProject } from '../../utils/dealHealthScore'

type SalesPipelineRow = {
  projectId: string
  customerName: string
  stage: string
  dealValue: number
  daysSinceActivity: number
  /** Extra fields from zenith-focus for Today’s Hit List (same API, no extra fetch). */
  expectedCloseDate?: string | null
  createdAt?: string
  updatedAt?: string
  salespersonId?: string
  leadSource?: string | null
}

type FinanceOverdueRow = {
  projectId: string
  customerName: string
  amount: number
  dueSince: string
  daysOverdue: number
}

type InstallRow = {
  projectId: string
  customerName: string
  kW: number | null
  salespersonName: string
  startDate: string | null
  expectedCompletion: string | null
  percentComplete: number | null
  overdue: boolean
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
        donut: { collected: number; outstanding: number; subsidyPending: number }
      }
      installPulse: { rows: InstallRow[]; avgInstallationDays: number | null; delayedCount: number }
    }

function activityTone(days: number): { text: string; className: string } {
  if (days < 3) return { text: 'text-emerald-300', className: 'bg-emerald-500/15' }
  if (days <= 7) return { text: 'text-amber-300', className: 'bg-amber-500/15' }
  return { text: 'text-red-300', className: 'bg-red-500/15' }
}

function SalesPipelineBlock({
  title,
  data,
  accentClass,
  onOpenDrawer,
}: {
  title: string
  data: { rows: SalesPipelineRow[]; followUpNeeded: number }
  accentClass: string
  onOpenDrawer?: (p: { id: string; customerName?: string; stageLabel?: string }) => void
}) {
  const [sortField, setSortField] = useState<
    'customerName' | 'stage' | 'dealValue' | 'lastActivity' | 'health' | null
  >(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [stageFilter, setStageFilter] = useState<string>('ALL')
  const [customerFilter, setCustomerFilter] = useState<string>('')

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
  }, [customerFilter, data.rows, sortDir, sortField, stageFilter])

  return (
    <section
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden ${accentClass} pl-4`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="zenith-display text-base font-bold text-white">{title}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              placeholder="Filter customer…"
              className="h-9 rounded-lg bg-black/25 border border-white/10 px-3 text-xs text-white/80 placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#00d4b4]/40"
            />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="h-9 rounded-lg bg-black/25 border border-white/10 px-2.5 text-xs text-white/80 focus:outline-none focus:ring-2 focus:ring-[#00d4b4]/40"
              aria-label="Filter by stage"
            >
              <option value="ALL">All stages</option>
              {Array.from(new Set(data.rows.map((r) => r.stage))).map((s) => (
                <option key={s} value={s}>
                  {s}
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
        <div className="zenith-scroll-x overflow-x-auto -mx-1">
          <table className="w-full text-left text-xs sm:text-sm min-w-[640px]">
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
                  <td colSpan={6} className="py-8 text-center text-white/40">
                    No pipeline rows for this period.
                  </td>
                </tr>
              ) : (
                displayRows.map((r) => {
                  const tone = activityTone(r.daysSinceActivity)
                  return (
                    <tr key={r.projectId} className="border-b border-white/[0.06] hover:bg-white/[0.04]">
                      <td className="py-2.5 pr-3">
                        <Link to={`/projects/${r.projectId}`} className="text-white font-medium hover:text-[#f5a623]">
                          {r.customerName}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-white/80">{r.stage}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-white/90">
                        ₹{Math.round(r.dealValue).toLocaleString('en-IN')}
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
                            className="text-xs font-bold text-white/70 hover:text-[#f5a623] underline-offset-2 hover:underline"
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

function FinanceRadarBlock({
  data,
  accentClass,
}: {
  data: {
    totalOutstanding: number
    avgCollectionDays: number | null
    subsidyPendingCount: number
    overdueTop5: FinanceOverdueRow[]
    donut: { collected: number; outstanding: number; subsidyPending: number }
  }
  accentClass: string
}) {
  const [sortField, setSortField] = useState<'amount' | 'days' | 'customer' | null>('amount')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [customerFilter, setCustomerFilter] = useState<string>('')

  const overdueRows = useMemo(() => {
    const q = customerFilter.trim().toLowerCase()
    let rows = [...data.overdueTop5]
    if (q) rows = rows.filter((r) => (r.customerName || '').toLowerCase().includes(q))
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
        default:
          return 0
      }
    })
    return rows
  }, [customerFilter, data.overdueTop5, sortDir, sortField])

  const toggleSort = (f: NonNullable<typeof sortField>) => {
    if (sortField !== f) {
      setSortField(f)
      setSortDir(f === 'customer' ? 'asc' : 'desc')
      return
    }
    setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
  }

  const pieData = [
    { name: 'Collected', value: data.donut.collected, fill: '#00d4b4' },
    { name: 'Outstanding', value: data.donut.outstanding, fill: '#f5a623' },
    { name: 'Subsidy pending', value: data.donut.subsidyPending, fill: '#a78bfa' },
  ].filter((d) => d.value > 0)

  return (
    <section
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden ${accentClass} pl-4`}
    >
      <div className="p-4 sm:p-5">
        <h3 className="zenith-display text-base font-bold text-white mb-4">Payment radar</h3>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div>
            <div className="flex items-end justify-between gap-2 mb-2">
              <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest">Top overdue</h4>
              <input
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                placeholder="Filter customer…"
                className="h-8 rounded-lg bg-black/25 border border-white/10 px-3 text-xs text-white/80 placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#00d4b4]/40"
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="text-white/45 border-b border-white/10">
                      <th
                        className="py-2 px-3 font-semibold cursor-pointer select-none"
                        onClick={() => toggleSort('customer')}
                      >
                        Customer {sortField === 'customer' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                      </th>
                      <th
                        className="py-2 px-3 font-semibold text-right cursor-pointer select-none"
                        onClick={() => toggleSort('amount')}
                      >
                        Amount {sortField === 'amount' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                      </th>
                      <th className="py-2 px-3 font-semibold">Since</th>
                      <th
                        className="py-2 px-3 font-semibold text-right cursor-pointer select-none"
                        onClick={() => toggleSort('days')}
                      >
                        Days {sortField === 'days' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                      </th>
                      <th className="py-2 px-3 font-semibold text-right"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-white/40">
                          No overdue rows in top slice.
                        </td>
                      </tr>
                    ) : (
                      overdueRows.map((r) => {
                        const mail = `mailto:?subject=${encodeURIComponent(`Payment reminder — ${r.customerName}`)}&body=${encodeURIComponent(
                          `Project outstanding: ₹${Math.round(r.amount).toLocaleString('en-IN')}\nDays since confirmation: ${r.daysOverdue}`,
                        )}`
                        return (
                          <tr key={r.projectId} className="border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.04]">
                            <td className="py-2.5 px-3">
                              <Link to={`/projects/${r.projectId}`} className="font-semibold text-white hover:text-[#f5a623]">
                                {r.customerName}
                              </Link>
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums text-white/85">
                              ₹{Math.round(r.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-white/55 text-xs whitespace-nowrap">
                              {format(parseISO(r.dueSince), 'dd MMM yyyy')}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="inline-flex items-center rounded-md bg-red-500/25 text-red-200 text-[11px] font-bold px-1.5 py-0.5 tabular-nums">
                                {r.daysOverdue}d
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <a href={mail} className="text-xs font-bold text-[#00d4b4] hover:underline whitespace-nowrap">
                                Send reminder
                              </a>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="h-[160px] w-full min-w-0">
            {pieData.length === 0 ? (
              <p className="text-sm text-white/40 py-8 text-center">No payment mix data</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={68}
                    paddingAngle={2}
                  >
                    {pieData.map((e, i) => (
                      <Cell key={i} fill={e.fill} stroke="rgba(0,0,0,0.25)" />
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
                </PieChart>
              </ResponsiveContainer>
            )}
            <p className="text-[10px] text-center text-white/40 mt-1">Collected · Outstanding · Subsidy pending (₹)</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function InstallationPulseBlock({
  data,
  accentClass,
}: {
  data: { rows: InstallRow[]; avgInstallationDays: number | null; delayedCount: number }
  accentClass: string
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
          return (((a.percentComplete ?? -1) - (b.percentComplete ?? -1)) || 0) * dir
        default:
          return 0
      }
    })
    return rows
  }, [data.rows, overdueOnly, sortDir, sortField])

  return (
    <section
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden ${accentClass} pl-4`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="zenith-display text-base font-bold text-white">Installation pulse</h3>
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
          <table className="w-full min-w-[820px] md:min-w-[860px] xl:min-w-[900px] text-left text-xs sm:text-sm border-separate border-spacing-0">
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
                  className="py-2.5 pl-3 font-semibold align-bottom min-w-[7.5rem] sm:min-w-[8.5rem] cursor-pointer select-none"
                  onClick={() => handleSort('percentComplete')}
                >
                  Progress {sortField === 'percentComplete' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-white/40">
                    No projects under installation for this period.
                  </td>
                </tr>
              ) : (
                displayRows.map((r) => (
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
                        <Link
                          to={`/projects/${r.projectId}`}
                          className="text-white font-medium hover:text-[#f5a623] truncate sm:whitespace-normal sm:break-words"
                          title={r.customerName}
                        >
                          {r.customerName}
                        </Link>
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
                    <td className="py-2.5 pl-3 align-middle">
                      {r.percentComplete != null ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden min-w-[48px] sm:min-w-[64px]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#f5a623] to-[#00d4b4]"
                              style={{ width: `${r.percentComplete}%` }}
                            />
                          </div>
                          <span className="text-[11px] tabular-nums text-white/55 shrink-0 w-7 sm:w-8 text-right">
                            {r.percentComplete}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-white/35">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] sm:text-xs text-white/45 leading-relaxed mt-4 max-w-3xl">
          <span className="text-white/55 font-semibold">Data sources: </span>
          <strong className="text-white/70">Sales person</strong> is the project’s assigned{' '}
          <strong className="text-white/70">salesperson</strong>. Start uses installation start date, then{' '}
          <strong className="text-white/70">stage entered</strong> or <strong className="text-white/70">order confirmation</strong>{' '}
          date. <strong className="text-white/70">Expected</strong> uses <strong className="text-white/70">expected commissioning</strong>{' '}
          on the project when set; otherwise <strong className="text-white/70">installation completion date</strong> (same field as
          Project Lifecycle). Progress uses start vs that target (or 100% if install is marked complete).
        </p>
      </div>
    </section>
  )
}

export default function ZenithYourFocus({
  role,
  dateFilter,
  zenithMainLoading,
  onOpenDrawer,
}: {
  role: UserRole
  dateFilter: ZenithDateFilter
  /** When Zenith dashboard payload is still loading, skip focus fetch to avoid duplicate empty state. */
  zenithMainLoading: boolean
  onOpenDrawer?: (p: { id: string; customerName?: string; stageLabel?: string }) => void
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
      <h2 className="zenith-display text-xs uppercase tracking-[0.2em] text-white/40 font-bold px-1">Your focus</h2>

      {data.focusKind === 'SALES' && (
        <SalesPipelineBlock
          title="Your pipeline today"
          data={data.salesPipeline}
          accentClass="border-l-4 border-[#F5A623]"
          onOpenDrawer={onOpenDrawer}
        />
      )}

      {data.focusKind === 'FINANCE' && (
        <FinanceRadarBlock data={data.financeRadar} accentClass="border-l-4 border-[#00D4B4]" />
      )}

      {data.focusKind === 'OPERATIONS' && (
        <InstallationPulseBlock data={data.installPulse} accentClass="border-l-4 border-sky-400" />
      )}

      {data.focusKind === 'MANAGEMENT' && (
        <div className="space-y-5">
          <SalesPipelineBlock
            title="Company pipeline today"
            data={data.salesPipeline}
            accentClass="border-l-4 border-[#F5A623]"
            onOpenDrawer={onOpenDrawer}
          />
          <FinanceRadarBlock data={data.financeRadar} accentClass="border-l-4 border-[#00D4B4]" />
          <InstallationPulseBlock data={data.installPulse} accentClass="border-l-4 border-sky-400" />
        </div>
      )}
    </div>
  )
}
