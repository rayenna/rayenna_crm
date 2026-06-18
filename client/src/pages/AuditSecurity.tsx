import { useMemo, useState, useEffect, Fragment, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useChartColors } from '../hooks/useChartColors'
import { useQuery } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { User, UserRole } from '../types'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  AUDIT_ACTION_TYPE_OPTIONS,
  AUDIT_ENTITY_TYPE_OPTIONS,
  auditActionLabel,
  auditDatePresetRange,
  auditEntityLinkLabel,
  auditEntityPath,
  buildAuditFilterSummary,
  type AuditDatePreset,
} from '../utils/auditSecurityUi'
import AuditProjectFieldHistory from '../components/audit/AuditProjectFieldHistory'
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
import MetricCard from '../components/dashboard/MetricCard'
import { Shield } from 'lucide-react'
import {
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
const DATE_PRESET_OPTIONS: { value: AuditDatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
]

function AuditEntityLink({
  entityType,
  entityId,
}: {
  entityType?: string | null
  entityId?: string | null
}) {
  const path = auditEntityPath(entityType, entityId)
  const label = auditEntityLinkLabel(entityType, entityId)
  if (!path || !entityType || !entityId) {
    return <span>—</span>
  }
  return (
    <Link
      to={path}
      className="font-medium text-[color:var(--accent-teal)] underline-offset-2 hover:underline"
      title={entityId}
    >
      {label}
    </Link>
  )
}

function buildExportParams(
  dateFrom: string,
  dateTo: string,
  actionType: string,
  entityType: string,
  userId: string,
  summarySearch: string,
): URLSearchParams {
  const p = new URLSearchParams()
  if (dateFrom) p.set('dateFrom', dateFrom)
  if (dateTo) p.set('dateTo', dateTo)
  if (actionType) p.set('actionType', actionType)
  if (entityType) p.set('entityType', entityType)
  if (userId) p.set('userId', userId)
  if (summarySearch.trim()) p.set('q', summarySearch.trim())
  return p
}

type AuditRecordsTab = 'security' | 'fieldHistory'

function failedLoginRowKey(log: { id?: string; createdAt: string; email?: string; ip?: string }, idx: number): string {
  return log.id ?? `${log.createdAt}-${log.email ?? ''}-${log.ip ?? ''}-${idx}`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Sort control chrome (dark header strip, Zenith-aligned) */
const AUDIT_SORT_BTN_HEADER =
  'group flex min-h-[2rem] w-full min-w-0 flex-nowrap items-center gap-2 overflow-visible rounded-md px-1.5 py-1 text-left transition-colors hover:bg-[color:var(--bg-card-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-muted)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--bg-modal)] sm:min-h-[2.5rem] sm:gap-2 sm:px-2 sm:py-1.5'
/** nowrap on small screens so headers stay one line when the table scrolls horizontally */
const AUDIT_SORT_LABEL =
  'min-w-0 flex-1 basis-0 text-left text-[11px] font-bold uppercase leading-snug tracking-wide text-[color:var(--text-secondary)] max-sm:shrink-0 max-sm:whitespace-nowrap max-sm:break-normal sm:whitespace-normal sm:break-words sm:text-xs sm:leading-tight sm:tracking-wider'

function AuditTableSortGlyph({ active }: { active: boolean }) {
  const box = active
    ? 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--text-primary)_6%,transparent)]'
    : 'border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-muted)] group-hover:border-[color:var(--accent-gold-border)] group-hover:bg-[color:var(--bg-card-hover)] group-hover:text-[color:var(--accent-gold)]'
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
  'rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] overflow-hidden min-w-0'

/**
 * Recent failed logins (md+): single scroll container (both axes). Nested outer/inner + w-max + table w-full
 * caused circular width resolution in browsers → only the first column laid out. Do not reintroduce that pattern.
 */
const auditTableTightViewportMd =
  'zenith-scroll-x touch-pan-x touch-pan-y min-h-0 w-full min-w-0 max-w-full shrink-0 overflow-x-auto overflow-y-auto overscroll-x-contain overscroll-y-contain rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] [-webkit-overflow-scrolling:touch] h-[max(12rem,min(20.5rem,calc(100dvh-16rem)))] max-h-[max(12rem,min(20.5rem,calc(100dvh-16rem)))] sm:h-[max(12rem,min(21.25rem,calc(100dvh-14rem)))] sm:max-h-[max(12rem,min(21.25rem,calc(100dvh-14rem)))]'

/**
 * Activity timeline (md+): same single scroll container; height sized for ~PAGE_SIZE rows.
 * If you change PAGE_SIZE, update the `20` in calc below.
 */
const auditTableActivityViewportMd =
  'zenith-scroll-x touch-pan-x touch-pan-y min-h-0 w-full min-w-0 max-w-full shrink-0 overflow-x-auto overflow-y-auto overscroll-x-contain overscroll-y-contain rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] [-webkit-overflow-scrolling:touch] h-[max(24rem,min(calc(4rem+20*3.5rem),calc(100dvh-5rem)))] max-h-[max(24rem,min(calc(4rem+20*3.5rem),calc(100dvh-5rem)))]'

/** Wide layout so Time (PPp), User/role & Entity stay readable; wrapper scrolls horizontally when the card is narrower. */
const auditActivityTableMinClass = 'min-w-[80rem]'

const sectionHeaderBar =
  'flex flex-col gap-3 border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4'

const fieldLabelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)] sm:text-xs'

const fieldControlClass = 'zenith-native-select mt-1.5 min-h-[44px] w-full rounded-xl px-3 py-2.5 text-sm'

const fieldDateClass = 'zenith-native-filter-input mt-1.5 min-h-[44px] w-full rounded-xl px-3 py-2.5 text-sm'

type FailedLoginSortKey = 'time' | 'email' | 'ip'
type ActivityLogSortKey = 'time' | 'userRole' | 'email' | 'action' | 'ip' | 'entity' | 'summary'

function defaultOrderFailedLogin(key: FailedLoginSortKey): 'asc' | 'desc' {
  return key === 'time' ? 'desc' : 'asc'
}

function defaultOrderActivityLog(key: ActivityLogSortKey): 'asc' | 'desc' {
  return key === 'time' ? 'desc' : 'asc'
}

const FAILED_SORT_SELECT: { value: FailedLoginSortKey; label: string }[] = [
  { value: 'time', label: 'Time' },
  { value: 'email', label: 'Email' },
  { value: 'ip', label: 'IP address' },
]

const ACTIVITY_SORT_SELECT: { value: ActivityLogSortKey; label: string }[] = [
  { value: 'time', label: 'Time' },
  { value: 'userRole', label: 'User / role' },
  { value: 'email', label: 'Email' },
  { value: 'action', label: 'Action' },
  { value: 'ip', label: 'IP / location' },
  { value: 'entity', label: 'Entity' },
  { value: 'summary', label: 'Summary' },
]

export default function AuditSecurity() {
  const { hasRole } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const chartColors = useChartColors()
  const chartAxisTick = useMemo(() => ({ fill: chartColors.axisText, fontSize: 11 }), [chartColors.axisText])
  const chartGridStroke = chartColors.grid
  const chartAxisLine = chartColors.tooltipBorder
  const chartTooltipStyle = useMemo(
    () => ({
      borderRadius: 12,
      border: `1px solid ${chartColors.tooltipBorder}`,
      backgroundColor: chartColors.tooltipBg,
      color: chartColors.tooltipFg,
      boxShadow: chartColors.tooltipShadow,
      padding: '10px 14px',
    }),
    [chartColors.tooltipBg, chartColors.tooltipBorder, chartColors.tooltipFg, chartColors.tooltipShadow],
  )
  const [page, setPage] = useState(1)
  const [recordsTab, setRecordsTab] = useState<AuditRecordsTab>('security')
  const [actionType, setActionType] = useState('')
  const [entityType, setEntityType] = useState('')
  const [filterUserId, setFilterUserId] = useState(() => searchParams.get('userId') ?? '')
  const [summarySearch, setSummarySearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedFailedLogin, setExpandedFailedLogin] = useState<string | null>(null)
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

  const actionLabelByValue = new Map(AUDIT_ACTION_TYPE_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]))

  useEffect(() => {
    const userId = searchParams.get('userId')
    if (userId) {
      setFilterUserId(userId)
      setPage(1)
    }
  }, [searchParams])

  const { data: usersList } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/users')
      return res.data as User[]
    },
    enabled: hasRole([UserRole.ADMIN]),
    staleTime: 60_000,
  })

  const filterUserLabel = useMemo(() => {
    if (!filterUserId) return undefined
    const match = usersList?.find((u) => u.id === filterUserId)
    return match ? `${match.name} (${match.email})` : filterUserId
  }, [filterUserId, usersList])

  const activeFilterSummary = buildAuditFilterSummary({
    actionType,
    entityType,
    dateFrom,
    dateTo,
    userId: filterUserId,
    userLabel: filterUserLabel,
    summarySearch,
  })

  const clearTimelineFilters = () => {
    setActionType('')
    setEntityType('')
    setFilterUserId('')
    setSummarySearch('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
    if (searchParams.get('userId')) {
      const next = new URLSearchParams(searchParams)
      next.delete('userId')
      setSearchParams(next, { replace: true })
    }
  }

  const applyDatePreset = (preset: AuditDatePreset) => {
    const { from, to } = auditDatePresetRange(preset)
    setDateFrom(from)
    setDateTo(to)
    setPage(1)
  }

  const handleFilterUserChange = (userId: string) => {
    setFilterUserId(userId)
    setPage(1)
    const next = new URLSearchParams(searchParams)
    if (userId) next.set('userId', userId)
    else next.delete('userId')
    setSearchParams(next, { replace: true })
  }

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
  if (filterUserId) params.set('userId', filterUserId)
  if (summarySearch.trim()) params.set('q', summarySearch.trim())
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['admin', 'audit', 'logs', page, actionType, entityType, filterUserId, summarySearch, dateFrom, dateTo, activitySort.by, activitySort.order],
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

  const entityKeys = ['User', 'Customer', 'Project', 'Document', 'SupportTicket', 'Proposal', 'Other'] as const
  const entityColors: Record<(typeof entityKeys)[number], string> = {
    User: 'var(--accent-blue)',
    Customer: 'var(--accent-teal)',
    Project: 'var(--accent-teal)',
    Document: 'var(--accent-purple)',
    SupportTicket: 'var(--accent-gold)',
    Proposal: 'var(--accent-purple)',
    Other: 'var(--text-muted)',
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
      const params = buildExportParams(dateFrom, dateTo, actionType, entityType, filterUserId, summarySearch)
      const res = await axiosInstance.get(`/api/admin/audit/export/csv?${params.toString()}`, { responseType: 'blob' })
      const name = res.headers['content-disposition']?.match(/filename="?([^"]+)"?/)?.[1] ?? `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      downloadBlob(res.data, name)
    } catch (e: unknown) {
      toast.error(getFriendlyApiErrorMessage(e))
    } finally {
      setExporting(null)
    }
  }

  const handleExportPdf = async () => {
    setExporting('pdf')
    try {
      const params = buildExportParams(dateFrom, dateTo, actionType, entityType, filterUserId, summarySearch)
      const res = await axiosInstance.get(`/api/admin/audit/export/pdf?${params.toString()}`, { responseType: 'blob' })
      const name = res.headers['content-disposition']?.match(/filename="?([^"]+)"?/)?.[1] ?? `audit-logs-${new Date().toISOString().slice(0, 10)}.pdf`
      downloadBlob(res.data, name)
    } catch (e: unknown) {
      toast.error(getFriendlyApiErrorMessage(e))
    } finally {
      setExporting(null)
    }
  }

  const handleExportSignedPdf = async () => {
    setExporting('signed')
    try {
      const params = buildExportParams(dateFrom, dateTo, actionType, entityType, filterUserId, summarySearch)
      const res = await axiosInstance.get(`/api/admin/audit/export/signed-pdf?${params.toString()}`, { responseType: 'blob' })
      const name = res.headers['content-disposition']?.match(/filename="?([^"]+)"?/)?.[1] ?? `signed-audit-export-${new Date().toISOString().slice(0, 10)}.pdf`
      downloadBlob(res.data, name)
    } catch (e: unknown) {
      toast.error(getFriendlyApiErrorMessage(e))
    } finally {
      setExporting(null)
    }
  }

  const shell = (children: ReactNode) => (
    <div
      className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] min-h-[calc(100vh-5rem)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(0.35rem,env(safe-area-inset-top,0px))] [-webkit-tap-highlight-color:transparent]"
    >
      <div className="zenith-exec-main mx-auto w-full max-w-full min-w-0 px-3 sm:px-5 pb-10">{children}</div>
    </div>
  )

  if (!hasRole([UserRole.ADMIN])) {
    return shell(
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-2 pt-6 text-center">
        <div className="w-full max-w-md rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-8 shadow-[var(--shadow-modal)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:var(--bg-card)] text-[color:var(--accent-red)]">
            <Shield className="h-7 w-7" strokeWidth={2} aria-hidden />
          </div>
          <h1 className="zenith-display text-lg font-bold tracking-tight text-[color:var(--text-primary)]">Access denied</h1>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">Audit &amp; Security is available to administrators only.</p>
        </div>
      </div>,
    )
  }

  return shell(
    <>
      <header className="sticky top-0 z-30 mb-4 border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)]/80 pb-3 pt-1 backdrop-blur-xl sm:mb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] shadow-[var(--shadow-card)]">
              <Shield className="h-5 w-5 text-[color:var(--accent-gold)]" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="zenith-display text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">Audit &amp; Security</h1>
              <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">
                Accountability, traceability, and security visibility across the organisation.
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-8 sm:space-y-10">
      {/* KPI strip — same family as dashboard metric cards */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-muted)] sm:mb-4">
          Last {SUMMARY_DAYS} days at a glance
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            variant="zenith"
            title={`Failed logins · ${SUMMARY_DAYS}d`}
            value={summaryLoading ? '…' : (summary?.failedLogins ?? 0)}
            icon={<FaExclamationTriangle />}
            gradient="from-rose-500 to-red-600"
          />
          <MetricCard
            variant="zenith"
            title={`Successful logins · ${SUMMARY_DAYS}d`}
            value={summaryLoading ? '…' : (summary?.loginSuccessCount ?? 0)}
            icon={<FaCheckCircle />}
            gradient="from-emerald-500 to-teal-600"
          />
          <MetricCard
            variant="zenith"
            title={`Audit events · ${SUMMARY_DAYS}d`}
            value={summaryLoading ? '…' : (summary?.auditByAction?.reduce((s, x) => s + x.count, 0) ?? 0)}
            icon={<FaClipboardList />}
            gradient="from-primary-500 to-cyan-600"
          />
          <MetricCard
            variant="zenith"
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
              <h2 id="audit-insights-heading" className="zenith-display text-base font-bold tracking-tight text-[color:var(--text-primary)] sm:text-lg">
                Security insights
              </h2>
              <p className="text-xs text-[color:var(--text-muted)] sm:text-sm">Login trends and how audit actions break down by entity.</p>
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
          <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] p-3 sm:p-4">
            <h3 className="mb-3 text-sm font-bold text-[color:var(--text-primary)]">Login activity trend</h3>
            <div className="h-[220px] w-full min-h-[200px] sm:h-64 overflow-x-auto">
              {loginTrendLoading ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm font-medium text-[color:var(--text-muted)]">Loading chart…</p>
                </div>
              ) : loginTrendChartData.length ? (
                <div className="h-full min-w-[min(100%,320px)] sm:min-w-[520px]">
                  <ResponsiveContainer width="100%" height="100%" debounce={400} minWidth={0}>
                    <LineChart data={loginTrendChartData} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                      <XAxis dataKey="label" tickMargin={8} tick={chartAxisTick} axisLine={{ stroke: chartAxisLine }} />
                      <YAxis allowDecimals={false} tick={chartAxisTick} axisLine={false} tickLine={false} width={36} />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(value: number) => [value, 'Count']}
                        labelFormatter={(_label, payload) => (payload?.[0]?.payload?.date ? String(payload[0].payload.date) : '')}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: 8, color: 'var(--text-secondary)', fontWeight: 600 }} />
                      <Line type="monotone" dataKey="success" name="Successful logins" stroke={chartColors.green} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="failure" name="Failed logins" stroke={chartColors.red} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-input)]">
                  <p className="text-sm text-[color:var(--text-muted)]">No login activity in this range.</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] p-3 sm:p-4">
            <h3 className="mb-3 text-sm font-bold text-[color:var(--text-primary)]">Action distribution</h3>
            <div className="overflow-x-auto">
              <div className="h-[220px] min-h-[200px] w-full sm:h-64 min-w-[min(100%,280px)] sm:min-w-[520px]">
                {actionDistributionLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm font-medium text-[color:var(--text-muted)]">Loading chart…</p>
                  </div>
                ) : actionDistributionChartData.length ? (
                  <ResponsiveContainer width="100%" height="100%" debounce={400} minWidth={0}>
                    <BarChart data={actionDistributionChartData} margin={{ top: 8, right: 8, left: -8, bottom: 52 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                      <XAxis
                        dataKey="actionLabel"
                        interval={0}
                        angle={-28}
                        textAnchor="end"
                        height={56}
                        tick={{ ...chartAxisTick, fontSize: 10 }}
                        axisLine={{ stroke: chartAxisLine }}
                      />
                      <YAxis allowDecimals={false} tick={chartAxisTick} axisLine={false} tickLine={false} width={36} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: 6, color: 'var(--text-secondary)', fontWeight: 600 }} />
                      {entityKeys.map((k) => (
                        <Bar key={k} dataKey={k} stackId="a" fill={entityColors[k]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-input)]">
                    <p className="text-sm text-[color:var(--text-muted)]">No audit events in this range.</p>
                  </div>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[color:var(--text-muted)]">
              Stacked by entity type. Labels match the Activity timeline action filter.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 border-b border-[color:var(--border-default)] pb-1" role="tablist" aria-label="Audit records">
        <button
          type="button"
          role="tab"
          aria-selected={recordsTab === 'security'}
          onClick={() => setRecordsTab('security')}
          className={`inline-flex min-h-[44px] touch-manipulation items-center rounded-t-xl border px-4 text-sm font-semibold transition-colors ${
            recordsTab === 'security'
              ? 'border-[color:var(--border-default)] border-b-transparent bg-[color:var(--bg-card)] text-[color:var(--accent-teal)]'
              : 'border-transparent bg-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]'
          }`}
        >
          Security events
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={recordsTab === 'fieldHistory'}
          onClick={() => setRecordsTab('fieldHistory')}
          className={`inline-flex min-h-[44px] touch-manipulation items-center rounded-t-xl border px-4 text-sm font-semibold transition-colors ${
            recordsTab === 'fieldHistory'
              ? 'border-[color:var(--border-default)] border-b-transparent bg-[color:var(--bg-card)] text-[color:var(--accent-teal)]'
              : 'border-transparent bg-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]'
          }`}
        >
          Project field history
        </button>
      </div>

      {recordsTab === 'fieldHistory' ? (
        <AuditProjectFieldHistory />
      ) : (
        <>
      {/* Recent failed logins */}
      <section className={sectionShell} aria-labelledby="audit-failed-heading">
        <div className={sectionHeaderBar}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md">
              <FaExclamationTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 id="audit-failed-heading" className="zenith-display text-base font-bold tracking-tight text-[color:var(--text-primary)] sm:text-lg">
                Recent failed logins
              </h2>
              <p className="text-xs text-[color:var(--text-muted)] sm:text-sm">Latest attempts from access logs (up to 10).</p>
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-col p-3 sm:p-4">
        {failedLoginsData?.logs?.length ? (
          <>
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:hidden">
              <div>
                <label className={fieldLabelClass} htmlFor="audit-failed-sort-by">
                  Sort by
                </label>
                <select
                  id="audit-failed-sort-by"
                  className={fieldControlClass}
                  value={failedSort.by}
                  onChange={(e) => {
                    const by = e.target.value as FailedLoginSortKey
                    setFailedSort({ by, order: defaultOrderFailedLogin(by) })
                  }}
                >
                  {FAILED_SORT_SELECT.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={fieldLabelClass} htmlFor="audit-failed-sort-order">
                  Order
                </label>
                <select
                  id="audit-failed-sort-order"
                  className={fieldControlClass}
                  value={failedSort.order}
                  onChange={(e) =>
                    setFailedSort((prev) => ({ ...prev, order: e.target.value as 'asc' | 'desc' }))
                  }
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
            <ul className="mb-4 space-y-3 md:hidden" aria-label="Recent failed logins">
              {sortedFailedLogins.map((log: { id?: string; email?: string; ip?: string; userAgent?: string; createdAt: string }, idx: number) => {
                const timeStr = log.createdAt ? format(new Date(log.createdAt), 'PPp') : '—'
                const rowKey = failedLoginRowKey(log, idx)
                const isExpanded = expandedFailedLogin === rowKey
                return (
                  <li
                    key={rowKey}
                    className="rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)]"
                  >
                    <p className="zenith-display text-xs font-semibold uppercase tracking-wide text-[color:var(--accent-gold)]">
                      {timeStr}
                    </p>
                    <p className="mt-2 break-all text-sm text-[color:var(--text-primary)] [overflow-wrap:anywhere]">{log.email ?? '—'}</p>
                    <p className="mt-1 font-mono text-xs text-[color:var(--accent-teal)]">{log.ip ?? '—'}</p>
                    {log.userAgent ? (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setExpandedFailedLogin(isExpanded ? null : rowKey)}
                          className="text-xs font-semibold text-[color:var(--accent-teal)] underline-offset-2 hover:underline"
                        >
                          {isExpanded ? 'Hide user agent' : 'Show user agent'}
                        </button>
                        {isExpanded ? (
                          <p className="mt-1 break-all text-xs leading-relaxed text-[color:var(--text-muted)] [overflow-wrap:anywhere]">
                            {log.userAgent}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
            <div className={`hidden md:block ${auditTableTightViewportMd}`}>
            <table className="w-full min-w-[19rem] table-fixed border-collapse bg-transparent text-sm leading-snug text-[color:var(--text-primary)] sm:min-w-0">
              <colgroup>
                <col className="w-[32%]" />
                <col className="w-[40%]" />
                <col className="w-[28%]" />
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] shadow-[var(--shadow-card)]">
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
              <tbody className="divide-y divide-[color:var(--border-default)]">
                {sortedFailedLogins.map((log: any, idx: number) => {
                  const timeStr = log.createdAt ? format(new Date(log.createdAt), 'PPp') : '—'
                  const rowKey = failedLoginRowKey(log, idx)
                  const isExpanded = expandedFailedLogin === rowKey
                  return (
                  <Fragment key={rowKey}>
                  <tr
                    className="bg-[color:var(--bg-input)] transition-colors duration-150 ease-out hover:bg-[color:var(--accent-gold-muted)]/45"
                  >
                    <td className="min-w-0 px-2 py-2.5 align-middle text-sm text-[color:var(--text-secondary)] sm:px-3 sm:py-3">
                      <span className="block truncate tabular-nums" title={timeStr}>{timeStr}</span>
                    </td>
                    <td className="min-w-0 px-2 py-2.5 align-middle text-sm text-[color:var(--text-secondary)] sm:px-3 sm:py-3">
                      <span className="block truncate" title={log.email ?? ''}>{log.email ?? '—'}</span>
                    </td>
                    <td className="min-w-0 px-2 py-2.5 align-middle text-sm text-[color:var(--text-secondary)] sm:px-3 sm:py-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="block truncate font-mono text-[13px] text-[color:var(--accent-teal)]" title={log.ip ?? ''}>{log.ip ?? '—'}</span>
                        {log.userAgent ? (
                          <button
                            type="button"
                            onClick={() => setExpandedFailedLogin(isExpanded ? null : rowKey)}
                            className="w-fit text-left text-[11px] font-semibold text-[color:var(--accent-teal)] underline-offset-2 hover:underline"
                          >
                            {isExpanded ? 'Hide user agent' : 'User agent'}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && log.userAgent ? (
                    <tr className="bg-[color:var(--bg-surface)]">
                      <td colSpan={3} className="px-3 py-2 text-xs leading-relaxed text-[color:var(--text-muted)]">
                        <span className="font-semibold text-[color:var(--text-secondary)]">User agent:</span>{' '}
                        <span className="break-all [overflow-wrap:anywhere]">{log.userAgent}</span>
                      </td>
                    </tr>
                  ) : null}
                  </Fragment>
                  )
                })}
              </tbody>
            </table>
            </div>
          </>
        ) : (
          <div className="flex min-h-[8rem] flex-1 items-center justify-center rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-8 text-center sm:min-h-[10rem]">
            <p className="text-sm font-medium text-[color:var(--text-muted)]">No failed logins in recent access logs.</p>
          </div>
        )}
        </div>
      </section>

      {/* Activity timeline */}
      <section className={sectionShell} aria-labelledby="audit-timeline-heading">
        <div className={sectionHeaderBar}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white shadow-md">
                <FaStream className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 id="audit-timeline-heading" className="zenith-display text-base font-bold tracking-tight text-[color:var(--text-primary)] sm:text-lg">
                  Activity timeline
                </h2>
                <p className="text-xs text-[color:var(--text-muted)] sm:text-sm">
                  Filter and export security audit entries. Sort applies across all pages (server-side).
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:max-w-xl lg:justify-end">
              <button
                type="button"
                disabled={!!exporting}
                onClick={handleExportCsv}
                className="inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl bg-[color:var(--accent-teal)] px-4 text-sm font-bold text-[color:var(--text-inverse)] shadow-[var(--shadow-card)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <FaDownload className="h-3.5 w-3.5" aria-hidden />
                {exporting === 'csv' ? 'Exporting…' : 'CSV'}
              </button>
              <button
                type="button"
                disabled={!!exporting}
                onClick={handleExportPdf}
                className="inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-input)] px-4 text-sm font-semibold text-[color:var(--text-primary)] shadow-[var(--shadow-card)] transition-colors hover:bg-[color:var(--bg-card-hover)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {exporting === 'pdf' ? 'Exporting…' : 'PDF'}
              </button>
              <button
                type="button"
                disabled={!!exporting}
                onClick={handleExportSignedPdf}
                className="inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-xl border-2 border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-4 text-sm font-semibold text-[color:var(--accent-gold)] shadow-[var(--shadow-card)] transition-colors hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {exporting === 'signed' ? 'Exporting…' : 'Signed PDF'}
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-4 py-4 sm:px-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {DATE_PRESET_OPTIONS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => applyDatePreset(preset.value)}
                className="inline-flex min-h-[36px] touch-manipulation items-center rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 text-xs font-semibold text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--accent-teal-border)] hover:text-[color:var(--accent-teal)]"
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={clearTimelineFilters}
              className="inline-flex min-h-[36px] touch-manipulation items-center rounded-lg border border-[color:var(--border-strong)] bg-transparent px-3 text-xs font-semibold text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text-primary)]"
            >
              Clear filters
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="min-w-0 xl:col-span-2">
              <label htmlFor="audit-summary-search" className={fieldLabelClass}>
                Summary search
              </label>
              <input
                id="audit-summary-search"
                type="search"
                placeholder="Search summary text…"
                className={fieldDateClass}
                value={summarySearch}
                onChange={(e) => {
                  setSummarySearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
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
                {AUDIT_ACTION_TYPE_OPTIONS.map((o) => (
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
                {AUDIT_ENTITY_TYPE_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="audit-filter-user" className={fieldLabelClass}>
                User (actor)
              </label>
              <select
                id="audit-filter-user"
                className={fieldControlClass}
                value={filterUserId}
                onChange={(e) => handleFilterUserChange(e.target.value)}
              >
                <option value="">All users</option>
                {(usersList ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
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
                className={fieldDateClass}
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
                className={fieldDateClass}
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
          {activeFilterSummary ? (
            <p className="mt-4 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 text-xs text-[color:var(--text-secondary)]">
              <span className="font-semibold text-[color:var(--accent-teal)]">Showing:</span> {activeFilterSummary}
            </p>
          ) : null}
        </div>

        <div className="p-3 sm:p-4">
        {logsLoading ? (
          <div className="flex min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-input)]">
            <p className="text-sm font-medium text-[color:var(--text-muted)]">Loading audit log…</p>
          </div>
        ) : logsData?.logs?.length ? (
          <>
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:hidden">
              <div>
                <label className={fieldLabelClass} htmlFor="audit-activity-sort-by">
                  Sort by
                </label>
                <select
                  id="audit-activity-sort-by"
                  className={fieldControlClass}
                  value={activitySort.by}
                  onChange={(e) => {
                    const by = e.target.value as ActivityLogSortKey
                    setPage(1)
                    setActivitySort({ by, order: defaultOrderActivityLog(by) })
                  }}
                >
                  {ACTIVITY_SORT_SELECT.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={fieldLabelClass} htmlFor="audit-activity-sort-order">
                  Order
                </label>
                <select
                  id="audit-activity-sort-order"
                  className={fieldControlClass}
                  value={activitySort.order}
                  onChange={(e) => {
                    setPage(1)
                    setActivitySort((prev) => ({ ...prev, order: e.target.value as 'asc' | 'desc' }))
                  }}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
            <ul className="mb-4 space-y-3 md:hidden" aria-label="Activity log">
              {(logsData?.logs ?? []).map((log: any) => {
                const timeStr = log.createdAt ? format(new Date(log.createdAt), 'PPp') : '—'
                const ipTitle =
                  log.ip
                    ? `${log.ip}${ipLocations?.locations?.[log.ip]?.location ? ` • ${ipLocations.locations[log.ip].location}` : ''}`
                    : ''
                return (
                  <li
                    key={log.id}
                    className="rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)]"
                  >
                    <p className="zenith-display text-xs font-semibold uppercase tracking-wide text-[color:var(--accent-gold)]">
                      {timeStr}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[color:var(--text-primary)]">
                      {auditActionLabel(log.actionType)}
                    </p>
                    <p className="mt-1 break-words text-sm text-[color:var(--text-secondary)] [overflow-wrap:anywhere]">
                      {(log.userId ?? '—') + ' / ' + (log.role ?? '—')}
                    </p>
                    <p className="mt-1 break-all text-xs text-[color:var(--accent-teal)] [overflow-wrap:anywhere]">{log.email ?? '—'}</p>
                    {log.ip ? (
                      <p className="mt-1 text-xs text-[color:var(--text-muted)]" title={ipTitle}>
                        <span className="font-mono text-[13px] text-[color:var(--accent-teal)]">{log.ip}</span>
                        {ipLocations?.locations?.[log.ip]?.location ? (
                          <span> · {ipLocations.locations[log.ip].location}</span>
                        ) : null}
                      </p>
                    ) : null}
                    <p className="mt-2 font-mono text-xs text-[color:var(--text-muted)] [overflow-wrap:anywhere]">
                      <AuditEntityLink entityType={log.entityType} entityId={log.entityId} />
                    </p>
                    <p className="mt-2 text-sm leading-snug text-[color:var(--text-secondary)]">{log.summary ?? '—'}</p>
                  </li>
                )
              })}
            </ul>
            <div className="hidden md:block">
            <p className="mb-2 text-xs leading-snug text-[color:var(--text-muted)] lg:hidden" role="note">
              Scroll the table horizontally to see every column.
            </p>
            <div
              className={auditTableActivityViewportMd}
              role="region"
              aria-label="Activity log table, scroll horizontally for all columns"
            >
              <table className={`w-full ${auditActivityTableMinClass} table-fixed border-collapse bg-transparent text-sm leading-snug text-[color:var(--text-primary)]`}>
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
                  <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] shadow-[var(--shadow-card)]">
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
                        title="Sort by email (sorts by user account id across pages)"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleActivityLogSort('email')
                        }}
                      >
                        <span className={AUDIT_SORT_LABEL}>Email</span>
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
                <tbody className="divide-y divide-[color:var(--border-default)]">
                  {(logsData?.logs ?? []).map((log: any) => {
                    const timeStr = log.createdAt ? format(new Date(log.createdAt), 'PPp') : '—'
                    const ipTitle =
                      log.ip
                        ? `${log.ip}${ipLocations?.locations?.[log.ip]?.location ? ` • ${ipLocations.locations[log.ip].location}` : ''}`
                        : ''
                    return (
                    <tr
                      key={log.id}
                      className="bg-[color:var(--bg-input)] transition-colors duration-150 ease-out hover:bg-[color:var(--accent-gold-muted)]/45"
                    >
                      <td className="min-w-[16rem] max-w-none whitespace-normal px-2 py-2.5 align-top text-sm text-[color:var(--text-secondary)] sm:px-3 sm:py-3">
                        <span className="block whitespace-nowrap tabular-nums leading-snug" title={timeStr}>
                          {timeStr}
                        </span>
                      </td>
                      <td className="min-w-0 px-2 py-2.5 align-top text-sm text-[color:var(--text-secondary)] sm:px-3 sm:py-3">
                        <span
                          className="block break-words [overflow-wrap:anywhere]"
                          title={`${log.userId ?? ''} / ${log.role ?? ''}`}
                        >
                          {log.userId} / {log.role}
                        </span>
                      </td>
                      <td className="min-w-0 px-2 py-2.5 align-middle text-sm text-[color:var(--text-secondary)] sm:px-3 sm:py-3">
                        <span className="block truncate text-[color:var(--accent-teal)]" title={log.email ?? ''}>{log.email ?? '—'}</span>
                      </td>
                      <td className="min-w-0 px-2 py-2.5 align-middle text-sm text-[color:var(--text-secondary)] sm:px-3 sm:py-3">
                        <span className="block truncate" title={auditActionLabel(log.actionType)}>
                          {auditActionLabel(log.actionType)}
                        </span>
                      </td>
                      <td className="min-w-0 px-2 py-2.5 align-middle text-sm text-[color:var(--text-secondary)] sm:px-3 sm:py-3">
                        {log.ip ? (
                          <span className="block truncate" title={ipTitle}>
                            <span className="font-mono text-[13px] text-[color:var(--accent-teal)]">{log.ip}</span>
                            {ipLocations?.locations?.[log.ip]?.location ? (
                              <span className="text-[color:var(--text-muted)]"> • {ipLocations.locations[log.ip].location}</span>
                            ) : null}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td className="min-w-0 px-2 py-2.5 align-top text-sm text-[color:var(--text-secondary)] sm:px-3 sm:py-3">
                        <span className="block break-words [overflow-wrap:anywhere]">
                          <AuditEntityLink entityType={log.entityType} entityId={log.entityId} />
                        </span>
                      </td>
                      <td className="min-w-0 px-2 py-2.5 align-middle text-sm text-[color:var(--text-secondary)] sm:px-3 sm:py-3">
                        <span className="line-clamp-2 break-words text-[color:var(--text-muted)]" title={log.summary ?? ''}>
                          {log.summary ?? '—'}
                        </span>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            </div>
            {logsData.pagination && logsData.pagination.totalPages > 1 && (
              <div className="mt-5 flex flex-col gap-3 border-t border-[color:var(--border-default)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-center text-sm text-[color:var(--text-secondary)] sm:text-left">
                  Page <span className="font-semibold text-[color:var(--text-primary)]">{logsData.pagination.page}</span>
                  {' '}of <span className="font-semibold text-[color:var(--text-primary)]">{logsData.pagination.totalPages}</span>
                  <span className="text-[color:var(--text-muted)]"> · {logsData.pagination.total} entries</span>
                </span>
                <div className="flex justify-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    disabled={logsData.pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="min-h-[44px] min-w-[6.5rem] touch-manipulation rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-input)] px-4 text-sm font-semibold text-[color:var(--text-primary)] shadow-[var(--shadow-card)] transition-colors hover:bg-[color:var(--bg-card-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={logsData.pagination.page >= logsData.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="min-h-[44px] min-w-[6.5rem] touch-manipulation rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-input)] px-4 text-sm font-semibold text-[color:var(--text-primary)] shadow-[var(--shadow-card)] transition-colors hover:bg-[color:var(--bg-card-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-10 sm:px-6">
            <p className="text-center text-sm font-medium text-[color:var(--text-secondary)]">No audit logs match the filters.</p>
            <p className="mx-auto mt-2 max-w-xl text-center text-xs leading-relaxed text-[color:var(--text-muted)]">
              Activity includes logins, user changes, customers, documents, payment updates, project events, support tickets, proposal generation, and PE events. Try clearing filters or widening the date range.
            </p>
          </div>
        )}
        </div>
      </section>
        </>
      )}
      </div>
    </>
  )
}
