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
import FunnelVelocityHowToRead from '../components/reports/FunnelVelocityHowToRead'
import type { FunnelDeal, FunnelVelocityPayload } from '../types/funnelVelocity'
import { formatInr, formatInrCompact, formatPct } from '../utils/salesReviewFormat'

const ACCESS_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.SALES]
const NARROW_MQ = '(max-width: 743px)'
const TABLE_HEAD_ROW =
  'border-b border-[color:var(--border-default)] bg-[color:var(--zenith-table-header-bg)]'
const TABLE_HEAD_TH =
  'py-2.5 text-xs font-extrabold uppercase tracking-wide text-[color:var(--accent-gold)] sm:text-sm'
const EXPORT_CONFIRM =
  'The Data that is present in the CRM System is the exclusive property of Rayenna Energy Private Limited. Unauthorised Export of any data is prohibited and will be subject to disciplinary measures including and not limited to termination and legal procedures.\n\nBy exporting this data, you are confirming that you are authorised to access this data/info and have written approvals from the management.\n\nDo you want to continue?'
type ExportFormat = 'xlsx' | 'pdf' | 'pptx'

type SalesUser = { id: string; name: string }
type RowSortKey =
  | 'customer'
  | 'stage'
  | 'seller'
  | 'days'
  | 'sla'
  | 'aging'
  | 'probability'
  | 'value'
  | 'flags'

function compareRows(a: FunnelDeal, b: FunnelDeal, key: RowSortKey, order: 'asc' | 'desc'): number {
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
    case 'days': {
      const vacant = emptyLast(a.daysInStage == null, b.daysInStage == null)
      if (vacant) return vacant
      return ((a.daysInStage || 0) - (b.daysInStage || 0)) * dir
    }
    case 'probability':
      return (a.probability - b.probability) * dir
    case 'value':
      return (a.orderValue - b.orderValue) * dir
    case 'customer':
      return byText(a.customerName, b.customerName)
    case 'stage':
      return byText(a.stage, b.stage)
    case 'seller':
      return byText(a.salespersonName || '', b.salespersonName || '')
    case 'sla':
      return byText(a.slaLabel, b.slaLabel)
    case 'aging':
      return byText(a.agingLabel, b.agingLabel)
    case 'flags':
      return (a.flags.length - b.flags.length) * dir
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

function slaTone(band: FunnelDeal['slaBand']): string {
  if (band === 'RED') return 'text-[color:var(--accent-red)]'
  if (band === 'AMBER') return 'text-[color:var(--accent-gold)]'
  if (band === 'GREEN') return 'text-emerald-500'
  return 'text-[color:var(--text-muted)]'
}

function formatDays(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n}d`
}

function funnelCell(rowKey: string, n: number | null, compact: boolean): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (rowKey === 'pipeline') return compact ? formatInrCompact(n) : formatInr(n)
  return String(n)
}

export default function FunnelVelocity() {
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()
  const canAccess = hasRole(ACCESS_ROLES)
  const isSales = user?.role === UserRole.SALES
  const colors = useChartColors()
  const [salespersonId, setSalespersonId] = useState('')
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState<string[]>([])
  const [sla, setSla] = useState<string[]>([])
  const [aging, setAging] = useState<string[]>([])
  const [flag, setFlag] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<RowSortKey>('days')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
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

  const { data: salesUsers } = useQuery({
    queryKey: ['users', 'role', 'sales'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/users/role/sales')
      return res.data as SalesUser[]
    },
    enabled: canAccess && !isSales,
  })

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reports', 'funnel-velocity', isSales ? user?.id : salespersonId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (!isSales && salespersonId) params.set('salespersonId', salespersonId)
      const qs = params.toString()
      const res = await axiosInstance.get(`/api/reports/funnel-velocity${qs ? `?${qs}` : ''}`)
      return res.data as FunnelVelocityPayload
    },
    enabled: canAccess,
  })

  const deals = data?.deals ?? []
  const stages = useMemo(() => uniqueSorted(deals.map((d) => d.stage)), [deals])
  const slaOpts = useMemo(() => uniqueSorted(deals.map((d) => d.slaLabel)), [deals])
  const agingOpts = useMemo(() => uniqueSorted(deals.map((d) => d.agingLabel)), [deals])
  const flagOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const d of deals) {
      d.flags.forEach((id, i) => {
        if (!map.has(id)) map.set(id, d.flagLabels[i] || id)
      })
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [deals])

  const filteredDeals = useMemo(() => {
    const q = search.trim().toLowerCase()
    return deals.filter((d) => {
      if (stage.length && !stage.includes(d.stage)) return false
      if (sla.length && !sla.includes(d.slaLabel)) return false
      if (aging.length && !aging.includes(d.agingLabel)) return false
      if (flag.length && !d.flags.some((id) => flag.includes(id))) return false
      if (!q) return true
      const hay = `${d.slNo ?? ''} ${d.customerName} ${d.salespersonName ?? ''} ${d.stage}`.toLowerCase()
      return hay.includes(q)
    })
  }, [deals, search, stage, sla, aging, flag])

  const visibleDeals = useMemo(() => {
    const copy = [...filteredDeals]
    copy.sort((a, b) => compareRows(a, b, sortKey, sortOrder))
    return copy
  }, [filteredDeals, sortKey, sortOrder])

  const headerAriaSort = (key: RowSortKey): 'ascending' | 'descending' | 'none' => {
    if (sortKey !== key) return 'none'
    return sortOrder === 'asc' ? 'ascending' : 'descending'
  }

  const onSort = (key: string, order: 'asc' | 'desc') => {
    setSortKey(key as RowSortKey)
    setSortOrder(order)
  }

  const chartData = useMemo(() => {
    if (!data) return []
    const dealsRow = data.funnel.rows.find((r) => r.key === 'deals')
    return data.funnel.columns.map((col, i) => ({
      name: col.label,
      Deals: dealsRow?.values[i] ?? 0,
    }))
  }, [data])

  const filterActive = Boolean(search || stage.length || sla.length || aging.length || flag.length)
  const clearFilters = () => {
    setSearch('')
    setStage([])
    setSla([])
    setAging([])
    setFlag([])
  }

  const confirmExport = async () => {
    if (!pendingExport || exporting) return
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (!isSales && salespersonId) params.set('salespersonId', salespersonId)
      const qs = params.toString()
      const res = await axiosInstance.get(
        `/api/reports/funnel-velocity/export/${pendingExport}${qs ? `?${qs}` : ''}`,
        { responseType: 'blob' },
      )
      const header = String(res.headers['content-disposition'] || '')
      const fromHeader = header.match(/filename="?([^"]+)"?/)?.[1]
      const filename = fromHeader || `funnel-velocity.${pendingExport}`
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      const label = pendingExport === 'xlsx' ? 'Excel' : pendingExport === 'pdf' ? 'PDF' : 'PowerPoint'
      toast.success(`Funnel Velocity exported to ${label}`)
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
        Funnel Velocity is available to Admin, Management, and Sales.
      </div>,
    )
  }

  if (isError) {
    return shell(
      <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] p-5">
        <p className="font-medium">Unable to load Funnel Velocity.</p>
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
              Funnel Velocity
            </h1>
            <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">
              Pre-confirmation hygiene — days in stage, SLA colour, and FY conversion
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
                    onClick={() => {
                      setExportMenuOpen(false)
                      setPendingExport(fmt)
                    }}
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

      <FunnelVelocityHowToRead />

      {isLoading || !data || !k ? (
        <div className="flex min-h-[280px] items-center justify-center text-sm text-[color:var(--text-muted)]">
          Loading Funnel Velocity…
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
            <Kpi
              label="Open pipeline"
              value={formatInrCompact(k.openPipeline)}
              hint={`${k.openDeals} deals`}
            />
            <Kpi label="Median days" value={k.medianDays == null ? '—' : String(k.medianDays)} />
            <Kpi
              label="SLA red"
              value={String(k.slaRed)}
              hint={`${k.slaAmber} amber`}
              warn={k.slaRed > 0}
            />
            <Kpi
              label="Win rate"
              value={formatPct(k.winRate, false)}
              hint={`${k.confirmedYtdDeals} won · ${k.lostYtdDeals} lost`}
            />
            <Kpi
              label="Days to confirm"
              value={k.medianDaysToConfirm == null ? '—' : String(k.medianDaysToConfirm)}
              hint="median, created → confirmed"
            />
            <Kpi
              label="Days to lose"
              value={k.medianDaysToLose == null ? '—' : String(k.medianDaysToLose)}
              hint="median, created → lost"
            />
          </section>

          {k.slaRed > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-3 py-2 text-xs text-[color:var(--text-primary)] sm:text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent-gold)]" aria-hidden />
              <p>
                {k.slaRed} deal{k.slaRed === 1 ? '' : 's'} past 90% of stage SLA.
                {k.estimatedDates > 0
                  ? ` ${k.estimatedDates} using created date (stage entered missing).`
                  : ''}
              </p>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <MetricCard title="Open funnel">
              <MetricTable
                columns={[...data.funnel.columns.map((c) => c.label), 'Total']}
                rows={data.funnel.rows.map((row) => ({
                  key: row.key,
                  label: row.label,
                  cells: [...row.values, row.total],
                }))}
                compact={narrow}
              />
              <p className="mt-2 text-[11px] text-[color:var(--text-muted)]">
                SLA: Lead {data.funnel.columns[0]?.slaDays}d · Survey {data.funnel.columns[1]?.slaDays}d ·
                Proposal {data.funnel.columns[2]?.slaDays}d
              </p>
            </MetricCard>
            <MetricCard title="Days in stage">
              <MetricTable
                columns={[...data.aging.columns.map((c) => c.label), 'Total']}
                rows={data.aging.rows.map((row) => ({
                  key: row.key,
                  label: row.label,
                  cells: [...row.values, row.total],
                }))}
                compact={narrow}
              />
            </MetricCard>
          </section>

          <MetricCard title="Seller load">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-sm">
                <thead>
                  <tr className={TABLE_HEAD_ROW}>
                    <th className={`${TABLE_HEAD_TH} pr-2 text-left`}>Seller</th>
                    <th className={`${TABLE_HEAD_TH} pl-2 text-right`}>Deals</th>
                    <th className={`${TABLE_HEAD_TH} pl-2 text-right`}>Pipeline</th>
                    <th className={`${TABLE_HEAD_TH} pl-2 text-right`}>Median days</th>
                    <th className={`${TABLE_HEAD_TH} pl-2 text-right`}>SLA red</th>
                    <th className={`${TABLE_HEAD_TH} pl-2 text-right`}>SLA amber</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sellerLoad.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-sm text-[color:var(--text-muted)]">
                        No open funnel deals
                      </td>
                    </tr>
                  ) : (
                    data.sellerLoad.map((row) => (
                      <tr
                        key={row.salespersonId || 'unassigned'}
                        className="border-b border-[color:var(--border-default)] last:border-0"
                      >
                        <th className="py-2.5 pr-2 text-left text-sm font-bold text-[color:var(--text-primary)]">
                          {row.salespersonName}
                        </th>
                        <td className="py-2 pl-2 text-right tabular-nums text-sm font-semibold">{row.deals}</td>
                        <td className="py-2 pl-2 text-right tabular-nums text-sm font-semibold">
                          {narrow ? formatInrCompact(row.pipeline) : formatInr(row.pipeline)}
                        </td>
                        <td className="py-2 pl-2 text-right tabular-nums text-sm font-semibold">
                          {row.medianDays == null ? '—' : row.medianDays}
                        </td>
                        <td
                          className={`py-2 pl-2 text-right tabular-nums text-sm font-semibold ${
                            row.slaRed > 0 ? 'text-[color:var(--accent-red)]' : ''
                          }`}
                        >
                          {row.slaRed}
                        </td>
                        <td className="py-2 pl-2 text-right tabular-nums text-sm font-semibold">{row.slaAmber}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </MetricCard>

          <ChartPanel
            title="Open funnel mix"
            subtitle="Deals sitting in Lead, Site survey, and Proposal"
            className="print:break-inside-avoid"
          >
            <div className="h-[240px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: colors.axisText, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: colors.axisText, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip contentStyle={ZENITH_CHART_CUSTOM_TOOLTIP_SHELL} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Deals" fill={colors.gold} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartPanel>

          <section className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="zenith-display text-base font-bold text-[color:var(--text-primary)]">
                  Stuck list
                </h2>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Showing {visibleDeals.length} of {deals.length} open funnel deals
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
                <span className="sr-only">Search funnel</span>
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
                    placeholder="SLA"
                    options={slaOpts.map((o) => ({ value: o, label: o }))}
                    selectedValues={sla}
                    onChange={setSla}
                  />
                  <MultiSelect
                    compact
                    variant="zenith"
                    placeholder="Aging"
                    options={agingOpts.map((o) => ({ value: o, label: o }))}
                    selectedValues={aging}
                    onChange={setAging}
                  />
                  <MultiSelect
                    compact
                    variant="zenith"
                    placeholder="Flag"
                    options={flagOptions}
                    selectedValues={flag}
                    onChange={setFlag}
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
                            {d.stage} · {d.slaLabel}
                            {d.salespersonName ? ` · ${d.salespersonName}` : ''}
                          </p>
                        </div>
                        <p className={`shrink-0 text-sm font-bold ${slaTone(d.slaBand)}`}>
                          {formatDays(d.daysInStage)}
                        </p>
                      </div>
                      <p className="mt-1.5 text-[11px] text-[color:var(--text-secondary)]">
                        {formatInrCompact(d.orderValue)}
                        {d.flagLabels.length ? ` · ${d.flagLabels.slice(0, 2).join(' · ')}` : ''}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] text-sm">
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
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('stage')}>
                        <DealListColHead
                          label="Stage"
                          sortKey="stage"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onSort}
                          filter={{
                            options: stages.map((o) => ({ value: o, label: o })),
                            selected: stage,
                            onChange: setStage,
                          }}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('seller')}>
                        <DealListColHead
                          label="Seller"
                          sortKey="seller"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onSort}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-right`} aria-sort={headerAriaSort('days')}>
                        <DealListColHead
                          label="Days"
                          align="right"
                          sortKey="days"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onSort}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('sla')}>
                        <DealListColHead
                          label="SLA"
                          sortKey="sla"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onSort}
                          filter={{
                            options: slaOpts.map((o) => ({ value: o, label: o })),
                            selected: sla,
                            onChange: setSla,
                          }}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('aging')}>
                        <DealListColHead
                          label="Aging"
                          sortKey="aging"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onSort}
                          filter={{
                            options: agingOpts.map((o) => ({ value: o, label: o })),
                            selected: aging,
                            onChange: setAging,
                          }}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-right`} aria-sort={headerAriaSort('probability')}>
                        <DealListColHead
                          label="Prob."
                          align="right"
                          sortKey="probability"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onSort}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('flags')}>
                        <DealListColHead
                          label="Flags"
                          sortKey="flags"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onSort}
                          filter={{
                            options: flagOptions,
                            selected: flag,
                            onChange: setFlag,
                          }}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} text-right`} aria-sort={headerAriaSort('value')}>
                        <DealListColHead
                          label="Value"
                          align="right"
                          sortKey="value"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onSort}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDeals.map((d) => (
                      <ListRow key={d.id} row={d} onOpen={() => navigate(`/projects/${d.id}`)} />
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

function MetricCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-4">
      <h2 className="zenith-display mb-3 text-base font-bold text-[color:var(--text-primary)]">{title}</h2>
      {children}
    </section>
  )
}

function MetricTable({
  columns,
  rows,
  compact,
}: {
  columns: string[]
  rows: { key: string; label: string; cells: (number | null)[] }[]
  compact: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr className={TABLE_HEAD_ROW}>
            <th className={`${TABLE_HEAD_TH} pr-2 text-left`}>Metric</th>
            {columns.map((c) => (
              <th key={c} className={`${TABLE_HEAD_TH} pl-2 text-right`}>
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
                    (row.key === 'slaRed' || row.key === 'pipeline') && (cell || 0) > 0 && columns[i] === '30+'
                      ? 'text-[color:var(--accent-gold)]'
                      : row.key === 'slaRed' && (cell || 0) > 0
                        ? 'text-[color:var(--accent-red)]'
                        : 'text-[color:var(--text-primary)]'
                  }`}
                >
                  {funnelCell(row.key, cell, compact)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ListRow({ row: d, onOpen }: { row: FunnelDeal; onOpen: () => void }) {
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
      </td>
      <td className="py-2.5 pr-3 text-[color:var(--text-secondary)]">{d.stage}</td>
      <td className="py-2.5 pr-3">{d.salespersonName || '—'}</td>
      <td className={`py-2.5 pr-3 text-right tabular-nums font-semibold ${slaTone(d.slaBand)}`}>
        {formatDays(d.daysInStage)}
      </td>
      <td className={`py-2.5 pr-3 ${slaTone(d.slaBand)}`}>{d.slaLabel}</td>
      <td className="py-2.5 pr-3">{d.agingLabel}</td>
      <td className="py-2.5 pr-3 text-right tabular-nums">{d.probability}%</td>
      <td className="py-2.5 pr-3 text-[11px] text-[color:var(--text-secondary)]">
        {d.flagLabels.length ? d.flagLabels.slice(0, 2).join(' · ') : '—'}
        {d.flagLabels.length > 2 ? ` +${d.flagLabels.length - 2}` : ''}
      </td>
      <td className="py-2.5 text-right font-semibold">{formatInr(d.orderValue)}</td>
    </tr>
  )
}
