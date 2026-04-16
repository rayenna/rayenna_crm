import { FaBolt, FaChartLine, FaPercent, FaRupeeSign } from 'react-icons/fa'

export interface FYRow {
  fy: string
  totalProjectValue: number
  totalProfit: number
  totalCapacity?: number
  totalPipeline?: number
}

export interface PreviousYearSamePeriod {
  totalCapacity: number
  totalPipeline: number
  totalRevenue: number
  totalProfit: number
}

interface KeyMetricsTileProps {
  capacity: number
  pipeline: number
  revenue: number
  profit: number | null
  projectValueProfitByFY: FYRow[]
  /** When exactly one FY is selected, YoY is current vs previous year; if previous is missing/zero, show N/A */
  selectedFYs?: string[]
  /** When one FY + quarter/month selected, API returns same period in previous year for YoY */
  previousYearSamePeriod?: PreviousYearSamePeriod | null
  variant?: 'default' | 'zenith'
}

/** e.g. "2024-25" -> "2023-24", "2024-2025" -> "2023-2024" */
function getPreviousFY(fy: string): string {
  const s = String(fy).trim()
  const twoDigit = s.match(/^(\d{4})-(\d{2})$/)
  if (twoDigit) {
    const start = parseInt(twoDigit[1], 10)
    const end = parseInt(twoDigit[2], 10)
    return `${start - 1}-${String(end - 1).padStart(2, '0')}`
  }
  const fourDigit = s.match(/^(\d{4})-(\d{4})$/)
  if (fourDigit) {
    const start = parseInt(fourDigit[1], 10)
    const end = parseInt(fourDigit[2], 10)
    return `${start - 1}-${end - 1}`
  }
  return ''
}

function computeYoY(
  current: number,
  previous: number | null | undefined
): { value: number | null; label: string } {
  if (previous == null || previous === 0) return { value: null, label: 'N/A' }
  const pct = ((current - previous) / previous) * 100
  return { value: pct, label: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` }
}

function YoYBadge({ yoY, variant = 'default' }: { yoY: { value: number | null; label: string }; variant?: 'default' | 'zenith' }) {
  const isZenith = variant === 'zenith'
  if (yoY.label === 'N/A') {
    return (
      <span
        className={
          isZenith
            ? 'inline-flex items-center gap-0.5 rounded-full border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-2 py-0.5 text-xs font-extrabold text-[color:var(--accent-gold)]'
            : 'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300'
        }
      >
        N/A
      </span>
    )
  }
  const value = yoY.value!
  const isPositive = value > 0
  const isZero = value === 0
  const colorClass = isZenith
    ? (isZero
        ? 'border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
        : isPositive
          ? 'border-[color:var(--accent-teal-border)] bg-[color:var(--accent-teal-muted)] text-[color:var(--accent-teal)]'
          : 'border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] text-[color:var(--accent-red)]')
    : (isZero
        ? 'text-amber-700 bg-amber-100 border-amber-300'
        : isPositive
          ? 'text-emerald-700 bg-emerald-100 border-emerald-400'
          : 'text-red-700 bg-red-100 border-red-400')
  const Arrow = isZero ? (
    <span className={isZenith ? 'text-[color:var(--accent-gold)]' : 'text-amber-600'} aria-hidden>→</span>
  ) : isPositive ? (
    <span className={isZenith ? 'text-[color:var(--accent-teal)]' : 'text-emerald-600'} aria-hidden>↑</span>
  ) : (
    <span className={isZenith ? 'text-[color:var(--accent-red)]' : 'text-red-600'} aria-hidden>↓</span>
  )
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold border ${colorClass}`}
    >
      {Arrow}
      <span>{yoY.label}</span>
    </span>
  )
}

const KeyMetricsTile = ({
  capacity,
  pipeline,
  revenue,
  profit,
  projectValueProfitByFY,
  selectedFYs,
  previousYearSamePeriod,
  variant = 'default',
}: KeyMetricsTileProps) => {
  const isZenith = variant === 'zenith'
  // YoY is only relevant when exactly one FY is selected (optionally with quarter/month).
  // Default view (no FY) or multiple FYs → show N/A for all YoY.
  const singleFYSelected = selectedFYs?.length === 1
  const selectedFY = singleFYSelected ? selectedFYs[0]! : null
  const previousFYLabel = selectedFY ? getPreviousFY(selectedFY) : null

  const naYoY = { value: null as number | null, label: 'N/A' }

  // When quarter/month selected, API returns previousYearSamePeriod (same period in previous year).
  // Use displayed metrics as current and previousYearSamePeriod as previous.
  const usePeriodYoY = singleFYSelected && previousYearSamePeriod != null

  let capacityPrevious: number | undefined
  let pipelinePrevious: number | undefined
  let revenuePrevious: number | undefined
  let profitPrevious: number | undefined

  if (usePeriodYoY) {
    capacityPrevious = previousYearSamePeriod.totalCapacity
    pipelinePrevious = previousYearSamePeriod.totalPipeline
    revenuePrevious = previousYearSamePeriod.totalRevenue
    profitPrevious = previousYearSamePeriod.totalProfit
  } else if (singleFYSelected && selectedFY) {
    const previousRow = previousFYLabel
      ? projectValueProfitByFY.find((r) => r.fy === previousFYLabel)
      : undefined
    revenuePrevious = previousRow?.totalProjectValue
    profitPrevious = previousRow?.totalProfit
    capacityPrevious = previousRow?.totalCapacity
    pipelinePrevious = previousRow?.totalPipeline
  }

  const capacityYoY = singleFYSelected
    ? computeYoY(capacity, capacityPrevious)
    : naYoY
  const pipelineYoY = singleFYSelected
    ? computeYoY(pipeline, pipelinePrevious)
    : naYoY
  const revenueYoY = singleFYSelected
    ? computeYoY(revenue, revenuePrevious)
    : naYoY
  const profitYoY =
    singleFYSelected && profit != null
      ? computeYoY(profit, profitPrevious)
      : naYoY

  // Pipeline Conversion = (Total Revenue / Total Pipeline) x 100 %. YoY = current vs previous year same period.
  const pipelineConversion =
    pipeline > 0 ? (revenue / pipeline) * 100 : null
  const pipelineConversionPrevious =
    pipelinePrevious != null && pipelinePrevious > 0 && revenuePrevious != null
      ? (revenuePrevious / pipelinePrevious) * 100
      : null
  const pipelineConversionYoY = singleFYSelected
    ? computeYoY(pipelineConversion ?? 0, pipelineConversionPrevious)
    : naYoY
  // When current or previous conversion is N/A, show N/A for YoY
  const conversionYoY =
    pipelineConversion == null
      ? naYoY
      : pipelineConversionPrevious == null && singleFYSelected
      ? naYoY
      : pipelineConversionYoY

  const formatCurrency = (n: number) =>
    `₹${Math.round(n).toLocaleString('en-IN')}`
  const formatCapacity = (n: number) => `${Math.round(n)} kW`

  const metrics: Array<{
    key: string
    label: string
    value: string
    yoY: { value: number | null; label: string }
    icon: React.ReactNode
    gradient: string
  }> = [
    {
      key: 'capacity',
      label: 'Total Capacity',
      value: formatCapacity(capacity),
      yoY: capacityYoY,
      icon: <FaBolt className="w-5 h-5 sm:w-6 sm:h-6" />,
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      key: 'pipeline',
      label: 'Total Pipeline',
      value: formatCurrency(pipeline),
      yoY: pipelineYoY,
      icon: <FaChartLine className="w-5 h-5 sm:w-6 sm:h-6" />,
      gradient: 'from-violet-500 to-purple-600',
    },
    {
      key: 'revenue',
      label: 'Total Revenue',
      value: formatCurrency(revenue),
      yoY: revenueYoY,
      icon: <FaRupeeSign className="w-5 h-5 sm:w-6 sm:h-6" />,
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      key: 'profit',
      label: 'Total Profit',
      value: profit != null ? formatCurrency(profit) : '—',
      yoY: profitYoY,
      icon: <FaRupeeSign className="w-5 h-5 sm:w-6 sm:h-6" />,
      gradient: 'from-rose-500 to-pink-600',
    },
    {
      key: 'conversion',
      label: 'Pipeline Conversion',
      value:
        pipelineConversion != null
          ? `${pipelineConversion.toFixed(1)}%`
          : '—',
      yoY: conversionYoY,
      icon: <FaPercent className="w-5 h-5 sm:w-6 sm:h-6" />,
      gradient: 'from-indigo-500 to-blue-600',
    },
  ]

  return (
    <div
      className={
        isZenith
          ? 'w-full min-h-0 overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]'
          : 'w-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300 min-h-0'
      }
    >
      <div className="p-4 sm:p-6 lg:px-4 lg:py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_1.65fr_1.65fr_1.65fr_minmax(0,1fr)] gap-4 sm:gap-5 lg:gap-3">
          {metrics.map((m) => (
            <div
              key={m.key}
              className={
                isZenith
                  ? 'relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] p-4 shadow-sm sm:p-6 lg:p-4'
                  : 'relative flex flex-col rounded-xl bg-slate-50/70 p-4 sm:p-6 lg:p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow min-w-0 overflow-hidden'
              }
            >
              {/* YoY badge – top right */}
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                <YoYBadge yoY={m.yoY} variant={variant} />
              </div>
              {/* Icon – top left */}
              <div
                className={`mb-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm sm:mb-4 sm:h-11 sm:w-11 ${m.gradient} ${
                  isZenith ? 'text-[color:var(--text-inverse)]' : 'text-white'
                }`}
              >
                {m.icon}
              </div>
              {/* Main value – single line on xl, full value in title */}
              <div className="flex-1 min-w-0 mt-auto overflow-hidden">
                <div
                  className={`text-xl font-extrabold leading-tight sm:text-2xl lg:min-w-0 lg:overflow-hidden lg:text-ellipsis lg:text-xl lg:whitespace-nowrap ${
                    isZenith ? 'text-[color:var(--text-primary)]' : 'text-gray-900'
                  }`}
                  title={m.value}
                >
                  {m.value}
                </div>
                <div
                  className={`mt-1 truncate text-xs font-semibold sm:text-sm ${isZenith ? 'text-[color:var(--text-muted)]' : 'text-gray-600'}`}
                  title={m.label}
                >
                  {m.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default KeyMetricsTile
