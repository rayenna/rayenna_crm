import { useMemo, useState, type ReactElement } from 'react'
import toast from 'react-hot-toast'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Calendar, ChevronLeft, ChevronRight, Download, Info } from 'lucide-react'
import HelpContextSuggestions from '@/components/HelpContextSuggestions'
import { useAnnualEnergy, useMonthlyEnergy } from '@/hooks/useConsumerEnergy'
import {
  buildAreaChartData,
  distributionFromReading,
  formatKwh,
  formatRupee,
  monthLabel,
  shiftMonth,
  type ChartPeriod,
} from '@/utils/energyCharts'

const CHART_GREEN = '#10B981'
const CHART_AMBER = '#F5A623'
const AREA_CHART_H = 208
const PIE_CHART_H = 224
const BAR_CHART_H = 208

type ViewMode = 'month' | 'year'

function HubChart({
  height,
  className = '',
  children,
}: {
  height: number
  className?: string
  children: ReactElement
}) {
  return (
    <div className={`hub-chart-slot w-full min-w-0 ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height={height} debounce={250} minWidth={0}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="zenith-glass rounded-2xl p-4">
      <p className="text-xs font-medium text-[color:var(--text-muted)]">{label}</p>
      <p className="zenith-kpi-value mt-1 text-lg font-bold text-[color:var(--text-primary)]">
        {value}
      </p>
    </div>
  )
}

function PeriodTabs({
  value,
  onChange,
}: {
  value: ChartPeriod
  onChange: (p: ChartPeriod) => void
}) {
  const tabs: { id: ChartPeriod; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
  ]
  return (
    <div className="w-full min-w-0 rounded-xl bg-[color:var(--bg-badge)] p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={[
            'flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition',
            value === t.id
              ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
              : 'text-[color:var(--text-muted)]',
          ].join(' ')}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export default function Track() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('today')

  const monthlyQuery = useMonthlyEnergy(year, month)
  const annualQuery = useAnnualEnergy(year, true)

  const reading = monthlyQuery.data
  const annualMonths = annualQuery.data?.months

  const ytd = useMemo(() => {
    if (!annualMonths?.length) return null
    return annualMonths.reduce(
      (acc, m) => ({
        totalGenerated: acc.totalGenerated + m.totalGenerated,
        totalConsumed: acc.totalConsumed + m.totalConsumed,
        gridExport: acc.gridExport + m.gridExport,
        totalSavings: acc.totalSavings + m.totalSavings,
      }),
      { totalGenerated: 0, totalConsumed: 0, gridExport: 0, totalSavings: 0 },
    )
  }, [annualMonths])

  const stats = viewMode === 'year' && ytd ? ytd : reading

  const distribution = useMemo(
    () => (reading ? distributionFromReading(reading) : []),
    [reading],
  )

  const areaData = useMemo(
    () => buildAreaChartData(reading, annualMonths, chartPeriod),
    [reading, annualMonths, chartPeriod],
  )

  const savingsTrend = useMemo(
    () =>
      (annualMonths ?? []).map((m) => ({
        name: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][m.month - 1],
        savings: m.totalSavings,
      })),
    [annualMonths],
  )

  const disclaimer = reading?.disclaimer ?? annualQuery.data?.disclaimer

  const goPrev = () => {
    if (viewMode === 'year') setYear((y) => y - 1)
    else {
      const next = shiftMonth(year, month, -1)
      setYear(next.year)
      setMonth(next.month)
    }
  }

  const goNext = () => {
    if (viewMode === 'year') setYear((y) => y + 1)
    else {
      const next = shiftMonth(year, month, 1)
      setYear(next.year)
      setMonth(next.month)
    }
  }

  const isLoading = monthlyQuery.isLoading || (viewMode === 'year' && annualQuery.isLoading)

  return (
    <div className="min-w-0 overflow-x-clip px-4 py-6 pb-8">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="zenith-display text-2xl font-bold text-[color:var(--text-primary)]">
            Track
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            Energy performance dashboard
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast('Monthly PDF report — coming soon')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] text-[color:var(--text-secondary)]"
          aria-label="Download report"
        >
          <Download className="h-4 w-4" />
        </button>
      </header>

      {disclaimer && (
        <div className="mb-4 flex gap-2 rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-3 py-2 text-xs text-[color:var(--text-secondary)]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--accent-gold)]" />
          <span>{disclaimer}</span>
        </div>
      )}

      <div className="zenith-glass mb-4 rounded-2xl p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-badge)]"
            aria-label="Previous period"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-[color:var(--accent-gold)]" />
            <span className="truncate text-sm font-semibold text-[color:var(--text-primary)]">
              {viewMode === 'year' ? String(year) : monthLabel(month, year)}
            </span>
          </div>
          <button
            type="button"
            onClick={goNext}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-badge)]"
            aria-label="Next period"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          {(['month', 'year'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={[
                'flex-1 rounded-full py-1.5 text-xs font-bold capitalize',
                viewMode === mode
                  ? 'bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)]'
                  : 'bg-[color:var(--bg-badge)] text-[color:var(--text-muted)]',
              ].join(' ')}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--accent-gold)] border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="mb-4 grid min-w-0 grid-cols-2 gap-3">
            <StatCard
              label="Total Generated"
              value={stats ? formatKwh(stats.totalGenerated) : '—'}
            />
            <StatCard
              label="Total Consumed"
              value={stats ? formatKwh(stats.totalConsumed) : '—'}
            />
            <StatCard label="Grid Export" value={stats ? formatKwh(stats.gridExport) : '—'} />
            <StatCard
              label="Total Savings"
              value={stats ? formatRupee(stats.totalSavings) : '—'}
            />
          </div>

          <HelpContextSuggestions screen="track" className="mb-4" title="Help for your energy data" />

          {viewMode === 'month' && (
            <>
              <section className="zenith-glass mb-4 min-w-0 overflow-hidden rounded-2xl p-4">
                <h2 className="mb-3 text-sm font-bold text-[color:var(--text-primary)]">
                  Energy Overview
                </h2>
                <PeriodTabs value={chartPeriod} onChange={setChartPeriod} />
                <HubChart height={AREA_CHART_H} className="mt-4">
                  <AreaChart data={areaData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: 'var(--chart-axis-text)', fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fill: 'var(--chart-axis-text)', fontSize: 10 }} width={36} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--chart-tooltip-bg)',
                          border: '1px solid var(--chart-tooltip-border)',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area
                        type="monotone"
                        dataKey="generated"
                        name="Generated"
                        stroke={CHART_GREEN}
                        fill={CHART_GREEN}
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="consumed"
                        name="Consumed"
                        stroke={CHART_AMBER}
                        fill={CHART_AMBER}
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </AreaChart>
                </HubChart>
              </section>

              <section className="zenith-glass mb-4 min-w-0 overflow-hidden rounded-2xl p-4">
                <h2 className="mb-3 text-sm font-bold text-[color:var(--text-primary)]">
                  Energy Distribution
                </h2>
                <HubChart height={PIE_CHART_H}>
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie
                        data={distribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={76}
                        paddingAngle={2}
                      >
                        {distribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [
                          `${Math.round(Number(value) || 0)} kWh`,
                          String(name),
                        ]}
                        contentStyle={{
                          background: 'var(--chart-tooltip-bg)',
                          border: '1px solid var(--chart-tooltip-border)',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, width: '100%' }}
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                      />
                    </PieChart>
                </HubChart>
              </section>
            </>
          )}

          <section className="zenith-glass min-w-0 overflow-hidden rounded-2xl p-4">
            <h2 className="mb-3 text-sm font-bold text-[color:var(--text-primary)]">
              Monthly Savings Trend
            </h2>
            <HubChart height={BAR_CHART_H}>
              <BarChart data={savingsTrend} margin={{ top: 8, right: 4, left: -4, bottom: 0 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--chart-axis-text)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--chart-axis-text)', fontSize: 10 }} width={40} />
                  <Tooltip
                    formatter={(v) => [formatRupee(Number(v) || 0), 'Savings']}
                    contentStyle={{
                      background: 'var(--chart-tooltip-bg)',
                      border: '1px solid var(--chart-tooltip-border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="savings" name="Savings" fill={CHART_GREEN} radius={[4, 4, 0, 0]} />
                </BarChart>
            </HubChart>
          </section>
        </>
      )}
    </div>
  )
}
