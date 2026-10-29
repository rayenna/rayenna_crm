import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
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
import MarginMixHowToRead from '../components/reports/MarginMixHowToRead'
import type { MarginJob, MarginMixPayload, MixRow } from '../types/marginMix'
import { formatInr, formatInrCompact, formatPct } from '../utils/salesReviewFormat'

const ACCESS_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.FINANCE]
const NARROW_MQ = '(max-width: 743px)'
const TABLE_HEAD_ROW =
  'border-b border-[color:var(--border-default)] bg-[color:var(--zenith-table-header-bg)]'
const TABLE_HEAD_TH =
  'py-2.5 text-xs font-extrabold uppercase tracking-wide text-[color:var(--accent-gold)] sm:text-sm'
const EXPORT_CONFIRM =
  'The Data that is present in the CRM System is the exclusive property of Rayenna Energy Private Limited. Unauthorised Export of any data is prohibited and will be subject to disciplinary measures including and not limited to termination and legal procedures.\n\nBy exporting this data, you are confirming that you are authorised to access this data/info and have written approvals from the management.\n\nDo you want to continue?'
type ExportFormat = 'xlsx' | 'pdf' | 'pptx'

type SalesUser = { id: string; name: string }
type RowSortKey = 'customer' | 'stage' | 'seller' | 'band' | 'pct' | 'profit' | 'value' | 'flags'

const QUARTER_OPTIONS = [
  { value: '', label: 'All quarters' },
  { value: '1', label: 'Q1 Apr–Jun' },
  { value: '2', label: 'Q2 Jul–Sep' },
  { value: '3', label: 'Q3 Oct–Dec' },
  { value: '4', label: 'Q4 Jan–Mar' },
] as const

const SELECT_CLASS =
  'min-h-[40px] w-full rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 text-sm text-[color:var(--text-primary)]'

function marginMixQuery(salespersonId: string, fy: string, quarter: string): string {
  const params = new URLSearchParams()
  if (salespersonId) params.set('salespersonId', salespersonId)
  if (fy) params.set('fy', fy)
  if (quarter) params.set('quarter', quarter)
  return params.toString()
}

function compareRows(a: MarginJob, b: MarginJob, key: RowSortKey, order: 'asc' | 'desc'): number {
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
    case 'pct': {
      const vacant = emptyLast(a.profitPct == null, b.profitPct == null)
      if (vacant) return vacant
      return ((a.profitPct || 0) - (b.profitPct || 0)) * dir
    }
    case 'profit': {
      const vacant = emptyLast(a.profit == null, b.profit == null)
      if (vacant) return vacant
      return ((a.profit || 0) - (b.profit || 0)) * dir
    }
    case 'value':
      return (a.orderValue - b.orderValue) * dir
    case 'customer':
      return byText(a.customerName, b.customerName)
    case 'stage':
      return byText(a.stage, b.stage)
    case 'seller':
      return byText(a.salespersonName || '', b.salespersonName || '')
    case 'band':
      return byText(a.marginBandLabel, b.marginBandLabel)
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

function bandTone(band: MarginJob['marginBand']): string {
  if (band === 'loss') return 'text-[color:var(--accent-red)]'
  if (band === 'thin') return 'text-[color:var(--accent-gold)]'
  if (band === 'healthy') return 'text-emerald-500'
  return 'text-[color:var(--text-secondary)]'
}

export default function MarginMix() {
  const { hasRole } = useAuth()
  const navigate = useNavigate()
  const canAccess = hasRole(ACCESS_ROLES)
  const colors = useChartColors()
  const [salespersonId, setSalespersonId] = useState('')
  const [fy, setFy] = useState('')
  const [quarter, setQuarter] = useState('')
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState<string[]>([])
  const [band, setBand] = useState<string[]>([])
  const [segment, setSegment] = useState<string[]>([])
  const [flag, setFlag] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<RowSortKey>('pct')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
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
    enabled: canAccess,
  })

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reports', 'margin-mix', salespersonId, fy, quarter],
    queryFn: async () => {
      const qs = marginMixQuery(salespersonId, fy, quarter)
      const res = await axiosInstance.get(`/api/reports/margin-mix${qs ? `?${qs}` : ''}`)
      return res.data as MarginMixPayload
    },
    enabled: canAccess,
    placeholderData: keepPreviousData,
  })

  const jobs = data?.jobs ?? []
  const fyOptions = useMemo(() => {
    const years = new Set(data?.availableFys ?? [])
    const selected = fy || data?.currentFy
    if (selected) years.add(selected)
    return Array.from(years).sort((a, b) => b.localeCompare(a))
  }, [data, fy])
  const stages = useMemo(() => uniqueSorted(jobs.map((d) => d.stage)), [jobs])
  const bands = useMemo(() => uniqueSorted(jobs.map((d) => d.marginBandLabel)), [jobs])
  const segments = useMemo(() => uniqueSorted(jobs.map((d) => d.segmentLabel)), [jobs])
  const flagOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const d of jobs) {
      d.flags.forEach((id, i) => {
        if (!map.has(id)) map.set(id, d.flagLabels[i] || id)
      })
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [jobs])

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return jobs.filter((d) => {
      if (stage.length && !stage.includes(d.stage)) return false
      if (band.length && !band.includes(d.marginBandLabel)) return false
      if (segment.length && !segment.includes(d.segmentLabel)) return false
      if (flag.length && !d.flags.some((id) => flag.includes(id))) return false
      if (!q) return true
      const hay = `${d.slNo ?? ''} ${d.customerName} ${d.salespersonName ?? ''} ${d.stage}`.toLowerCase()
      return hay.includes(q)
    })
  }, [jobs, search, stage, band, segment, flag])

  const visibleJobs = useMemo(() => {
    const copy = [...filteredJobs]
    copy.sort((a, b) => compareRows(a, b, sortKey, sortOrder))
    return copy
  }, [filteredJobs, sortKey, sortOrder])

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
    return data.bandMix.map((r) => ({ name: r.label, Jobs: r.jobs, Revenue: r.revenue }))
  }, [data])

  const filterActive = Boolean(search || stage.length || band.length || segment.length || flag.length)
  const clearFilters = () => {
    setSearch('')
    setStage([])
    setBand([])
    setSegment([])
    setFlag([])
  }

  const confirmExport = async () => {
    if (!pendingExport || exporting) return
    setExporting(true)
    try {
      const qs = marginMixQuery(salespersonId, fy, quarter)
      const res = await axiosInstance.get(
        `/api/reports/margin-mix/export/${pendingExport}${qs ? `?${qs}` : ''}`,
        { responseType: 'blob' },
      )
      const header = String(res.headers['content-disposition'] || '')
      const fromHeader = header.match(/filename="?([^"]+)"?/)?.[1]
      const filename = fromHeader || `margin-mix.${pendingExport}`
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      const label = pendingExport === 'xlsx' ? 'Excel' : pendingExport === 'pdf' ? 'PDF' : 'PowerPoint'
      toast.success(`Margin & Mix exported to ${label}`)
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
        Margin & Mix is available to Admin, Management, and Finance.
      </div>,
    )
  }

  if (isError) {
    return shell(
      <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] p-5">
        <p className="font-medium">Unable to load Margin & Mix.</p>
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
              Margin & Mix
            </h1>
            <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">
              Confirmed jobs — gross profit, missing cost, and mix
              {data ? ` · ${data.periodLabel}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <label className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
            <span className="sr-only">Salesperson</span>
            <select
              value={salespersonId}
              onChange={(e) => setSalespersonId(e.target.value)}
              className={`${SELECT_CLASS} sm:w-44`}
            >
              <option value="">All sellers</option>
              {(salesUsers ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[7.5rem] items-center sm:flex-none">
            <span className="sr-only">Financial year</span>
            <select
              value={fy || data?.currentFy || ''}
              onChange={(e) => setFy(e.target.value)}
              className={`${SELECT_CLASS} sm:w-36`}
            >
              {fyOptions.map((year) => (
                <option key={year} value={year}>
                  FY {year}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[8.5rem] items-center sm:flex-none">
            <span className="sr-only">Quarter</span>
            <select
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              className={`${SELECT_CLASS} sm:w-40`}
            >
              {QUARTER_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
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

      <MarginMixHowToRead />

      {isLoading || !data || !k ? (
        <div className="flex min-h-[280px] items-center justify-center text-sm text-[color:var(--text-muted)]">
          Loading Margin & Mix…
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
            <Kpi label="Revenue" value={formatInrCompact(k.revenue)} hint={`${k.jobs} jobs`} />
            <Kpi label="Gross profit" value={formatInrCompact(k.profit)} />
            <Kpi
              label="GP %"
              value={formatPct(k.profitPct, false)}
              hint={k.profitPctYoy != null ? `${formatPct(k.profitPctYoy)} vs same period last year` : undefined}
            />
            <Kpi label="Missing cost" value={String(k.missingCostJobs)} warn={k.missingCostJobs > 0} />
            <Kpi
              label="Thin / loss"
              value={`${k.thinJobs} / ${k.lossJobs}`}
              warn={k.thinJobs + k.lossJobs > 0}
            />
            <Kpi
              label="Revenue YoY"
              value={formatPct(k.revenueYoy)}
              hint={formatInrCompact(k.lastFyRevenue)}
            />
          </section>

          {(k.missingCostJobs > 0 || k.lossJobs > 0) && (
            <div className="flex items-start gap-2 rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-3 py-2 text-xs text-[color:var(--text-primary)] sm:text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent-gold)]" aria-hidden />
              <p>
                {k.missingCostJobs > 0
                  ? `${k.missingCostJobs} job${k.missingCostJobs === 1 ? '' : 's'} with no CRM cost. `
                  : ''}
                {k.lossJobs > 0 ? `${k.lossJobs} below zero GP.` : ''}
                {k.peMismatchJobs > 0 ? ` ${k.peMismatchJobs} PE vs CRM cost flag${k.peMismatchJobs === 1 ? '' : 's'}.` : ''}
              </p>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <MixCard title="Seller mix" rows={data.sellerLoad} compact={narrow} />
            <MixCard title="Segment" rows={data.segmentMix} compact={narrow} />
            <MixCard title="System type" rows={data.systemMix} compact={narrow} />
            <MixCard title="kW band" rows={data.kwMix} compact={narrow} />
          </section>

          <ChartPanel
            title="Margin band"
            subtitle={data ? `Won jobs ${data.periodLabel} by GP % band` : 'Won jobs by GP % band'}
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
                  <Bar dataKey="Jobs" fill={colors.gold} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartPanel>

          <section className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="zenith-display text-base font-bold text-[color:var(--text-primary)]">Job list</h2>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Showing {visibleJobs.length} of {jobs.length} won jobs · worst GP % first
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
                    placeholder="Search customer, #, seller…"
                    className="min-h-[40px] w-full rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] py-2 pl-8 pr-3 text-sm"
                  />
                </span>
              </label>
              {narrow ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <MultiSelect compact variant="zenith" placeholder="Stage" options={stages.map((o) => ({ value: o, label: o }))} selectedValues={stage} onChange={setStage} />
                  <MultiSelect compact variant="zenith" placeholder="Band" options={bands.map((o) => ({ value: o, label: o }))} selectedValues={band} onChange={setBand} />
                  <MultiSelect compact variant="zenith" placeholder="Segment" options={segments.map((o) => ({ value: o, label: o }))} selectedValues={segment} onChange={setSegment} />
                  <MultiSelect compact variant="zenith" placeholder="Flag" options={flagOptions} selectedValues={flag} onChange={setFlag} />
                </div>
              ) : null}
            </div>

            {narrow ? (
              <ul className="space-y-2">
                {visibleJobs.map((d) => (
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
                            {d.stage} · {d.marginBandLabel}
                            {d.salespersonName ? ` · ${d.salespersonName}` : ''}
                          </p>
                        </div>
                        <p className={`shrink-0 text-sm font-bold ${bandTone(d.marginBand)}`}>
                          {formatPct(d.profitPct, false)}
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
                        <DealListColHead label="Customer" sortKey="customer" activeSortKey={sortKey} sortOrder={sortOrder} onSort={onSort} />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('stage')}>
                        <DealListColHead
                          label="Stage"
                          sortKey="stage"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onSort}
                          filter={{ options: stages.map((o) => ({ value: o, label: o })), selected: stage, onChange: setStage }}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('seller')}>
                        <DealListColHead label="Seller" sortKey="seller" activeSortKey={sortKey} sortOrder={sortOrder} onSort={onSort} />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-right`} aria-sort={headerAriaSort('pct')}>
                        <DealListColHead label="GP %" align="right" sortKey="pct" activeSortKey={sortKey} sortOrder={sortOrder} onSort={onSort} />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('band')}>
                        <DealListColHead
                          label="Band"
                          sortKey="band"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onSort}
                          filter={{ options: bands.map((o) => ({ value: o, label: o })), selected: band, onChange: setBand }}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-right`} aria-sort={headerAriaSort('profit')}>
                        <DealListColHead label="GP" align="right" sortKey="profit" activeSortKey={sortKey} sortOrder={sortOrder} onSort={onSort} />
                      </th>
                      <th className={`${TABLE_HEAD_TH} pr-3 text-left`} aria-sort={headerAriaSort('flags')}>
                        <DealListColHead
                          label="Flags"
                          sortKey="flags"
                          activeSortKey={sortKey}
                          sortOrder={sortOrder}
                          onSort={onSort}
                          filter={{ options: flagOptions, selected: flag, onChange: setFlag }}
                        />
                      </th>
                      <th className={`${TABLE_HEAD_TH} text-right`} aria-sort={headerAriaSort('value')}>
                        <DealListColHead label="Value" align="right" sortKey="value" activeSortKey={sortKey} sortOrder={sortOrder} onSort={onSort} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleJobs.map((d) => (
                      <tr
                        key={d.id}
                        className="cursor-pointer border-b border-[color:var(--border-default)] last:border-0 hover:bg-[color:var(--bg-surface)]"
                        onClick={() => navigate(`/projects/${d.id}`)}
                      >
                        <td className="py-2.5 pr-3">
                          <p className="font-semibold text-[color:var(--accent-purple)]">
                            {d.slNo != null ? `#${d.slNo} · ` : ''}
                            {d.customerName}
                          </p>
                        </td>
                        <td className="py-2.5 pr-3 text-[color:var(--text-secondary)]">{d.stage}</td>
                        <td className="py-2.5 pr-3">{d.salespersonName || '—'}</td>
                        <td className={`py-2.5 pr-3 text-right tabular-nums font-semibold ${bandTone(d.marginBand)}`}>
                          {formatPct(d.profitPct, false)}
                        </td>
                        <td className={`py-2.5 pr-3 ${bandTone(d.marginBand)}`}>{d.marginBandLabel}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{formatInr(d.profit)}</td>
                        <td className="py-2.5 pr-3 text-[11px] text-[color:var(--text-secondary)]">
                          {d.flagLabels.length ? d.flagLabels.slice(0, 2).join(' · ') : '—'}
                          {d.flagLabels.length > 2 ? ` +${d.flagLabels.length - 2}` : ''}
                        </td>
                        <td className="py-2.5 text-right font-semibold">{formatInr(d.orderValue)}</td>
                      </tr>
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

function MixCard({ title, rows, compact }: { title: string; rows: MixRow[]; compact: boolean }) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-4">
      <h2 className="zenith-display mb-3 text-base font-bold text-[color:var(--text-primary)]">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className={TABLE_HEAD_ROW}>
              <th className={`${TABLE_HEAD_TH} pr-2 text-left`}>Slice</th>
              <th className={`${TABLE_HEAD_TH} pl-2 text-right`}>Jobs</th>
              <th className={`${TABLE_HEAD_TH} pl-2 text-right`}>Revenue</th>
              <th className={`${TABLE_HEAD_TH} pl-2 text-right`}>GP</th>
              <th className={`${TABLE_HEAD_TH} pl-2 text-right`}>GP %</th>
              <th className={`${TABLE_HEAD_TH} pl-2 text-right`}>No cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-sm text-[color:var(--text-muted)]">
                  No won jobs in this period
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="border-b border-[color:var(--border-default)] last:border-0">
                  <th className="py-2.5 pr-2 text-left text-sm font-bold text-[color:var(--text-primary)]">
                    {row.label}
                  </th>
                  <td className="py-2 pl-2 text-right tabular-nums text-sm font-semibold">{row.jobs}</td>
                  <td className="py-2 pl-2 text-right tabular-nums text-sm font-semibold">
                    {compact ? formatInrCompact(row.revenue) : formatInr(row.revenue)}
                  </td>
                  <td className="py-2 pl-2 text-right tabular-nums text-sm font-semibold">
                    {compact ? formatInrCompact(row.profit) : formatInr(row.profit)}
                  </td>
                  <td
                    className={`py-2 pl-2 text-right tabular-nums text-sm font-semibold ${
                      (row.profitPct ?? 0) < 10 ? 'text-[color:var(--accent-gold)]' : ''
                    }`}
                  >
                    {formatPct(row.profitPct, false)}
                  </td>
                  <td className="py-2 pl-2 text-right tabular-nums text-sm font-semibold">{row.missingCost}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
