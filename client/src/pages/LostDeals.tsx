import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, XCircle } from 'lucide-react'
import axiosInstance from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import DashboardFilters from '../components/dashboard/DashboardFilters'
import ChartPanel from '../components/zenith/ChartPanel'
import { useChartColors } from '../hooks/useChartColors'
import { ZENITH_CHART_CUSTOM_TOOLTIP_SHELL } from '../components/dashboard/zenithRechartsTooltipStyles'
import {
  lostReasonLabel,
  lostToCompetitionLabel,
} from '../utils/lostReasonLabels'

type LostDealsSummary = {
  lostCount: number
  lostValue: number
  wonCount: number
  wonValue: number
  winRateCount: number | null
  winRateValue: number | null
  uncategorizedCount: number
}

type LostDealsResponse = {
  summary: LostDealsSummary
  byReason: { reason: string; count: number; value: number }[]
  byCompetitionSubtype: { subtype: string; count: number; value: number }[]
  bySalesperson: { id: string | null; name: string; count: number; value: number }[]
  byFy: { fy: string; count: number; value: number }[]
  projects: {
    id: string
    slNo: number | null
    customerName: string | null
    salespersonName: string | null
    year: string | null
    projectCost: number | null
    lostReason: string | null
    lostToCompetitionReason: string | null
    lostOtherReason: string | null
    lostDate: string | null
    confirmationDate: string | null
  }[]
}

const REASON_COLORS = [
  'var(--accent-red)',
  'var(--accent-gold)',
  'var(--accent-teal)',
  'var(--accent-blue)',
  'var(--accent-purple)',
  'var(--accent-green)',
  'color-mix(in srgb, var(--accent-red) 65%, white)',
  'color-mix(in srgb, var(--accent-gold) 65%, white)',
  'color-mix(in srgb, var(--accent-teal) 65%, white)',
  'color-mix(in srgb, var(--accent-blue) 65%, white)',
]

function formatInr(n: number): string {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`
}

function formatPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n.toFixed(1)}%`
}

function reasonDisplayLabel(reason: string): string {
  if (reason === 'UNCATEGORIZED') return 'Uncategorized'
  return lostReasonLabel(reason) || reason
}

function competitionDisplayLabel(subtype: string): string {
  if (subtype === 'UNCATEGORIZED') return 'Uncategorized'
  return lostToCompetitionLabel(subtype) || subtype
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

type LostProjectRow = LostDealsResponse['projects'][number]

type LostTableSortKey =
  | 'slNo'
  | 'customerName'
  | 'salespersonName'
  | 'year'
  | 'projectCost'
  | 'lostReason'
  | 'lostDate'

const SORT_BTN =
  'group flex min-h-[2rem] w-full min-w-0 flex-nowrap items-center gap-1.5 overflow-visible rounded-md px-0.5 py-1 text-left transition-colors hover:bg-[color:var(--bg-table-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--bg-page)]'
const SORT_LABEL =
  'min-w-0 flex-1 basis-0 whitespace-nowrap text-left text-[11px] font-bold uppercase leading-snug tracking-wide text-[color:var(--text-secondary)]'

function LostSortGlyph({ active }: { active: boolean }) {
  const box = active
    ? 'border-[color:var(--accent-gold-border)] bg-[color:color-mix(in srgb,var(--accent-gold) 18%, transparent)] text-[color:var(--accent-gold)]'
    : 'border-[color:var(--border-default)] bg-[color:var(--bg-surface)] text-[color:var(--text-muted)] group-hover:border-[color:var(--accent-gold-border)] group-hover:text-[color:var(--accent-gold)]'
  return (
    <span
      className={`inline-flex size-5 shrink-0 select-none items-center justify-center rounded border transition-colors sm:size-6 ${box}`}
      aria-hidden
    >
      <svg
        className="block size-[12px] shrink-0 text-current opacity-95 sm:size-[14px]"
        viewBox="0 0 24 24"
        width={14}
        height={14}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 10l4-4 4 4M8 14l4 4 4-4" />
      </svg>
    </span>
  )
}

function compareLostRows(
  a: LostProjectRow,
  b: LostProjectRow,
  sortKey: LostTableSortKey,
  sortOrder: 'asc' | 'desc',
): number {
  const dir = sortOrder === 'asc' ? 1 : -1
  const emptyLast = (empty: boolean) => (empty ? 1 : -1)

  switch (sortKey) {
    case 'slNo': {
      const av = a.slNo
      const bv = b.slNo
      if (av == null && bv == null) return 0
      if (av == null) return emptyLast(true) * dir
      if (bv == null) return emptyLast(false) * dir
      return (av - bv) * dir
    }
    case 'projectCost': {
      return ((Number(a.projectCost) || 0) - (Number(b.projectCost) || 0)) * dir
    }
    case 'lostDate': {
      const at = a.lostDate ? Date.parse(a.lostDate) : NaN
      const bt = b.lostDate ? Date.parse(b.lostDate) : NaN
      const aOk = Number.isFinite(at)
      const bOk = Number.isFinite(bt)
      if (!aOk && !bOk) return 0
      if (!aOk) return emptyLast(true) * dir
      if (!bOk) return emptyLast(false) * dir
      return (at - bt) * dir
    }
    case 'lostReason': {
      const as = a.lostReason ? reasonDisplayLabel(a.lostReason) : 'Uncategorized'
      const bs = b.lostReason ? reasonDisplayLabel(b.lostReason) : 'Uncategorized'
      return as.localeCompare(bs, undefined, { sensitivity: 'base' }) * dir
    }
    case 'customerName':
    case 'salespersonName':
    case 'year': {
      const as = String(a[sortKey] ?? '').trim()
      const bs = String(b[sortKey] ?? '').trim()
      if (!as && !bs) return 0
      if (!as) return emptyLast(true) * dir
      if (!bs) return emptyLast(false) * dir
      return as.localeCompare(bs, undefined, { sensitivity: 'base', numeric: true }) * dir
    }
    default:
      return 0
  }
}

function readListParam(params: URLSearchParams, key: string): string[] {
  return params.getAll(key).filter(Boolean)
}

function InrTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value?: unknown; name?: string }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  const v = Number(payload[0]?.value)
  return (
    <div style={ZENITH_CHART_CUSTOM_TOOLTIP_SHELL}>
      <div style={{ color: 'var(--chart-tooltip-fg)', fontSize: 13, fontWeight: 500 }}>
        {label != null && label !== '' ? `${label}: ` : ''}
        {Number.isFinite(v) ? formatInr(v) : '—'}
      </div>
    </div>
  )
}

function PieInrTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: unknown; payload?: { count?: number } }>
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const v = Number(item?.value)
  const count = item?.payload?.count
  return (
    <div style={ZENITH_CHART_CUSTOM_TOOLTIP_SHELL}>
      <div style={{ color: 'var(--chart-tooltip-fg)', fontSize: 13, fontWeight: 500 }}>
        {item?.name}: {Number.isFinite(v) ? formatInr(v) : '—'}
        {count != null ? ` · ${count}` : ''}
      </div>
    </div>
  )
}

const LostDeals = () => {
  const { hasRole } = useAuth()
  const chartColors = useChartColors()
  const [searchParams, setSearchParams] = useSearchParams()
  const [uncategorizedOnly, setUncategorizedOnly] = useState(false)
  const [sortKey, setSortKey] = useState<LostTableSortKey>('slNo')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const selectedFYs = useMemo(() => readListParam(searchParams, 'fy'), [searchParams])
  const selectedQuarters = useMemo(() => readListParam(searchParams, 'quarter'), [searchParams])
  const selectedMonths = useMemo(() => readListParam(searchParams, 'month'), [searchParams])

  // React Router's setSearchParams(fn) uses the render-closed searchParams, not chained
  // pending updates — so Clear FY (which calls onFY/Quarter/MonthChange in one click) must
  // apply sequential mutations against a ref or only the last call wins.
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  const updateSearchParams = (mutate: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParamsRef.current)
    mutate(next)
    searchParamsRef.current = next
    setSearchParams(next, { replace: true })
  }

  const onFYChange = (fys: string[]) => {
    updateSearchParams((params) => {
      params.delete('fy')
      fys.forEach((v) => params.append('fy', v))
      // Quarter/month only apply with exactly one FY (same rule as DashboardFilters).
      if (fys.length !== 1) {
        params.delete('quarter')
        params.delete('month')
      }
    })
  }

  const onQuarterChange = (quarters: string[]) => {
    updateSearchParams((params) => {
      params.delete('quarter')
      quarters.forEach((v) => params.append('quarter', v))
    })
  }

  const onMonthChange = (months: string[]) => {
    updateSearchParams((params) => {
      params.delete('month')
      months.forEach((v) => params.append('month', v))
    })
  }

  const canAccess = hasRole([UserRole.ADMIN, UserRole.MANAGEMENT])

  const shell = (children: React.ReactNode) => (
    <div className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] min-h-[calc(100vh-5rem)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(0.35rem,env(safe-area-inset-top,0px))] [-webkit-tap-highlight-color:transparent]">
      <div className="zenith-exec-main mx-auto w-full max-w-full min-w-0 px-3 sm:px-5 pb-10">{children}</div>
    </div>
  )

  const { data: fyPayload } = useQuery({
    queryKey: ['dashboard', 'financial-years', 'lost-deals'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/dashboard/financial-years')
      return res.data as { projectValueProfitByFY?: { fy: string }[] }
    },
    staleTime: 5 * 60_000,
    enabled: canAccess,
  })

  const availableFYs =
    fyPayload?.projectValueProfitByFY?.map((r) => r.fy).filter(Boolean) ?? []

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'lost-deals', selectedFYs, selectedQuarters, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedQuarters.forEach((q) => params.append('quarter', q))
      selectedMonths.forEach((m) => params.append('month', m))
      const qs = params.toString()
      const res = await axiosInstance.get(`/api/dashboard/lost-deals${qs ? `?${qs}` : ''}`)
      return res.data as LostDealsResponse
    },
    enabled: canAccess,
  })

  const summary = data?.summary
  const uncategorizedPct =
    summary && summary.lostCount > 0
      ? (summary.uncategorizedCount / summary.lostCount) * 100
      : 0

  const reasonChartData = useMemo(
    () =>
      (data?.byReason ?? []).map((r) => ({
        name: reasonDisplayLabel(r.reason),
        value: r.value,
        count: r.count,
        reason: r.reason,
      })),
    [data?.byReason],
  )

  const competitionChartData = useMemo(
    () =>
      (data?.byCompetitionSubtype ?? []).map((r) => ({
        name: competitionDisplayLabel(r.subtype),
        value: r.value,
        count: r.count,
      })),
    [data?.byCompetitionSubtype],
  )

  const salesChartData = useMemo(
    () =>
      (data?.bySalesperson ?? []).map((r) => ({
        name: r.name,
        value: r.value,
        count: r.count,
      })),
    [data?.bySalesperson],
  )

  const fyChartData = useMemo(
    () =>
      (data?.byFy ?? []).map((r) => ({
        name: r.fy,
        value: r.value,
        count: r.count,
      })),
    [data?.byFy],
  )

  const tableProjects = useMemo(() => {
    const rows = [...(data?.projects ?? [])]
    const filtered = uncategorizedOnly ? rows.filter((p) => !p.lostReason) : rows
    filtered.sort((a, b) => compareLostRows(a, b, sortKey, sortOrder))
    return filtered
  }, [data?.projects, uncategorizedOnly, sortKey, sortOrder])

  const handleColumnSort = (key: LostTableSortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    // Serial # and dates feel natural ascending first; value descending first.
    setSortOrder(key === 'projectCost' ? 'desc' : 'asc')
  }

  const headerAriaSort = (key: LostTableSortKey): 'ascending' | 'descending' | 'none' => {
    if (sortKey !== key) return 'none'
    return sortOrder === 'asc' ? 'ascending' : 'descending'
  }

  if (!canAccess) {
    return shell(
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-2 pt-6 text-center">
        <div className="w-full max-w-md rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-8 shadow-[var(--shadow-card)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--accent-red-border)] bg-[color:color-mix(in srgb,var(--accent-red) 12%, var(--bg-card))] text-[color:var(--accent-red)]">
            <XCircle className="h-7 w-7" strokeWidth={2} aria-hidden />
          </div>
          <h1 className="zenith-display text-lg font-bold tracking-tight text-[color:var(--text-primary)]">
            Access denied
          </h1>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
            Lost Deals analytics is available only to Admin and Management.
          </p>
        </div>
      </div>,
    )
  }

  const kpiItems = [
    {
      key: 'lost-count',
      label: 'Lost count',
      value: summary ? String(summary.lostCount) : '—',
    },
    {
      key: 'lost-value',
      label: 'Lost ₹',
      value: summary ? formatInr(summary.lostValue) : '—',
    },
    {
      key: 'win-count',
      label: 'Win rate (count)',
      value: summary ? formatPct(summary.winRateCount) : '—',
    },
    {
      key: 'win-value',
      label: 'Win rate (₹)',
      value: summary ? formatPct(summary.winRateValue) : '—',
    },
    {
      key: 'uncat',
      label: 'Uncategorized',
      value: summary
        ? `${summary.uncategorizedCount} (${formatPct(uncategorizedPct)})`
        : '—',
    },
  ]

  return shell(
    <div className="space-y-5 pt-4 sm:pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="zenith-display text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">
            Lost Deals
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[color:var(--text-secondary)]">
            Lost value uses project cost. Win rate compares Confirmed / Installation / Completed /
            Subsidy Credited vs Lost in the same FY filter scope.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] sm:p-4">
        <DashboardFilters
          variant="zenith"
          availableFYs={availableFYs}
          selectedFYs={selectedFYs}
          selectedQuarters={selectedQuarters}
          selectedMonths={selectedMonths}
          onFYChange={onFYChange}
          onQuarterChange={onQuarterChange}
          onMonthChange={onMonthChange}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="zenith-skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] p-4 text-sm text-[color:var(--text-primary)]">
          {(error as Error)?.message || 'Failed to load Lost Deals.'}{' '}
          <button
            type="button"
            className="font-semibold text-[color:var(--accent-gold)] underline"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {kpiItems.map((k) => (
              <div
                key={k.key}
                className="rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]"
              >
                <div className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--text-muted)]">
                  {k.label}
                </div>
                <div className="zenith-display mt-1.5 text-lg font-bold tabular-nums text-[color:var(--text-primary)] sm:text-xl">
                  {k.value}
                </div>
              </div>
            ))}
          </div>

          {summary && summary.uncategorizedCount > 0 && uncategorizedPct >= 40 ? (
            <div className="flex gap-3 rounded-xl border border-[color:var(--accent-gold-border,var(--accent-gold))] bg-[color:var(--accent-gold-muted)] px-3 py-3 sm:px-4">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--accent-gold)]"
                aria-hidden
              />
              <div className="min-w-0 text-sm text-[color:var(--text-primary)]">
                <p className="font-semibold">
                  {summary.uncategorizedCount} of {summary.lostCount} lost deals have no reason
                  tagged.
                </p>
                <p className="mt-0.5 text-[color:var(--text-secondary)]">
                  Open a project and set Lost reason via Edit Project so reason mix and competition
                  charts become meaningful.
                </p>
                <button
                  type="button"
                  className="mt-2 text-sm font-semibold text-[color:var(--accent-gold)] underline"
                  onClick={() => setUncategorizedOnly(true)}
                >
                  Show uncategorized in table
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartPanel title="Lost ₹ by reason" subtitle="Mix of tagged loss reasons">
              {reasonChartData.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center text-sm text-[color:var(--text-muted)]">
                  No lost deals in this filter
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={reasonChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {reasonChartData.map((entry, i) => (
                        <Cell
                          key={entry.reason}
                          fill={
                            entry.reason === 'UNCATEGORIZED'
                              ? chartColors.gold
                              : REASON_COLORS[i % REASON_COLORS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieInrTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {reasonChartData.length > 0 ? (
                <ul className="mt-1 max-h-36 space-y-1 overflow-y-auto text-xs text-[color:var(--text-secondary)]">
                  {reasonChartData.map((r, i) => (
                    <li key={r.reason} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{
                            background:
                              r.reason === 'UNCATEGORIZED'
                                ? chartColors.gold
                                : REASON_COLORS[i % REASON_COLORS.length],
                          }}
                        />
                        <span className="truncate">{r.name}</span>
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {r.count} · {formatInr(r.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </ChartPanel>

            <ChartPanel
              title="Competition subtypes"
              subtitle="Only deals tagged Lost to Competition"
            >
              {competitionChartData.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center text-sm text-[color:var(--text-muted)]">
                  No competition-tagged losses yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={competitionChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fill: chartColors.axisText, fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fill: chartColors.axisText, fontSize: 10 }}
                    />
                    <Tooltip content={<InrTooltip />} />
                    <Bar dataKey="value" fill={chartColors.red} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>

            <ChartPanel title="Lost ₹ by salesperson" subtitle="Deal value on Lost projects">
              {salesChartData.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center text-sm text-[color:var(--text-muted)]">
                  No lost deals in this filter
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, salesChartData.length * 36)}>
                  <BarChart
                    data={salesChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fill: chartColors.axisText, fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fill: chartColors.axisText, fontSize: 11 }}
                    />
                    <Tooltip content={<InrTooltip />} />
                    <Bar dataKey="value" fill={chartColors.teal} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>

            <ChartPanel title="Lost by financial year" subtitle="Count and value by FY">
              {fyChartData.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center text-sm text-[color:var(--text-muted)]">
                  No lost deals in this filter
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={fyChartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                    <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: chartColors.axisText, fontSize: 11 }} />
                    <YAxis tick={{ fill: chartColors.axisText, fontSize: 11 }} />
                    <Tooltip content={<InrTooltip />} />
                    <Bar dataKey="value" fill={chartColors.blue} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>
          </div>

          <div className="rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="zenith-display text-sm font-semibold text-[color:var(--text-primary)] sm:text-[15px]">
                Lost projects
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {uncategorizedOnly ? (
                  <button
                    type="button"
                    onClick={() => setUncategorizedOnly(false)}
                    className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-elevated,var(--bg-card))] px-2.5 py-1 text-xs font-semibold text-[color:var(--text-primary)]"
                  >
                    Uncategorized ×
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setUncategorizedOnly(true)}
                    className="rounded-lg border border-dashed border-[color:var(--border-default)] px-2.5 py-1 text-xs font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                  >
                    Filter: uncategorized
                  </button>
                )}
                <span className="text-xs text-[color:var(--text-muted)]">
                  {tableProjects.length} shown
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] text-[11px] uppercase tracking-wide text-[color:var(--text-muted)]">
                    {(
                      [
                        { key: 'slNo', label: '#', align: 'left' },
                        { key: 'customerName', label: 'Customer', align: 'left' },
                        { key: 'salespersonName', label: 'Sales', align: 'left' },
                        { key: 'year', label: 'FY', align: 'left' },
                        { key: 'projectCost', label: 'Value', align: 'right' },
                        { key: 'lostReason', label: 'Reason', align: 'left' },
                        { key: 'lostDate', label: 'Lost date', align: 'left' },
                      ] as const
                    ).map((col) => (
                      <th
                        key={col.key}
                        scope="col"
                        className={`px-2 py-2 font-medium ${col.align === 'right' ? 'text-right' : ''}`}
                        aria-sort={headerAriaSort(col.key)}
                      >
                        <button
                          type="button"
                          className={`${SORT_BTN} ${col.align === 'right' ? 'justify-end' : ''}`}
                          onClick={() => handleColumnSort(col.key)}
                          title={`Sort by ${col.label}`}
                        >
                          <span className={SORT_LABEL}>{col.label}</span>
                          <LostSortGlyph active={sortKey === col.key} />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableProjects.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-2 py-8 text-center text-[color:var(--text-muted)]"
                      >
                        No projects match this view
                      </td>
                    </tr>
                  ) : (
                    tableProjects.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-[color:var(--border-default)]/60 hover:bg-[color:var(--bg-hover,transparent)]"
                      >
                        <td className="px-2 py-2 tabular-nums text-[color:var(--text-secondary)]">
                          <Link
                            to={`/projects/${p.id}`}
                            className="font-semibold text-[color:var(--accent-teal)] hover:underline"
                          >
                            {p.slNo ?? '—'}
                          </Link>
                        </td>
                        <td className="max-w-[12rem] truncate px-2 py-2 text-[color:var(--text-primary)]">
                          <Link to={`/projects/${p.id}`} className="hover:underline">
                            {p.customerName || '—'}
                          </Link>
                        </td>
                        <td className="px-2 py-2 text-[color:var(--text-secondary)]">
                          {p.salespersonName || '—'}
                        </td>
                        <td className="px-2 py-2 tabular-nums text-[color:var(--text-secondary)]">
                          {p.year || '—'}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-[color:var(--text-primary)]">
                          {formatInr(Number(p.projectCost) || 0)}
                        </td>
                        <td className="px-2 py-2 text-[color:var(--text-secondary)]">
                          {p.lostReason
                            ? reasonDisplayLabel(p.lostReason)
                            : (
                              <span className="text-[color:var(--accent-gold)]">Uncategorized</span>
                            )}
                        </td>
                        <td className="px-2 py-2 tabular-nums text-[color:var(--text-secondary)]">
                          {formatShortDate(p.lostDate)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>,
  )
}

export default LostDeals
