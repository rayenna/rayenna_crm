import { useMemo, useState, type FormEvent, type ReactElement } from 'react'
import toast from 'react-hot-toast'
import {
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
import { Calendar, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import HelpContextSuggestions from '@/components/HelpContextSuggestions'
import { useAnnualEnergy, useLogMonthlyEnergy, useMonthlyEnergy } from '@/hooks/useConsumerEnergy'
import {
  distributionFromReading,
  formatKwh,
  formatRupee,
  monthLabel,
  shiftMonth,
} from '@/utils/energyCharts'

const CHART_GREEN = '#10B981'
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

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="zenith-glass rounded-2xl p-4">
      <p className="text-xs font-medium text-[color:var(--text-muted)]">{label}</p>
      <p className="zenith-kpi-value mt-1 text-lg font-bold text-[color:var(--text-primary)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[10px] text-[color:var(--text-tertiary)]">{hint}</p>
      ) : null}
    </div>
  )
}

function isCurrentOrPastMonth(year: number, month: number, now = new Date()) {
  return year * 12 + month <= now.getFullYear() * 12 + (now.getMonth() + 1)
}

export default function Track() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [kwhInput, setKwhInput] = useState('')

  const monthlyQuery = useMonthlyEnergy(year, month)
  const annualQuery = useAnnualEnergy(year, true)
  const logMutation = useLogMonthlyEnergy()

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
      { totalGenerated: 0, totalConsumed: 0, totalSavings: 0, gridExport: 0 },
    )
  }, [annualMonths])

  const stats = viewMode === 'year' && ytd ? ytd : reading
  const monthIsEstimated = reading?.isEstimated !== false
  const canLog = viewMode === 'month' && isCurrentOrPastMonth(year, month)

  const distribution = useMemo(
    () => (reading ? distributionFromReading(reading) : []),
    [reading],
  )

  const savingsTrend = useMemo(
    () =>
      (annualMonths ?? []).map((m) => ({
        name: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][m.month - 1],
        savings: m.totalSavings,
      })),
    [annualMonths],
  )

  const disclaimer = viewMode === 'year' ? annualQuery.data?.disclaimer : reading?.disclaimer

  const goPrev = () => {
    if (viewMode === 'year') setYear((y) => y - 1)
    else {
      const next = shiftMonth(year, month, -1)
      setYear(next.year)
      setMonth(next.month)
      setKwhInput('')
    }
  }

  const goNext = () => {
    if (viewMode === 'year') {
      if (year < now.getFullYear()) setYear((y) => y + 1)
      return
    }
    const next = shiftMonth(year, month, 1)
    if (!isCurrentOrPastMonth(next.year, next.month, now)) return
    setYear(next.year)
    setMonth(next.month)
    setKwhInput('')
  }

  const handleLog = async (e: FormEvent) => {
    e.preventDefault()
    const totalGenerated = Number(kwhInput)
    if (!Number.isFinite(totalGenerated) || totalGenerated < 0) {
      toast.error('Enter this month’s inverter kWh')
      return
    }
    try {
      await logMutation.mutateAsync({ year, month, totalGenerated })
      toast.success('Generation saved for this month')
      setKwhInput('')
    } catch {
      toast.error('Could not save generation. Try again.')
    }
  }

  const isLoading = monthlyQuery.isLoading || (viewMode === 'year' && annualQuery.isLoading)
  const splitHint = 'Typical split, not the meter'

  return (
    <div className="min-w-0 overflow-x-clip px-4 py-6 pb-8">
      <header className="mb-4">
        <h1 className="zenith-display text-2xl font-bold text-[color:var(--text-primary)]">
          Track
        </h1>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
          {viewMode === 'year'
            ? annualQuery.data?.isEstimated
              ? 'Year so far — expected months until you log inverter kWh'
              : 'Year so far — logged inverter generation'
            : monthIsEstimated
              ? 'Expected generation for your plant size'
              : 'Monthly generation from your inverter log'}
        </p>
      </header>

      {disclaimer ? (
        <div className="mb-4 flex gap-2 rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-3 py-2 text-xs font-medium text-[color:var(--text-secondary)]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--accent-gold)]" />
          <span>{disclaimer}</span>
        </div>
      ) : null}

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
              label={
                viewMode === 'year'
                  ? 'Generated (YTD)'
                  : monthIsEstimated
                    ? 'Expected generated'
                    : 'Generated'
              }
              value={stats ? formatKwh(stats.totalGenerated) : '—'}
            />
            <StatCard
              label="Self-use (typical)"
              value={stats ? formatKwh(stats.totalConsumed) : '—'}
              hint={splitHint}
            />
            <StatCard
              label="Export (typical)"
              value={stats ? formatKwh(stats.gridExport) : '—'}
              hint={splitHint}
            />
            <StatCard
              label="Typical savings"
              value={stats ? formatRupee(stats.totalSavings) : '—'}
              hint="Not from your bill"
            />
          </div>

          {canLog ? (
            <section className="zenith-glass mb-4 rounded-2xl p-4">
              <h2 className="text-sm font-bold text-[color:var(--text-primary)]">
                Log this month’s inverter kWh
              </h2>
              <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                Use this month’s generation from the inverter screen or SolisCloud / ShinePhone.
                Do not use the KSEB bill (export is not total generation). Linked Solis plants
                update Hub automatically.
              </p>
              <form onSubmit={handleLog} className="mt-3 flex gap-2">
                <input
                  type="number"
                  min={0}
                  max={50000}
                  step="1"
                  inputMode="decimal"
                  value={kwhInput}
                  onChange={(e) => setKwhInput(e.target.value)}
                  placeholder={
                    reading && !reading.isEstimated
                      ? String(Math.round(reading.totalGenerated))
                      : 'kWh'
                  }
                  className="min-w-0 flex-1 rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-placeholder)] outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-border)]"
                  aria-label="This month’s generation in kWh"
                />
                <button
                  type="submit"
                  disabled={logMutation.isPending}
                  className="shrink-0 rounded-xl bg-[color:var(--accent-green)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  {logMutation.isPending
                    ? 'Saving…'
                    : reading && !reading.isEstimated
                      ? 'Update'
                      : 'Save'}
                </button>
              </form>
            </section>
          ) : null}

          <HelpContextSuggestions screen="track" className="mb-4" title="Help for your energy data" />

          {viewMode === 'month' && distribution.length > 0 ? (
            <section className="zenith-glass mb-4 min-w-0 overflow-hidden rounded-2xl p-4">
              <h2 className="text-sm font-bold text-[color:var(--text-primary)]">Typical energy split</h2>
              <p className="mb-3 text-xs text-[color:var(--text-muted)]">
                Assumed from your monthly kWh — not live metering
              </p>
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
          ) : null}

          <section className="zenith-glass min-w-0 overflow-hidden rounded-2xl p-4">
            <h2 className="mb-1 text-sm font-bold text-[color:var(--text-primary)]">
              Monthly savings trend
            </h2>
            <p className="mb-3 text-xs text-[color:var(--text-muted)]">
              Typical rupee estimate from generation — not your KSEB bill
            </p>
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
