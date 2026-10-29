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
import SalesReviewHowToRead from '../components/reports/SalesReviewHowToRead'
import type {
  SalesReviewDeal,
  SalesReviewForecastCol,
  SalesReviewPayload,
} from '../types/salesReview'
import {
  formatCloseDate,
  formatInr,
  formatInrCompact,
  formatKw,
  formatPct,
  yoyToneClass,
} from '../utils/salesReviewFormat'

const REPORTS_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.SALES]
const NARROW_MQ = '(max-width: 743px)'
const TABLE_HEAD_ROW =
  'border-b border-[color:var(--border-default)] bg-[color:var(--zenith-table-header-bg)]'
const TABLE_HEAD_TH =
  'py-2.5 text-xs font-extrabold uppercase tracking-wide text-[color:var(--accent-gold)] sm:text-sm'
const EXPORT_CONFIRM =
  'The Data that is present in the CRM System is the exclusive property of Rayenna Energy Private Limited. Unauthorised Export of any data is prohibited and will be subject to disciplinary measures including and not limited to termination and legal procedures.\n\nBy exporting this data, you are confirming that you are authorised to access this data/info and have written approvals from the management.\n\nDo you want to continue?'
type SalesReviewExportFormat = 'xlsx' | 'pdf' | 'pptx'

type SalesUser = { id: string; name: string }
type DealSortKey =
  | 'customer'
  | 'stage'
  | 'probability'
  | 'type'
  | 'system'
  | 'segment'
  | 'closeDate'
  | 'quarter'
  | 'fy'
  | 'loan'
  | 'orderValue'

function compareDealRows(
  a: SalesReviewDeal,
  b: SalesReviewDeal,
  key: DealSortKey,
  order: 'asc' | 'desc',
): number {
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
    case 'probability':
      return (a.probability - b.probability) * dir
    case 'orderValue':
      return (a.orderValue - b.orderValue) * dir
    case 'closeDate': {
      const vacant = emptyLast(!a.closeDate, !b.closeDate)
      if (vacant) return vacant
      return a.closeDate! < b.closeDate! ? -1 * dir : a.closeDate! > b.closeDate! ? dir : 0
    }
    case 'loan': {
      const rank = (v: boolean | null) => (v === true ? 2 : v === false ? 1 : 0)
      return (rank(a.bankLoan) - rank(b.bankLoan)) * dir
    }
    case 'customer':
      return byText(a.customerName, b.customerName)
    case 'stage':
      return byText(a.stage, b.stage)
    case 'type':
      return byText(a.customerTypeLabel, b.customerTypeLabel)
    case 'system':
      return byText(a.systemTypeLabel, b.systemTypeLabel)
    case 'segment':
      return byText(a.segmentLabel, b.segmentLabel)
    case 'quarter':
      return byText(a.quarter ?? '', b.quarter ?? '')
    case 'fy':
      return byText(a.fy ?? '', b.fy ?? '')
    default:
      return 0
  }
}

function isNarrowViewport(): boolean {
  return typeof window !== 'undefined' ? window.matchMedia(NARROW_MQ).matches : false
}

function moneyCell(n: number | null, compact: boolean): string {
  return compact ? formatInrCompact(n) : formatInr(n)
}

function formatCell(rowKey: string, n: number | null, compact: boolean): string {
  if (rowKey === 'yoy' || rowKey === 'qoq') return formatPct(n)
  if (rowKey === 'avgProfitability') return formatPct(n, false)
  if (rowKey === 'deals') return n == null ? '—' : String(n)
  if (rowKey === 'capacityKw') return formatKw(n)
  return moneyCell(n, compact)
}

function isPctRow(key: string): boolean {
  return key === 'yoy' || key === 'qoq' || key === 'avgProfitability'
}

export default function SalesReview() {
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()
  const canAccess = hasRole(REPORTS_ROLES)
  const isSales = user?.role === UserRole.SALES
  const colors = useChartColors()
  const [salespersonId, setSalespersonId] = useState('')
  const [expandQuarters, setExpandQuarters] = useState(false)
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState<string[]>([])
  const [customerType, setCustomerType] = useState<string[]>([])
  const [systemType, setSystemType] = useState<string[]>([])
  const [segment, setSegment] = useState<string[]>([])
  const [fy, setFy] = useState<string[]>([])
  const [quarter, setQuarter] = useState<string[]>([])
  const [loan, setLoan] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<DealSortKey>('closeDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [narrow, setNarrow] = useState(isNarrowViewport)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [pendingExport, setPendingExport] = useState<SalesReviewExportFormat | null>(null)
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

  const { data: salesUsers } = useQuery({
    queryKey: ['users', 'role', 'sales'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/users/role/sales')
      return res.data as SalesUser[]
    },
    enabled: canAccess && !isSales,
  })

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reports', 'sales-review', isSales ? user?.id : salespersonId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (!isSales && salespersonId) params.set('salespersonId', salespersonId)
      const qs = params.toString()
      const res = await axiosInstance.get(`/api/reports/sales-review${qs ? `?${qs}` : ''}`)
      return res.data as SalesReviewPayload
    },
    enabled: canAccess,
  })

  const deals = data?.deals ?? []
  const stages = useMemo(() => [...new Set(deals.map((d) => d.stage))].sort(), [deals])
  const customerTypes = useMemo(
    () => [...new Set(deals.map((d) => d.customerTypeLabel).filter((v) => v && v !== '—'))].sort(),
    [deals],
  )
  const systemTypes = useMemo(
    () => [...new Set(deals.map((d) => d.systemTypeLabel).filter((v) => v && v !== '—'))].sort(),
    [deals],
  )
  const fys = useMemo(
    () => [...new Set(deals.map((d) => d.fy).filter(Boolean) as string[])].sort(),
    [deals],
  )
  const quarters = useMemo(
    () => [...new Set(deals.map((d) => d.quarter).filter(Boolean) as string[])].sort(),
    [deals],
  )

  const filteredDeals = useMemo(() => {
    const q = search.trim().toLowerCase()
    return deals.filter((d) => {
      if (stage.length && !stage.includes(d.stage)) return false
      if (customerType.length && !customerType.includes(d.customerTypeLabel)) return false
      if (systemType.length && !systemType.includes(d.systemTypeLabel)) return false
      if (segment.length && !segment.includes(d.segment ?? '')) return false
      if (fy.length && !fy.includes(d.fy ?? '')) return false
      if (quarter.length && !quarter.includes(d.quarter ?? '')) return false
      if (loan.length) {
        const wantY = loan.includes('Y')
        const wantN = loan.includes('N')
        if (d.bankLoan === true && !wantY) return false
        if (d.bankLoan === false && !wantN) return false
        if (d.bankLoan !== true && d.bankLoan !== false) return false
      }
      if (q) {
        const hay = `${d.customerName} ${d.slNo ?? ''} ${d.salespersonName ?? ''} ${d.stage}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [deals, stage, customerType, systemType, segment, fy, quarter, loan, search])

  const visibleDeals = useMemo(() => {
    const rows = [...filteredDeals]
    rows.sort((a, b) => compareDealRows(a, b, sortKey, sortOrder))
    return rows
  }, [filteredDeals, sortKey, sortOrder])

  const headerAriaSort = (key: DealSortKey): 'ascending' | 'descending' | 'none' => {
    if (sortKey !== key) return 'none'
    return sortOrder === 'asc' ? 'ascending' : 'descending'
  }

  const onDealSort = (key: string, order: 'asc' | 'desc') => {
    setSortKey(key as DealSortKey)
    setSortOrder(order)
  }

  const monthCols = useMemo(() => {
    if (!data || !expandQuarters) return []
    return data.forecast.columns.flatMap((col) =>
      col.months.map((m) => ({ ...m, parent: col.shortLabel, fy: col.fy })),
    )
  }, [data, expandQuarters])

  const monthMetrics = useMemo(() => {
    if (!expandQuarters || !data) return null
    const acc = new Map<string, { pipeline: number; weighted: number }>()
    for (const m of monthCols) acc.set(m.key, { pipeline: 0, weighted: 0 })
    for (const d of data.deals) {
      if (!d.closeDate) continue
      const mk = d.closeDate.slice(0, 7)
      const row = acc.get(mk)
      if (!row) continue
      row.pipeline += d.orderValue
      row.weighted += d.weightedValue
    }
    return acc
  }, [data, expandQuarters, monthCols])

  const chartData = useMemo(() => {
    if (!data) return []
    const pipe = data.forecast.rows.find((r) => r.key === 'pipeline')
    const w = data.forecast.rows.find((r) => r.key === 'weighted')
    const ly = data.forecast.rows.find((r) => r.key === 'lastYear')
    return data.forecast.columns.map((col, i) => ({
      name: col.shortLabel,
      Pipeline: pipe?.values[i] ?? 0,
      Weighted: w?.values[i] ?? 0,
      'Last year': ly?.values[i] ?? 0,
    }))
  }, [data])

  const filterActive =
    Boolean(
      search ||
        stage.length ||
        customerType.length ||
        systemType.length ||
        segment.length ||
        fy.length ||
        quarter.length ||
        loan.length,
    )

  const clearFilters = () => {
    setSearch('')
    setStage([])
    setCustomerType([])
    setSystemType([])
    setSegment([])
    setFy([])
    setQuarter([])
    setLoan([])
  }

  const requestExport = (format: SalesReviewExportFormat) => {
    setExportMenuOpen(false)
    setPendingExport(format)
  }

  const cancelExport = () => {
    if (exporting) return
    setPendingExport(null)
  }

  const confirmExport = async () => {
    if (!pendingExport || exporting) return
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (!isSales && salespersonId) params.set('salespersonId', salespersonId)
      const qs = params.toString()
      const res = await axiosInstance.get(
        `/api/reports/sales-review/export/${pendingExport}${qs ? `?${qs}` : ''}`,
        { responseType: 'blob' },
      )
      const header = String(res.headers['content-disposition'] || '')
      const fromHeader = header.match(/filename="?([^"]+)"?/)?.[1]
      const filename = fromHeader || `sales-review.${pendingExport}`
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      const label = pendingExport === 'xlsx' ? 'Excel' : pendingExport === 'pdf' ? 'PDF' : 'PowerPoint'
      toast.success(`Sales Review exported to ${label}`)
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
        Sales Review is available to Admin, Management, and Sales.
      </div>,
    )
  }

  if (isError) {
    return shell(
      <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] p-5">
        <p className="font-medium">Unable to load Sales Review.</p>
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
              Sales Review
            </h1>
            <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">
              Weekly pack — achievement, four-quarter forecast, and open deals
              {data ? ` · FY${data.currentFy}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {!isSales ? (
            <label className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
              <span className="sr-only">Salesperson</span>
              <select
                value={salespersonId}
                onChange={(e) => setSalespersonId(e.target.value)}
                className="min-h-[40px] w-full rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 text-sm text-[color:var(--text-primary)] sm:w-56"
              >
                <option value="">All sellers</option>
                {(salesUsers ?? []).map((u) => (
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

      <SalesReviewHowToRead />

      {isLoading || !data || !k ? (
        <div className="flex min-h-[280px] items-center justify-center text-sm text-[color:var(--text-muted)]">
          Loading Sales Review…
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
            <Kpi label="YTD revenue" value={formatInrCompact(k.closedYtdRevenue)} hint={`${k.closedYtdDeals} deals`} />
            <Kpi label="YTD profit" value={formatInrCompact(k.closedYtdProfit)} />
            <Kpi label="YTD capacity" value={formatKw(k.closedYtdKw)} />
            <Kpi label="Open pipeline" value={formatInrCompact(k.openPipeline)} hint={`${k.openDeals} deals`} />
            <Kpi label="Weighted forecast" value={formatInrCompact(k.openWeighted)} />
            <Kpi
              label="Call flags"
              value={`${k.pastDueDeals} overdue`}
              hint={`${k.unscheduledDeals} no date · ${k.lostYtdDeals} lost YTD`}
              warn={k.pastDueDeals > 0}
            />
          </section>

          {(k.pastDueDeals > 0 || k.unscheduledDeals > 0) && (
            <div className="flex items-start gap-2 rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-3 py-2 text-xs text-[color:var(--text-primary)] sm:text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent-gold)]" aria-hidden />
              <p>
                {k.pastDueDeals > 0 ? `${k.pastDueDeals} deal${k.pastDueDeals === 1 ? '' : 's'} past expected commissioning. ` : ''}
                {k.unscheduledDeals > 0
                  ? `${k.unscheduledDeals} with no close date — set expected commissioning before the call.`
                  : ''}
              </p>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <MetricCard title="Achievement">
              <MetricTable
                columns={data.achievement.columns.map((c) => c.label)}
                rows={data.achievement.rows.map((row) => ({
                  key: row.key,
                  label: row.label,
                  cells: row.values,
                }))}
                compact={narrow}
              />
            </MetricCard>

            <MetricCard
              title="Forecast"
              action={
                <button
                  type="button"
                  onClick={() => setExpandQuarters((v) => !v)}
                  className="rounded-lg border border-[color:var(--border-default)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--text-secondary)] print:hidden"
                >
                  {expandQuarters ? 'Collapse months' : 'Expand quarters'}
                </button>
              }
            >
              {expandQuarters && monthMetrics ? (
                <MonthTable columns={monthCols} metrics={monthMetrics} compact={narrow} />
              ) : (
                <MetricTable
                  columns={[...data.forecast.columns.map((c) => c.shortLabel), 'Total']}
                  rows={data.forecast.rows.map((row) => ({
                    key: row.key,
                    label: row.label,
                    cells: [...row.values, row.total],
                  }))}
                  compact={narrow}
                  columnHints={data.forecast.columns.map((c) => c.label)}
                />
              )}
              <p className="mt-2 text-[11px] text-[color:var(--text-muted)]">
                Unscheduled {formatInrCompact(data.forecast.unscheduledPipeline)} pipeline (
                {formatInrCompact(data.forecast.unscheduledWeighted)} weighted)
                {data.forecast.laterPipeline > 0
                  ? ` · Beyond NQ+2 ${formatInrCompact(data.forecast.laterPipeline)}`
                  : ''}
              </p>
            </MetricCard>
          </section>

          <ChartPanel
            title="Forecast vs last year"
            subtitle="Open pipeline and weighted forecast against closed revenue in the same quarter last year"
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
                  <Bar dataKey="Pipeline" fill={colors.blue} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Weighted" fill={colors.gold} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Last year" fill={colors.teal} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartPanel>

          <section className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="zenith-display text-base font-bold text-[color:var(--text-primary)]">Deal list</h2>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Showing {filteredDeals.length} of {deals.length} open deals
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
                <span className="sr-only">Search deals</span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search customer, #, seller…"
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
                    placeholder="Customer type"
                    options={customerTypes.map((o) => ({ value: o, label: o }))}
                    selectedValues={customerType}
                    onChange={setCustomerType}
                  />
                  <MultiSelect
                    compact
                    variant="zenith"
                    placeholder="System type"
                    options={systemTypes.map((o) => ({ value: o, label: o }))}
                    selectedValues={systemType}
                    onChange={setSystemType}
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
                    placeholder="FY"
                    options={fys.map((o) => ({ value: o, label: o }))}
                    selectedValues={fy}
                    onChange={setFy}
                  />
                  <MultiSelect
                    compact
                    variant="zenith"
                    placeholder="Quarter"
                    options={quarters.map((o) => ({ value: o, label: o }))}
                    selectedValues={quarter}
                    onChange={setQuarter}
                  />
                  <MultiSelect
                    compact
                    variant="zenith"
                    placeholder="Bank loan"
                    options={[
                      { value: 'Y', label: 'Loan Y' },
                      { value: 'N', label: 'Loan N' },
                    ]}
                    selectedValues={loan}
                    onChange={setLoan}
                  />
                </div>
              ) : null}
            </div>

            {narrow ? (
              <ul className="space-y-2">
                {visibleDeals.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/projects/${d.id}`)}
                      className="w-full rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] p-3 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[color:var(--accent-purple)]">
                            {d.slNo != null ? `#${d.slNo} · ` : ''}
                            {d.customerName}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
                            {d.stage} · {d.probability}% · {d.customerTypeLabel}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-emerald-500">{formatInrCompact(d.orderValue)}</p>
                      </div>
                      <p className="mt-1.5 text-[11px] text-[color:var(--text-secondary)]">
                        Close {formatCloseDate(d.closeDate)}
                        {d.pastDue ? ' · Overdue' : ''}
                        {d.unscheduled ? ' · No date' : ''}
                        {d.bankLoan ? ' · Loan' : ''}
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
                          onSort={onDealSort}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('stage')}>
                        <DealListColHead
                          label="Stage"
                          sortKey="stage"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onDealSort}
                          filter={{
                            options: stages.map((o) => ({ value: o, label: o })),
                            selected: stage,
                            onChange: setStage,
                          }}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('probability')}>
                        <DealListColHead
                          label="Prob."
                          sortKey="probability"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onDealSort}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('type')}>
                        <DealListColHead
                          label="Type"
                          sortKey="type"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onDealSort}
                          filter={{
                            options: customerTypes.map((o) => ({ value: o, label: o })),
                            selected: customerType,
                            onChange: setCustomerType,
                          }}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('system')}>
                        <DealListColHead
                          label="System"
                          sortKey="system"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onDealSort}
                          filter={{
                            options: systemTypes.map((o) => ({ value: o, label: o })),
                            selected: systemType,
                            onChange: setSystemType,
                          }}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('segment')}>
                        <DealListColHead
                          label="Segment"
                          sortKey="segment"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onDealSort}
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
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('closeDate')}>
                        <DealListColHead
                          label="Close date"
                          sortKey="closeDate"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onDealSort}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('quarter')}>
                        <DealListColHead
                          label="Qtr"
                          sortKey="quarter"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onDealSort}
                          filter={{
                            options: quarters.map((o) => ({ value: o, label: o })),
                            selected: quarter,
                            onChange: setQuarter,
                          }}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('fy')}>
                        <DealListColHead
                          label="FY"
                          sortKey="fy"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onDealSort}
                          filter={{
                            options: fys.map((o) => ({ value: o, label: o })),
                            selected: fy,
                            onChange: setFy,
                          }}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('loan')}>
                        <DealListColHead
                          label="Loan"
                          sortKey="loan"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onDealSort}
                          filter={{
                            options: [
                              { value: 'Y', label: 'Loan Y' },
                              { value: 'N', label: 'Loan N' },
                            ],
                            selected: loan,
                            onChange: setLoan,
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
                          onSort={onDealSort}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDeals.map((d) => (
                      <DealRow key={d.id} deal={d} onOpen={() => navigate(`/projects/${d.id}`)} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {filteredDeals.length === 0 ? (
              <p className="py-8 text-center text-sm text-[color:var(--text-muted)]">No open deals match these filters.</p>
            ) : null}
          </section>
        </>
      )}
      <ErrorModal
        open={pendingExport != null}
        onClose={cancelExport}
        type="warning"
        surface="zenith"
        message={EXPORT_CONFIRM}
        actions={[
          { label: 'CANCEL', variant: 'ghost', onClick: cancelExport },
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
    <div className="rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] px-4 py-3.5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:py-4">
      <p className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--accent-gold)] sm:text-sm">
        {label}
      </p>
      <p
        className={`zenith-kpi-value mt-1.5 text-xl font-bold tabular-nums leading-tight sm:text-2xl ${
          warn ? 'text-[color:var(--accent-gold)]' : 'text-[color:var(--text-primary)]'
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[color:var(--text-secondary)]">{hint}</p> : null}
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
    <div className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-4 print:break-inside-avoid">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="zenith-display text-base font-bold text-[color:var(--text-primary)]">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function MetricTable({
  columns,
  rows,
  compact,
  columnHints,
}: {
  columns: string[]
  rows: { key: string; label: string; cells: (number | null)[] }[]
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
                    isPctRow(row.key) ? yoyToneClass(cell) : 'text-[color:var(--text-primary)]'
                  }`}
                >
                  {formatCell(row.key, cell, compact)}
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
  columns: Array<SalesReviewForecastCol['months'][number] & { parent: string; fy: string }>
  metrics: Map<string, { pipeline: number; weighted: number }>
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
          {(['pipeline', 'weighted'] as const).map((key) => (
            <tr key={key} className="border-b border-[color:var(--border-default)]">
              <th className="py-2.5 pr-2 text-left text-sm font-bold text-[color:var(--text-primary)]">
                {key === 'pipeline' ? 'Pipeline' : 'Forecast (weighted)'}
              </th>
              {columns.map((c) => (
                <td key={`${key}-${c.key}`} className="py-2 pl-2 text-right tabular-nums text-xs font-semibold">
                  {moneyCell(metrics.get(c.key)?.[key] ?? 0, compact)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DealRow({ deal: d, onOpen }: { deal: SalesReviewDeal; onOpen: () => void }) {
  return (
    <tr
      className="cursor-pointer border-b border-[color:var(--border-default)] last:border-0 hover:bg-[color:var(--bg-surface)]"
      onClick={onOpen}
    >
      <td className="py-2.5 pr-3">
        <p className="font-semibold text-[color:var(--accent-purple)]">
          {d.slNo != null ? `#${d.slNo} · ` : ''}
          {d.customerName}
        </p>
        {d.salespersonName ? (
          <p className="text-[11px] text-[color:var(--text-muted)]">{d.salespersonName}</p>
        ) : null}
      </td>
      <td className="py-2.5 pr-3 text-[color:var(--text-secondary)]">{d.stage}</td>
      <td className="py-2.5 pr-3 tabular-nums">{d.probability}%</td>
      <td className="py-2.5 pr-3">{d.customerTypeLabel}</td>
      <td className="py-2.5 pr-3">{d.systemTypeLabel}</td>
      <td className="py-2.5 pr-3">{d.segmentLabel}</td>
      <td className={`py-2.5 pr-3 ${d.pastDue ? 'font-semibold text-[color:var(--accent-gold)]' : ''}`}>
        {formatCloseDate(d.closeDate)}
      </td>
      <td className="py-2.5 pr-3">{d.quarter ?? '—'}</td>
      <td className="py-2.5 pr-3">{d.fy ?? '—'}</td>
      <td className="py-2.5 pr-3">{d.bankLoan ? 'Y' : d.bankLoan === false ? 'N' : '—'}</td>
      <td className="py-2.5 text-right font-semibold text-emerald-500">{formatInr(d.orderValue)}</td>
    </tr>
  )
}
