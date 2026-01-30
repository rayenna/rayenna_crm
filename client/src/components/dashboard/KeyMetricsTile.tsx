import { FaBolt, FaChartLine, FaRupeeSign } from 'react-icons/fa'

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

function YoYBadge({ yoY }: { yoY: { value: number | null; label: string } }) {
  if (yoY.label === 'N/A') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300">
        N/A
      </span>
    )
  }
  const value = yoY.value!
  const isPositive = value > 0
  const isZero = value === 0
  const colorClass = isZero
    ? 'text-amber-700 bg-amber-100 border-amber-300'
    : isPositive
    ? 'text-emerald-700 bg-emerald-100 border-emerald-400'
    : 'text-red-700 bg-red-100 border-red-400'
  const Arrow = isZero ? (
    <span className="text-amber-600" aria-hidden>→</span>
  ) : isPositive ? (
    <span className="text-emerald-600" aria-hidden>↑</span>
  ) : (
    <span className="text-red-600" aria-hidden>↓</span>
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
}: KeyMetricsTileProps) => {
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
    bgLight: string
  }> = [
    {
      key: 'capacity',
      label: 'Total Capacity',
      value: formatCapacity(capacity),
      yoY: capacityYoY,
      icon: <FaBolt className="w-5 h-5 sm:w-6 sm:h-6" />,
      gradient: 'from-amber-500 to-orange-500',
      bgLight: 'bg-amber-50',
    },
    {
      key: 'pipeline',
      label: 'Total Pipeline',
      value: formatCurrency(pipeline),
      yoY: pipelineYoY,
      icon: <FaChartLine className="w-5 h-5 sm:w-6 sm:h-6" />,
      gradient: 'from-violet-500 to-purple-600',
      bgLight: 'bg-violet-50',
    },
    {
      key: 'revenue',
      label: 'Total Revenue',
      value: formatCurrency(revenue),
      yoY: revenueYoY,
      icon: <FaRupeeSign className="w-5 h-5 sm:w-6 sm:h-6" />,
      gradient: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50',
    },
    {
      key: 'profit',
      label: 'Total Profit',
      value: profit != null ? formatCurrency(profit) : '—',
      yoY: profitYoY,
      icon: <FaRupeeSign className="w-5 h-5 sm:w-6 sm:h-6" />,
      gradient: 'from-rose-500 to-pink-600',
      bgLight: 'bg-rose-50',
    },
  ]

  return (
    <div className="w-full rounded-2xl border-2 border-primary-200/60 bg-gradient-to-br from-white via-primary-50/30 to-white shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 min-h-0">
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(0,0.7fr)_1.1fr_1.1fr_1.1fr] gap-4 sm:gap-5 xl:gap-6">
          {metrics.map((m) => (
            <div
              key={m.key}
              className={`relative flex flex-col rounded-xl ${m.bgLight} p-4 sm:p-6 border border-white/80 shadow-sm hover:shadow-md transition-shadow min-w-0`}
            >
              {/* YoY badge – top right */}
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                <YoYBadge yoY={m.yoY} />
              </div>
              {/* Icon – top left */}
              <div
                className={`flex-shrink-0 flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${m.gradient} text-white shadow-md mb-3 sm:mb-4`}
              >
                {m.icon}
              </div>
              {/* Main value – single line on xl, full value in title */}
              <div className="flex-1 min-w-0 mt-auto overflow-hidden">
                <div className="text-xl sm:text-2xl lg:text-3xl xl:text-2xl xl:whitespace-nowrap xl:min-w-0 xl:overflow-hidden xl:text-ellipsis font-extrabold text-gray-900 leading-tight" title={m.value}>
                  {m.value}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-gray-600 mt-1 truncate" title={m.label}>
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
