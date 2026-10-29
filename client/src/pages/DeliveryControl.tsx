import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  Download,
  Printer,
  Search,
  X,
} from 'lucide-react'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { ErrorModal } from '../components/common/ErrorModal'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import ChartPanel from '../components/zenith/ChartPanel'
import { useChartColors } from '../hooks/useChartColors'
import { ZENITH_CHART_CUSTOM_TOOLTIP_SHELL } from '../components/dashboard/zenithRechartsTooltipStyles'
import MultiSelect from '../components/MultiSelect'
import { DealListColHead } from '../components/reports/DealListColHead'
import DeliveryControlHowToRead from '../components/reports/DeliveryControlHowToRead'
import type { DeliveryControlPayload, DeliveryJob, SubsidyClockJob } from '../types/deliveryControl'
import {
  formatCloseDate,
  formatInr,
  formatInrCompact,
  formatKw,
} from '../utils/salesReviewFormat'

const ACCESS_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.SALES, UserRole.OPERATIONS]
const NARROW_MQ = '(max-width: 743px)'
const TABLE_HEAD_ROW =
  'border-b border-[color:var(--border-default)] bg-[color:var(--zenith-table-header-bg)]'
const TABLE_HEAD_TH =
  'py-2.5 text-xs font-extrabold uppercase tracking-wide text-[color:var(--accent-gold)] sm:text-sm'
const EXPORT_CONFIRM =
  'The Data that is present in the CRM System is the exclusive property of Rayenna Energy Private Limited. Unauthorised Export of any data is prohibited and will be subject to disciplinary measures including and not limited to termination and legal procedures.\n\nBy exporting this data, you are confirming that you are authorised to access this data/info and have written approvals from the management.\n\nDo you want to continue?'
type ExportFormat = 'xlsx' | 'pdf' | 'pptx'

type OpsUser = { id: string; name: string }
type JobSortKey =
  | 'customer'
  | 'stage'
  | 'ops'
  | 'seller'
  | 'segment'
  | 'kw'
  | 'commissionDate'
  | 'daysLate'
  | 'blockers'
  | 'orderValue'

type ClockSortKey = 'customer' | 'step' | 'days' | 'ops' | 'exception' | 'value'

function compareJobs(a: DeliveryJob, b: DeliveryJob, key: JobSortKey, order: 'asc' | 'desc'): number {
  const dir = order === 'asc' ? 1 : -1
  const emptyLast = (aEmpty: boolean, bEmpty: boolean) => {
    if (aEmpty === bEmpty) return 0
    return aEmpty ? 1 : -1
  }
  const byText = (as: string, bs: string) => {
    const aEmpty = !as || as === '—'
    const bEmpty = !bs || bs === '—'
    const vacant = emptyLast(aEmpty, bEmpty)
    if (vacant) return vacant
    return as.localeCompare(bs, undefined, { sensitivity: 'base', numeric: true }) * dir
  }

  switch (key) {
    case 'kw':
      return (Number(a.capacityKw || 0) - Number(b.capacityKw || 0)) * dir
    case 'orderValue':
      return (a.orderValue - b.orderValue) * dir
    case 'daysLate': {
      const vacant = emptyLast(a.daysLate == null, b.daysLate == null)
      if (vacant) return vacant
      return ((a.daysLate || 0) - (b.daysLate || 0)) * dir
    }
    case 'commissionDate': {
      const vacant = emptyLast(!a.commissionDate, !b.commissionDate)
      if (vacant) return vacant
      return a.commissionDate! < b.commissionDate! ? -1 * dir : a.commissionDate! > b.commissionDate! ? dir : 0
    }
    case 'blockers':
      return (a.blockers.length - b.blockers.length) * dir
    case 'customer':
      return byText(a.customerName, b.customerName)
    case 'stage':
      return byText(a.stage, b.stage)
    case 'ops':
      return byText(a.opsPersonName || 'Unassigned', b.opsPersonName || 'Unassigned')
    case 'seller':
      return byText(a.salespersonName || '', b.salespersonName || '')
    case 'segment':
      return byText(a.segmentLabel, b.segmentLabel)
    default:
      return 0
  }
}

function compareClockJobs(
  a: SubsidyClockJob,
  b: SubsidyClockJob,
  key: ClockSortKey,
  order: 'asc' | 'desc',
): number {
  const dir = order === 'asc' ? 1 : -1
  const byText = (as: string, bs: string) =>
    as.localeCompare(bs, undefined, { sensitivity: 'base', numeric: true }) * dir
  switch (key) {
    case 'days': {
      if (a.daysInStep == null && b.daysInStep == null) return 0
      if (a.daysInStep == null) return 1
      if (b.daysInStep == null) return -1
      return (a.daysInStep - b.daysInStep) * dir
    }
    case 'value':
      return (a.orderValue - b.orderValue) * dir
    case 'customer':
      return byText(a.customerName, b.customerName)
    case 'step':
      return byText(a.stepLabel, b.stepLabel)
    case 'ops':
      return byText(a.opsPersonName || 'Unassigned', b.opsPersonName || 'Unassigned')
    case 'exception':
      return byText(a.exceptionLabels[0] || '', b.exceptionLabels[0] || '')
    default:
      return 0
  }
}

function isNarrowViewport(): boolean {
  return typeof window !== 'undefined' ? window.matchMedia(NARROW_MQ).matches : false
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v && v !== '—')))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  )
}

export default function DeliveryControl() {
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()
  const canAccess = hasRole(ACCESS_ROLES)
  const isSales = user?.role === UserRole.SALES
  const colors = useChartColors()
  const [opsPersonId, setOpsPersonId] = useState('')
  const [expandMonths, setExpandMonths] = useState(false)
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState<string[]>([])
  const [opsFilter, setOpsFilter] = useState<string[]>([])
  const [segment, setSegment] = useState<string[]>([])
  const [blocker, setBlocker] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<JobSortKey>('daysLate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [clockSearch, setClockSearch] = useState('')
  const [clockStep, setClockStep] = useState<string[]>([])
  const [clockFlag, setClockFlag] = useState<string[]>([])
  const [clockSortKey, setClockSortKey] = useState<ClockSortKey>('days')
  const [clockSortOrder, setClockSortOrder] = useState<'asc' | 'desc'>('desc')
  const [narrow, setNarrow] = useState(isNarrowViewport)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [pendingExport, setPendingExport] = useState<ExportFormat | null>(null)
  const [exporting, setExporting] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mq = window.matchMedia(NARROW_MQ)
    const onChange = () => setNarrow(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!exportMenuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!exportMenuRef.current?.contains(e.target as Node)) setExportMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [exportMenuOpen])

  const { data: opsUsers } = useQuery({
    queryKey: ['users', 'role', 'operations'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/users/role/operations')
      return res.data as OpsUser[]
    },
    enabled: canAccess && !isSales,
  })

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['reports', 'delivery-control', isSales ? user?.id : opsPersonId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (!isSales && opsPersonId) params.set('opsPersonId', opsPersonId)
      const qs = params.toString()
      const res = await axiosInstance.get(`/api/reports/delivery-control${qs ? `?${qs}` : ''}`)
      return res.data as DeliveryControlPayload
    },
    enabled: canAccess,
  })

  const jobs = data?.jobs ?? []
  const stages = useMemo(() => uniqueSorted(jobs.map((j) => j.stage)), [jobs])
  const opsNames = useMemo(
    () => uniqueSorted(jobs.map((j) => j.opsPersonName || (j.unassignedOps ? 'Unassigned' : ''))),
    [jobs],
  )
  const blockerOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const j of jobs) {
      j.blockers.forEach((id, i) => {
        if (!map.has(id)) map.set(id, j.blockerLabels[i] || id)
      })
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [jobs])

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return jobs.filter((j) => {
      if (stage.length && !stage.includes(j.stage)) return false
      const opsName = j.opsPersonName || 'Unassigned'
      if (opsFilter.length && !opsFilter.includes(opsName)) return false
      if (segment.length && !segment.includes(j.segment || '')) return false
      if (blocker.length && !j.blockers.some((id) => blocker.includes(id))) return false
      if (!q) return true
      const hay = `${j.slNo ?? ''} ${j.customerName} ${j.salespersonName ?? ''} ${opsName} ${j.stage}`.toLowerCase()
      return hay.includes(q)
    })
  }, [jobs, search, stage, opsFilter, segment, blocker])

  const visibleJobs = useMemo(() => {
    const copy = [...filteredJobs]
    copy.sort((a, b) => compareJobs(a, b, sortKey, sortOrder))
    return copy
  }, [filteredJobs, sortKey, sortOrder])

  const headerAriaSort = (key: JobSortKey): 'ascending' | 'descending' | 'none' => {
    if (sortKey !== key) return 'none'
    return sortOrder === 'asc' ? 'ascending' : 'descending'
  }

  const onJobSort = (key: string, order: 'asc' | 'desc') => {
    setSortKey(key as JobSortKey)
    setSortOrder(order)
  }

  const monthCols = useMemo(() => {
    if (!data || !expandMonths) return []
    return data.board.columns.flatMap((col) =>
      col.months.map((m) => ({ ...m, parent: col.shortLabel, fy: col.fy })),
    )
  }, [data, expandMonths])

  const monthMetrics = useMemo(() => {
    if (!expandMonths || !data) return null
    const acc = new Map<string, { jobs: number; kw: number; value: number }>()
    for (const m of monthCols) acc.set(m.key, { jobs: 0, kw: 0, value: 0 })
    for (const j of data.jobs) {
      if (!j.commissionDate) continue
      const row = acc.get(j.commissionDate.slice(0, 7))
      if (!row) continue
      row.jobs += 1
      row.kw += j.capacityKw || 0
      row.value += j.orderValue
    }
    return acc
  }, [data, expandMonths, monthCols])

  const chartData = useMemo(() => {
    if (!data) return []
    const valRow = data.board.rows.find((r) => r.key === 'value')
    return data.board.columns.map((col, i) => ({
      name: col.shortLabel,
      Value: valRow?.values[i] ?? 0,
    }))
  }, [data])

  const clockJobs = data?.subsidyClock?.jobs ?? []
  const clockSteps = useMemo(() => uniqueSorted(clockJobs.map((j) => j.stepLabel)), [clockJobs])
  const clockFlags = useMemo(() => uniqueSorted(clockJobs.flatMap((j) => j.exceptionLabels)), [clockJobs])
  const filteredClockJobs = useMemo(() => {
    const q = clockSearch.trim().toLowerCase()
    return clockJobs.filter((j) => {
      if (clockStep.length && !clockStep.includes(j.stepLabel)) return false
      if (clockFlag.length && !j.exceptionLabels.some((f) => clockFlag.includes(f))) return false
      if (!q) return true
      const hay = `${j.customerName} ${j.slNo ?? ''} ${j.opsPersonName ?? ''} ${j.salespersonName ?? ''} ${j.stepLabel}`.toLowerCase()
      return hay.includes(q)
    })
  }, [clockJobs, clockSearch, clockStep, clockFlag])
  const visibleClockJobs = useMemo(() => {
    const copy = [...filteredClockJobs]
    copy.sort((a, b) => compareClockJobs(a, b, clockSortKey, clockSortOrder))
    return copy
  }, [filteredClockJobs, clockSortKey, clockSortOrder])
  const clockFilterActive = Boolean(clockSearch || clockStep.length || clockFlag.length)
  const clockHeaderAriaSort = (key: ClockSortKey): 'ascending' | 'descending' | 'none' => {
    if (clockSortKey !== key) return 'none'
    return clockSortOrder === 'asc' ? 'ascending' : 'descending'
  }
  const onClockSort = (key: string, order: 'asc' | 'desc') => {
    setClockSortKey(key as ClockSortKey)
    setClockSortOrder(order)
  }

  const filterActive = Boolean(search || stage.length || opsFilter.length || segment.length || blocker.length)
  const clearFilters = () => {
    setSearch('')
    setStage([])
    setOpsFilter([])
    setSegment([])
    setBlocker([])
  }

  const requestExport = (format: ExportFormat) => {
    setExportMenuOpen(false)
    setPendingExport(format)
  }

  const confirmExport = async () => {
    if (!pendingExport || exporting) return
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (!isSales && opsPersonId) params.set('opsPersonId', opsPersonId)
      const qs = params.toString()
      const res = await axiosInstance.get(
        `/api/reports/delivery-control/export/${pendingExport}${qs ? `?${qs}` : ''}`,
        { responseType: 'blob' },
      )
      const header = String(res.headers['content-disposition'] || '')
      const fromHeader = header.match(/filename="?([^"]+)"?/)?.[1]
      const filename = fromHeader || `delivery-control.${pendingExport}`
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      const label = pendingExport === 'xlsx' ? 'Excel' : pendingExport === 'pdf' ? 'PDF' : 'PowerPoint'
      toast.success(`Delivery Control exported to ${label}`)
    } catch (err) {
      toast.error(getFriendlyApiErrorMessage(err))
    } finally {
      setExporting(false)
      setPendingExport(null)
    }
  }

  const shell = (children: ReactNode) => (
    <div className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(0.35rem,env(safe-area-inset-top,0px))]">
      <div className="zenith-exec-main mx-auto w-full max-w-full min-w-0 px-3 sm:px-5 pb-10 print:px-0">
        {children}
      </div>
    </div>
  )

  if (!canAccess) {
    return shell(
      <div className="pt-8 text-center text-sm text-[color:var(--text-secondary)]">
        Delivery Control is available to Admin, Management, Operations, and Sales.
      </div>,
    )
  }

  if (isError) {
    return shell(
      <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] p-5">
        <p className="font-medium">Unable to load Delivery Control.</p>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{getFriendlyApiErrorMessage(error)}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 min-h-[44px] rounded-xl bg-[color:var(--accent-gold)] px-4 text-sm font-extrabold text-[color:var(--text-inverse)]"
        >
          Try again
        </button>
      </div>,
    )
  }

  const k = data?.kpis

  return shell(
    <div className="space-y-5 pt-3 sm:pt-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:flex-row">
        <div className="flex min-w-0 items-start gap-3">
          <Link
            to="/reports"
            className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border-default)] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] print:hidden"
            aria-label="Back to Reports"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
              Reports
            </p>
            <h1 className="zenith-display text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">
              Delivery Control
            </h1>
            <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">
              Weekly pack — in-delivery jobs, commissioning, ops load, and subsidy clock
              {data ? ` · FY${data.currentFy}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {!isSales ? (
            <label className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
              <span className="sr-only">Assigned ops</span>
              <select
                value={opsPersonId}
                onChange={(e) => setOpsPersonId(e.target.value)}
                className="min-h-[40px] w-full rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 text-sm text-[color:var(--text-primary)] sm:w-56"
              >
                <option value="">All ops</option>
                <option value="unassigned">Unassigned</option>
                {(opsUsers ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen((v) => !v)}
              disabled={isLoading || !data}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-3 text-sm font-semibold text-[color:var(--text-primary)] disabled:opacity-50"
              aria-expanded={exportMenuOpen}
              aria-haspopup="menu"
              title="Export this report"
            >
              <Download className="h-4 w-4" aria-hidden />
              Export
              <ChevronDown className="h-3.5 w-3.5 text-[color:var(--text-muted)]" aria-hidden />
            </button>
            {exportMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-1.5 w-52 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-dropdown)] p-1.5 shadow-[var(--shadow-dropdown)] ring-1 ring-[color:var(--border-default)]"
              >
                {(
                  [
                    ['xlsx', 'Excel (.xlsx)'],
                    ['pdf', 'PDF'],
                    ['pptx', 'PowerPoint (.pptx)'],
                  ] as const
                ).map(([fmt, label]) => (
                  <button
                    key={fmt}
                    type="button"
                    role="menuitem"
                    onClick={() => requestExport(fmt)}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--bg-table-hover)]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-3 text-sm font-semibold text-[color:var(--text-primary)]"
          >
            <Printer className="h-4 w-4" aria-hidden />
            Print
          </button>
        </div>
      </header>

      <DeliveryControlHowToRead />

      {isLoading || !data || !k ? (
        <div className="flex min-h-[280px] items-center justify-center text-sm text-[color:var(--text-muted)]">
          Loading Delivery Control…
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
            <Kpi
              label="In delivery"
              value={formatInrCompact(k.inDeliveryValue)}
              hint={`${k.inDeliveryJobs} jobs`}
            />
            <Kpi label="Capacity" value={formatKw(k.inDeliveryKw)} />
            <Kpi
              label="By stage"
              value={`${k.confirmedJobs} / ${k.installingJobs} / ${k.subsidyJobs}`}
              hint="Confirmed · Install · Subsidy"
            />
            <Kpi label="Overdue" value={String(k.overdueJobs)} warn={k.overdueJobs > 0} />
            <Kpi label="No date" value={String(k.unscheduledJobs)} warn={k.unscheduledJobs > 0} />
            <Kpi
              label="Blockers"
              value={String(k.blockedJobs)}
              hint={`${k.unassignedJobs} unassigned`}
              warn={k.blockedJobs > 0 || k.unassignedJobs > 0}
            />
          </section>

          {(k.overdueJobs > 0 || k.unscheduledJobs > 0 || k.unassignedJobs > 0) && (
            <div className="flex items-start gap-2 rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-3 py-2 text-xs text-[color:var(--text-primary)] sm:text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent-gold)]" aria-hidden />
              <p>
                {k.overdueJobs > 0
                  ? `${k.overdueJobs} job${k.overdueJobs === 1 ? '' : 's'} past expected commissioning. `
                  : ''}
                {k.unscheduledJobs > 0
                  ? `${k.unscheduledJobs} with no commissioning date. `
                  : ''}
                {k.unassignedJobs > 0 ? `${k.unassignedJobs} unassigned to ops.` : ''}
              </p>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <MetricCard
              title="Commissioning board"
              action={
                <button
                  type="button"
                  onClick={() => setExpandMonths((v) => !v)}
                  className="rounded-lg border border-[color:var(--border-default)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--text-secondary)] print:hidden"
                >
                  {expandMonths ? 'Collapse months' : 'Expand quarters'}
                </button>
              }
            >
              {expandMonths && monthMetrics ? (
                <MonthTable columns={monthCols} metrics={monthMetrics} compact={narrow} />
              ) : (
                <MetricTable
                  columns={[...data.board.columns.map((c) => c.shortLabel), 'Total']}
                  rows={data.board.rows.map((row) => ({
                    key: row.key,
                    label: row.label,
                    cells: [...row.values, row.total],
                  }))}
                  compact={narrow}
                  columnHints={data.board.columns.map((c) => c.label)}
                />
              )}
              <p className="mt-2 text-[11px] text-[color:var(--text-muted)]">
                Unscheduled {data.board.unscheduledJobs} jobs (
                {formatInrCompact(data.board.unscheduledValue)} · {formatKw(data.board.unscheduledKw)})
                {data.board.laterJobs > 0
                  ? ` · Beyond NQ+2 ${data.board.laterJobs} jobs`
                  : ''}
              </p>
            </MetricCard>

            <MetricCard title="Ops load">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className={TABLE_HEAD_ROW}>
                      <th className={`${TABLE_HEAD_TH} pr-2 text-left`}>Ops</th>
                      <th className={`${TABLE_HEAD_TH} pl-2 text-right`}>Jobs</th>
                      <th className={`${TABLE_HEAD_TH} pl-2 text-right`}>kW</th>
                      <th className={`${TABLE_HEAD_TH} pl-2 text-right`}>Value</th>
                      <th className={`${TABLE_HEAD_TH} pl-2 text-right`}>Overdue</th>
                      <th className={`${TABLE_HEAD_TH} pl-2 text-right`}>Blocked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.opsLoad.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-sm text-[color:var(--text-muted)]">
                          No in-delivery jobs
                        </td>
                      </tr>
                    ) : (
                      data.opsLoad.map((row) => (
                        <tr
                          key={row.opsPersonId || 'unassigned'}
                          className="border-b border-[color:var(--border-default)] last:border-0"
                        >
                          <th className="py-2.5 pr-2 text-left text-sm font-bold text-[color:var(--text-primary)]">
                            {row.opsPersonName}
                          </th>
                          <td className="py-2 pl-2 text-right tabular-nums text-sm font-semibold">{row.jobs}</td>
                          <td className="py-2 pl-2 text-right tabular-nums text-sm font-semibold">
                            {formatKw(row.capacityKw)}
                          </td>
                          <td className="py-2 pl-2 text-right tabular-nums text-sm font-semibold">
                            {narrow ? formatInrCompact(row.orderValue) : formatInr(row.orderValue)}
                          </td>
                          <td
                            className={`py-2 pl-2 text-right tabular-nums text-sm font-semibold ${
                              row.overdue > 0 ? 'text-[color:var(--accent-gold)]' : ''
                            }`}
                          >
                            {row.overdue}
                          </td>
                          <td className="py-2 pl-2 text-right tabular-nums text-sm font-semibold">{row.blocked}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </MetricCard>
          </section>

          <ChartPanel
            title="Commissioning mix"
            subtitle="Order value by expected commissioning quarter"
            className="print:break-inside-avoid"
          >
            <div className="h-[240px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: colors.axisText, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: colors.axisText, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatInrCompact(Number(v))}
                    width={64}
                  />
                  <Tooltip
                    contentStyle={ZENITH_CHART_CUSTOM_TOOLTIP_SHELL}
                    formatter={(value) => formatInr(Number(value ?? 0))}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Value" fill={colors.gold} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartPanel>

          {data.subsidyClock ? (
            <SubsidyClockSection
              clock={data.subsidyClock}
              narrow={narrow}
              search={clockSearch}
              onSearch={setClockSearch}
              step={clockStep}
              onStep={setClockStep}
              flag={clockFlag}
              onFlag={setClockFlag}
              steps={clockSteps}
              flags={clockFlags}
              visibleJobs={visibleClockJobs}
              shown={filteredClockJobs.length}
              total={clockJobs.length}
              filterActive={clockFilterActive}
              onClear={() => {
                setClockSearch('')
                setClockStep([])
                setClockFlag([])
              }}
              sortKey={clockSortKey}
              sortOrder={clockSortOrder}
              onSort={onClockSort}
              headerAriaSort={clockHeaderAriaSort}
              onOpen={(id) => navigate(`/projects/${id}`)}
            />
          ) : null}

          <section className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="zenith-display text-base font-bold text-[color:var(--text-primary)]">Job list</h2>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Showing {filteredJobs.length} of {jobs.length} in-delivery jobs
                </p>
              </div>
              {filterActive ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent-gold)] print:hidden"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear filters
                </button>
              ) : null}
            </div>

            <div className="relative z-10 mb-3 print:hidden">
              <label className={narrow ? 'block' : 'block max-w-md'}>
                <span className="sr-only">Search jobs</span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search customer, #, ops, seller…"
                    className="min-h-[40px] w-full rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] py-2 pl-8 pr-3 text-sm"
                  />
                </span>
              </label>
              {narrow ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <MultiSelect
                    compact
                    variant="zenith"
                    placeholder="Stage"
                    options={stages.map((o) => ({ value: o, label: o }))}
                    selectedValues={stage}
                    onChange={setStage}
                  />
                  <MultiSelect
                    compact
                    variant="zenith"
                    placeholder="Ops"
                    options={opsNames.map((o) => ({ value: o, label: o }))}
                    selectedValues={opsFilter}
                    onChange={setOpsFilter}
                  />
                  <MultiSelect
                    compact
                    variant="zenith"
                    placeholder="Segment"
                    options={[
                      { value: 'SUBSIDY', label: 'Subsidy' },
                      { value: 'NON_SUBSIDY', label: 'Non-subsidy' },
                    ]}
                    selectedValues={segment}
                    onChange={setSegment}
                  />
                  <MultiSelect
                    compact
                    variant="zenith"
                    placeholder="Blocker"
                    options={blockerOptions}
                    selectedValues={blocker}
                    onChange={setBlocker}
                  />
                </div>
              ) : null}
            </div>

            {narrow ? (
              <ul className="space-y-2">
                {visibleJobs.map((j) => (
                  <li key={j.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/projects/${j.id}`)}
                      className="w-full rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] p-3 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[color:var(--accent-purple)]">
                            {j.slNo != null ? `#${j.slNo} · ` : ''}
                            {j.customerName}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
                            {j.stage} · {j.opsPersonName || 'Unassigned'}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-emerald-500">
                          {formatInrCompact(j.orderValue)}
                        </p>
                      </div>
                      <p className="mt-1.5 text-[11px] text-[color:var(--text-secondary)]">
                        {formatCloseDate(j.commissionDate)}
                        {j.pastDue && j.daysLate != null ? ` · +${j.daysLate}d` : ''}
                        {j.unscheduled ? ' · No date' : ''}
                        {j.blockerLabels[0] ? ` · ${j.blockerLabels[0]}` : ''}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-left text-sm">
                  <thead>
                    <tr className={TABLE_HEAD_ROW}>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('customer')}>
                        <DealListColHead
                          label="Customer"
                          sortKey="customer"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onJobSort}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('stage')}>
                        <DealListColHead
                          label="Stage"
                          sortKey="stage"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onJobSort}
                          filter={{
                            options: stages.map((o) => ({ value: o, label: o })),
                            selected: stage,
                            onChange: setStage,
                          }}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('ops')}>
                        <DealListColHead
                          label="Ops"
                          sortKey="ops"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onJobSort}
                          filter={{
                            options: opsNames.map((o) => ({ value: o, label: o })),
                            selected: opsFilter,
                            onChange: setOpsFilter,
                          }}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('seller')}>
                        <DealListColHead
                          label="Seller"
                          sortKey="seller"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onJobSort}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('segment')}>
                        <DealListColHead
                          label="Segment"
                          sortKey="segment"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onJobSort}
                          filter={{
                            options: [
                              { value: 'SUBSIDY', label: 'Subsidy' },
                              { value: 'NON_SUBSIDY', label: 'Non-subsidy' },
                            ],
                            selected: segment,
                            onChange: setSegment,
                          }}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-right`} aria-sort={headerAriaSort('kw')}>
                        <DealListColHead
                          label="kW"
                          align="right"
                          sortKey="kw"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onJobSort}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('commissionDate')}>
                        <DealListColHead
                          label="Commission"
                          sortKey="commissionDate"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onJobSort}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-right`} aria-sort={headerAriaSort('daysLate')}>
                        <DealListColHead
                          label="Late"
                          align="right"
                          sortKey="daysLate"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onJobSort}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('blockers')}>
                        <DealListColHead
                          label="Blockers"
                          sortKey="blockers"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onJobSort}
                          filter={{
                            options: blockerOptions,
                            selected: blocker,
                            onChange: setBlocker,
                          }}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} text-right`} aria-sort={headerAriaSort('orderValue')}>
                        <DealListColHead
                          label="Order value"
                          align="right"
                          sortKey="orderValue"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onJobSort}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleJobs.map((j) => (
                      <JobRow key={j.id} job={j} onOpen={() => navigate(`/projects/${j.id}`)} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <ErrorModal
        open={pendingExport != null}
        onClose={() => {
          if (!exporting) setPendingExport(null)
        }}
        type="warning"
        surface="zenith"
        message={EXPORT_CONFIRM}
        actions={[
          {
            label: 'CANCEL',
            variant: 'ghost',
            onClick: () => {
              if (!exporting) setPendingExport(null)
            },
          },
          { label: exporting ? 'EXPORTING…' : 'YES', variant: 'primary', onClick: confirmExport },
        ]}
      />
    </div>,
  )
}

function Kpi({
  label,
  value,
  hint,
  warn,
}: {
  label: string
  value: string
  hint?: string
  warn?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-3.5 sm:p-4 ${
        warn
          ? 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)]'
          : 'border-[color:var(--border-card)] bg-[color:var(--bg-card)]'
      }`}
    >
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-[color:var(--accent-gold)] sm:text-xs">
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold tabular-nums text-[color:var(--text-primary)] sm:text-2xl">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">{hint}</p> : null}
    </div>
  )
}

function MetricCard({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="zenith-display text-base font-bold text-[color:var(--text-primary)]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function MetricTable({
  columns,
  rows,
  compact,
  columnHints,
}: {
  columns: string[]
  rows: { key: string; label: string; cells: number[] }[]
  compact: boolean
  columnHints?: string[]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr className={TABLE_HEAD_ROW}>
            <th className={`${TABLE_HEAD_TH} pr-2 text-left`}>Metric</th>
            {columns.map((c, i) => (
              <th key={c} title={columnHints?.[i]} className={`${TABLE_HEAD_TH} pl-2 text-right`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-[color:var(--border-default)] last:border-0">
              <th className="py-2.5 pr-2 text-left text-sm font-bold text-[color:var(--text-primary)]">
                {row.label}
              </th>
              {row.cells.map((cell, i) => (
                <td
                  key={`${row.key}-${i}`}
                  className={`py-2 pl-2 text-right tabular-nums text-xs font-semibold sm:text-sm ${
                    row.key === 'overdue' && cell > 0
                      ? 'text-[color:var(--accent-gold)]'
                      : 'text-[color:var(--text-primary)]'
                  }`}
                >
                  {row.key === 'value'
                    ? compact
                      ? formatInrCompact(cell)
                      : formatInr(cell)
                    : row.key === 'capacityKw'
                      ? formatKw(cell)
                      : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MonthTable({
  columns,
  metrics,
  compact,
}: {
  columns: Array<{ key: string; label: string; parent: string }>
  metrics: Map<string, { jobs: number; kw: number; value: number }>
  compact: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className={TABLE_HEAD_ROW}>
            <th className={`${TABLE_HEAD_TH} pr-2 text-left`}>Metric</th>
            {columns.map((c) => (
              <th key={c.key} className={`${TABLE_HEAD_TH} pl-2 text-right`}>
                <span className="block text-[10px] font-bold uppercase tracking-wide text-[color:var(--accent-gold)] opacity-80">
                  {c.parent}
                </span>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(['jobs', 'kw', 'value'] as const).map((key) => (
            <tr key={key} className="border-b border-[color:var(--border-default)]">
              <th className="py-2.5 pr-2 text-left text-sm font-bold text-[color:var(--text-primary)]">
                {key === 'jobs' ? 'Jobs' : key === 'kw' ? 'Capacity (kW)' : 'Order value'}
              </th>
              {columns.map((c) => {
                const cell = metrics.get(c.key)?.[key] ?? 0
                return (
                  <td key={`${key}-${c.key}`} className="py-2 pl-2 text-right tabular-nums text-xs font-semibold">
                    {key === 'value'
                      ? compact
                        ? formatInrCompact(cell)
                        : formatInr(cell)
                      : key === 'kw'
                        ? formatKw(cell)
                        : String(cell)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SubsidyClockSection({
  clock,
  narrow,
  search,
  onSearch,
  step,
  onStep,
  flag,
  onFlag,
  steps,
  flags,
  visibleJobs,
  shown,
  total,
  filterActive,
  onClear,
  sortKey,
  sortOrder,
  onSort,
  headerAriaSort,
  onOpen,
}: {
  clock: DeliveryControlPayload['subsidyClock']
  narrow: boolean
  search: string
  onSearch: (v: string) => void
  step: string[]
  onStep: (v: string[]) => void
  flag: string[]
  onFlag: (v: string[]) => void
  steps: string[]
  flags: string[]
  visibleJobs: SubsidyClockJob[]
  shown: number
  total: number
  filterActive: boolean
  onClear: () => void
  sortKey: ClockSortKey
  sortOrder: 'asc' | 'desc'
  onSort: (key: string, order: 'asc' | 'desc') => void
  headerAriaSort: (key: ClockSortKey) => 'ascending' | 'descending' | 'none'
  onOpen: (id: string) => void
}) {
  const k = clock.kpis
  const colors = useChartColors()
  const jobsRow = clock.rows.find((r) => r.key === 'jobs')
  const chartData = clock.columns.map((col, i) => ({
    name: col.label.replace('KSEB ', '').replace(' not filed', ''),
    Jobs: jobsRow?.values[i] ?? 0,
  }))

  return (
    <section className="space-y-3">
      <div>
        <h2 className="zenith-display text-base font-bold text-[color:var(--text-primary)] sm:text-lg">
          Subsidy clock
        </h2>
        <p className="mt-0.5 text-xs text-[color:var(--text-muted)] sm:text-sm">
          Confirmed subsidy jobs until credit lands. Completed-not-credited stay on this clock; they
          are off the factory board.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        <Kpi
          label="On clock"
          value={formatInrCompact(k.onClockValue)}
          hint={`${k.onClockJobs} jobs · ${formatKw(k.onClockKw)}`}
        />
        <Kpi
          label="Awaiting credit"
          value={String(k.awaitingCreditJobs)}
          hint={formatInrCompact(k.awaitingCreditValue)}
          warn={k.awaitingCreditJobs > 0}
        />
        <Kpi
          label="Completed, not credited"
          value={String(k.completedNotCreditedJobs)}
          warn={k.completedNotCreditedJobs > 0}
        />
        <Kpi label="90+ days in step" value={String(k.stale90Jobs)} warn={k.stale90Jobs > 0} />
        <Kpi label="Exceptions" value={String(k.exceptionJobs)} warn={k.exceptionJobs > 0} />
      </div>

      {(k.stale90Jobs > 0 || k.completedNotCreditedJobs > 0 || k.exceptionJobs > 0) && (
        <div className="flex items-start gap-2 rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-3 py-2 text-xs text-[color:var(--text-primary)] sm:text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent-gold)]" aria-hidden />
          <p>
            {k.completedNotCreditedJobs > 0
              ? `${k.completedNotCreditedJobs} completed on site, subsidy not credited. `
              : ''}
            {k.stale90Jobs > 0 ? `${k.stale90Jobs} sitting 90+ days in the current step. ` : ''}
            {k.exceptionJobs > 0 ? `${k.exceptionJobs} with date or filing exceptions.` : ''}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MetricCard title="Subsidy funnel">
          <SubsidyFunnelTable clock={clock} compact={narrow} />
        </MetricCard>
        <ChartPanel
          title="Jobs by step"
          subtitle="Where subsidy-eligible work is waiting"
          className="print:break-inside-avoid"
        >
          <div className="h-[220px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: colors.axisText, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={narrow ? -25 : 0}
                  textAnchor={narrow ? 'end' : 'middle'}
                  height={narrow ? 48 : 28}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: colors.axisText, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip contentStyle={ZENITH_CHART_CUSTOM_TOOLTIP_SHELL} />
                <Bar dataKey="Jobs" fill={colors.gold} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="zenith-display text-base font-bold text-[color:var(--text-primary)]">
              Subsidy jobs
            </h3>
            <p className="text-xs text-[color:var(--text-muted)]">
              Showing {shown} of {total} on the clock
            </p>
          </div>
          {filterActive ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent-gold)] print:hidden"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          ) : null}
        </div>

        <div className="relative z-10 mb-3 print:hidden">
          <label className={narrow ? 'block' : 'block max-w-md'}>
            <span className="sr-only">Search subsidy jobs</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <input
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search customer, #, ops, seller…"
                className="min-h-[40px] w-full rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] py-2 pl-8 pr-3 text-sm"
              />
            </span>
          </label>
          {narrow ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <MultiSelect
                compact
                variant="zenith"
                placeholder="Step"
                options={steps.map((o) => ({ value: o, label: o }))}
                selectedValues={step}
                onChange={onStep}
              />
              <MultiSelect
                compact
                variant="zenith"
                placeholder="Exception"
                options={flags.map((o) => ({ value: o, label: o }))}
                selectedValues={flag}
                onChange={onFlag}
              />
            </div>
          ) : null}
        </div>

        {total === 0 ? (
          <p className="py-6 text-center text-sm text-[color:var(--text-muted)]">
            No subsidy jobs waiting on KSEB, MNRE, or credit.
          </p>
        ) : narrow ? (
          <ul className="space-y-2">
            {visibleJobs.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => onOpen(j.id)}
                  className="w-full rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] p-3 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[color:var(--accent-purple)]">
                        {j.slNo != null ? `#${j.slNo} · ` : ''}
                        {j.customerName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
                        {j.stepLabel} · {j.opsPersonName || 'Unassigned'}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-emerald-500">
                      {formatInrCompact(j.orderValue)}
                    </p>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[color:var(--text-secondary)]">
                    {j.daysInStep != null ? `${j.daysInStep}d in step` : 'No date'}
                    {j.exceptionLabels[0] ? ` · ${j.exceptionLabels[0]}` : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('customer')}>
                    <DealListColHead
                      label="Customer"
                      sortKey="customer"
                      activeSortKey={sortKey}
                      sortOrder={sortOrder}
                      onSort={onSort}
                    />
                  </th>
                  <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('step')}>
                    <DealListColHead
                      label="Step"
                      sortKey="step"
                      activeSortKey={sortKey}
                      sortOrder={sortOrder}
                      onSort={onSort}
                      filter={{
                        options: steps.map((o) => ({ value: o, label: o })),
                        selected: step,
                        onChange: onStep,
                      }}
                    />
                  </th>
                  <th className={`${TABLE_HEAD_TH} pr-3 text-right`} aria-sort={headerAriaSort('days')}>
                    <DealListColHead
                      label="Days"
                      sortKey="days"
                      activeSortKey={sortKey}
                      sortOrder={sortOrder}
                      onSort={onSort}
                      align="right"
                    />
                  </th>
                  <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('ops')}>
                    <DealListColHead
                      label="Ops"
                      sortKey="ops"
                      activeSortKey={sortKey}
                      sortOrder={sortOrder}
                      onSort={onSort}
                    />
                  </th>
                  <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('exception')}>
                    <DealListColHead
                      label="Exception"
                      sortKey="exception"
                      activeSortKey={sortKey}
                      sortOrder={sortOrder}
                      onSort={onSort}
                      filter={
                        flags.length
                          ? {
                              options: flags.map((o) => ({ value: o, label: o })),
                              selected: flag,
                              onChange: onFlag,
                            }
                          : undefined
                      }
                    />
                  </th>
                  <th className={`${TABLE_HEAD_TH} text-right`} aria-sort={headerAriaSort('value')}>
                    <DealListColHead
                      label="Value"
                      sortKey="value"
                      activeSortKey={sortKey}
                      sortOrder={sortOrder}
                      onSort={onSort}
                      align="right"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleJobs.map((j) => (
                  <tr
                    key={j.id}
                    className="cursor-pointer border-b border-[color:var(--border-default)] last:border-0 hover:bg-[color:var(--bg-surface)]"
                    onClick={() => onOpen(j.id)}
                  >
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold text-[color:var(--accent-purple)]">
                        {j.slNo != null ? `#${j.slNo} · ` : ''}
                        {j.customerName}
                      </p>
                      <p className="text-[11px] text-[color:var(--text-muted)]">{j.stage}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-[color:var(--text-secondary)]">{j.stepLabel}</td>
                    <td
                      className={`py-2.5 pr-3 text-right tabular-nums ${
                        (j.daysInStep ?? 0) >= 90
                          ? 'font-semibold text-[color:var(--accent-gold)]'
                          : 'text-[color:var(--text-secondary)]'
                      }`}
                    >
                      {j.daysInStep == null ? '—' : `${j.daysInStep}d`}
                    </td>
                    <td className="py-2.5 pr-3">{j.opsPersonName || 'Unassigned'}</td>
                    <td className="py-2.5 pr-3 text-[11px] text-[color:var(--text-secondary)]">
                      {j.exceptionLabels[0] || '—'}
                      {j.exceptionLabels.length > 1 ? ` +${j.exceptionLabels.length - 1}` : ''}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-emerald-500">
                      {formatInr(j.orderValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function SubsidyFunnelTable({
  clock,
  compact,
}: {
  clock: DeliveryControlPayload['subsidyClock']
  compact: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-sm">
        <thead>
          <tr className={TABLE_HEAD_ROW}>
            <th className={`${TABLE_HEAD_TH} pr-2 text-left`}>Metric</th>
            {clock.columns.map((c) => (
              <th key={c.key} className={`${TABLE_HEAD_TH} pl-2 text-right`}>
                {c.label}
              </th>
            ))}
            <th className={`${TABLE_HEAD_TH} pl-2 text-right`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {clock.rows.map((row) => (
            <tr key={row.key} className="border-b border-[color:var(--border-default)] last:border-0">
              <th className="py-2.5 pr-2 text-left text-sm font-bold text-[color:var(--text-primary)]">
                {row.label}
              </th>
              {[...row.values, row.total].map((cell, i) => (
                <td
                  key={`${row.key}-${i}`}
                  className={`py-2 pl-2 text-right tabular-nums text-xs font-semibold sm:text-sm ${
                    row.key === 'medianDays' && cell >= 90
                      ? 'text-[color:var(--accent-gold)]'
                      : 'text-[color:var(--text-primary)]'
                  }`}
                >
                  {row.key === 'value'
                    ? compact
                      ? formatInrCompact(cell)
                      : formatInr(cell)
                    : row.key === 'capacityKw'
                      ? formatKw(cell)
                      : row.key === 'medianDays'
                        ? `${cell}d`
                        : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function JobRow({ job: j, onOpen }: { job: DeliveryJob; onOpen: () => void }) {
  return (
    <tr
      className="cursor-pointer border-b border-[color:var(--border-default)] last:border-0 hover:bg-[color:var(--bg-surface)]"
      onClick={onOpen}
    >
      <td className="py-2.5 pr-3">
        <p className="font-semibold text-[color:var(--accent-purple)]">
          {j.slNo != null ? `#${j.slNo} · ` : ''}
          {j.customerName}
        </p>
        {j.salespersonName ? (
          <p className="text-[11px] text-[color:var(--text-muted)] sm:hidden">{j.salespersonName}</p>
        ) : null}
      </td>
      <td className="py-2.5 pr-3 text-[color:var(--text-secondary)]">{j.stage}</td>
      <td className="py-2.5 pr-3">{j.opsPersonName || 'Unassigned'}</td>
      <td className="py-2.5 pr-3 text-[color:var(--text-secondary)]">{j.salespersonName || '—'}</td>
      <td className="py-2.5 pr-3">{j.segmentLabel}</td>
      <td className="py-2.5 pr-3 text-right tabular-nums">{formatKw(j.capacityKw)}</td>
      <td className={`py-2.5 pr-3 ${j.pastDue ? 'font-semibold text-[color:var(--accent-gold)]' : ''}`}>
        {formatCloseDate(j.commissionDate)}
      </td>
      <td
        className={`py-2.5 pr-3 text-right tabular-nums ${
          j.pastDue ? 'font-semibold text-[color:var(--accent-gold)]' : 'text-[color:var(--text-secondary)]'
        }`}
      >
        {j.daysLate == null ? '—' : j.pastDue ? `+${j.daysLate}d` : `${j.daysLate}d`}
      </td>
      <td className="py-2.5 pr-3 text-[11px] text-[color:var(--text-secondary)]">
        {j.blockerLabels.length ? j.blockerLabels.slice(0, 2).join(' · ') : '—'}
        {j.blockerLabels.length > 2 ? ` +${j.blockerLabels.length - 2}` : ''}
      </td>
      <td className="py-2.5 text-right font-semibold text-emerald-500">{formatInr(j.orderValue)}</td>
    </tr>
  )
}
