import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import axiosInstance from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import type { ZenithDateFilter } from './zenithTypes'
import ZenithLogActivityModal from './ZenithLogActivityModal'

type SalesPipelineRow = {
  projectId: string
  customerName: string
  stage: string
  dealValue: number
  daysSinceActivity: number
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
  installer: string
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
}: {
  title: string
  data: { rows: SalesPipelineRow[]; followUpNeeded: number }
  accentClass: string
}) {
  const [logFor, setLogFor] = useState<{ id: string; label: string } | null>(null)

  return (
    <section
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden ${accentClass} pl-4`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="zenith-display text-base font-bold text-white">{title}</h3>
          {data.followUpNeeded > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-500/20 text-red-200 text-xs font-bold px-2.5 py-1 border border-red-400/30">
              Follow-up needed: {data.followUpNeeded}
            </span>
          )}
        </div>
        <div className="zenith-scroll-x overflow-x-auto -mx-1">
          <table className="w-full text-left text-xs sm:text-sm min-w-[520px]">
            <thead>
              <tr className="text-white/45 border-b border-white/10">
                <th className="py-2 pr-3 font-semibold">Customer</th>
                <th className="py-2 pr-3 font-semibold">Stage</th>
                <th className="py-2 pr-3 font-semibold text-right">Deal value</th>
                <th className="py-2 pr-3 font-semibold">Last activity</th>
                <th className="py-2 pl-2 font-semibold w-[120px]"> </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-white/40">
                    No pipeline rows for this period.
                  </td>
                </tr>
              ) : (
                data.rows.map((r) => {
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
                      <td className="py-2.5 pl-2">
                        <button
                          type="button"
                          onClick={() => setLogFor({ id: r.projectId, label: r.customerName })}
                          className="text-xs font-bold text-[#00d4b4] hover:text-[#5eead4] underline-offset-2 hover:underline"
                        >
                          Log activity
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {logFor && (
        <ZenithLogActivityModal
          projectId={logFor.id}
          customerLabel={logFor.label}
          onClose={() => setLogFor(null)}
        />
      )}
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
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Top overdue</h4>
            <ul className="space-y-2">
              {data.overdueTop5.length === 0 ? (
                <li className="text-sm text-white/40">No overdue rows in top slice.</li>
              ) : (
                data.overdueTop5.map((r) => {
                  const mail = `mailto:?subject=${encodeURIComponent(`Payment reminder — ${r.customerName}`)}&body=${encodeURIComponent(
                    `Project outstanding: ₹${Math.round(r.amount).toLocaleString('en-IN')}\nDays since confirmation: ${r.daysOverdue}`,
                  )}`
                  return (
                    <li
                      key={r.projectId}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs sm:text-sm"
                    >
                      <Link to={`/projects/${r.projectId}`} className="font-semibold text-white hover:text-[#f5a623] min-w-0 flex-1 truncate">
                        {r.customerName}
                      </Link>
                      <span className="tabular-nums text-white/80">₹{Math.round(r.amount).toLocaleString('en-IN')}</span>
                      <span className="text-white/45 text-xs">
                        Since {format(parseISO(r.dueSince), 'dd MMM yyyy')}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-red-500/25 text-red-200 text-[11px] font-bold px-1.5 py-0.5">
                        {r.daysOverdue}d
                      </span>
                      <a
                        href={mail}
                        className="ml-auto text-xs font-bold text-[#00d4b4] hover:underline"
                      >
                        Send reminder
                      </a>
                    </li>
                  )
                })
              )}
            </ul>
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
  return (
    <section
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden ${accentClass} pl-4`}
    >
      <div className="p-4 sm:p-5">
        <h3 className="zenith-display text-base font-bold text-white mb-3">Installation pulse</h3>
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
        <p className="text-[11px] sm:text-xs text-white/45 leading-relaxed mb-4 max-w-3xl">
          <span className="text-white/55 font-semibold">Data sources: </span>
          Installer shows the latest <strong className="text-white/70">installation record’s installer</strong> when present,
          otherwise the project’s <strong className="text-white/70">assigned operations</strong> user. Start uses installation
          start date, then <strong className="text-white/70">stage entered</strong> or <strong className="text-white/70">order confirmation</strong>{' '}
          date. Expected is <strong className="text-white/70">expected commissioning</strong> on the project. Progress uses those
          dates (or marks complete if <strong className="text-white/70">installation completion</strong> is set). Fill those fields
          on the project if this table looks empty.
        </p>
        <div className="zenith-scroll-x overflow-x-auto -mx-1">
          <table className="w-full text-left text-xs sm:text-sm min-w-[720px]">
            <thead>
              <tr className="text-white/45 border-b border-white/10">
                <th className="py-2 pr-2 font-semibold">Customer</th>
                <th className="py-2 pr-2 font-semibold text-right">kW</th>
                <th className="py-2 pr-2 font-semibold">Installer</th>
                <th className="py-2 pr-2 font-semibold">Start</th>
                <th className="py-2 pr-2 font-semibold">Expected</th>
                <th className="py-2 font-semibold min-w-[120px]">Progress</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-white/40">
                    No projects under installation for this period.
                  </td>
                </tr>
              ) : (
                data.rows.map((r) => (
                  <tr
                    key={r.projectId}
                    className={`border-b border-white/[0.06] ${r.overdue ? 'bg-red-500/5' : 'hover:bg-white/[0.04]'}`}
                  >
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full flex-shrink-0 ${r.overdue ? 'bg-red-400' : 'bg-emerald-400'}`}
                          title={r.overdue ? 'Overdue' : 'On track'}
                        />
                        <Link to={`/projects/${r.projectId}`} className="text-white font-medium hover:text-[#f5a623]">
                          {r.customerName}
                        </Link>
                      </div>
                    </td>
                    <td className="py-2.5 pr-2 text-right tabular-nums text-white/85">
                      {r.kW != null ? r.kW.toFixed(2) : '—'}
                    </td>
                    <td className="py-2.5 pr-2 text-white/75">{r.installer}</td>
                    <td className="py-2.5 pr-2 text-white/60">
                      {r.startDate ? format(parseISO(r.startDate), 'dd MMM yy') : '—'}
                    </td>
                    <td className="py-2.5 pr-2 text-white/60">
                      {r.expectedCompletion ? format(parseISO(r.expectedCompletion), 'dd MMM yy') : '—'}
                    </td>
                    <td className="py-2.5">
                      {r.percentComplete != null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden min-w-[64px]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#f5a623] to-[#00d4b4]"
                              style={{ width: `${r.percentComplete}%` }}
                            />
                          </div>
                          <span className="text-[11px] tabular-nums text-white/55 w-8">{r.percentComplete}%</span>
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
      </div>
    </section>
  )
}

export default function ZenithYourFocus({
  role,
  dateFilter,
  zenithMainLoading,
}: {
  role: UserRole
  dateFilter: ZenithDateFilter
  /** When Zenith dashboard payload is still loading, skip focus fetch to avoid duplicate empty state. */
  zenithMainLoading: boolean
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
          />
          <FinanceRadarBlock data={data.financeRadar} accentClass="border-l-4 border-[#00D4B4]" />
          <InstallationPulseBlock data={data.installPulse} accentClass="border-l-4 border-sky-400" />
        </div>
      )}
    </div>
  )
}
