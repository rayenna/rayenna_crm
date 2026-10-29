/**
 * Margin & Mix report — confirmed-and-beyond GP, cost completeness, and mix.
 * Indian FY (Apr–Mar). KEEP UI copy in sync with client/src/help/content/modules/reports.md
 */

import { calculateFYInIst, calendarYmdInTimeZone } from './istCalendar'
import {
  indianFyQuarterFromMonth,
  previousFyLabel,
  SALES_REVIEW_CUSTOMER_TYPE_LABELS,
  SALES_REVIEW_SEGMENT_LABELS,
  SALES_REVIEW_STATUS_LABELS,
  SALES_REVIEW_SYSTEM_TYPE_LABELS,
} from './salesReview'

/** Won book. Pipeline (Lead / Survey / Proposal) and Lost stay off this pack. */
export const MARGIN_MIX_STATUSES = [
  'CONFIRMED',
  'UNDER_INSTALLATION',
  'SUBMITTED_FOR_SUBSIDY',
  'COMPLETED',
  'COMPLETED_SUBSIDY_CREDITED',
] as const

const BOOK_SET = new Set<string>(MARGIN_MIX_STATUSES)

export const THIN_MARGIN_PCT = 10
export const PE_MISMATCH_PCT = 10

export const MARGIN_BAND_KEYS = ['loss', 'thin', 'ok', 'healthy', 'unknown'] as const
export type MarginBandKey = (typeof MARGIN_BAND_KEYS)[number]

export const MARGIN_BAND_LABELS: Record<MarginBandKey, string> = {
  loss: 'Loss',
  thin: 'Under 10%',
  ok: '10–20%',
  healthy: '20%+',
  unknown: 'Unknown',
}

export const KW_BAND_KEYS = ['b0_3', 'b3_5', 'b5_10', 'b10_20', 'b20', 'unknown'] as const
export type KwBandKey = (typeof KW_BAND_KEYS)[number]

export const KW_BAND_LABELS: Record<KwBandKey, string> = {
  b0_3: '0–3 kW',
  b3_5: '3–5 kW',
  b5_10: '5–10 kW',
  b10_20: '10–20 kW',
  b20: '20+ kW',
  unknown: 'No kW',
}

export const MARGIN_FLAG_LABELS: Record<string, string> = {
  missing_cost: 'Missing cost',
  loss: 'Loss',
  thin: 'Thin margin',
  estimated_profit: 'Profit estimated',
  pe_mismatch: 'PE vs CRM cost',
  pe_only: 'PE cost only',
  unassigned: 'Unassigned seller',
}

export const MARGIN_MIX_QUARTERS = [1, 2, 3, 4] as const
export type MarginMixQuarter = (typeof MARGIN_MIX_QUARTERS)[number]

export const MARGIN_MIX_QUARTER_LABELS: Record<MarginMixQuarter, string> = {
  1: 'Q1 Apr–Jun',
  2: 'Q2 Jul–Sep',
  3: 'Q3 Oct–Dec',
  4: 'Q4 Jan–Mar',
}

export type MarginMixPeriodInput = {
  fy?: string | null
  quarter?: number | string | null
}

export type MarginMixProjectInput = {
  id: string
  slNo: number | null
  projectStatus: string
  year: string
  projectCost: number | null
  totalProjectCost: number | null
  grossProfit: number | null
  expectedProfit: number | null
  profitability: number | null
  systemCapacity: number | null
  systemType: string | null
  type: string | null
  confirmationDate: Date | string | null
  peCostingTotal: number | null
  salespersonId: string | null
  salespersonName: string | null
  customerName: string | null
  customerType: string | null
}

export type MarginJob = {
  id: string
  slNo: number | null
  customerName: string
  salespersonName: string | null
  salespersonId: string | null
  stage: string
  stageStatus: string
  customerType: string | null
  customerTypeLabel: string
  systemType: string | null
  systemTypeLabel: string
  segment: string | null
  segmentLabel: string
  capacityKw: number | null
  kwBand: KwBandKey
  kwBandLabel: string
  orderValue: number
  cost: number | null
  peCost: number | null
  profit: number | null
  profitPct: number | null
  profitEstimated: boolean
  marginBand: MarginBandKey
  marginBandLabel: string
  missingCost: boolean
  flags: string[]
  flagLabels: string[]
}

export type MixRow = {
  key: string
  label: string
  jobs: number
  revenue: number
  profit: number | null
  profitPct: number | null
  missingCost: number
}

export type MarginMixKpis = {
  jobs: number
  revenue: number
  profit: number | null
  profitPct: number | null
  missingCostJobs: number
  thinJobs: number
  lossJobs: number
  peMismatchJobs: number
  lastFyRevenue: number
  lastFyProfit: number | null
  lastFyProfitPct: number | null
  revenueYoy: number | null
  profitPctYoy: number | null
}

export type MarginMixPayload = {
  generatedAt: string
  salespersonId: string | null
  currentFy: string
  lastFy: string
  quarter: MarginMixQuarter | null
  availableFys: string[]
  periodLabel: string
  kpis: MarginMixKpis
  sellerLoad: MixRow[]
  segmentMix: MixRow[]
  systemMix: MixRow[]
  kwMix: MixRow[]
  bandMix: MixRow[]
  jobs: MarginJob[]
}

function num(v: number | null | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function roundMoney(n: number): number {
  return Math.round(n)
}

function roundPct(n: number | null): number | null {
  if (n == null || !Number.isFinite(n)) return null
  return Math.round(n * 10) / 10
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (v == null || v === '') return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function fyOfField(v: Date | string | null | undefined): string | null {
  return calculateFYInIst(v)
}

export function isOnMarginBook(status: string): boolean {
  return BOOK_SET.has(status)
}

export function jobFy(p: MarginMixProjectInput): string | null {
  return fyOfField(p.confirmationDate) || (p.year?.trim() ? p.year.trim() : null)
}

export function isFyLabel(fy: string | null | undefined): boolean {
  return Boolean(fy && /^\d{4}-\d{2}$/.test(fy.trim()))
}

export function parseMarginMixQuarter(v: number | string | null | undefined): MarginMixQuarter | null {
  const n = typeof v === 'string' && v.trim() === '' ? NaN : Number(v)
  if (n === 1 || n === 2 || n === 3 || n === 4) return n
  return null
}

export function marginMixPeriodLabel(fy: string, quarter: MarginMixQuarter | null): string {
  return quarter ? `Q${quarter} FY${fy}` : `FY${fy}`
}

/** Indian FY quarter from confirmation date (IST). Null when the date is missing. */
export function jobQuarter(p: MarginMixProjectInput): MarginMixQuarter | null {
  const d = toDate(p.confirmationDate)
  if (!d) return null
  const ymd = calendarYmdInTimeZone(d)
  const month = Number(ymd.split('-')[1])
  if (!month) return null
  return indianFyQuarterFromMonth(month)
}

function inPeriod(
  p: MarginMixProjectInput,
  fy: string,
  quarter: MarginMixQuarter | null,
): boolean {
  if (jobFy(p) !== fy) return false
  if (quarter == null) return true
  return jobQuarter(p) === quarter
}

export function kwBand(kw: number | null | undefined): KwBandKey {
  if (kw == null || !Number.isFinite(kw) || kw <= 0) return 'unknown'
  if (kw <= 3) return 'b0_3'
  if (kw <= 5) return 'b3_5'
  if (kw <= 10) return 'b5_10'
  if (kw <= 20) return 'b10_20'
  return 'b20'
}

export function hasCrmCost(cost: number | null | undefined): boolean {
  return cost != null && Number.isFinite(cost) && cost > 0
}

export function resolveProfit(p: MarginMixProjectInput): { profit: number | null; estimated: boolean } {
  if (p.grossProfit != null && Number.isFinite(Number(p.grossProfit))) {
    return { profit: Number(p.grossProfit), estimated: false }
  }
  if (p.expectedProfit != null && Number.isFinite(Number(p.expectedProfit))) {
    return { profit: Number(p.expectedProfit), estimated: true }
  }
  const value = num(p.projectCost)
  if (hasCrmCost(p.totalProjectCost) && value > 0) {
    return { profit: value - Number(p.totalProjectCost), estimated: false }
  }
  return { profit: null, estimated: false }
}

export function profitPct(profit: number | null, orderValue: number): number | null {
  if (profit == null || orderValue <= 0) return null
  return (profit / orderValue) * 100
}

export function marginBand(pct: number | null): MarginBandKey {
  if (pct == null || !Number.isFinite(pct)) return 'unknown'
  if (pct < 0) return 'loss'
  if (pct < THIN_MARGIN_PCT) return 'thin'
  if (pct < 20) return 'ok'
  return 'healthy'
}

function peFlags(crmCost: number | null, peCost: number | null): string[] {
  const flags: string[] = []
  const crm = hasCrmCost(crmCost)
  const pe = peCost != null && Number.isFinite(peCost) && peCost > 0
  if (pe && !crm) flags.push('pe_only')
  if (pe && crm) {
    const base = Math.max(Number(crmCost), Number(peCost), 1)
    const gap = (Math.abs(Number(crmCost) - Number(peCost)) / base) * 100
    if (gap >= PE_MISMATCH_PCT) flags.push('pe_mismatch')
  }
  return flags
}

function weightedPct(profit: number | null, revenue: number): number | null {
  if (profit == null || revenue <= 0) return null
  return roundPct((profit / revenue) * 100)
}

function yoyPct(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null
  return roundPct(((current - previous) / Math.abs(previous)) * 100)
}

function mixFrom(jobs: MarginJob[], keyFn: (j: MarginJob) => string, labelFn: (j: MarginJob, key: string) => string): MixRow[] {
  const map = new Map<string, MarginJob[]>()
  for (const j of jobs) {
    const key = keyFn(j)
    const list = map.get(key)
    if (list) list.push(j)
    else map.set(key, [j])
  }
  return [...map.entries()]
    .map(([key, rows]) => summariseMix(key, labelFn(rows[0], key), rows))
    .sort((a, b) => (a.profitPct ?? 999) - (b.profitPct ?? 999) || b.revenue - a.revenue)
}

function summariseMix(key: string, label: string, rows: MarginJob[]): MixRow {
  const revenue = roundMoney(rows.reduce((s, j) => s + j.orderValue, 0))
  const known = rows.filter((j) => j.profit != null)
  const profit = known.length ? roundMoney(known.reduce((s, j) => s + (j.profit || 0), 0)) : null
  const knownRevenue = roundMoney(known.reduce((s, j) => s + j.orderValue, 0))
  return {
    key,
    label,
    jobs: rows.length,
    revenue,
    profit,
    profitPct: weightedPct(profit, knownRevenue),
    missingCost: rows.filter((j) => j.missingCost).length,
  }
}

function toJob(p: MarginMixProjectInput): MarginJob {
  const orderValue = roundMoney(num(p.projectCost))
  const cost = hasCrmCost(p.totalProjectCost) ? roundMoney(Number(p.totalProjectCost)) : null
  const peCost = p.peCostingTotal != null && Number.isFinite(p.peCostingTotal) && p.peCostingTotal > 0
    ? roundMoney(p.peCostingTotal)
    : null
  const { profit: rawProfit, estimated } = resolveProfit(p)
  const profit = rawProfit == null ? null : roundMoney(rawProfit)
  const pct = profitPct(profit, orderValue)
  const band = marginBand(pct)
  const missingCost = !hasCrmCost(p.totalProjectCost)
  const kw = p.systemCapacity != null && Number.isFinite(p.systemCapacity) ? Number(p.systemCapacity) : null
  const bandKey = kwBand(kw)
  const flags: string[] = []
  if (missingCost) flags.push('missing_cost')
  if (band === 'loss') flags.push('loss')
  if (band === 'thin') flags.push('thin')
  if (estimated) flags.push('estimated_profit')
  flags.push(...peFlags(p.totalProjectCost, p.peCostingTotal))
  if (!p.salespersonId) flags.push('unassigned')

  return {
    id: p.id,
    slNo: p.slNo,
    customerName: p.customerName?.trim() || '—',
    salespersonName: p.salespersonName,
    salespersonId: p.salespersonId,
    stage: SALES_REVIEW_STATUS_LABELS[p.projectStatus] || p.projectStatus,
    stageStatus: p.projectStatus,
    customerType: p.customerType,
    customerTypeLabel: SALES_REVIEW_CUSTOMER_TYPE_LABELS[p.customerType || ''] || p.customerType || '—',
    systemType: p.systemType,
    systemTypeLabel: SALES_REVIEW_SYSTEM_TYPE_LABELS[p.systemType || ''] || p.systemType || '—',
    segment: p.type,
    segmentLabel: SALES_REVIEW_SEGMENT_LABELS[p.type || ''] || p.type || '—',
    capacityKw: kw,
    kwBand: bandKey,
    kwBandLabel: KW_BAND_LABELS[bandKey],
    orderValue,
    cost,
    peCost,
    profit,
    profitPct: roundPct(pct),
    profitEstimated: estimated,
    marginBand: band,
    marginBandLabel: MARGIN_BAND_LABELS[band],
    missingCost,
    flags,
    flagLabels: flags.map((f) => MARGIN_FLAG_LABELS[f] || f),
  }
}

function kpisFrom(jobs: MarginJob[], lastFyJobs: MarginJob[]): MarginMixKpis {
  const revenue = roundMoney(jobs.reduce((s, j) => s + j.orderValue, 0))
  const known = jobs.filter((j) => j.profit != null)
  const profit = known.length ? roundMoney(known.reduce((s, j) => s + (j.profit || 0), 0)) : null
  const knownRevenue = roundMoney(known.reduce((s, j) => s + j.orderValue, 0))
  const lastRevenue = roundMoney(lastFyJobs.reduce((s, j) => s + j.orderValue, 0))
  const lastKnown = lastFyJobs.filter((j) => j.profit != null)
  const lastProfit = lastKnown.length ? roundMoney(lastKnown.reduce((s, j) => s + (j.profit || 0), 0)) : null
  const lastKnownRevenue = roundMoney(lastKnown.reduce((s, j) => s + j.orderValue, 0))
  const profitPctNow = weightedPct(profit, knownRevenue)
  const lastPct = weightedPct(lastProfit, lastKnownRevenue)
  return {
    jobs: jobs.length,
    revenue,
    profit,
    profitPct: profitPctNow,
    missingCostJobs: jobs.filter((j) => j.missingCost).length,
    thinJobs: jobs.filter((j) => j.marginBand === 'thin').length,
    lossJobs: jobs.filter((j) => j.marginBand === 'loss').length,
    peMismatchJobs: jobs.filter((j) => j.flags.includes('pe_mismatch') || j.flags.includes('pe_only')).length,
    lastFyRevenue: lastRevenue,
    lastFyProfit: lastProfit,
    lastFyProfitPct: lastPct,
    revenueYoy: yoyPct(revenue, lastRevenue),
    profitPctYoy:
      profitPctNow != null && lastPct != null ? roundPct(profitPctNow - lastPct) : null,
  }
}

export function buildMarginMix(
  projects: MarginMixProjectInput[],
  now: Date = new Date(),
  period: MarginMixPeriodInput = {},
): MarginMixPayload {
  const calendarFy = calculateFYInIst(now) || '2026-27'
  const selectedFy = isFyLabel(period.fy) ? period.fy!.trim() : calendarFy
  const quarter = parseMarginMixQuarter(period.quarter)
  const lastFy = previousFyLabel(selectedFy)
  const book = projects.filter((p) => isOnMarginBook(p.projectStatus))
  const availableFys = Array.from(
    new Set(
      [calendarFy, ...book.map((p) => jobFy(p)).filter((fy): fy is string => Boolean(fy))],
    ),
  ).sort((a, b) => b.localeCompare(a))
  const current = book.filter((p) => inPeriod(p, selectedFy, quarter)).map(toJob)
  const previous = book.filter((p) => inPeriod(p, lastFy, quarter)).map(toJob)

  current.sort((a, b) => {
    const ap = a.profitPct
    const bp = b.profitPct
    if (ap == null && bp == null) return b.orderValue - a.orderValue
    if (ap == null) return 1
    if (bp == null) return -1
    return ap - bp || b.orderValue - a.orderValue
  })

  return {
    generatedAt: now.toISOString(),
    salespersonId: null,
    currentFy: selectedFy,
    lastFy,
    quarter,
    availableFys,
    periodLabel: marginMixPeriodLabel(selectedFy, quarter),
    kpis: kpisFrom(current, previous),
    sellerLoad: mixFrom(
      current,
      (j) => j.salespersonId || 'unassigned',
      (j, key) => (key === 'unassigned' ? 'Unassigned' : j.salespersonName || 'Seller'),
    ),
    segmentMix: mixFrom(current, (j) => j.segment || 'unknown', (j) => j.segmentLabel),
    systemMix: mixFrom(current, (j) => j.systemType || 'unknown', (j) => j.systemTypeLabel),
    kwMix: mixFrom(current, (j) => j.kwBand, (j) => j.kwBandLabel),
    bandMix: MARGIN_BAND_KEYS.map((key) =>
      summariseMix(key, MARGIN_BAND_LABELS[key], current.filter((j) => j.marginBand === key)),
    ),
    jobs: current,
  }
}
