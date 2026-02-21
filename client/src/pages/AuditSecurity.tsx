import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import { format } from 'date-fns'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts'
import PageCard from '../components/PageCard'
import { FaShieldAlt } from 'react-icons/fa'

const PAGE_SIZE = 20
const SUMMARY_DAYS = 7
const TREND_DAYS_OPTIONS = [7, 30, 90] as const

const ACTION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All actions' },
  { value: 'login', label: 'Login' },
  { value: 'password_reset_initiated', label: 'Password reset initiated' },
  { value: 'password_reset_completed', label: 'Password reset completed' },
  { value: 'user_created', label: 'User created' },
  { value: 'user_role_changed', label: 'User role changed' },
  { value: 'project_created', label: 'Project created' },
  { value: 'project_status_changed', label: 'Project status changed' },
  { value: 'support_ticket_created', label: 'Support ticket created' },
  { value: 'support_ticket_closed', label: 'Support ticket closed' },
  { value: 'proposal_generated', label: 'Proposal generated' },
]

const ENTITY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All entities' },
  { value: 'User', label: 'User' },
  { value: 'Project', label: 'Project' },
  { value: 'SupportTicket', label: 'Support ticket' },
  { value: 'Proposal', label: 'Proposal' },
]

function buildExportParams(dateFrom: string, dateTo: string, actionType: string, entityType: string): URLSearchParams {
  const p = new URLSearchParams()
  if (dateFrom) p.set('dateFrom', dateFrom)
  if (dateTo) p.set('dateTo', dateTo)
  if (actionType) p.set('actionType', actionType)
  if (entityType) p.set('entityType', entityType)
  return p
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function AuditSecurity () {
  const { hasRole } = useAuth()
  const [page, setPage] = useState(1)
  const [actionType, setActionType] = useState('')
  const [entityType, setEntityType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [trendDays, setTrendDays] = useState<(typeof TREND_DAYS_OPTIONS)[number]>(7)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | 'signed' | null>(null)

  const actionLabelByValue = new Map(ACTION_TYPE_OPTIONS.filter(o => o.value).map((o) => [o.value, o.label]))

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin', 'audit', 'security-summary', SUMMARY_DAYS],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/admin/audit/security-summary?days=${SUMMARY_DAYS}`)
      return res.data as {
        since: string
        days: number
        failedLogins: number
        loginSuccessCount: number
        auditByAction: { actionType: string; count: number }[]
        accessByAction: { actionType: string; count: number }[]
      }
    },
    enabled: hasRole([UserRole.ADMIN]),
  })

  const { data: loginTrendData, isLoading: loginTrendLoading } = useQuery({
    queryKey: ['admin', 'audit', 'login-trend', trendDays],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/admin/audit/login-trend?days=${trendDays}`)
      return res.data as { since: string; days: number; series: { date: string; success: number; failure: number }[] }
    },
    enabled: hasRole([UserRole.ADMIN]),
  })

  const { data: actionDistributionData, isLoading: actionDistributionLoading } = useQuery({
    queryKey: ['admin', 'audit', 'action-distribution', trendDays],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/admin/audit/action-distribution?days=${trendDays}`)
      return res.data as { since: string; days: number; series: { actionType: string; entityType: string; count: number }[] }
    },
    enabled: hasRole([UserRole.ADMIN]),
  })

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(PAGE_SIZE))
  if (actionType) params.set('actionType', actionType)
  if (entityType) params.set('entityType', entityType)
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['admin', 'audit', 'logs', page, actionType, entityType, dateFrom, dateTo],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/admin/audit/logs?${params.toString()}`)
      return res.data as { logs: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }
    },
    enabled: hasRole([UserRole.ADMIN]),
  })

  const activityIps = Array.from(
    new Set((logsData?.logs ?? []).map((l: any) => l?.ip).filter(Boolean))
  ) as string[]

  const { data: ipLocations } = useQuery({
    queryKey: ['admin', 'audit', 'ip-locations', activityIps.join(',')],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/admin/audit/ip-locations?ips=${encodeURIComponent(activityIps.join(','))}`)
      return res.data as { locations: Record<string, { location: string | null }> }
    },
    enabled: hasRole([UserRole.ADMIN]) && activityIps.length > 0,
    staleTime: 1000 * 60 * 60, // 1h
  })

  const { data: failedLoginsData } = useQuery({
    queryKey: ['admin', 'audit', 'access-logs', 'failure'],
    queryFn: async () => {
      const res = await axiosInstance.get(
        '/api/admin/audit/access-logs?actionType=login_failure&limit=10'
      )
      return res.data as { logs: { email?: string; ip?: string; userAgent?: string; createdAt: string }[] }
    },
    enabled: hasRole([UserRole.ADMIN]),
  })

  const loginTrendChartData = (loginTrendData?.series ?? []).map((p) => ({
    ...p,
    label: p.date ? format(new Date(`${p.date}T00:00:00`), 'MMM d') : p.date,
  }))

  const entityKeys = ['User', 'Project', 'SupportTicket', 'Proposal', 'Other'] as const
  const entityColors: Record<(typeof entityKeys)[number], string> = {
    User: '#2563eb', // blue-600
    Project: '#16a34a', // green-600
    SupportTicket: '#f59e0b', // amber-500
    Proposal: '#7c3aed', // violet-600
    Other: '#6b7280', // gray-500
  }

  const actionDistributionChartData = (() => {
    const rows = actionDistributionData?.series ?? []
    const byAction: Record<string, any> = {}
    for (const r of rows) {
      const a = r.actionType
      const entity = (entityKeys.includes(r.entityType as any) ? r.entityType : 'Other') as (typeof entityKeys)[number]
      if (!byAction[a]) {
        byAction[a] = { actionType: a, actionLabel: actionLabelByValue.get(a) ?? a, total: 0 }
        for (const k of entityKeys) byAction[a][k] = 0
      }
      byAction[a][entity] += r.count ?? 0
      byAction[a].total += r.count ?? 0
    }
    return Object.values(byAction).sort((x: any, y: any) => (y.total ?? 0) - (x.total ?? 0))
  })()

  const handleExportCsv = async () => {
    setExporting('csv')
    try {
      const params = buildExportParams(dateFrom, dateTo, actionType, entityType)
      const res = await axiosInstance.get(`/api/admin/audit/export/csv?${params.toString()}`, { responseType: 'blob' })
      const name = res.headers['content-disposition']?.match(/filename="?([^"]+)"?/)?.[1] ?? `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      downloadBlob(res.data, name)
    } catch {
      // Error handled by axios / toast if configured
    } finally {
      setExporting(null)
    }
  }

  const handleExportPdf = async () => {
    setExporting('pdf')
    try {
      const params = buildExportParams(dateFrom, dateTo, actionType, entityType)
      const res = await axiosInstance.get(`/api/admin/audit/export/pdf?${params.toString()}`, { responseType: 'blob' })
      const name = res.headers['content-disposition']?.match(/filename="?([^"]+)"?/)?.[1] ?? `audit-logs-${new Date().toISOString().slice(0, 10)}.pdf`
      downloadBlob(res.data, name)
    } catch {
      //
    } finally {
      setExporting(null)
    }
  }

  const handleExportSignedPdf = async () => {
    setExporting('signed')
    try {
      const params = buildExportParams(dateFrom, dateTo, actionType, entityType)
      const res = await axiosInstance.get(`/api/admin/audit/export/signed-pdf?${params.toString()}`, { responseType: 'blob' })
      const name = res.headers['content-disposition']?.match(/filename="?([^"]+)"?/)?.[1] ?? `signed-audit-export-${new Date().toISOString().slice(0, 10)}.pdf`
      downloadBlob(res.data, name)
    } catch {
      //
    } finally {
      setExporting(null)
    }
  }

  if (!hasRole([UserRole.ADMIN])) {
    return (
      <div className="px-0 py-6 sm:px-0">
        <p className="text-red-600 font-medium">Access denied. This page is for Administrators only.</p>
      </div>
    )
  }

  return (
    <div className="px-0 py-6 sm:px-0">
      <PageCard
        title="Audit & Security"
        subtitle="Accountability, traceability, and security visibility. Admin only."
        icon={<FaShieldAlt className="w-5 h-5 text-white" />}
        className="max-w-full"
      >
      <div className="space-y-6">
      {/* Security tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-gradient-to-br from-white to-red-50/30 rounded-xl border-l-4 border-l-red-400 border border-red-100/60 p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Failed logins (last {SUMMARY_DAYS}d)</div>
          <div className="mt-1 text-2xl font-bold text-red-600">
            {summaryLoading ? '…' : (summary?.failedLogins ?? 0)}
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-emerald-50/30 rounded-xl border-l-4 border-l-emerald-400 border border-emerald-100/60 p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Successful logins (last {SUMMARY_DAYS}d)</div>
          <div className="mt-1 text-2xl font-bold text-green-600">
            {summaryLoading ? '…' : (summary?.loginSuccessCount ?? 0)}
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-primary-50/30 rounded-xl border-l-4 border-l-primary-500 border border-primary-100/60 p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Audit events (last {SUMMARY_DAYS}d)</div>
          <div className="mt-1 text-2xl font-bold text-primary-700">
            {summaryLoading ? '…' : (summary?.auditByAction?.reduce((s, x) => s + x.count, 0) ?? 0)}
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-primary-50/30 rounded-xl border-l-4 border-l-primary-500 border border-primary-100/60 p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Access events (last {SUMMARY_DAYS}d)</div>
          <div className="mt-1 text-2xl font-bold text-primary-700">
            {summaryLoading ? '…' : (summary?.accessByAction?.reduce((s, x) => s + x.count, 0) ?? 0)}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="bg-gradient-to-br from-white to-violet-50/20 rounded-xl border border-violet-100/60 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Security insights</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Range</span>
            <select
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
              value={trendDays}
              onChange={(e) => setTrendDays(Number(e.target.value) as any)}
            >
              {TREND_DAYS_OPTIONS.map((d) => (
                <option key={d} value={d}>Last {d} days</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">Login activity trend</div>
            <div className="h-64 overflow-x-auto">
              {loginTrendLoading ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : loginTrendChartData.length ? (
                <div className="min-w-[640px] h-full">
                  <ResponsiveContainer width="100%" height="100%" debounce={250} minWidth={0}>
                    <LineChart data={loginTrendChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tickMargin={8} />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                        formatter={(value: any) => [value, 'Count']}
                        labelFormatter={(label: any, payload: any) => (payload?.[0]?.payload?.date ? payload[0].payload.date : label)}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="success" name="Successful logins" stroke="#16a34a" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="failure" name="Failed logins" stroke="#dc2626" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No login activity in this range.</p>
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">Action distribution</div>
            <div className="overflow-x-auto">
              <div className="h-64 min-w-[640px]">
                {actionDistributionLoading ? (
                  <p className="text-sm text-gray-500">Loading…</p>
                ) : actionDistributionChartData.length ? (
                  <ResponsiveContainer width="100%" height="100%" debounce={250} minWidth={0}>
                    <BarChart data={actionDistributionChartData} margin={{ top: 8, right: 12, left: 0, bottom: 48 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="actionLabel"
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      {entityKeys.map((k) => (
                        <Bar key={k} dataKey={k} stackId="a" fill={entityColors[k]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-500">No audit events in this range.</p>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Stacked by entity type. Action types match the “All actions” filter list.
            </p>
          </div>
        </div>
      </div>

      {/* Export audit logs — date-range export, CSV / PDF / Signed audit export */}
      <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-l-amber-400 border border-amber-100">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Export audit logs</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Date-range export uses the date range and filters set in the Activity timeline below. Set optional date range and filters there, then choose format.
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            disabled={!!exporting}
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            type="button"
            disabled={!!exporting}
            onClick={handleExportPdf}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
          </button>
          <button
            type="button"
            disabled={!!exporting}
            onClick={handleExportSignedPdf}
            className="px-4 py-2 rounded-lg text-sm font-medium border-2 border-primary-600 text-primary-700 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exporting === 'signed' ? 'Exporting…' : 'Signed audit export'}
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Signed audit export includes a footer: generated date and exporter email. For official use.
        </p>
      </div>

      {/* Failed login trend / recent failures */}
      <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-l-red-400 border border-red-100">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Recent failed logins</h3>
        </div>
        {failedLoginsData?.logs?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {failedLoginsData.logs.map((log: any) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {log.createdAt ? format(new Date(log.createdAt), 'PPp') : '—'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">{log.email ?? '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{log.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No failed logins in recent access logs.</p>
        )}
      </div>

      {/* Activity timeline (security audit logs) */}
      <div className="bg-gradient-to-br from-white to-violet-50/20 rounded-xl border-l-4 border-l-violet-400 border border-violet-100/60 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity timeline</h2>
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <label className="sr-only" htmlFor="audit-action-type">Action type</label>
          <select
            id="audit-action-type"
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-48 bg-white"
            value={actionType}
            onChange={(e) => { setActionType(e.target.value); setPage(1); }}
          >
            {ACTION_TYPE_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="audit-entity-type">Entity type</label>
          <select
            id="audit-entity-type"
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm w-40 bg-white"
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          >
            {ENTITY_TYPE_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="date"
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          />
          <input
            type="date"
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          />
        </div>
        {logsLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : logsData?.logs?.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full table-fixed divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap w-40">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap w-52">User / Role</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap w-64">E-mail id</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap w-52">Action</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap w-64">IP / Location</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap w-44">Entity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap w-[28rem]">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logsData.logs.map((log: any) => (
                    <tr key={log.id}>
                      <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap align-top">
                        {log.createdAt ? format(new Date(log.createdAt), 'PPp') : '—'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap align-top truncate" title={`${log.userId ?? ''} / ${log.role ?? ''}`}>
                        {log.userId} / {log.role}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap align-top truncate" title={log.email ?? ''}>
                        {log.email ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap align-top truncate" title={log.actionType ?? ''}>
                        {log.actionType}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap align-top truncate" title={log.ip ? `${log.ip}${ipLocations?.locations?.[log.ip]?.location ? ` • ${ipLocations.locations[log.ip].location}` : ''}` : ''}>
                        {log.ip
                          ? (
                              <span>
                                <span>{log.ip}</span>
                                {ipLocations?.locations?.[log.ip]?.location ? (
                                  <span className="text-gray-500"> • {ipLocations.locations[log.ip].location}</span>
                                ) : null}
                              </span>
                            )
                          : '—'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap align-top truncate" title={log.entityType && log.entityId ? `${log.entityType}#${log.entityId}` : ''}>
                        {log.entityType && log.entityId ? `${log.entityType}#${log.entityId.slice(0, 8)}` : '—'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 align-top truncate" title={log.summary ?? ''}>
                        {log.summary ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logsData.pagination && logsData.pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Page {logsData.pagination.page} of {logsData.pagination.totalPages} ({logsData.pagination.total} total)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={logsData.pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={logsData.pagination.page >= logsData.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-500 space-y-1">
            <p>No audit logs match the filters.</p>
            <p className="text-gray-400">Activity includes logins, user creation/role changes, project creation/status changes, support ticket create/close, and proposal generation. Clear filters or perform those actions to see entries.</p>
          </div>
        )}
      </div>
      </div>
      </PageCard>
    </div>
  )
}
