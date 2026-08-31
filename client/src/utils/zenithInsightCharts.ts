import type { ZenithExplorerProject } from '../types/zenithExplorer'
import { calendarYmdInTimeZone } from './istCalendar'
import { isOpenForecastDeal, resolveForecastScheduleYmd } from './revenueForecast'
import { matchesZenithPaymentNaBucket } from './zenithChartDrilldown'

export type ZenithInsightBarRow = {
  /** Stable drill value (bucket id or salesperson name). */
  key: string
  /** Y-axis label. */
  label: string
  count: number
  /** Primary metric for bar length (days median uses count; outstanding uses ₹). */
  value: number
  /** Optional bar fill (pipeline ageing uses a green → red ramp). */
  fill?: string
}

/** Pipeline ageing bar colors — green (fresh) through red (stale). */
export const PIPELINE_AGE_BUCKET_COLORS: Record<PipelineAgeBucketId, string> = {
  '0-14': 'var(--accent-green)',
  '15-30': '#EAB308',
  '31-60': 'var(--accent-gold)',
  '61-90': '#F97316',
  '90+': 'var(--accent-red)',
}

export const PIPELINE_AGE_BUCKETS = [
  { id: '0-14', label: '0–14 days', min: 0, max: 14 },
  { id: '15-30', label: '15–30 days', min: 15, max: 30 },
  { id: '31-60', label: '31–60 days', min: 31, max: 60 },
  { id: '61-90', label: '61–90 days', min: 61, max: 90 },
  { id: '90+', label: '90+ days', min: 91, max: Infinity },
] as const

export type PipelineAgeBucketId = (typeof PIPELINE_AGE_BUCKETS)[number]['id']

export type CommissioningBucketId =
  | 'overdue'
  | 'this-month'
  | 'unscheduled'
  | 'later'
  | `month-${string}`

const MS_PER_DAY = 86_400_000

function daysInCurrentStage(p: ZenithExplorerProject, now = new Date()): number {
  const raw = p.stage_entered_at ?? p.updated_at
  if (!raw) return 0
  const t = Date.parse(raw)
  if (!Number.isNaN(t)) {
    return Math.max(0, Math.floor((now.getTime() - t) / MS_PER_DAY))
  }
  return 0
}

function pipelineAgeBucketId(days: number): PipelineAgeBucketId {
  for (const b of PIPELINE_AGE_BUCKETS) {
    if (days >= b.min && days <= b.max) return b.id
  }
  return '90+'
}

function openPipelineDeals(projects: ZenithExplorerProject[]): ZenithExplorerProject[] {
  return projects.filter((p) => isOpenForecastDeal(p) && p.projectStatus !== 'LOST')
}

export function filterPipelineAgeBucket(
  projects: ZenithExplorerProject[],
  bucketId: PipelineAgeBucketId,
): ZenithExplorerProject[] {
  return openPipelineDeals(projects).filter((p) => pipelineAgeBucketId(daysInCurrentStage(p)) === bucketId)
}

export function buildPipelineAgeChartRows(projects: ZenithExplorerProject[]): ZenithInsightBarRow[] {
  const open = openPipelineDeals(projects)
  const counts = new Map<PipelineAgeBucketId, number>()
  for (const b of PIPELINE_AGE_BUCKETS) counts.set(b.id, 0)
  for (const p of open) {
    const id = pipelineAgeBucketId(daysInCurrentStage(p))
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return PIPELINE_AGE_BUCKETS.map((b) => ({
    key: b.id,
    label: b.label,
    count: counts.get(b.id) ?? 0,
    value: counts.get(b.id) ?? 0,
    fill: PIPELINE_AGE_BUCKET_COLORS[b.id],
  })).filter((r) => r.count > 0)
}

type YmdParts = { y: number; m: number; d: number; ymd: string }

function parseYmd(ymd: string): YmdParts | null {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return null
  return { y, m, d, ymd }
}

function istPartsNow(now?: Date): YmdParts {
  const d = now ?? new Date()
  const ymd = calendarYmdInTimeZone(d)
  return parseYmd(ymd) ?? { y: 1970, m: 1, d: 1, ymd: '1970-01-01' }
}

function startOfMonthYmd(parts: YmdParts): string {
  return `${parts.y}-${String(parts.m).padStart(2, '0')}-01`
}

function endOfMonthYmd(parts: YmdParts): string {
  const last = new Date(Date.UTC(parts.y, parts.m, 0)).getUTCDate()
  return `${parts.y}-${String(parts.m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}

function addMonths(parts: YmdParts, delta: number): YmdParts {
  const d = new Date(Date.UTC(parts.y, parts.m - 1 + delta, 1))
  const ymd = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
  return parseYmd(ymd) ?? parts
}

function monthLabel(parts: YmdParts): string {
  const d = new Date(Date.UTC(parts.y, parts.m - 1, 1))
  return d.toLocaleString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' })
}

export type CommissioningBucketDef = {
  id: CommissioningBucketId
  label: string
  /** Inclusive YMD range when applicable. */
  fromYmd?: string
  toYmd?: string
}

function commissioningBucketForDeal(
  p: ZenithExplorerProject,
  nowParts: YmdParts,
  horizonEndYmd: string,
): CommissioningBucketId {
  const ymd = resolveForecastScheduleYmd(p)
  if (!ymd) return 'unscheduled'
  if (ymd < startOfMonthYmd(nowParts)) return 'overdue'
  if (ymd >= startOfMonthYmd(nowParts) && ymd <= endOfMonthYmd(nowParts)) return 'this-month'
  if (ymd > horizonEndYmd) return 'later'
  const parts = parseYmd(ymd)
  if (!parts) return 'later'
  return `month-${parts.y}-${String(parts.m).padStart(2, '0')}`
}

function buildCommissioningBucketDefs(now = new Date()): CommissioningBucketDef[] {
  const nowParts = istPartsNow(now)
  const defs: CommissioningBucketDef[] = [
    { id: 'overdue', label: 'Overdue' },
    { id: 'this-month', label: 'This month', fromYmd: startOfMonthYmd(nowParts), toYmd: endOfMonthYmd(nowParts) },
  ]
  for (let i = 1; i <= 5; i++) {
    const mp = addMonths(nowParts, i)
    defs.push({
      id: `month-${mp.y}-${String(mp.m).padStart(2, '0')}`,
      label: monthLabel(mp),
      fromYmd: startOfMonthYmd(mp),
      toYmd: endOfMonthYmd(mp),
    })
  }
  defs.push({ id: 'later', label: 'Later' })
  defs.push({ id: 'unscheduled', label: 'Unscheduled' })
  return defs
}

export function filterCommissioningBucket(
  projects: ZenithExplorerProject[],
  bucketId: CommissioningBucketId,
  now = new Date(),
): ZenithExplorerProject[] {
  const nowParts = istPartsNow(now)
  const horizon = addMonths(nowParts, 5)
  const horizonEndYmd = endOfMonthYmd(horizon)
  return openPipelineDeals(projects).filter(
    (p) => commissioningBucketForDeal(p, nowParts, horizonEndYmd) === bucketId,
  )
}

export function buildCommissioningTimelineRows(projects: ZenithExplorerProject[]): ZenithInsightBarRow[] {
  const nowParts = istPartsNow()
  const horizon = addMonths(nowParts, 5)
  const horizonEndYmd = endOfMonthYmd(horizon)
  const defs = buildCommissioningBucketDefs()
  const counts = new Map<CommissioningBucketId, number>()
  for (const d of defs) counts.set(d.id, 0)
  for (const p of openPipelineDeals(projects)) {
    const id = commissioningBucketForDeal(p, nowParts, horizonEndYmd)
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return defs
    .map((d) => ({
      key: d.id,
      label: d.label,
      count: counts.get(d.id) ?? 0,
      value: counts.get(d.id) ?? 0,
    }))
    .filter((r) => r.count > 0)
}

function outstandingAmount(p: ZenithExplorerProject): number {
  if (matchesZenithPaymentNaBucket(p)) return 0
  const ps = p.payment_status ?? 'PENDING'
  if (ps === 'FULLY_PAID') return 0
  const bal = p.balance_amount
  if (bal != null && bal > 0) return bal
  if (ps === 'PENDING' || ps === 'PARTIAL') {
    const deal = p.deal_value ?? 0
    const adv = p.advance_received ?? 0
    return Math.max(0, deal - adv)
  }
  return 0
}

export function filterOutstandingBySalesperson(
  projects: ZenithExplorerProject[],
  salesperson: string,
): ZenithExplorerProject[] {
  const name = salesperson.trim() || 'Unassigned'
  return projects.filter((p) => {
    if (p.projectStatus === 'LOST') return false
    if (outstandingAmount(p) <= 0) return false
    const sp = (p.assigned_to_name || '').trim() || 'Unassigned'
    return sp === name
  })
}

const OUTSTANDING_TOP_N = 8

export function buildOutstandingBySalespersonRows(projects: ZenithExplorerProject[]): ZenithInsightBarRow[] {
  const byName = new Map<string, { count: number; amount: number }>()
  for (const p of projects) {
    if (p.projectStatus === 'LOST') continue
    const amt = outstandingAmount(p)
    if (amt <= 0) continue
    const name = (p.assigned_to_name || '').trim() || 'Unassigned'
    const cur = byName.get(name) ?? { count: 0, amount: 0 }
    cur.count += 1
    cur.amount += amt
    byName.set(name, cur)
  }
  return Array.from(byName.entries())
    .map(([name, v]) => ({
      key: name,
      label: name,
      count: v.count,
      value: Math.round(v.amount),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, OUTSTANDING_TOP_N)
}

export function buildPipelineAgeFilterLabel(bucketId: PipelineAgeBucketId): string {
  const b = PIPELINE_AGE_BUCKETS.find((x) => x.id === bucketId)
  return `Pipeline ageing — ${b?.label ?? bucketId}`
}

export function buildCommissioningFilterLabel(bucketId: CommissioningBucketId): string {
  const defs = buildCommissioningBucketDefs()
  const d = defs.find((x) => x.id === bucketId)
  return `Commissioning — ${d?.label ?? bucketId}`
}

export function buildOutstandingSalesFilterLabel(name: string): string {
  return `Outstanding — ${name}`
}
