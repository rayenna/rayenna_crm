import type { ZenithExplorerProject } from '../types/zenithExplorer'
import { UserRole } from '../types'
import { calendarYmdInTimeZone } from './istCalendar'

/**
 * Keep in sync with `ZENITH_FUNNEL_METRICS_PROJECT_CAP` in `src/routes/dashboard.ts`.
 * Explorer / forecast cohort is truncated at this many projects (newest `updatedAt` first).
 */
export const ZENITH_EXPLORER_PROJECT_CAP = 2000

/** Stage display labels → win probability for early / open pipeline. */
export const STAGE_PROBABILITY: Record<string, number> = {
  Lead: 0.1,
  'Site Survey': 0.25,
  Proposal: 0.45,
  /** Confirmed+ use 100% for schedule forecasting (still open until Completed). */
  'Confirmed Order': 1,
  'Under Installation': 1,
  'Submitted for Subsidy': 1,
  Completed: 1,
  'Completed - Subsidy Credited': 1,
  Lost: 0,
}

/** Ordered chips for the weight legend (open stages only). */
export const FORECAST_STAGE_WEIGHT_CHIPS: { label: string; probability: number }[] = [
  { label: 'Lead', probability: 0.1 },
  { label: 'Site Survey', probability: 0.25 },
  { label: 'Proposal', probability: 0.45 },
  { label: 'Confirmed Order', probability: 1 },
  { label: 'Under Installation', probability: 1 },
  { label: 'Submitted for Subsidy', probability: 1 },
]

export const FORECAST_TERMINAL_STAGE_LABELS = new Set([
  'Completed',
  'Completed - Subsidy Credited',
  'Lost',
])

/** Lead → Proposal: speculative / early pipeline. */
export const FORECAST_EARLY_STAGE_LABELS = new Set(['Lead', 'Site Survey', 'Proposal'])

/** Confirmed → Subsidy submitted: committed / near-certain. */
export const FORECAST_COMMITTED_STAGE_LABELS = new Set([
  'Confirmed Order',
  'Under Installation',
  'Submitted for Subsidy',
])

export type ForecastBand = 'all' | 'early' | 'committed'

/** When the expected revenue is scheduled (IST calendar / Indian FY). */
export type ForecastTiming = 'all' | 'month' | 'quarter' | 'rest_of_fy'

export type ForecastBreakdownDimension = 'source' | 'sales' | 'segment' | 'stage'

export type ForecastBreakdownRow = {
  label: string
  weighted: number
  count: number
  raw: number
}

export type ForecastResult = {
  totalForecast: number
  totalRaw: number
  /** Weighted ÷ raw, 0–1. Zero when raw is 0. */
  impliedWinRate: number
  byLeadSource: ForecastBreakdownRow[]
  bySalesMember: ForecastBreakdownRow[]
  bySegment: ForecastBreakdownRow[]
  byStage: ForecastBreakdownRow[]
  dealCount: number
  band: ForecastBand
  timing: ForecastTiming
  /** Open deals (in band) with no commissioning / confirmation / stage date. */
  unscheduledCount: number
  /** Open deals (in band) scheduled before this IST month — included in Month & Quarter. */
  pastDueCount: number
  /** Open deals (in band) scheduled after the current Indian FY. */
  beyondFyCount: number
}

export type ComputeForecastOpts = {
  band?: ForecastBand
  timing?: ForecastTiming
  /** Override “now” for tests (Date or ISO). */
  now?: Date | string
}

export function probForStage(stageLabel: string): number {
  return STAGE_PROBABILITY[stageLabel] ?? 0.1
}

export function isOpenForecastDeal(p: ZenithExplorerProject): boolean {
  return !FORECAST_TERMINAL_STAGE_LABELS.has(p.stageLabel)
}

export function dealMatchesForecastBand(p: ZenithExplorerProject, band: ForecastBand): boolean {
  if (band === 'all') return true
  if (band === 'early') return FORECAST_EARLY_STAGE_LABELS.has(p.stageLabel)
  return FORECAST_COMMITTED_STAGE_LABELS.has(p.stageLabel)
}

/**
 * Schedule YMD for When filters — expected commissioning only (IST).
 * Confirmation / stage-entered are not used: they mark history, not when revenue is due,
 * and made Month/Quarter collapse into almost “Any time” on real data.
 */
export function resolveForecastScheduleYmd(p: ZenithExplorerProject): string | null {
  const raw = p.expected_close_date
  if (raw == null || raw === '') return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return calendarYmdInTimeZone(d)
}

type YmdParts = { y: number; m: number; d: number; ymd: string }

function parseYmd(ymd: string): YmdParts | null {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return null
  return { y, m, d, ymd }
}

function istPartsNow(now?: Date | string): YmdParts {
  const d = now == null ? new Date() : typeof now === 'string' ? new Date(now) : now
  const ymd = calendarYmdInTimeZone(Number.isNaN(d.getTime()) ? new Date() : d)
  return parseYmd(ymd) ?? { y: 1970, m: 1, d: 1, ymd: '1970-01-01' }
}

/** Indian FY quarter 1–4 from calendar month (Apr=Q1 … Jan–Mar=Q4). */
export function indianFyQuarterFromMonth(month: number): 1 | 2 | 3 | 4 {
  if (month >= 4 && month <= 6) return 1
  if (month >= 7 && month <= 9) return 2
  if (month >= 10 && month <= 12) return 3
  return 4
}

/** FY label for a calendar YMD, e.g. 2025-26. */
function fyLabelFromParts(p: YmdParts): string {
  if (p.m >= 4) return `${p.y}-${String(p.y + 1).slice(-2)}`
  return `${p.y - 1}-${String(p.y).slice(-2)}`
}

/** Last calendar day of the Indian FY quarter containing `parts`. */
function endOfIndianFyQuarterYmd(parts: YmdParts): string {
  const q = indianFyQuarterFromMonth(parts.m)
  if (q === 1) return `${parts.y}-06-30`
  if (q === 2) return `${parts.y}-09-30`
  if (q === 3) return `${parts.y}-12-31`
  // Q4 Jan–Mar → FY ends 31 Mar of that calendar year
  return `${parts.y}-03-31`
}

/** Last day of the Indian FY containing `parts`. */
function endOfIndianFyYmd(parts: YmdParts): string {
  if (parts.m >= 4) return `${parts.y + 1}-03-31`
  return `${parts.y}-03-31`
}

function startOfMonthYmd(parts: YmdParts): string {
  return `${parts.y}-${String(parts.m).padStart(2, '0')}-01`
}

function endOfMonthYmd(parts: YmdParts): string {
  const last = new Date(Date.UTC(parts.y, parts.m, 0)).getUTCDate()
  return `${parts.y}-${String(parts.m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}

/**
 * Timing buckets (IST), using expected commissioning date only:
 * - month: overdue (commissioning before this month) OR this calendar month
 * - quarter: through end of current Indian FY quarter (includes month + overdue)
 * - rest_of_fy: after this quarter, still in the current Indian FY
 * - all: no schedule filter (includes deals with no commissioning date + next FY)
 */
export function dealMatchesForecastTiming(
  p: ZenithExplorerProject,
  timing: ForecastTiming,
  now?: Date | string,
): boolean {
  if (timing === 'all') return true
  const schedule = resolveForecastScheduleYmd(p)
  if (!schedule) return false

  const today = istPartsNow(now)
  const monthEnd = endOfMonthYmd(today)
  const quarterEnd = endOfIndianFyQuarterYmd(today)
  const fyEnd = endOfIndianFyYmd(today)

  if (timing === 'month') {
    return schedule <= monthEnd
  }
  if (timing === 'quarter') {
    return schedule <= quarterEnd
  }
  // rest_of_fy
  return schedule > quarterEnd && schedule <= fyEnd
}

export function getForecastOpenDeals(
  projects: ZenithExplorerProject[] | null | undefined,
  band: ForecastBand = 'all',
  timing: ForecastTiming = 'all',
  now?: Date | string,
): ZenithExplorerProject[] {
  return (projects ?? []).filter(
    (p) =>
      isOpenForecastDeal(p) &&
      dealMatchesForecastBand(p, band) &&
      dealMatchesForecastTiming(p, timing, now),
  )
}

function groupAndWeight(
  deals: ZenithExplorerProject[],
  keyFn: (p: ZenithExplorerProject) => string,
): ForecastBreakdownRow[] {
  const groups: Record<string, { label: string; weighted: number; count: number; raw: number }> = {}
  for (const p of deals) {
    const key = keyFn(p)
    const value = Number(p.deal_value ?? 0)
    const weighted = value * probForStage(p.stageLabel)
    if (!groups[key]) {
      groups[key] = { label: key, weighted: 0, count: 0, raw: 0 }
    }
    groups[key].weighted += weighted
    groups[key].count += 1
    groups[key].raw += value
  }
  return Object.values(groups)
    .map((g) => ({ ...g, weighted: Math.round(g.weighted), raw: Math.round(g.raw) }))
    .sort((a, b) => b.weighted - a.weighted)
}

function normalizeOpts(bandOrOpts: ForecastBand | ComputeForecastOpts = 'all'): Required<
  Pick<ComputeForecastOpts, 'band' | 'timing'>
> & { now?: Date | string } {
  if (typeof bandOrOpts === 'string') {
    return { band: bandOrOpts, timing: 'all' }
  }
  return {
    band: bandOrOpts.band ?? 'all',
    timing: bandOrOpts.timing ?? 'all',
    now: bandOrOpts.now,
  }
}

export function computeForecast(
  projects: ZenithExplorerProject[] | null | undefined,
  bandOrOpts: ForecastBand | ComputeForecastOpts = 'all',
): ForecastResult {
  const { band, timing, now } = normalizeOpts(bandOrOpts)
  const inBand = (projects ?? []).filter(
    (p) => isOpenForecastDeal(p) && dealMatchesForecastBand(p, band),
  )
  const today = istPartsNow(now)
  const monthStart = startOfMonthYmd(today)
  const fyEnd = endOfIndianFyYmd(today)

  let unscheduledCount = 0
  let pastDueCount = 0
  let beyondFyCount = 0
  for (const p of inBand) {
    const ymd = resolveForecastScheduleYmd(p)
    if (!ymd) {
      unscheduledCount += 1
      continue
    }
    if (ymd < monthStart) pastDueCount += 1
    if (ymd > fyEnd) beyondFyCount += 1
  }

  const openDeals = inBand.filter((p) => dealMatchesForecastTiming(p, timing, now))

  let totalForecast = 0
  let totalRaw = 0
  for (const p of openDeals) {
    const value = Number(p.deal_value ?? 0)
    totalRaw += value
    totalForecast += value * probForStage(p.stageLabel)
  }
  totalForecast = Math.round(totalForecast)
  totalRaw = Math.round(totalRaw)

  return {
    totalForecast,
    totalRaw,
    impliedWinRate: totalRaw > 0 ? totalForecast / totalRaw : 0,
    byLeadSource: groupAndWeight(openDeals, (p) => p.lead_source || 'Unknown'),
    bySalesMember: groupAndWeight(openDeals, (p) => p.assigned_to_name || 'Unassigned'),
    bySegment: groupAndWeight(openDeals, (p) => p.customer_segment || 'Unknown'),
    byStage: groupAndWeight(openDeals, (p) => p.stageLabel || 'Unknown'),
    dealCount: openDeals.length,
    band,
    timing,
    unscheduledCount,
    pastDueCount,
    beyondFyCount,
  }
}

/** Weighted value for sorting drill-down lists. */
export function weightedDealValue(p: ZenithExplorerProject): number {
  return Number(p.deal_value ?? 0) * probForStage(p.stageLabel)
}

function sliceKey(p: ZenithExplorerProject, dimension: ForecastBreakdownDimension): string {
  switch (dimension) {
    case 'source':
      return p.lead_source || 'Unknown'
    case 'sales':
      return p.assigned_to_name || 'Unassigned'
    case 'segment':
      return p.customer_segment || 'Unknown'
    case 'stage':
      return p.stageLabel || 'Unknown'
  }
}

/** Open forecast deals for one breakdown row (respects band + timing), sorted by weighted contribution. */
export function filterForecastSliceDeals(
  projects: ZenithExplorerProject[] | null | undefined,
  dimension: ForecastBreakdownDimension,
  label: string,
  band: ForecastBand = 'all',
  timing: ForecastTiming = 'all',
): ZenithExplorerProject[] {
  return getForecastOpenDeals(projects, band, timing)
    .filter((p) => sliceKey(p, dimension) === label)
    .sort((a, b) => weightedDealValue(b) - weightedDealValue(a))
}

/** Open forecast deals for several category labels (e.g. remaining “+N more” rows). */
export function filterForecastSliceDealsMany(
  projects: ZenithExplorerProject[] | null | undefined,
  dimension: ForecastBreakdownDimension,
  labels: string[],
  band: ForecastBand = 'all',
  timing: ForecastTiming = 'all',
): ZenithExplorerProject[] {
  const set = new Set(labels)
  return getForecastOpenDeals(projects, band, timing)
    .filter((p) => set.has(sliceKey(p, dimension)))
    .sort((a, b) => weightedDealValue(b) - weightedDealValue(a))
}

export function forecastDimensionTitle(dimension: ForecastBreakdownDimension): string {
  switch (dimension) {
    case 'source':
      return 'Source'
    case 'sales':
      return 'Sales'
    case 'segment':
      return 'Customer type'
    case 'stage':
      return 'Stage'
  }
}

export function forecastBandLabel(band: ForecastBand): string {
  switch (band) {
    case 'all':
      return 'All open'
    case 'early':
      return 'Early pipeline'
    case 'committed':
      return 'Committed'
  }
}

export function forecastTimingLabel(timing: ForecastTiming): string {
  switch (timing) {
    case 'all':
      return 'Any time'
    case 'month':
      return 'This month'
    case 'quarter':
      return 'This quarter'
    case 'rest_of_fy':
      return 'Rest of FY'
  }
}

export function explorerCohortLooksCapped(projectCount: number): boolean {
  return projectCount >= ZENITH_EXPLORER_PROJECT_CAP
}

/** Exported for tests — FY label of “today” in IST. */
export function forecastCurrentFyLabel(now?: Date | string): string {
  return fyLabelFromParts(istPartsNow(now))
}

export type ForecastConcentration = {
  /** 0–3 deals included in the top slice. */
  dealCount: number
  weighted: number
  /** Share of total weighted forecast, 0–1. */
  share: number
  /** Customer names for tooltip. */
  names: string[]
}

export type ForecastRoleAccent = {
  tone: 'neutral' | 'info' | 'warning'
  text: string
  title?: string
}

const SOURCE_CONCENTRATION_WARN = 0.5

/** Largest N deals by weighted contribution as a share of the forecast total. */
export function computeForecastConcentration(
  deals: ZenithExplorerProject[],
  totalWeighted: number,
  topN = 3,
): ForecastConcentration {
  const ranked = [...deals].sort((a, b) => weightedDealValue(b) - weightedDealValue(a))
  const top = ranked.slice(0, topN)
  const weighted = Math.round(top.reduce((s, p) => s + weightedDealValue(p), 0))
  const share = totalWeighted > 0 ? weighted / totalWeighted : 0
  return {
    dealCount: top.length,
    weighted,
    share,
    names: top.map((p) => p.customer_name || 'Unknown'),
  }
}

function hasOpenBalance(p: ZenithExplorerProject): boolean {
  const bal = p.balance_amount
  if (bal != null && Number.isFinite(Number(bal)) && Number(bal) > 0) return true
  const ps = p.payment_status ?? 'PENDING'
  return ps === 'PENDING' || ps === 'PARTIAL'
}

/**
 * Thin role-specific line under the shared concentration row.
 * Uses the same band+timing deal set as the headline.
 */
export function buildForecastRoleAccent(
  role: UserRole | string | null | undefined,
  deals: ZenithExplorerProject[],
  forecast: ForecastResult,
): ForecastRoleAccent | null {
  if (!role || forecast.dealCount === 0) return null

  if (role === UserRole.SALES) {
    if (forecast.unscheduledCount > 0 && forecast.timing === 'all') {
      return {
        tone: 'info',
        text: `Set commissioning on ${forecast.unscheduledCount} deal${forecast.unscheduledCount === 1 ? '' : 's'} for When filters`,
        title: 'Month / Quarter / Rest of FY need expected commissioning dates',
      }
    }
    if (forecast.pastDueCount > 0) {
      return {
        tone: 'warning',
        text: `${forecast.pastDueCount} past commissioning date`,
        title: 'Open deals whose expected commissioning is before this month',
      }
    }
    return {
      tone: 'neutral',
      text: 'Your open pipeline (scoped to you)',
      title: 'Sales Zenith shows your deals only',
    }
  }

  if (role === UserRole.MANAGEMENT || role === UserRole.ADMIN) {
    const topSource = forecast.byLeadSource[0]
    if (
      topSource &&
      forecast.totalForecast > 0 &&
      topSource.weighted / forecast.totalForecast >= SOURCE_CONCENTRATION_WARN
    ) {
      const pct = Math.round((topSource.weighted / forecast.totalForecast) * 100)
      return {
        tone: 'warning',
        text: `${topSource.label} is ${pct}% of forecast`,
        title: 'One lead source dominates the weighted open pipeline',
      }
    }
    return null
  }

  if (role === UserRole.FINANCE) {
    const unpaid = deals.filter(hasOpenBalance)
    if (unpaid.length === 0) {
      return {
        tone: 'neutral',
        text: 'No open balance on this forecast set',
        title: 'PENDING / PARTIAL or balance amount > 0',
      }
    }
    const weighted = Math.round(unpaid.reduce((s, p) => s + weightedDealValue(p), 0))
    return {
      tone: 'info',
      text: `₹${weighted.toLocaleString('en-IN')} weighted with open balance · ${unpaid.length} deal${unpaid.length === 1 ? '' : 's'}`,
      title: 'Open deals in this filter with PENDING/PARTIAL payment or balance > 0',
    }
  }

  if (role === UserRole.OPERATIONS) {
    const committed = deals.filter((p) => FORECAST_COMMITTED_STAGE_LABELS.has(p.stageLabel))
    if (committed.length === 0) {
      return {
        tone: 'neutral',
        text: 'No Confirmed+ deals in this filter',
        title: 'Confirmed Order, Under Installation, Submitted for Subsidy',
      }
    }
    const weighted = Math.round(committed.reduce((s, p) => s + weightedDealValue(p), 0))
    const kw = committed.reduce((s, p) => {
      const n = Number(p.system_capacity_kw)
      return s + (Number.isFinite(n) && n > 0 ? n : 0)
    }, 0)
    const kwPart =
      kw > 0 ? ` · ${kw.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kW` : ''
    return {
      tone: 'info',
      text: `Committed ₹${weighted.toLocaleString('en-IN')}${kwPart} · ${committed.length} deal${committed.length === 1 ? '' : 's'}`,
      title: 'Confirmed+ stages in the current band and When filter',
    }
  }

  return null
}
