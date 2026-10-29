/**
 * Sales Review report — achievement, forecast, and deal-list math.
 * Indian FY (Apr–Mar). KEEP UI copy in sync with client/src/help/content/modules/reports.md
 */

import { calculateFYInIst, calendarYmdInTimeZone } from './istCalendar'

export const SALES_REVIEW_REVENUE_STATUSES = [
  'CONFIRMED',
  'UNDER_INSTALLATION',
  'COMPLETED',
  'COMPLETED_SUBSIDY_CREDITED',
] as const

export const SALES_REVIEW_OPEN_STATUSES = [
  'LEAD',
  'SITE_SURVEY',
  'PROPOSAL',
  'CONFIRMED',
  'UNDER_INSTALLATION',
  'SUBMITTED_FOR_SUBSIDY',
] as const

export const SALES_REVIEW_STATUS_LABELS: Record<string, string> = {
  LEAD: 'Lead',
  SITE_SURVEY: 'Site Survey',
  PROPOSAL: 'Proposal',
  CONFIRMED: 'Confirmed Order',
  UNDER_INSTALLATION: 'Under Installation',
  SUBMITTED_FOR_SUBSIDY: 'Submitted for Subsidy',
  COMPLETED: 'Completed',
  COMPLETED_SUBSIDY_CREDITED: 'Completed - Subsidy Credited',
  LOST: 'Lost',
}

export const SALES_REVIEW_SYSTEM_TYPE_LABELS: Record<string, string> = {
  ON_GRID: 'On-grid',
  OFF_GRID: 'Off-grid',
  HYBRID: 'Hybrid',
}

export const SALES_REVIEW_CUSTOMER_TYPE_LABELS: Record<string, string> = {
  RESIDENTIAL: 'Residential',
  APARTMENT: 'Apartment',
  COMMERCIAL: 'Commercial',
}

export const SALES_REVIEW_SEGMENT_LABELS: Record<string, string> = {
  SUBSIDY: 'Subsidy',
  NON_SUBSIDY: 'Non-subsidy',
}

const REVENUE_SET = new Set<string>(SALES_REVIEW_REVENUE_STATUSES)
const OPEN_SET = new Set<string>(SALES_REVIEW_OPEN_STATUSES)

export type SalesReviewProjectInput = {
  id: string
  slNo: number | null
  projectStatus: string
  year: string
  projectCost: number | null
  grossProfit: number | null
  expectedProfit: number | null
  profitability: number | null
  salesProbability: number | null
  systemCapacity: number | null
  systemType: string | null
  type: string | null
  confirmationDate: Date | string | null
  expectedCommissioningDate: Date | string | null
  availingLoan: boolean | null
  salespersonId: string | null
  salespersonName: string | null
  customerName: string | null
  customerType: string | null
}

export type AchievementMetricRow = {
  key: 'revenue' | 'profit' | 'avgProfitability' | 'yoy' | 'deals' | 'capacityKw'
  label: string
  values: (number | null)[]
}

export type ForecastQuarterCol = {
  key: 'CQ' | 'NQ' | 'NQ1' | 'NQ2'
  label: string
  shortLabel: string
  fy: string
  quarter: 1 | 2 | 3 | 4
  startYmd: string
  endYmd: string
  months: { key: string; label: string; startYmd: string; endYmd: string }[]
}

export type ForecastMetricRow = {
  key: 'pipeline' | 'weighted' | 'closed' | 'lastYear' | 'yoy' | 'qoq'
  label: string
  values: (number | null)[]
  total: number | null
}

export type SalesReviewDeal = {
  id: string
  slNo: number | null
  customerName: string
  salespersonName: string | null
  stage: string
  stageStatus: string
  probability: number
  customerType: string | null
  customerTypeLabel: string
  systemType: string | null
  systemTypeLabel: string
  segment: string | null
  segmentLabel: string
  closeDate: string | null
  quarter: string | null
  fy: string | null
  bankLoan: boolean | null
  orderValue: number
  weightedValue: number
  capacityKw: number | null
  pastDue: boolean
  unscheduled: boolean
  forecastBucket: 'CQ' | 'NQ' | 'NQ1' | 'NQ2' | 'later' | 'unscheduled'
}

export type SalesReviewKpis = {
  closedYtdRevenue: number
  closedYtdProfit: number
  closedYtdDeals: number
  closedYtdKw: number
  openPipeline: number
  openWeighted: number
  openDeals: number
  pastDueDeals: number
  unscheduledDeals: number
  lostYtdValue: number
  lostYtdDeals: number
}

export type SalesReviewPayload = {
  generatedAt: string
  salespersonId: string | null
  currentFy: string
  achievement: {
    columns: { fy: string; ytd: boolean; label: string }[]
    rows: AchievementMetricRow[]
  }
  forecast: {
    columns: ForecastQuarterCol[]
    rows: ForecastMetricRow[]
    unscheduledPipeline: number
    unscheduledWeighted: number
    laterPipeline: number
    laterWeighted: number
  }
  deals: SalesReviewDeal[]
  kpis: SalesReviewKpis
}

type YmdParts = { y: number; m: number; d: number; ymd: string }

function toDate(v: Date | string | null | undefined): Date | null {
  if (v == null || v === '') return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function parseYmd(ymd: string): YmdParts | null {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return null
  return { y, m, d, ymd }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function ymdOf(date: Date): string {
  return calendarYmdInTimeZone(date)
}

function istParts(date: Date): YmdParts {
  return parseYmd(ymdOf(date)) ?? { y: 1970, m: 1, d: 1, ymd: '1970-01-01' }
}

export function previousFyLabel(fy: string): string {
  const m = String(fy).trim().match(/^(\d{4})-(\d{2})$/)
  if (!m) return ''
  const start = parseInt(m[1], 10)
  const end = parseInt(m[2], 10)
  return `${start - 1}-${String(end - 1).padStart(2, '0')}`
}

export function fyStartYear(fy: string): number {
  const m = String(fy).trim().match(/^(\d{4})/)
  return m ? parseInt(m[1], 10) : 0
}

export function indianFyQuarterFromMonth(month: number): 1 | 2 | 3 | 4 {
  if (month >= 4 && month <= 6) return 1
  if (month >= 7 && month <= 9) return 2
  if (month >= 10 && month <= 12) return 3
  return 4
}

function fyLabelFromParts(p: YmdParts): string {
  if (p.m >= 4) return `${p.y}-${String(p.y + 1).slice(-2)}`
  return `${p.y - 1}-${String(p.y).slice(-2)}`
}

function shiftQuarter(fy: string, q: 1 | 2 | 3 | 4, delta: number): { fy: string; quarter: 1 | 2 | 3 | 4 } {
  const start = fyStartYear(fy)
  const abs = start * 4 + (q - 1) + delta
  const fyStart = Math.floor(abs / 4)
  const quarter = ((abs % 4) + 4) % 4
  return { fy: `${fyStart}-${String(fyStart + 1).slice(-2)}`, quarter: (quarter + 1) as 1 | 2 | 3 | 4 }
}

function quarterBounds(fy: string, q: 1 | 2 | 3 | 4): { startYmd: string; endYmd: string } {
  const startY = fyStartYear(fy)
  if (q === 1) return { startYmd: `${startY}-04-01`, endYmd: `${startY}-06-30` }
  if (q === 2) return { startYmd: `${startY}-07-01`, endYmd: `${startY}-09-30` }
  if (q === 3) return { startYmd: `${startY}-10-01`, endYmd: `${startY}-12-31` }
  return { startYmd: `${startY + 1}-01-01`, endYmd: `${startY + 1}-03-31` }
}

function quarterMonths(fy: string, q: 1 | 2 | 3 | 4): ForecastQuarterCol['months'] {
  const startY = fyStartYear(fy)
  const specs: { m: number; y: number; label: string }[] =
    q === 1
      ? [
          { m: 4, y: startY, label: 'Apr' },
          { m: 5, y: startY, label: 'May' },
          { m: 6, y: startY, label: 'Jun' },
        ]
      : q === 2
        ? [
            { m: 7, y: startY, label: 'Jul' },
            { m: 8, y: startY, label: 'Aug' },
            { m: 9, y: startY, label: 'Sep' },
          ]
        : q === 3
          ? [
              { m: 10, y: startY, label: 'Oct' },
              { m: 11, y: startY, label: 'Nov' },
              { m: 12, y: startY, label: 'Dec' },
            ]
          : [
              { m: 1, y: startY + 1, label: 'Jan' },
              { m: 2, y: startY + 1, label: 'Feb' },
              { m: 3, y: startY + 1, label: 'Mar' },
            ]
  return specs.map((s) => ({
    key: `${s.y}-${pad2(s.m)}`,
    label: s.label,
    startYmd: `${s.y}-${pad2(s.m)}-01`,
    endYmd: `${s.y}-${pad2(s.m)}-${pad2(lastDayOfMonth(s.y, s.m))}`,
  }))
}

function sameCalendarDayLastYear(p: YmdParts): string {
  const y = p.y - 1
  const d = Math.min(p.d, lastDayOfMonth(y, p.m))
  return `${y}-${pad2(p.m)}-${pad2(d)}`
}

function num(v: number | null | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function dealValue(p: SalesReviewProjectInput): number {
  return num(p.projectCost)
}

function dealProfit(p: SalesReviewProjectInput): number {
  if (p.grossProfit != null && Number.isFinite(Number(p.grossProfit))) return Number(p.grossProfit)
  if (p.expectedProfit != null && Number.isFinite(Number(p.expectedProfit))) return Number(p.expectedProfit)
  return 0
}

export function dealWinRate(p: SalesReviewProjectInput): number {
  if (p.salesProbability != null && Number.isFinite(Number(p.salesProbability))) {
    return Math.min(1, Math.max(0, Number(p.salesProbability) / 100))
  }
  const defaults: Record<string, number> = {
    LEAD: 0.1,
    SITE_SURVEY: 0.2,
    PROPOSAL: 0.3,
    CONFIRMED: 0.75,
    UNDER_INSTALLATION: 1,
    SUBMITTED_FOR_SUBSIDY: 1,
    COMPLETED: 1,
    COMPLETED_SUBSIDY_CREDITED: 1,
    LOST: 0,
  }
  return defaults[p.projectStatus] ?? 0.1
}

function isRevenueDeal(p: SalesReviewProjectInput): boolean {
  return REVENUE_SET.has(p.projectStatus) && dealValue(p) > 0
}

function isOpenDeal(p: SalesReviewProjectInput): boolean {
  return OPEN_SET.has(p.projectStatus)
}

function ymdOfField(v: Date | string | null | undefined): string | null {
  const d = toDate(v)
  return d ? ymdOf(d) : null
}

function closeYmd(p: SalesReviewProjectInput): string | null {
  return ymdOfField(p.expectedCommissioningDate) ?? ymdOfField(p.confirmationDate)
}

function pctDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

function roundMoney(n: number): number {
  return Math.round(n)
}

function roundPct(n: number | null): number | null {
  if (n == null || !Number.isFinite(n)) return null
  return Math.round(n * 10) / 10
}

export function achievementFyColumns(now: Date): { fy: string; ytd: boolean; label: string }[] {
  const fy = calculateFYInIst(now) || fyLabelFromParts(istParts(now))
  const prev = previousFyLabel(fy)
  const prev2 = previousFyLabel(prev)
  return [
    { fy: prev2, ytd: false, label: `FY${prev2}` },
    { fy: prev, ytd: false, label: `FY${prev}` },
    { fy, ytd: true, label: `FY${fy} YTD` },
  ]
}

export function forecastQuarterColumns(now: Date): ForecastQuarterCol[] {
  const parts = istParts(now)
  const fy = fyLabelFromParts(parts)
  const q = indianFyQuarterFromMonth(parts.m)
  const keys: Array<ForecastQuarterCol['key']> = ['CQ', 'NQ', 'NQ1', 'NQ2']
  const shorts = ['CQ', 'NQ', 'NQ+1', 'NQ+2']
  return keys.map((key, i) => {
    const shifted = shiftQuarter(fy, q, i)
    const bounds = quarterBounds(shifted.fy, shifted.quarter)
    return {
      key,
      label: `${shorts[i]} · Q${shifted.quarter} FY${shifted.fy}`,
      shortLabel: shorts[i],
      fy: shifted.fy,
      quarter: shifted.quarter,
      startYmd: bounds.startYmd,
      endYmd: bounds.endYmd,
      months: quarterMonths(shifted.fy, shifted.quarter),
    }
  })
}

function bucketForYmd(
  ymd: string | null,
  cols: ForecastQuarterCol[],
): SalesReviewDeal['forecastBucket'] {
  if (!ymd) return 'unscheduled'
  if (ymd < cols[0].startYmd) return 'CQ'
  for (const col of cols) {
    if (ymd >= col.startYmd && ymd <= col.endYmd) return col.key
  }
  return 'later'
}

type MoneyAcc = { revenue: number; profit: number; deals: number; kw: number }

function emptyAcc(): MoneyAcc {
  return { revenue: 0, profit: 0, deals: 0, kw: 0 }
}

function addRevenue(acc: MoneyAcc, p: SalesReviewProjectInput) {
  acc.revenue += dealValue(p)
  acc.profit += dealProfit(p)
  acc.deals += 1
  acc.kw += num(p.systemCapacity)
}

export function buildSalesReview(
  projects: SalesReviewProjectInput[],
  now: Date = new Date(),
): SalesReviewPayload {
  const today = istParts(now)
  const todayYmd = today.ymd
  const ytdCutPrevYear = sameCalendarDayLastYear(today)
  const fyCols = achievementFyColumns(now)
  const qCols = forecastQuarterColumns(now)
  const currentFy = fyCols[2].fy
  const prevFy = fyCols[1].fy

  const fyAcc = fyCols.map(() => emptyAcc())
  const prevSamePeriod = emptyAcc()
  const lostYtd = { value: 0, deals: 0 }

  for (const p of projects) {
    if (p.projectStatus === 'LOST') {
      if (p.year === currentFy) {
        lostYtd.value += dealValue(p) || num(p.projectCost)
        lostYtd.deals += 1
      }
      continue
    }
    if (!isRevenueDeal(p)) continue
    const confYmd = ymdOfField(p.confirmationDate)
    for (let i = 0; i < fyCols.length; i++) {
      const col = fyCols[i]
      if (p.year !== col.fy) continue
      if (col.ytd && confYmd && confYmd > todayYmd) continue
      addRevenue(fyAcc[i], p)
    }
    if (p.year === prevFy) {
      if (!confYmd || confYmd <= ytdCutPrevYear) addRevenue(prevSamePeriod, p)
    }
  }

  const achievementRows: AchievementMetricRow[] = [
    {
      key: 'revenue',
      label: 'Revenue',
      values: fyAcc.map((a) => roundMoney(a.revenue)),
    },
    {
      key: 'profit',
      label: 'Profit',
      values: fyAcc.map((a) => roundMoney(a.profit)),
    },
    {
      key: 'avgProfitability',
      label: 'Avg. profitability',
      values: fyAcc.map((a) => (a.revenue > 0 ? roundPct((a.profit / a.revenue) * 100) : null)),
    },
    {
      key: 'yoy',
      label: 'Year on year',
      values: fyAcc.map((a, i) => {
        if (i === fyCols.length - 1) {
          return roundPct(pctDelta(a.revenue, prevSamePeriod.revenue))
        }
        const prev = fyAcc[i - 1]
        if (!prev) return null
        return roundPct(pctDelta(a.revenue, prev.revenue))
      }),
    },
    {
      key: 'deals',
      label: 'Deals won',
      values: fyAcc.map((a) => a.deals),
    },
    {
      key: 'capacityKw',
      label: 'Capacity (kW)',
      values: fyAcc.map((a) => a.kw),
    },
  ]

  type QAcc = { pipeline: number; weighted: number; closed: number; lastYear: number }
  const qAcc: Record<ForecastQuarterCol['key'], QAcc> = {
    CQ: { pipeline: 0, weighted: 0, closed: 0, lastYear: 0 },
    NQ: { pipeline: 0, weighted: 0, closed: 0, lastYear: 0 },
    NQ1: { pipeline: 0, weighted: 0, closed: 0, lastYear: 0 },
    NQ2: { pipeline: 0, weighted: 0, closed: 0, lastYear: 0 },
  }
  let unscheduledPipeline = 0
  let unscheduledWeighted = 0
  let laterPipeline = 0
  let laterWeighted = 0
  let prevQuarterClosed = 0

  const prevQ = shiftQuarter(qCols[0].fy, qCols[0].quarter, -1)
  const prevQBounds = quarterBounds(prevQ.fy, prevQ.quarter)

  const lastYearCols = qCols.map((c) => {
    const ly = shiftQuarter(c.fy, c.quarter, -4)
    return { key: c.key, ...quarterBounds(ly.fy, ly.quarter) }
  })

  const deals: SalesReviewDeal[] = []

  for (const p of projects) {
    const confYmd = ymdOfField(p.confirmationDate)
    if (isRevenueDeal(p) && confYmd) {
      if (confYmd >= prevQBounds.startYmd && confYmd <= prevQBounds.endYmd) {
        prevQuarterClosed += dealValue(p)
      }
      for (const ly of lastYearCols) {
        if (confYmd >= ly.startYmd && confYmd <= ly.endYmd) {
          qAcc[ly.key].lastYear += dealValue(p)
        }
      }
      for (const col of qCols) {
        if (confYmd >= col.startYmd && confYmd <= col.endYmd) {
          qAcc[col.key].closed += dealValue(p)
        }
      }
    }

    if (!isOpenDeal(p)) continue
    const value = dealValue(p)
    const weighted = value * dealWinRate(p)
    const close = closeYmd(p)
    const bucket = bucketForYmd(close, qCols)
    const pastDue = Boolean(close && close < todayYmd)
    const unscheduled = bucket === 'unscheduled'

    if (bucket === 'unscheduled') {
      unscheduledPipeline += value
      unscheduledWeighted += weighted
    } else if (bucket === 'later') {
      laterPipeline += value
      laterWeighted += weighted
    } else {
      qAcc[bucket].pipeline += value
      qAcc[bucket].weighted += weighted
    }

    const fyFromClose = close ? calculateFYInIst(`${close}T00:00:00+05:30`) : p.year || null
    const qFromClose = close
      ? `Q${indianFyQuarterFromMonth(parseYmd(close)?.m ?? 4)}`
      : null

    deals.push({
      id: p.id,
      slNo: p.slNo,
      customerName: p.customerName?.trim() || (p.slNo != null ? `#${p.slNo}` : 'Untitled'),
      salespersonName: p.salespersonName,
      stage: SALES_REVIEW_STATUS_LABELS[p.projectStatus] || p.projectStatus,
      stageStatus: p.projectStatus,
      probability: Math.round(dealWinRate(p) * 100),
      customerType: p.customerType,
      customerTypeLabel: SALES_REVIEW_CUSTOMER_TYPE_LABELS[p.customerType || ''] || p.customerType || '—',
      systemType: p.systemType,
      systemTypeLabel: SALES_REVIEW_SYSTEM_TYPE_LABELS[p.systemType || ''] || p.systemType || '—',
      segment: p.type,
      segmentLabel: SALES_REVIEW_SEGMENT_LABELS[p.type || ''] || p.type || '—',
      closeDate: close,
      quarter: qFromClose,
      fy: fyFromClose,
      bankLoan: p.availingLoan,
      orderValue: roundMoney(value),
      weightedValue: roundMoney(weighted),
      capacityKw: p.systemCapacity,
      pastDue,
      unscheduled,
      forecastBucket: bucket,
    })
  }

  deals.sort((a, b) => {
    if (a.unscheduled !== b.unscheduled) return a.unscheduled ? 1 : -1
    if (a.closeDate && b.closeDate && a.closeDate !== b.closeDate) {
      return a.closeDate < b.closeDate ? -1 : 1
    }
    return b.orderValue - a.orderValue
  })

  const keys: ForecastQuarterCol['key'][] = ['CQ', 'NQ', 'NQ1', 'NQ2']
  const pipeVals = keys.map((k) => roundMoney(qAcc[k].pipeline))
  const wVals = keys.map((k) => roundMoney(qAcc[k].weighted))
  const closedVals = keys.map((k) => roundMoney(qAcc[k].closed))
  const lyVals = keys.map((k) => roundMoney(qAcc[k].lastYear))
  const yoyVals = keys.map((k) => {
    const current = qAcc[k].closed + qAcc[k].weighted
    return roundPct(pctDelta(current, qAcc[k].lastYear))
  })
  const cqPace = qAcc.CQ.closed + qAcc.CQ.weighted
  const qoqVals: (number | null)[] = [
    roundPct(pctDelta(cqPace, prevQuarterClosed)),
    null,
    null,
    null,
  ]

  const forecastRows: ForecastMetricRow[] = [
    {
      key: 'pipeline',
      label: 'Pipeline',
      values: pipeVals,
      total: roundMoney(pipeVals.reduce((s, n) => s + n, 0)),
    },
    {
      key: 'weighted',
      label: 'Forecast (weighted)',
      values: wVals,
      total: roundMoney(wVals.reduce((s, n) => s + n, 0)),
    },
    {
      key: 'closed',
      label: 'Closed in period',
      values: closedVals,
      total: roundMoney(closedVals.reduce((s, n) => s + n, 0)),
    },
    {
      key: 'lastYear',
      label: 'Last year actual',
      values: lyVals,
      total: roundMoney(lyVals.reduce((s, n) => s + n, 0)),
    },
    {
      key: 'yoy',
      label: 'Year on year',
      values: yoyVals,
      total: roundPct(
        pctDelta(
          closedVals.reduce((s, n) => s + n, 0) + wVals.reduce((s, n) => s + n, 0),
          lyVals.reduce((s, n) => s + n, 0),
        ),
      ),
    },
    {
      key: 'qoq',
      label: 'Qtr on qtr',
      values: qoqVals,
      total: qoqVals[0],
    },
  ]

  const ytd = fyAcc[2]
  const openPipeline = deals.reduce((s, d) => s + d.orderValue, 0)
  const openWeighted = deals.reduce((s, d) => s + d.weightedValue, 0)

  return {
    generatedAt: now.toISOString(),
    salespersonId: null,
    currentFy,
    achievement: { columns: fyCols, rows: achievementRows },
    forecast: {
      columns: qCols,
      rows: forecastRows,
      unscheduledPipeline: roundMoney(unscheduledPipeline),
      unscheduledWeighted: roundMoney(unscheduledWeighted),
      laterPipeline: roundMoney(laterPipeline),
      laterWeighted: roundMoney(laterWeighted),
    },
    deals,
    kpis: {
      closedYtdRevenue: roundMoney(ytd.revenue),
      closedYtdProfit: roundMoney(ytd.profit),
      closedYtdDeals: ytd.deals,
      closedYtdKw: ytd.kw,
      openPipeline: roundMoney(openPipeline),
      openWeighted: roundMoney(openWeighted),
      openDeals: deals.length,
      pastDueDeals: deals.filter((d) => d.pastDue).length,
      unscheduledDeals: deals.filter((d) => d.unscheduled).length,
      lostYtdValue: roundMoney(lostYtd.value),
      lostYtdDeals: lostYtd.deals,
    },
  }
}
