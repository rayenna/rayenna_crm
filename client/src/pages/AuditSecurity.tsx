import { useMemo, useState } from 'react'
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
import MetricCard from '../components/dashboard/MetricCard'
import {
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClipboardList,
  FaFingerprint,
  FaDownload,
  FaChartLine,
  FaStream,
} from 'react-icons/fa'

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

/** Match Projects / Support Tickets table header chrome */
const AUDIT_SORT_BTN_HEADER =
  'group flex min-h-[2rem] w-full min-w-0 flex-nowrap items-center gap-2 overflow-visible rounded-md px-1.5 py-1 text-left transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/65 focus-visible:ring-offset-1 focus-visible:ring-offset-primary-800 sm:min-h-[2.5rem] sm:gap-2 sm:px-2 sm:py-1.5'
/** nowrap on small screens so headers stay one line when the table scrolls horizontally */
const AUDIT_SORT_LABEL =
  'min-w-0 flex-1 basis-0 text-left text-[11px] font-bold uppercase leading-snug tracking-wide text-slate-100 max-sm:shrink-0 max-sm:whitespace-nowrap max-sm:break-normal sm:whitespace-normal sm:break-words sm:text-xs sm:leading-tight sm:tracking-wider'

function AuditTableSortGlyph({ active }: { active: boolean }) {
  const box = active
    ? 'border-amber-400/90 bg-amber-400/15 text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
    : 'border-white/20 bg-black/15 text-slate-300/90 group-hover:border-amber-300/45 group-hover:bg-white/10 group-hover:text-amber-100'
  return (
    <span
      className={`inline-flex size-6 shrink-0 select-none items-center justify-center rounded border transition-colors ${box}`}
      aria-hidden
    >
      <svg
        className="block size-[14px] shrink-0 text-current opacity-95"
        viewBox="0 0 24 24"
        width={14}
        height={14}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        overflow="visible"
      >
        <path d="M8 10l4-4 4 4M8 14l4 4 4-4" />
      </svg>
    </span>
  )
}

const sectionShell =
  'rounded-2xl border border-gray-200/90 bg-white/95 shadow-md shadow-gray-900/[0.04] ring-1 ring-gray-100/90 overflow-hidden min-w-0'

/** Export + failed-logins pair: equal height on lg (+0.5in vs prior band), capped so the row does not grow without limit */
const exportFailedPairCardClass = `${sectionShell} flex flex-col min-w-0 overflow-hidden lg:min-h-[min(calc(22rem+0.5in),calc(46vh+0.5in))] lg:max-h-[min(calc(34rem+0.5in),calc(60vh+0.5in))]`

/**
 * Recent failed logins: single scroll container (both axes). Nested outer/inner + w-max + table w-full
 * caused circular width resolution in browsers → only the first column laid out. Do not reintroduce that pattern.
 */
const auditTableTightViewport =
  'touch-pan-x touch-pan-y min-h-0 w-full min-w-0 max-w-full shrink-0 overflow-x-auto overflow-y-auto overscroll-x-contain overscroll-y-contain rounded-2xl border border-gray-200/90 bg-white shadow-sm shadow-gray-900/[0.04] ring-1 ring-gray-100 [-webkit-overflow-scrolling:touch] h-[max(12rem,min(20.5rem,calc(100dvh-16rem)))] max-h-[max(12rem,min(20.5rem,calc(100dvh-16rem)))] sm:h-[max(12rem,min(21.25rem,calc(100dvh-14rem)))] sm:max-h-[max(12rem,min(21.25rem,calc(100dvh-14rem)))]'

/**
 * Activity timeline: same single scroll container; height sized for ~PAGE_SIZE rows.
 * If you change PAGE_SIZE, update the `20` in calc below.
 */
const auditTableActivityViewport =
  'touch-pan-x touch-pan-y min-h-0 w-full min-w-0 max-w-full shrink-0 overflow-x-auto overflow-y-auto overscroll-x-contain overscroll-y-contain rounded-2xl border border-gray-200/90 bg-white shadow-sm shadow-gray-900/[0.04] ring-1 ring-gray-100 [-webkit-overflow-scrolling:touch] h-[max(24rem,min(calc(4rem+20*3.5rem),calc(100dvh-5rem)))] max-h-[max(24rem,min(calc(4rem+20*3.5rem),calc(100dvh-5rem)))]'

/** Wide layout so Time (PPp), User/role & Entity stay readable; wrapper scrolls horizontally when the card is narrower. */
const auditActivityTableMinClass = 'min-w-[80rem]'

const sectionHeaderBar =
  'flex flex-col gap-3 border-b border-gray-100/90 bg-gradient-to-r from-slate-50/95 via-white to-primary-50/15 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4'

const fieldLabelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-gray-500 sm:text-xs'

const fieldControlClass =
  'min-h-[44px] w-full rounded-xl border border-gray-200/90 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-gray-100/70 transition-all focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20'

const chartTooltipStyle = {
  borderRadius: 12,
  border: 'none',
  boxShadow: '0 12px 40px rgb(15 23 42 / 0.12)',
  padding: '10px 14px',
}

const chartAxisTick = { fill: '#64748b', fontSize: 11 }

type FailedLoginSortKey = 'time' | 'email' | 'ip'
type ActivityLogSortKey = 'time' | 'userRole' | 'email' | 'action' | 'ip' | 'entity' | 'summary'

function defaultOrderFailedLogin(key: FailedLoginSortKey): 'asc' | 'desc' {
  return key === 'time' ? 'desc' : 'asc'
}

function defaultOrderActivityLog(key: ActivityLogSortKey): 'asc' | 'desc' {
  return key === 'time' ? 'desc' : 'asc'
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
  const [failedSort, setFailedSort] = useState<{ by: FailedLoginSortKey; order: 'asc' | 'desc' }>({
    by: 'time',
    order: 'desc',
  })
  const [activitySort, setActivitySort] = useState<{ by: ActivityLogSortKey; order: 'asc' | 'desc' }>({
    by: 'time',
    order: 'desc',
  })

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
  params.set('sortBy', activitySort.by)
  params.set('sortOrder', activitySort.order)
  if (actionType) params.set('actionType', actionType)
  if (entityType) params.set('entityType', entityType)
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['admin', 'audit', 'logs', page, actionType, entityType, dateFrom, dateTo, activitySort.by, activitySort.order],
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

  const handleFailedLoginSort = (sortKey: FailedLoginSortKey) => {
    setFailedSort((prev) => {
      if (prev.by === sortKey) {
        return { by: sortKey, order: prev.order === 'desc' ? 'asc' : 'desc' }
      }
      return { by: sortKey, order: defaultOrderFailedLogin(sortKey) }
    })
  }

  const handleActivityLogSort = (sortKey: ActivityLogSortKey) => {
    setPage(1)
    setActivitySort((prev) => {
      if (prev.by === sortKey) {
        return { by: sortKey, order: prev.order === 'desc' ? 'asc' : 'desc' }
      }
      return { by: sortKey, order: defaultOrderActivityLog(sortKey) }
    })
  }

  const ariaFailed = (k: FailedLoginSortKey): 'ascending' | 'descending' | 'none' =>
    failedSort.by === k ? (failedSort.order === 'asc' ? 'ascending' : 'descending') : 'none'

  const ariaActivity = (k: ActivityLogSortKey): 'ascending' | 'descending' | 'none' =>
    activitySort.by === k ? (activitySort.order === 'asc' ? 'ascending' : 'descending') : 'none'

  const sortedFailedLogins = useMemo(() => {
    const logs = failedLoginsData?.logs ?? []
    const copy = [...logs]
    const mul = failedSort.order === 'asc' ? 1 : -1
    copy.sort((a, b) => {
      let cmp = 0
      switch (failedSort.by) {
        case 'time':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'email':
          cmp = (a.email ?? '').localeCompare(b.email ?? '', undefined, { sensitivity: 'base' })
          break
        case 'ip':
          cmp = (a.ip ?? '').localeCompare(b.ip ?? '', undefined, { numeric: true })
          break
        default:
          cmp = 0
      }
      return cmp * mul
    })
    return copy
  }, [failedLoginsData?.logs, failedSort.by, failedSort.order])

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
        <div className="mx-auto max-w-lg rounded-2xl border border-red-200/80 bg-white p-8 text-center shadow-lg shadow-red-900/5 ring-1 ring-red-100/60">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <FaShieldAlt className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Access denied</h1>
          <p className="mt-2 text-sm text-gray-600">Audit &amp; Security is available to administrators only.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-paint-fix px-0 py-6 sm:px-0 max-w-full min-w-0 overflow-x-hidden bg-gradient-to-b from-slate-50/90 via-white to-primary-50/15">
      <PageCard
        title="Audit & Security"
        subtitle="Accountability, traceability, and security visibility across the organisation."
        icon={<FaShieldAlt className="w-5 h-5 text-white" />}
        className="max-w-full min-w-0"
        dense
      >
      <div className="space-y-8 sm:space-y-10">
      {/* KPI strip — same family as dashboard metric cards */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 sm:mb-4">Last {SUMMARY_DAYS} days at a glance</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title={`Failed logins · ${SUMMARY_DAYS}d`}
            value={summaryLoading ? '…' : (summary?.failedLogins ?? 0)}
            icon={<FaExclamationTriangle />}
            gradient="from-rose-500 to-red-600"
          />
          <MetricCard
            title={`Successful logins · ${SUMMARY_DAYS}d`}
            value={summaryLoading ? '…' : (summary?.loginSuccessCount ?? 0)}
            icon={<FaCheckCircle />}
            gradient="from-emerald-500 to-teal-600"
          />
          <MetricCard
            title={`Audit events · ${SUMMARY_DAYS}d`}
            value={summaryLoading ? '…' : (summary?.auditByAction?.reduce((s, x) => s + x.count, 0) ?? 0)}
            icon={<FaClipboardList />}
            gradient="from-primary-500 to-cyan-600"
          />
          <MetricCard
            title={`Access events · ${SUMMARY_DAYS}d`}
            value={summaryLoading ? '…' : (summary?.accessByAction?.reduce((s, x) => s + x.count, 0) ?? 0)}
            icon={<FaFingerprint />}
            gradient="from-violet-500 to-indigo-600"
          />
        </div>
      </div>

      {/* Charts */}
      <section className={sectionShell} aria-labelledby="audit-insights-heading">
        <div className={sectionHeaderBar}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 text-white shadow-md">
              <FaChartLine className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 id="audit-insights-heading" className="text-base font-bold text-gray-900 sm:text-lg">
                Security insights
              </h2>
              <p className="text-xs text-gray-500 sm:text-sm">Login trends and how audit actions break down by entity.</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:items-end">
            <label htmlFor="audit-trend-range" className={fieldLabelClass}>
              Chart range
            </label>
            <select
              id="audit-trend-range"
              className={`${fieldControlClass} sm:min-w-[11rem]`}
              value={trendDays}
              onChange={(e) => setTrendDays(Number(e.target.value) as (typeof TREND_DAYS_OPTIONS)[number])}
            >
              {TREND_DAYS_OPTIONS.map((d) => (
                <option key={d} value={d}>Last {d} days</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-4 sm:gap-6 sm:p-5 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-slate-50/40 p-3 shadow-inner shadow-slate-900/[0.02] sm:p-4">
            <h3 className="mb-3 text-sm font-bold text-gray-800">Login activity trend</h3>
            <div className="h-[220px] w-full min-h-[200px] sm:h-64 overflow-x-auto">
              {loginTrendLoading ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm font-medium text-gray-400">Loading chart…</p>
                </div>
              ) : loginTrendChartData.length ? (
                <div className="h-full min-w-[min(100%,320px)] sm:min-w-[520px]">
                  <ResponsiveContainer width="100%" height="100%" debounce={400} minWidth={0}>
                    <LineChart data={loginTrendChartData} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" tickMargin={8} tick={chartAxisTick} axisLine={{ stroke: '#cbd5e1' }} />
                      <YAxis allowDecimals={false} tick={chartAxisTick} axisLine={false} tickLine={false} width={36} />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(value: number) => [value, 'Count']}
                        labelFormatter={(_label, payload) => (payload?.[0]?.payload?.date ? String(payload[0].payload.date) : '')}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: 8 }} />
                      <Line type="monotone" dataKey="success" name="Successful logins" stroke="#16a34a" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="failure" name="Failed logins" stroke="#dc2626" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white/80">
                  <p className="text-sm text-gray-500">No login activity in this range.</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-slate-50/40 p-3 shadow-inner shadow-slate-900/[0.02] sm:p-4">
            <h3 className="mb-3 text-sm font-bold text-gray-800">Action distribution</h3>
            <div className="overflow-x-auto">
              <div className="h-[220px] min-h-[200px] w-full sm:h-64 min-w-[min(100%,280px)] sm:min-w-[520px]">
                {actionDistributionLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm font-medium text-gray-400">Loading chart…</p>
                  </div>
                ) : actionDistributionChartData.length ? (
                  <ResponsiveContainer width="100%" height="100%" debounce={400} minWidth={0}>
                    <BarChart data={actionDistributionChartData} margin={{ top: 8, right: 8, left: -8, bottom: 52 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="actionLabel"
                        interval={0}
                        angle={-28}
                        textAnchor="end"
                        height={56}
                        tick={{ ...chartAxisTick, fontSize: 10 }}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis allowDecimals={false} tick={chartAxisTick} axisLine={false} tickLine={false} width={36} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: 6 }} />
                      {entityKeys.map((k) => (
                        <Bar key={k} dataKey={k} stackId="a" fill={entityColors[k]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white/80">
                    <p className="text-sm text-gray-500">No audit events in this range.</p>
                  </div>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              Stacked by entity type. Labels match the Activity timeline action filter.
            </p>
          </div>
        </div>
      </section>

      {/* Export + recent failed logins: stack on phone/tablet; equal-height columns on laptop+ */}
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-8">
      {/* Export */}
      <section className={exportFailedPairCardClass} aria-labelledby="audit-export-heading">
        <div className={sectionHeaderBar}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
              <FaDownload className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 id="audit-export-heading" className="text-base font-bold text-gray-900 sm:text-lg">
                Export audit logs
              </h2>
              <p className="text-xs text-gray-500 sm:text-sm">
                Uses the date range and filters from Activity timeline below.
              </p>
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-5">
          <p className="text-sm leading-relaxed text-gray-600">
            Set filters and dates in the timeline section, then download CSV, PDF, or a signed PDF for records.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:mt-auto lg:flex-col lg:items-stretch">
            <button
              type="button"
              disabled={!!exporting}
              onClick={handleExportCsv}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
            </button>
            <button
              type="button"
              disabled={!!exporting}
              onClick={handleExportPdf}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-800 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
            </button>
            <button
              type="button"
              disabled={!!exporting}
              onClick={handleExportSignedPdf}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-primary-500 bg-white px-5 text-sm font-semibold text-primary-700 shadow-sm transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting === 'signed' ? 'Exporting…' : 'Signed audit export'}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-gray-500">
            Signed exports include generated date and exporter email in the footer.
          </p>
        </div>
      </section>

      {/* Recent failed logins */}
      <section className={exportFailedPairCardClass} aria-labelledby="audit-failed-heading">
        <div className={sectionHeaderBar}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md">
              <FaExclamationTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 id="audit-failed-heading" className="text-base font-bold text-gray-900 sm:text-lg">
                Recent failed logins
              </h2>
              <p className="text-xs text-gray-500 sm:text-sm">Latest attempts from access logs (up to 10).</p>
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
        {failedLoginsData?.logs?.length ? (
          <div className={auditTableTightViewport}>
            <table className="w-full min-w-[19rem] table-fixed border-collapse bg-white text-sm leading-snug sm:min-w-0">
              <colgroup>
                <col className="w-[32%]" />
                <col className="w-[40%]" />
                <col className="w-[28%]" />
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-primary-900/25 bg-gradient-to-r from-primary-800 via-slate-700 to-primary-900 shadow-sm shadow-black/10">
                  <th scope="col" className="px-2.5 py-2 align-middle sm:px-3 sm:py-2.5" aria-sort={ariaFailed('time')}>
                    <button
                      type="button"
                      className={AUDIT_SORT_BTN_HEADER}
                      title="Sort by time"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFailedLoginSort('time')
                      }}
                    >
                      <span className={AUDIT_SORT_LABEL}>Time</span>
                      <AuditTableSortGlyph active={failedSort.by === 'time'} />
                    </button>
                  </th>
                  <th scope="col" className="px-2.5 py-2 align-middle sm:px-3 sm:py-2.5" aria-sort={ariaFailed('email')}>
                    <button
                      type="button"
                      className={AUDIT_SORT_BTN_HEADER}
                      title="Sort by email"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFailedLoginSort('email')
                      }}
                    >
                      <span className={AUDIT_SORT_LABEL}>Email</span>
                      <AuditTableSortGlyph active={failedSort.by === 'email'} />
                    </button>
                  </th>
                  <th scope="col" className="px-2.5 py-2 align-middle sm:px-3 sm:py-2.5" aria-sort={ariaFailed('ip')}>
                    <button
                      type="button"
                      className={AUDIT_SORT_BTN_HEADER}
                      title="Sort by IP"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFailedLoginSort('ip')
                      }}
                    >
                      <span className={AUDIT_SORT_LABEL}>IP</span>
                      <AuditTableSortGlyph active={failedSort.by === 'ip'} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/90">
                {sortedFailedLogins.map((log: any, idx: number) => {
                  const timeStr = log.createdAt ? format(new Date(log.createdAt), 'PPp') : '—'
                  return (
                  <tr
                    key={log.id ?? `${log.createdAt}-${log.email}-${log.ip}-${idx}`}
                    className="bg-white transition-colors duration-150 ease-out odd:bg-white even:bg-slate-50/45 hover:bg-primary-50/70"
                  >
                    <td className="min-w-0 px-2 py-2.5 align-middle text-sm text-gray-700 sm:px-3 sm:py-3">
                      <span className="block truncate tabular-nums" title={timeStr}>{timeStr}</span>
                    </td>
                    <td className="min-w-0 px-2 py-2.5 align-middle text-sm text-gray-700 sm:px-3 sm:py-3">
                      <span className="block truncate" title={log.email ?? ''}>{log.email ?? '—'}</span>
                    </td>
                    <td className="min-w-0 px-2 py-2.5 align-middle text-sm text-gray-700 sm:px-3 sm:py-3">
                      <span className="block truncate font-mono text-[13px]" title={log.ip ?? ''}>{log.ip ?? '—'}</span>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-[8rem] flex-1 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-slate-50/60 px-4 py-8 text-center sm:min-h-[10rem]">
            <p className="text-sm font-medium text-gray-500">No failed logins in recent access logs.</p>
          </div>
        )}
        </div>
      </section>
      </div>

      {/* Activity timeline */}
      <section className={sectionShell} aria-labelledby="audit-timeline-heading">
        <div className={sectionHeaderBar}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white shadow-md">
              <FaStream className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 id="audit-timeline-heading" className="text-base font-bold text-gray-900 sm:text-lg">
                Activity timeline
              </h2>
              <p className="text-xs text-gray-500 sm:text-sm">
                Filter security audit entries. Column sort applies across all pages (server-side). E-mail column sorts by user id.
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-100/90 bg-gradient-to-br from-primary-50/25 via-white to-violet-50/20 px-4 py-4 sm:px-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <label htmlFor="audit-action-type" className={fieldLabelClass}>
                Action type
              </label>
              <select
                id="audit-action-type"
                className={fieldControlClass}
                value={actionType}
                onChange={(e) => {
                  setActionType(e.target.value)
                  setPage(1)
                }}
              >
                {ACTION_TYPE_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="audit-entity-type" className={fieldLabelClass}>
                Entity type
              </label>
              <select
                id="audit-entity-type"
                className={fieldControlClass}
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value)
                  setPage(1)
                }}
              >
                {ENTITY_TYPE_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="audit-date-from" className={fieldLabelClass}>
                From date
              </label>
              <input
                id="audit-date-from"
                type="date"
                className={fieldControlClass}
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="audit-date-to" className={fieldLabelClass}>
                To date
              </label>
              <input
                id="audit-date-to"
                type="date"
                className={fieldControlClass}
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4">
        {logsLoading ? (
          <div className="flex min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-slate-50/40">
            <p className="text-sm font-medium text-gray-400">Loading audit log…</p>
          </div>
        ) : logsData?.logs?.length ? (
          <>
            <p className="mb-2 text-xs leading-snug text-gray-600" role="note">
              Scroll the table horizontally to see every column.
            </p>
            <div
              className={auditTableActivityViewport}
              role="region"
              aria-label="Activity log table, scroll horizontally for all columns"
            >
              <table className={`w-full ${auditActivityTableMinClass} table-fixed border-collapse bg-white text-sm leading-snug`}>
                <colgroup>
                  <col className="min-w-[16rem] w-[16%]" />
                  <col className="min-w-[13rem] w-[18%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="min-w-[11rem] w-[14%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-primary-900/25 bg-gradient-to-r from-primary-800 via-slate-700 to-primary-900 shadow-sm shadow-black/10">
                    <th scope="col" className="px-2.5 py-2 align-middle sm:px-3 sm:py-2.5" aria-sort={ariaActivity('time')}>
                      <button
                        type="button"
                        className={AUDIT_SORT_BTN_HEADER}
                        title="Sort by time"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleActivityLogSort('time')
                        }}
                      >
                        <span className={AUDIT_SORT_LABEL}>Time</span>
                        <AuditTableSortGlyph active={activitySort.by === 'time'} />
                      </button>
                    </th>
                    <th scope="col" className="px-2.5 py-2 align-middle sm:px-3 sm:py-2.5" aria-sort={ariaActivity('userRole')}>
                      <button
                        type="button"
                        className={AUDIT_SORT_BTN_HEADER}
                        title="Sort by user / role"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleActivityLogSort('userRole')
                        }}
                      >
                        <span className={AUDIT_SORT_LABEL}>User / role</span>
                        <AuditTableSortGlyph active={activitySort.by === 'userRole'} />
                      </button>
                    </th>
                    <th scope="col" className="px-2.5 py-2 align-middle sm:px-3 sm:py-2.5" aria-sort={ariaActivity('email')}>
                      <button
                        type="button"
                        className={AUDIT_SORT_BTN_HEADER}
                        title="Sort by user id (applies across pages; proxy for e-mail)"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleActivityLogSort('email')
                        }}
                      >
                        <span className={AUDIT_SORT_LABEL}>E-mail id</span>
                        <AuditTableSortGlyph active={activitySort.by === 'email'} />
                      </button>
                    </th>
                    <th scope="col" className="px-2.5 py-2 align-middle sm:px-3 sm:py-2.5" aria-sort={ariaActivity('action')}>
                      <button
                        type="button"
                        className={AUDIT_SORT_BTN_HEADER}
                        title="Sort by action"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleActivityLogSort('action')
                        }}
                      >
                        <span className={AUDIT_SORT_LABEL}>Action</span>
                        <AuditTableSortGlyph active={activitySort.by === 'action'} />
                      </button>
                    </th>
                    <th scope="col" className="px-2.5 py-2 align-middle sm:px-3 sm:py-2.5" aria-sort={ariaActivity('ip')}>
                      <button
                        type="button"
                        className={AUDIT_SORT_BTN_HEADER}
                        title="Sort by IP address"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleActivityLogSort('ip')
                        }}
                      >
                        <span className={AUDIT_SORT_LABEL}>IP / location</span>
                        <AuditTableSortGlyph active={activitySort.by === 'ip'} />
                      </button>
                    </th>
                    <th scope="col" className="px-2.5 py-2 align-middle sm:px-3 sm:py-2.5" aria-sort={ariaActivity('entity')}>
                      <button
                        type="button"
                        className={AUDIT_SORT_BTN_HEADER}
                        title="Sort by entity"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleActivityLogSort('entity')
                        }}
                      >
                        <span className={AUDIT_SORT_LABEL}>Entity</span>
                        <AuditTableSortGlyph active={activitySort.by === 'entity'} />
                      </button>
                    </th>
                    <th scope="col" className="px-2.5 py-2 align-middle sm:px-3 sm:py-2.5" aria-sort={ariaActivity('summary')}>
                      <button
                        type="button"
                        className={AUDIT_SORT_BTN_HEADER}
                        title="Sort by summary"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleActivityLogSort('summary')
                        }}
                      >
                        <span className={AUDIT_SORT_LABEL}>Summary</span>
                        <AuditTableSortGlyph active={activitySort.by === 'summary'} />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/90">
                  {(logsData?.logs ?? []).map((log: any) => {
                    const timeStr = log.createdAt ? format(new Date(log.createdAt), 'PPp') : '—'
                    const ipTitle =
                      log.ip
                        ? `${log.ip}${ipLocations?.locations?.[log.ip]?.location ? ` • ${ipLocations.locations[log.ip].location}` : ''}`
                        : ''
                    return (
                    <tr
                      key={log.id}
                      className="bg-white transition-colors duration-150 ease-out odd:bg-white even:bg-slate-50/45 hover:bg-primary-50/70"
                    >
                      <td className="min-w-[16rem] max-w-none whitespace-normal px-2 py-2.5 align-top text-sm text-gray-700 sm:px-3 sm:py-3">
                        <span className="block whitespace-nowrap tabular-nums leading-snug" title={timeStr}>
                          {timeStr}
                        </span>
                      </td>
                      <td className="min-w-0 px-2 py-2.5 align-top text-sm text-gray-700 sm:px-3 sm:py-3">
                        <span
                          className="block break-words [overflow-wrap:anywhere]"
                          title={`${log.userId ?? ''} / ${log.role ?? ''}`}
                        >
                          {log.userId} / {log.role}
                        </span>
                      </td>
                      <td className="min-w-0 px-2 py-2.5 align-middle text-sm text-gray-700 sm:px-3 sm:py-3">
                        <span className="block truncate" title={log.email ?? ''}>{log.email ?? '—'}</span>
                      </td>
                      <td className="min-w-0 px-2 py-2.5 align-middle text-sm text-gray-700 sm:px-3 sm:py-3">
                        <span className="block truncate" title={log.actionType ?? ''}>{log.actionType}</span>
                      </td>
                      <td className="min-w-0 px-2 py-2.5 align-middle text-sm text-gray-700 sm:px-3 sm:py-3">
                        {log.ip ? (
                          <span className="block truncate" title={ipTitle}>
                            <span className="font-mono text-[13px]">{log.ip}</span>
                            {ipLocations?.locations?.[log.ip]?.location ? (
                              <span className="text-gray-500"> • {ipLocations.locations[log.ip].location}</span>
                            ) : null}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td className="min-w-0 px-2 py-2.5 align-top text-sm text-gray-700 sm:px-3 sm:py-3">
                        <span
                          className="block break-words font-mono text-[13px] [overflow-wrap:anywhere]"
                          title={log.entityType && log.entityId ? `${log.entityType}#${log.entityId}` : ''}
                        >
                          {log.entityType && log.entityId ? `${log.entityType}#${log.entityId}` : '—'}
                        </span>
                      </td>
                      <td className="min-w-0 px-2 py-2.5 align-middle text-sm text-gray-700 sm:px-3 sm:py-3">
                        <span className="line-clamp-2 break-words text-gray-700" title={log.summary ?? ''}>
                          {log.summary ?? '—'}
                        </span>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {logsData.pagination && logsData.pagination.totalPages > 1 && (
              <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-center text-sm text-gray-600 sm:text-left">
                  Page <span className="font-semibold text-gray-900">{logsData.pagination.page}</span>
                  {' '}of <span className="font-semibold text-gray-900">{logsData.pagination.totalPages}</span>
                  <span className="text-gray-400"> · {logsData.pagination.total} entries</span>
                </span>
                <div className="flex justify-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    disabled={logsData.pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="min-h-[44px] min-w-[6.5rem] rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={logsData.pagination.page >= logsData.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="min-h-[44px] min-w-[6.5rem] rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-slate-50/50 px-4 py-10 sm:px-6">
            <p className="text-center text-sm font-medium text-gray-600">No audit logs match the filters.</p>
            <p className="mx-auto mt-2 max-w-xl text-center text-xs leading-relaxed text-gray-400">
              Activity includes logins, user and role changes, project events, support tickets, and proposal generation. Try clearing filters or widening the date range.
            </p>
          </div>
        )}
        </div>
      </section>
      </div>
      </PageCard>
    </div>
  )
}
