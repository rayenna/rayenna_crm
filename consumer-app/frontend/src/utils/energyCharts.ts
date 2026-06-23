import type { EnergyReading } from '@/types/energy'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function monthLabel(month: number, year: number): string {
  return `${MONTHS[month - 1] ?? 'Month'} ${year}`
}

export function distributionFromReading(reading: EnergyReading) {
  const selfConsumed = Math.min(reading.totalConsumed, reading.totalGenerated)
  const gridExport = Math.max(0, reading.totalGenerated - selfConsumed)
  const gridImport = Math.max(0, reading.totalConsumed - selfConsumed)
  const total = selfConsumed + gridExport + gridImport || 1
  return [
    {
      name: 'Self Consumed',
      value: selfConsumed,
      percent: Math.round((selfConsumed / total) * 100),
      fill: 'var(--accent-green)',
    },
    {
      name: 'Grid Export',
      value: gridExport,
      percent: Math.round((gridExport / total) * 100),
      fill: 'var(--accent-gold)',
    },
    {
      name: 'Grid Import',
      value: gridImport,
      percent: Math.round((gridImport / total) * 100),
      fill: 'var(--text-muted)',
    },
  ]
}

export type ChartPeriod = 'today' | 'week' | 'month' | 'year'

export function buildAreaChartData(
  reading: EnergyReading | undefined,
  annualMonths: EnergyReading[] | undefined,
  period: ChartPeriod,
) {
  if (period === 'today' && reading?.dailyReadings?.length) {
    return reading.dailyReadings.map((p) => ({
      label: p.label,
      generated: p.generated,
      consumed: p.consumed,
    }))
  }

  if (period === 'year' && annualMonths?.length) {
    return annualMonths.map((m) => ({
      label: SHORT_MONTHS[m.month - 1],
      generated: m.totalGenerated,
      consumed: m.totalConsumed,
    }))
  }

  if (!reading) return []

  const daysInMonth = new Date(reading.year, reading.month, 0).getDate()
  const dailyGen = reading.totalGenerated / daysInMonth;
  const dailyCon = reading.totalConsumed / daysInMonth;

  if (period === 'week') {
    return Array.from({ length: 7 }, (_, i) => ({
      label: `D${i + 1}`,
      generated: Math.round(dailyGen * 1.1 * 10) / 10,
      consumed: Math.round(dailyCon * 1.05 * 10) / 10,
    }))
  }

  // month — daily totals
  return Array.from({ length: Math.min(daysInMonth, 30) }, (_, i) => {
    const day = i + 1
    const wave = 0.85 + 0.15 * Math.sin((day / daysInMonth) * Math.PI)
    return {
      label: String(day),
      generated: Math.round(dailyGen * wave * 10) / 10,
      consumed: Math.round(dailyCon * wave * 0.95 * 10) / 10,
    }
  })
}

export function formatKwh(n: number): string {
  return `${Math.round(n).toLocaleString('en-IN')} kWh`
}

export function formatRupee(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

export function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}
