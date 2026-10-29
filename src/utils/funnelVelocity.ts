/**
 * Funnel Velocity report — pre-confirmation stage aging, SLA colour, and FY conversion.
 * Indian FY (Apr–Mar). KEEP UI copy in sync with client/src/help/content/modules/reports.md
 *
 * SLA days match DATA_SENSE_STAGE_SLA_DAYS for Lead / Site survey / Proposal.
 */

import { calculateFYInIst, calendarYmdInTimeZone } from './istCalendar'
import {
  SALES_REVIEW_CUSTOMER_TYPE_LABELS,
  SALES_REVIEW_SEGMENT_LABELS,
  SALES_REVIEW_STATUS_LABELS,
  SALES_REVIEW_SYSTEM_TYPE_LABELS,
} from './salesReview'

/** Pre-confirmation pipeline only. Confirmed-and-beyond is Delivery Control. */
export const FUNNEL_OPEN_STATUSES = ['LEAD', 'SITE_SURVEY', 'PROPOSAL'] as const
export type FunnelOpenStatus = (typeof FUNNEL_OPEN_STATUSES)[number]

const OPEN_SET = new Set<string>(FUNNEL_OPEN_STATUSES)

const CONFIRMED_PLUS = new Set([
  'CONFIRMED',
  'UNDER_INSTALLATION',
  'SUBMITTED_FOR_SUBSIDY',
  'COMPLETED',
  'COMPLETED_SUBSIDY_CREDITED',
])

/** KEEP IN SYNC with DATA_SENSE_STAGE_SLA_DAYS (Lead 7 / Survey 14 / Proposal 21). */
export const FUNNEL_SLA_DAYS: Record<FunnelOpenStatus, number> = {
  LEAD: 7,
  SITE_SURVEY: 14,
  PROPOSAL: 21,
}

export const FUNNEL_STAGE_ORDER: FunnelOpenStatus[] = ['LEAD', 'SITE_SURVEY', 'PROPOSAL']

export const FUNNEL_STAGE_LABELS: Record<FunnelOpenStatus, string> = {
  LEAD: SALES_REVIEW_STATUS_LABELS.LEAD,
  SITE_SURVEY: SALES_REVIEW_STATUS_LABELS.SITE_SURVEY,
  PROPOSAL: SALES_REVIEW_STATUS_LABELS.PROPOSAL,
}

export const FUNNEL_SLA_LABELS: Record<FunnelSlaBand, string> = {
  GREEN: 'On track',
  AMBER: 'Amber',
  RED: 'Red',
  NONE: 'No date',
}

export const FUNNEL_FLAG_LABELS: Record<string, string> = {
  sla_red: 'SLA red',
  sla_amber: 'SLA amber',
  estimated_date: 'Stage date estimated',
  unassigned: 'Unassigned seller',
}

export const FUNNEL_AGING_KEYS = ['b0_7', 'b8_14', 'b15_21', 'b22_30', 'b30', 'undated'] as const
export type FunnelAgingKey = (typeof FUNNEL_AGING_KEYS)[number]

export const FUNNEL_AGING_LABELS: Record<FunnelAgingKey, string> = {
  b0_7: '0–7',
  b8_14: '8–14',
  b15_21: '15–21',
  b22_30: '22–30',
  b30: '30+',
  undated: 'Undated',
}

export type FunnelSlaBand = 'GREEN' | 'AMBER' | 'RED' | 'NONE'

export type FunnelVelocityProjectInput = {
  id: string
  slNo: number | null
  projectStatus: string
  year: string
  projectCost: number | null
  salesProbability: number | null
  systemCapacity: number | null
  systemType: string | null
  type: string | null
  confirmationDate: Date | string | null
  expectedCommissioningDate: Date | string | null
  stageEnteredAt: Date | string | null
  createdAt: Date | string | null
  lostDate: Date | string | null
  salespersonId: string | null
  salespersonName: string | null
  customerName: string | null
  customerType: string | null
}

export type FunnelDeal = {
  id: string
  slNo: number | null
  customerName: string
  salespersonName: string | null
  salespersonId: string | null
  stage: string
  stageStatus: FunnelOpenStatus
  customerType: string | null
  customerTypeLabel: string
  systemType: string | null
  systemTypeLabel: string
  segment: string | null
  segmentLabel: string
  orderValue: number
  probability: number
  daysInStage: number | null
  slaDays: number
  slaBand: FunnelSlaBand
  slaLabel: string
  agingBucket: FunnelAgingKey
  agingLabel: string
  stageEnteredYmd: string | null
  stageDateEstimated: boolean
  closeDate: string | null
  flags: string[]
  flagLabels: string[]
}

export type FunnelStageCol = {
  key: FunnelOpenStatus
  label: string
  slaDays: number
}

export type FunnelMetricRow = {
  key: 'deals' | 'pipeline' | 'medianDays' | 'slaRed' | 'slaAmber'
  label: string
  values: (number | null)[]
  total: number | null
}

export type FunnelAgingRow = {
  key: 'deals' | 'pipeline'
  label: string
  values: number[]
  total: number
}

export type FunnelSellerLoadRow = {
  salespersonId: string | null
  salespersonName: string
  deals: number
  pipeline: number
  medianDays: number | null
  slaRed: number
  slaAmber: number
}

export type FunnelVelocityKpis = {
  openDeals: number
  openPipeline: number
  medianDays: number | null
  slaRed: number
  slaAmber: number
  estimatedDates: number
  confirmedYtdDeals: number
  confirmedYtdValue: number
  lostYtdDeals: number
  lostYtdValue: number
  winRate: number | null
  medianDaysToConfirm: number | null
  medianDaysToLose: number | null
}

export type FunnelVelocityPayload = {
  generatedAt: string
  salespersonId: string | null
  currentFy: string
  funnel: {
    columns: FunnelStageCol[]
    rows: FunnelMetricRow[]
  }
  aging: {
    columns: { key: FunnelAgingKey; label: string }[]
    rows: FunnelAgingRow[]
  }
  sellerLoad: FunnelSellerLoadRow[]
  deals: FunnelDeal[]
  kpis: FunnelVelocityKpis
}

function num(v: number | null | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function roundMoney(n: number): number {
  return Math.round(n)
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (v == null || v === '') return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function ymdOfField(v: Date | string | null | undefined): string | null {
  const d = toDate(v)
  return d ? calendarYmdInTimeZone(d) : null
}

export function daysBetweenYmd(fromYmd: string, toYmd: string): number {
  const [ay, am, ad] = fromYmd.split('-').map(Number)
  const [by, bm, bd] = toYmd.split('-').map(Number)
  const ua = Date.UTC(ay, am - 1, ad)
  const ub = Date.UTC(by, bm - 1, bd)
  return Math.round((ub - ua) / 86_400_000)
}

export function median(nums: number[]): number | null {
  if (nums.length === 0) return null
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

export function isFunnelOpen(status: string): status is FunnelOpenStatus {
  return OPEN_SET.has(status)
}

export function funnelAgingBucket(days: number | null): FunnelAgingKey {
  if (days == null) return 'undated'
  if (days <= 7) return 'b0_7'
  if (days <= 14) return 'b8_14'
  if (days <= 21) return 'b15_21'
  if (days <= 30) return 'b22_30'
  return 'b30'
}

/** GREEN < 70% of SLA, AMBER < 90%, else RED. No date → NONE. */
export function funnelSlaBand(daysInStage: number | null, slaDays: number): FunnelSlaBand {
  if (daysInStage == null || !slaDays) return 'NONE'
  const percentage = (daysInStage / slaDays) * 100
  if (percentage < 70) return 'GREEN'
  if (percentage < 90) return 'AMBER'
  return 'RED'
}

function fyOfField(v: Date | string | null | undefined): string | null {
  return calculateFYInIst(v)
}

function isConfirmedYtd(p: FunnelVelocityProjectInput, currentFy: string): boolean {
  if (!CONFIRMED_PLUS.has(p.projectStatus)) return false
  return fyOfField(p.confirmationDate) === currentFy
}

function isLostYtd(p: FunnelVelocityProjectInput, currentFy: string): boolean {
  if (p.projectStatus !== 'LOST') return false
  const lostFy = fyOfField(p.lostDate)
  if (lostFy) return lostFy === currentFy
  return p.year === currentFy
}

export function buildFunnelVelocity(
  projects: FunnelVelocityProjectInput[],
  now: Date = new Date(),
): FunnelVelocityPayload {
  const todayYmd = calendarYmdInTimeZone(now)
  const currentFy = calculateFYInIst(now) || '2026-27'

  const deals: FunnelDeal[] = []
  const daysToConfirm: number[] = []
  const daysToLose: number[] = []
  let confirmedYtdDeals = 0
  let confirmedYtdValue = 0
  let lostYtdDeals = 0
  let lostYtdValue = 0

  for (const p of projects) {
    if (isConfirmedYtd(p, currentFy)) {
      confirmedYtdDeals += 1
      confirmedYtdValue += roundMoney(num(p.projectCost))
      const created = ymdOfField(p.createdAt)
      const confirmed = ymdOfField(p.confirmationDate)
      if (created && confirmed) daysToConfirm.push(Math.max(0, daysBetweenYmd(created, confirmed)))
    }
    if (isLostYtd(p, currentFy)) {
      lostYtdDeals += 1
      lostYtdValue += roundMoney(num(p.projectCost))
      const created = ymdOfField(p.createdAt)
      const lost = ymdOfField(p.lostDate)
      if (created && lost) daysToLose.push(Math.max(0, daysBetweenYmd(created, lost)))
    }
    if (!isFunnelOpen(p.projectStatus)) continue

    const slaDays = FUNNEL_SLA_DAYS[p.projectStatus]
    const enteredYmd = ymdOfField(p.stageEnteredAt)
    const createdYmd = ymdOfField(p.createdAt)
    const stageDateEstimated = !enteredYmd && Boolean(createdYmd)
    const stageYmd = enteredYmd ?? createdYmd
    const daysInStage = stageYmd == null ? null : Math.max(0, daysBetweenYmd(stageYmd, todayYmd))
    const slaBand = funnelSlaBand(daysInStage, slaDays)
    const agingBucket = funnelAgingBucket(daysInStage)
    const flags: string[] = []
    if (slaBand === 'RED') flags.push('sla_red')
    if (slaBand === 'AMBER') flags.push('sla_amber')
    if (stageDateEstimated) flags.push('estimated_date')
    if (!p.salespersonId) flags.push('unassigned')

    deals.push({
      id: p.id,
      slNo: p.slNo,
      customerName: p.customerName?.trim() || '—',
      salespersonName: p.salespersonName,
      salespersonId: p.salespersonId,
      stage: FUNNEL_STAGE_LABELS[p.projectStatus],
      stageStatus: p.projectStatus,
      customerType: p.customerType,
      customerTypeLabel: SALES_REVIEW_CUSTOMER_TYPE_LABELS[p.customerType || ''] || p.customerType || '—',
      systemType: p.systemType,
      systemTypeLabel: SALES_REVIEW_SYSTEM_TYPE_LABELS[p.systemType || ''] || p.systemType || '—',
      segment: p.type,
      segmentLabel: SALES_REVIEW_SEGMENT_LABELS[p.type || ''] || p.type || '—',
      orderValue: roundMoney(num(p.projectCost)),
      probability: Math.max(0, Math.min(100, Math.round(num(p.salesProbability)))),
      daysInStage,
      slaDays,
      slaBand,
      slaLabel: FUNNEL_SLA_LABELS[slaBand],
      agingBucket,
      agingLabel: FUNNEL_AGING_LABELS[agingBucket],
      stageEnteredYmd: stageYmd,
      stageDateEstimated,
      closeDate: ymdOfField(p.expectedCommissioningDate),
      flags,
      flagLabels: flags.map((f) => FUNNEL_FLAG_LABELS[f] || f),
    })
  }

  deals.sort((a, b) => {
    const ad = a.daysInStage
    const bd = b.daysInStage
    if (ad == null && bd == null) return 0
    if (ad == null) return 1
    if (bd == null) return -1
    return bd - ad
  })

  const columns: FunnelStageCol[] = FUNNEL_STAGE_ORDER.map((key) => ({
    key,
    label: FUNNEL_STAGE_LABELS[key],
    slaDays: FUNNEL_SLA_DAYS[key],
  }))

  const byStage = FUNNEL_STAGE_ORDER.map((status) => deals.filter((d) => d.stageStatus === status))
  const dealsRow: FunnelMetricRow = {
    key: 'deals',
    label: 'Open deals',
    values: byStage.map((rows) => rows.length),
    total: deals.length,
  }
  const pipelineRow: FunnelMetricRow = {
    key: 'pipeline',
    label: 'Pipeline',
    values: byStage.map((rows) => roundMoney(rows.reduce((s, d) => s + d.orderValue, 0))),
    total: roundMoney(deals.reduce((s, d) => s + d.orderValue, 0)),
  }
  const medianRow: FunnelMetricRow = {
    key: 'medianDays',
    label: 'Median days',
    values: byStage.map((rows) => median(rows.map((d) => d.daysInStage).filter((n): n is number => n != null))),
    total: median(deals.map((d) => d.daysInStage).filter((n): n is number => n != null)),
  }
  const redRow: FunnelMetricRow = {
    key: 'slaRed',
    label: 'SLA red',
    values: byStage.map((rows) => rows.filter((d) => d.slaBand === 'RED').length),
    total: deals.filter((d) => d.slaBand === 'RED').length,
  }
  const amberRow: FunnelMetricRow = {
    key: 'slaAmber',
    label: 'SLA amber',
    values: byStage.map((rows) => rows.filter((d) => d.slaBand === 'AMBER').length),
    total: deals.filter((d) => d.slaBand === 'AMBER').length,
  }

  const agingCols = FUNNEL_AGING_KEYS.map((key) => ({ key, label: FUNNEL_AGING_LABELS[key] }))
  const agingDeals = FUNNEL_AGING_KEYS.map((key) => deals.filter((d) => d.agingBucket === key))
  const aging: FunnelVelocityPayload['aging'] = {
    columns: agingCols,
    rows: [
      {
        key: 'deals',
        label: 'Open deals',
        values: agingDeals.map((rows) => rows.length),
        total: deals.length,
      },
      {
        key: 'pipeline',
        label: 'Pipeline',
        values: agingDeals.map((rows) => roundMoney(rows.reduce((s, d) => s + d.orderValue, 0))),
        total: roundMoney(deals.reduce((s, d) => s + d.orderValue, 0)),
      },
    ],
  }

  const sellerMap = new Map<string, FunnelDeal[]>()
  for (const d of deals) {
    const key = d.salespersonId || 'unassigned'
    const list = sellerMap.get(key)
    if (list) list.push(d)
    else sellerMap.set(key, [d])
  }
  const sellerLoad: FunnelSellerLoadRow[] = [...sellerMap.entries()]
    .map(([key, rows]) => ({
      salespersonId: key === 'unassigned' ? null : key,
      salespersonName: key === 'unassigned' ? 'Unassigned' : rows[0]?.salespersonName || 'Seller',
      deals: rows.length,
      pipeline: roundMoney(rows.reduce((s, d) => s + d.orderValue, 0)),
      medianDays: median(rows.map((d) => d.daysInStage).filter((n): n is number => n != null)),
      slaRed: rows.filter((d) => d.slaBand === 'RED').length,
      slaAmber: rows.filter((d) => d.slaBand === 'AMBER').length,
    }))
    .sort((a, b) => b.slaRed - a.slaRed || (b.medianDays || 0) - (a.medianDays || 0) || b.deals - a.deals)

  const decided = confirmedYtdDeals + lostYtdDeals
  const winRate = decided === 0 ? null : Math.round((confirmedYtdDeals / decided) * 1000) / 10

  return {
    generatedAt: now.toISOString(),
    salespersonId: null,
    currentFy,
    funnel: {
      columns,
      rows: [dealsRow, pipelineRow, medianRow, redRow, amberRow],
    },
    aging,
    sellerLoad,
    deals,
    kpis: {
      openDeals: deals.length,
      openPipeline: pipelineRow.total ?? 0,
      medianDays: medianRow.total,
      slaRed: redRow.total ?? 0,
      slaAmber: amberRow.total ?? 0,
      estimatedDates: deals.filter((d) => d.stageDateEstimated).length,
      confirmedYtdDeals,
      confirmedYtdValue: roundMoney(confirmedYtdValue),
      lostYtdDeals,
      lostYtdValue: roundMoney(lostYtdValue),
      winRate,
      medianDaysToConfirm: median(daysToConfirm),
      medianDaysToLose: median(daysToLose),
    },
  }
}
