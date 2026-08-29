/**
 * Deal Health Score — 0–100 from project / row fields (snake_case or camelCase).
 * Balanced: sales urgency (activity + stage velocity) + commercial strength (value, commitment, source).
 */

import type { HitListItem } from '../hooks/useHitList'
import type { Project } from '../types'
import type { ZenithExplorerProject } from '../types/zenithExplorer'

const EXCLUDED_STAGES = [
  'Completed',
  'Subsidy Credited',
  'Completed - Subsidy Credited',
  'Loan - Subsidy Credited',
  'Cancelled / Lost',
  'Lost',
] as const

const PROJECT_STATUS_TO_LABEL: Record<string, string> = {
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

const EXPECTED_DAYS_PER_STAGE: Record<string, number> = {
  Lead: 7,
  'Site Survey': 14,
  Proposal: 21,
  'Confirmed Order': 30,
  /** Installs often wait on material / site / DISCOM — longer SLA than early pipeline. */
  'Under Installation': 60,
  'Submitted for Subsidy': 21,
}

/** Booked + delivery/install started — high-confidence deals get an explicit score boost. */
const UNDER_INSTALLATION_CONFIDENCE_PTS = 15

const PRE_ORDER_STAGES = new Set(['Lead', 'Site Survey', 'Proposal'])

function isUnderInstallationStage(stageLabel: string, project: Record<string, unknown>): boolean {
  if (stageLabel === 'Under Installation') return true
  return (project.projectStatus as string | undefined) === 'UNDER_INSTALLATION'
}

const SOURCE_SCORES: Record<string, number> = {
  Referral: 10,
  REFERRAL: 10,
  'Management Connect': 8,
  MANAGEMENT_CONNECT: 8,
  'Channel Partner': 8,
  CHANNEL_PARTNER: 8,
  'Digital Marketing': 6,
  DIGITAL_MARKETING: 6,
  Sales: 5,
  SALES: 5,
  Website: 4,
  WEBSITE: 4,
  Google: 4,
  GOOGLE: 4,
  Other: 3,
  OTHER: 3,
}

function normalizeLeadSource(raw: string): string {
  const s = (raw ?? '').trim()
  if (!s) return ''
  if (SOURCE_SCORES[s] !== undefined) return s
  return s
}

function getStageLabel(project: Record<string, unknown>): string {
  if (project.stage) return String(project.stage).trim()
  const ps = project.projectStatus as string | undefined
  if (ps && PROJECT_STATUS_TO_LABEL[ps]) return PROJECT_STATUS_TO_LABEL[ps]
  if (ps) return String(ps).replace(/_/g, ' ')
  return ''
}

function isExcludedStage(project: Record<string, unknown>, stageLabel: string): boolean {
  if (!project) return true
  const ps = project.projectStatus as string | undefined
  if (ps === 'COMPLETED' || ps === 'COMPLETED_SUBSIDY_CREDITED' || ps === 'LOST') return true
  if ((EXCLUDED_STAGES as readonly string[]).includes(stageLabel)) return true
  return false
}

function daysSince(dateStr: string | undefined | null): number {
  if (!dateStr) return 999
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr as string)
  d.setHours(0, 0, 0, 0)
  if (Number.isNaN(d.getTime())) return 999
  return Math.max(0, Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)))
}

function sameCalendarDay(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false
  const da = new Date(a)
  const db = new Date(b)
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

function readOrderValue(project: Record<string, unknown>): number {
  return Number(
    (project.deal_value as number | undefined) ??
      (project.order_value as number | undefined) ??
      (project.total_amount as number | undefined) ??
      (project.projectCost as number | undefined) ??
      0,
  )
}

function readExpectedClose(project: Record<string, unknown>): string | null {
  const raw =
    (project.expected_close_date as string | undefined | null) ??
    (project.expectedCommissioningDate as string | undefined | null) ??
    (project.expectedCloseDate as string | undefined | null) ??
    (project.close_date as string | undefined | null) ??
    (project.closeDate as string | undefined | null) ??
    null
  if (raw == null || String(raw).trim() === '') return null
  if (Number.isNaN(new Date(raw).getTime())) return null
  return String(raw)
}

function expectedCloseDeltaDays(expectedClose: string | null): number | null {
  if (!expectedClose) return null
  const closeDate = new Date(expectedClose)
  closeDate.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((closeDate.getTime() - today.getTime()) / 86400000)
}

function readPaymentStatus(project: Record<string, unknown>): string {
  return String(
    (project.paymentStatus as string | undefined) ??
      (project.payment_status as string | undefined) ??
      '',
  )
    .trim()
    .toUpperCase()
}

function readBalanceAmount(project: Record<string, unknown>): number {
  const n = Number(
    (project.balanceAmount as number | undefined) ?? (project.balance_amount as number | undefined) ?? NaN,
  )
  return Number.isFinite(n) ? n : NaN
}

/**
 * Factor 4 (15 pts) — Commitment.
 * Pre-order: order value + expected commissioning.
 * Booked: confirmation + advance + payment/collection health; overdue expected close penalises.
 */
function scoreCommitment(
  project: Record<string, unknown>,
  stageLabel: string,
): {
  score: number
  detail: string
  hasConfirmation: boolean
  advance: number
  orderValue: number
  mode: 'pre_order' | 'booked'
  paymentWeak: boolean
  closeOverdue: boolean
} {
  const confirmationRaw =
    (project.confirmationDate as string | undefined | null) ??
    (project.confirmation_date as string | undefined | null) ??
    null

  const hasConfirmation =
    confirmationRaw != null &&
    String(confirmationRaw).trim() !== '' &&
    !Number.isNaN(new Date(confirmationRaw as string).getTime())

  const advance = Number(
    (project.advanceReceived as number | undefined) ?? (project.advance_received as number | undefined) ?? 0,
  )
  const orderValue = readOrderValue(project)
  const isPreOrder = PRE_ORDER_STAGES.has(stageLabel)
  const expectedClose = readExpectedClose(project)
  const closeDelta = expectedCloseDeltaDays(expectedClose)
  const closeOverdue = closeDelta != null && closeDelta < 0

  if (hasConfirmation || !isPreOrder) {
    let score = 0
    if (hasConfirmation) score += 4

    if (hasConfirmation && advance > 0 && orderValue > 0) {
      score += advance >= orderValue * 0.5 ? 6 : 3
    }

    const ps = readPaymentStatus(project)
    const bal = readBalanceAmount(project)
    const fullyPaid =
      ps === 'FULLY_PAID' || (orderValue > 0 && Number.isFinite(bal) && bal <= 0 && advance > 0)
    const partial =
      ps === 'PARTIAL' || (Number.isFinite(bal) && bal > 0 && advance > 0 && orderValue > 0 && bal < orderValue)

    let paymentWeak = false
    if (fullyPaid) {
      score += 5
    } else if (partial) {
      score += 3
      paymentWeak = true
    } else if (hasConfirmation) {
      score += 1
      paymentWeak = true
    }

    if (closeOverdue) {
      score = Math.max(0, score - 3)
    }

    score = Math.min(15, score)

    let detail: string
    if (!hasConfirmation) {
      detail = 'No confirmation date — set under Sales & Commercial'
    } else if (closeOverdue) {
      detail = `Expected commissioning ${Math.abs(closeDelta!)}d overdue — update date or push completion`
    } else if (fullyPaid) {
      detail =
        advance >= orderValue * 0.5
          ? `Fully paid · advance ${formatINR(advance)} — strong commitment`
          : 'Fully paid — collection complete'
    } else if (advance <= 0 || orderValue <= 0) {
      detail = 'Confirmed — record advance and keep payment status current'
    } else if (partial) {
      detail = `Partial collection · balance ${formatINR(bal)} — follow up on dues`
    } else if (advance < orderValue * 0.5) {
      detail = `Advance ${formatINR(advance)} — token; payment still pending`
    } else {
      detail = `Advance ${formatINR(advance)} (≥50%) — collect remaining balance`
    }

    return {
      score,
      detail,
      hasConfirmation,
      advance,
      orderValue,
      mode: 'booked',
      paymentWeak,
      closeOverdue,
    }
  }

  // Pre-order: hygiene / next-step readiness (no confirmation yet)
  let score = 0
  if (orderValue > 0) score += 5

  if (expectedClose) {
    score += closeOverdue ? 3 : 10
  } else {
    score += 5
  }

  score = Math.min(15, score)

  let detail: string
  if (orderValue <= 0 && !expectedClose) {
    detail = 'Add order value and expected commissioning'
  } else if (!expectedClose) {
    detail = 'Order value set — add expected commissioning'
  } else if (closeOverdue) {
    detail = `Expected close ${Math.abs(closeDelta!)}d overdue — reset or close out`
  } else {
    detail = `Expected close in ${closeDelta}d — on the calendar`
  }

  return {
    score,
    detail,
    hasConfirmation: false,
    advance,
    orderValue,
    mode: 'pre_order',
    paymentWeak: false,
    closeOverdue,
  }
}

/** Latest of update / remark / My Day / payment dates for Activity (Option 2 fold-in). */
function resolveLastMeaningfulActivity(project: Record<string, unknown>): {
  iso: string | undefined
  source: 'remark' | 'my_day' | 'payment' | 'update'
} {
  const labeled: Array<{ source: 'remark' | 'my_day' | 'payment' | 'update'; raw: unknown }> = [
    {
      source: 'remark',
      raw:
        (project.lastRemarkAt as string | undefined | null) ??
        (project.last_remark_at as string | undefined | null),
    },
    {
      source: 'my_day',
      raw:
        (project.lastTaskActivityAt as string | undefined | null) ??
        (project.last_task_activity_at as string | undefined | null),
    },
    {
      source: 'payment',
      raw:
        (project.lastPaymentDate as string | undefined | null) ??
        (project.last_payment_date as string | undefined | null) ??
        (project.advanceReceivedDate as string | undefined | null) ??
        (project.advance_received_date as string | undefined | null),
    },
    {
      source: 'update',
      raw:
        (project.updated_at as string | undefined) ??
        (project.updatedAt as string | undefined) ??
        (project.last_modified_at as string | undefined) ??
        (project.lastModifiedAt as string | undefined),
    },
  ]

  let bestIso: string | undefined
  let bestSource: 'remark' | 'my_day' | 'payment' | 'update' = 'update'
  let bestMs = -Infinity
  for (const row of labeled) {
    if (row.raw == null || String(row.raw).trim() === '') continue
    const ms = new Date(row.raw as string).getTime()
    if (Number.isNaN(ms)) continue
    if (ms >= bestMs) {
      bestMs = ms
      bestIso = String(row.raw)
      bestSource = row.source
    }
  }
  return { iso: bestIso, source: bestSource }
}

function activitySourceLabel(source: 'remark' | 'my_day' | 'payment' | 'update'): string {
  switch (source) {
    case 'remark':
      return 'Remark'
    case 'my_day':
      return 'My Day'
    case 'payment':
      return 'Payment'
    default:
      return 'Updated'
  }
}

/**
 * Factor 3 (max 20). Soft sweet spot ₹2L–₹8L; mild discount for larger deals.
 * 0 → 0 | < ₹2L → 10 | ₹2–8L → 20 | > ₹8L–₹15L → 15 | ≥ ₹15L → 12
 */
export function scoreDealValueForHealth(orderValue: number): { score: number; detail: string } {
  const v = orderValue
  if (!Number.isFinite(v) || v <= 0) {
    return { score: 0, detail: 'No deal value entered' }
  }
  if (v >= 1_500_000) {
    return { score: 12, detail: `${formatINR(v)} — 12 pts (≥ ₹15L, mild discount)` }
  }
  if (v > 800_000) {
    return { score: 15, detail: `${formatINR(v)} — 15 pts (above ₹8L, mild discount)` }
  }
  if (v >= 200_000) {
    return { score: 20, detail: `${formatINR(v)} — 20 pts (sweet spot ₹2L–₹8L)` }
  }
  return { score: 10, detail: `${formatINR(v)} — 10 pts (< ₹2L)` }
}

export function hitListItemToHealthProject(item: HitListItem): Record<string, unknown> {
  if (item.updatedAt) {
    return pipelineRowToHealthProject({
      stage: item.stage,
      updatedAt: item.updatedAt,
      stageEnteredAt: item.stageEnteredAt ?? null,
      dealValue: item.dealValue,
      expectedCloseDate: item.expectedCloseDate ?? null,
      confirmationDate: item.confirmationDate ?? null,
      advanceReceived: item.advanceReceived ?? 0,
      leadSource: item.leadSource ?? null,
    })
  }
  let updatedAt: string
  if (item.label === 'STALLED' || item.label === 'NUDGE NEEDED' || item.label === 'GOING COLD') {
    updatedAt = new Date(Date.now() - item.daysNumber * 86400000).toISOString()
  } else {
    updatedAt = new Date(Date.now() - 7 * 86400000).toISOString()
  }
  return {
    stage: item.stage,
    deal_value: item.dealValue,
    updated_at: updatedAt,
    stage_changed_at: updatedAt,
    stage_anchor_is_fallback: true,
    expected_close_date: item.expectedCloseDate ?? null,
    lead_source: item.leadSource ?? '',
  }
}

export function pipelineRowToHealthProject(r: {
  stage: string
  updatedAt?: string
  stageEnteredAt?: string | null
  dealValue: number
  expectedCloseDate?: string | null
  confirmationDate?: string | null
  advanceReceived?: number | null
  leadSource?: string | null
  paymentStatus?: string | null
  balanceAmount?: number | null
  lastRemarkAt?: string | null
  lastPaymentDate?: string | null
}): Record<string, unknown> {
  const hasRealStage = Boolean(r.stageEnteredAt && String(r.stageEnteredAt).trim())
  const stageAnchor = hasRealStage ? r.stageEnteredAt! : r.updatedAt
  return {
    stage: r.stage,
    updated_at: r.updatedAt,
    last_modified_at: r.updatedAt,
    stage_changed_at: stageAnchor,
    stage_entered_at: r.stageEnteredAt ?? null,
    stage_anchor_is_fallback: !hasRealStage,
    deal_value: r.dealValue,
    projectCost: r.dealValue,
    expected_close_date: r.expectedCloseDate,
    close_date: r.expectedCloseDate,
    confirmationDate: r.confirmationDate ?? null,
    confirmation_date: r.confirmationDate ?? null,
    advanceReceived: r.advanceReceived ?? 0,
    advance_received: r.advanceReceived ?? 0,
    lead_source: r.leadSource ?? '',
    paymentStatus: r.paymentStatus ?? null,
    payment_status: r.paymentStatus ?? null,
    balanceAmount: r.balanceAmount ?? null,
    balance_amount: r.balanceAmount ?? null,
    lastRemarkAt: r.lastRemarkAt ?? null,
    last_remark_at: r.lastRemarkAt ?? null,
    lastPaymentDate: r.lastPaymentDate ?? null,
    last_payment_date: r.lastPaymentDate ?? null,
  }
}

/**
 * Map a Zenith explorer row (`zenithExplorerProjects`) into the shape `computeDealHealth` expects.
 * Must stay aligned with `projectDetailToHealthProject` for the same inputs the API provides.
 */
export function zenithExplorerProjectToHealthProject(p: ZenithExplorerProject): Record<string, unknown> {
  const hasRealStage = Boolean(p.stage_entered_at && String(p.stage_entered_at).trim())
  const stageAnchor = hasRealStage ? p.stage_entered_at! : p.updated_at
  const leadStr = (p.lead_source ?? '').trim()
  const advance = Number(p.advance_received ?? 0)
  return {
    projectStatus: p.projectStatus,
    stage: p.stageLabel,
    updated_at: p.updated_at,
    updatedAt: p.updated_at,
    last_modified_at: p.updated_at,
    lastModifiedAt: p.updated_at,
    stage_changed_at: stageAnchor,
    stageChangedAt: stageAnchor,
    stage_entered_at: p.stage_entered_at ?? null,
    stage_anchor_is_fallback: !hasRealStage,
    deal_value: p.deal_value,
    projectCost: p.deal_value,
    confirmation_date: p.confirmation_date ?? null,
    confirmationDate: p.confirmation_date ?? null,
    advance_received: advance,
    advanceReceived: advance,
    lead_source: leadStr,
    leadSource: leadStr,
    payment_status: p.payment_status ?? null,
    paymentStatus: p.payment_status ?? null,
    balance_amount: p.balance_amount ?? null,
    balanceAmount: p.balance_amount ?? null,
    expected_close_date: p.expected_close_date ?? null,
    last_remark_at: p.last_remark_at ?? null,
    lastRemarkAt: p.last_remark_at ?? null,
  }
}

/** Map a loaded CRM `Project` (drawer / detail / list) into the shape `computeDealHealth` expects. */
export function projectDetailToHealthProject(p: Project): Record<string, unknown> {
  const lead = p.leadSource
  const leadStr = lead != null ? String(lead) : ''
  const hasRealStage = Boolean(p.stageEnteredAt && String(p.stageEnteredAt).trim())
  const stageAnchor = hasRealStage ? p.stageEnteredAt! : p.updatedAt
  const ext = p as Project & {
    lastRemarkAt?: string | null
    lastTaskActivityAt?: string | null
    projectRemarks?: { createdAt?: string }[]
  }
  const remarkFromInclude = ext.projectRemarks?.[0]?.createdAt
  return {
    projectStatus: p.projectStatus,
    updated_at: p.updatedAt,
    updatedAt: p.updatedAt,
    last_modified_at: p.updatedAt,
    lastModifiedAt: p.updatedAt,
    stage_changed_at: stageAnchor,
    stageChangedAt: stageAnchor,
    stage_entered_at: p.stageEnteredAt ?? null,
    stage_anchor_is_fallback: !hasRealStage,
    deal_value: p.projectCost,
    projectCost: p.projectCost,
    expected_close_date: p.expectedCommissioningDate,
    expectedCommissioningDate: p.expectedCommissioningDate,
    expectedCloseDate: p.expectedCommissioningDate,
    close_date: p.expectedCommissioningDate,
    closeDate: p.expectedCommissioningDate,
    confirmationDate: p.confirmationDate ?? null,
    confirmation_date: p.confirmationDate ?? null,
    advanceReceived: p.advanceReceived ?? 0,
    advance_received: p.advanceReceived ?? 0,
    advanceReceivedDate: p.advanceReceivedDate ?? null,
    advance_received_date: p.advanceReceivedDate ?? null,
    lastPaymentDate: p.lastPaymentDate ?? null,
    last_payment_date: p.lastPaymentDate ?? null,
    paymentStatus: p.paymentStatus ?? null,
    payment_status: p.paymentStatus ?? null,
    balanceAmount: p.balanceAmount ?? null,
    balance_amount: p.balanceAmount ?? null,
    lead_source: leadStr,
    leadSource: leadStr,
    lastRemarkAt: ext.lastRemarkAt ?? remarkFromInclude ?? null,
    last_remark_at: ext.lastRemarkAt ?? remarkFromInclude ?? null,
    lastTaskActivityAt: ext.lastTaskActivityAt ?? null,
    last_task_activity_at: ext.lastTaskActivityAt ?? null,
  }
}

export type DealHealthFactor = {
  name: string
  icon: string
  score: number
  max: number
  detail: string
}

export type DealHealthResult = {
  score: number
  grade: string
  label: string
  color: string
  insight: string
  factors: DealHealthFactor[]
  raw: {
    factor1: number
    factor2: number
    factor3: number
    factor4: number
    factor5: number
    factor6?: number
  }
}

export function computeDealHealth(project: Record<string, unknown> | null | undefined): DealHealthResult | null {
  if (!project) return null

  const stageLabel = getStageLabel(project)
  if (isExcludedStage(project, stageLabel)) return null

  const underInstall = isUnderInstallationStage(stageLabel, project)

  const updatedAt =
    (project.updated_at as string | undefined) ??
    (project.updatedAt as string | undefined) ??
    (project.last_modified_at as string | undefined) ??
    (project.lastModifiedAt as string | undefined)

  const touch = resolveLastMeaningfulActivity(project)
  const activityAnchor = touch.iso ?? updatedAt
  const daysSinceActivity = daysSince(activityAnchor)
  const touchLabel = activitySourceLabel(touch.source)

  let factor1: number
  let factor1Detail: string
  if (underInstall) {
    // Ops cadence is slower once install/delivery is underway — less harsh than pipeline stages.
    if (daysSinceActivity <= 7) {
      factor1 = 30
      factor1Detail = `${touchLabel} ${daysSinceActivity}d ago`
    } else if (daysSinceActivity <= 14) {
      factor1 = 22
      factor1Detail = `${touchLabel} ${daysSinceActivity}d ago`
    } else if (daysSinceActivity <= 30) {
      factor1 = 15
      factor1Detail = `${touchLabel} ${daysSinceActivity}d ago — install in progress`
    } else if (daysSinceActivity <= 60) {
      factor1 = 8
      factor1Detail = `${touchLabel} ${daysSinceActivity}d ago — check install status`
    } else {
      factor1 = 0
      factor1Detail = `No meaningful touch in ${daysSinceActivity} days — install may be stalled`
    }
  } else if (daysSinceActivity <= 3) {
    factor1 = 30
    factor1Detail = `${touchLabel} ${daysSinceActivity}d ago`
  } else if (daysSinceActivity <= 7) {
    factor1 = 22
    factor1Detail = `${touchLabel} ${daysSinceActivity}d ago`
  } else if (daysSinceActivity <= 14) {
    factor1 = 12
    factor1Detail = `${touchLabel} ${daysSinceActivity}d ago — getting stale`
  } else if (daysSinceActivity <= 30) {
    factor1 = 5
    factor1Detail = `${touchLabel} ${daysSinceActivity}d ago — stale`
  } else {
    factor1 = 0
    factor1Detail = `No meaningful touch in ${daysSinceActivity} days — neglected`
  }

  const expectedDays = EXPECTED_DAYS_PER_STAGE[stageLabel] ?? 14

  const realStageRaw =
    (project.stage_entered_at as string | undefined | null) ??
    (project.stageEnteredAt as string | undefined | null) ??
    null
  const hasRealStageEntered =
    project.stage_anchor_is_fallback === false ||
    (project.stage_anchor_is_fallback !== true &&
      realStageRaw != null &&
      String(realStageRaw).trim() !== '')

  const stageAnchor =
    (hasRealStageEntered ? realStageRaw : null) ??
    (project.stage_changed_at as string | undefined) ??
    (project.stageChangedAt as string | undefined) ??
    updatedAt

  const stageAnchorIsFallback =
    project.stage_anchor_is_fallback === true ||
    !hasRealStageEntered ||
    sameCalendarDay(stageAnchor, updatedAt)

  const daysInStage = daysSince(stageAnchor)

  let factor2: number
  let factor2Detail: string
  if (daysInStage <= expectedDays) {
    factor2 = 25
    factor2Detail = `${daysInStage}d in ${stageLabel} — on track`
  } else if (daysInStage <= expectedDays * 1.5) {
    factor2 = 15
    factor2Detail = `${daysInStage}d in ${stageLabel} — slightly delayed`
  } else if (daysInStage <= expectedDays * 2) {
    factor2 = 8
    factor2Detail = `${daysInStage}d in ${stageLabel} — delayed`
  } else {
    factor2 = 0
    factor2Detail = `${daysInStage}d in ${stageLabel} — stuck`
  }

  // Same clock for activity + stage → dampen Activity so neglect is not counted twice at full weight.
  // Under Installation already uses a softer Activity curve + Install confidence — skip dampen there.
  if (!underInstall && stageAnchorIsFallback && factor1 > 0) {
    factor1 = Math.round(factor1 * 0.55)
    factor1Detail = `${factor1Detail} (shared with stage clock)`
  }

  const value = readOrderValue(project)
  const { score: factor3, detail: factor3Detail } = scoreDealValueForHealth(value)

  const commitment = scoreCommitment(project, stageLabel)
  const factor4 = commitment.score
  const factor4Detail = commitment.detail

  const sourceRaw = String(
    (project.lead_source as string | undefined) ??
      (project.leadSource as string | undefined) ??
      (project.source as string | undefined) ??
      '',
  ).trim()
  const sourceNorm = normalizeLeadSource(sourceRaw)
  const factor5 = SOURCE_SCORES[sourceNorm] ?? SOURCE_SCORES[sourceRaw] ?? (sourceRaw ? 3 : 2)
  const factor5Detail = sourceRaw || 'Unknown source'

  const factor6 = underInstall ? UNDER_INSTALLATION_CONFIDENCE_PTS : 0
  const factor6Detail = underInstall
    ? 'Confirmed order with delivery / install underway — high-confidence deal'
    : ''

  const rawScore = factor1 + factor2 + factor3 + factor4 + factor5 + factor6
  const score = Math.min(100, Math.max(0, rawScore))

  const commerciallyStrong = factor3 >= 12 && factor5 >= 6
  const urgencyWeak = factor1 + factor2 <= 15

  let grade: string
  let label: string
  let color: string
  if (score >= 75) {
    grade = 'A'
    label = underInstall ? 'On track' : 'Healthy'
    color = 'var(--accent-teal)'
  } else if (score >= 55) {
    grade = 'B'
    label = underInstall ? 'In delivery' : 'Good'
    color = 'var(--accent-green)'
  } else if (score >= 35) {
    grade = 'C'
    label = commerciallyStrong && urgencyWeak ? 'Neglected' : underInstall ? 'Install risk' : 'At Risk'
    color = 'var(--accent-gold)'
  } else if (score >= 15) {
    grade = 'D'
    label = commerciallyStrong && urgencyWeak ? 'Neglected' : underInstall ? 'Install stalled' : 'Weak'
    color = 'var(--accent-red)'
  } else {
    grade = 'F'
    label = commerciallyStrong ? 'Critical — neglected' : 'Critical'
    color = 'var(--accent-red)'
  }

  const factorScores = [
    { key: 'activity' as const, score: factor1, max: 30 },
    { key: 'momentum' as const, score: factor2, max: 25 },
    { key: 'value' as const, score: factor3, max: 20 },
    { key: 'commitment' as const, score: factor4, max: 15 },
    { key: 'source' as const, score: factor5, max: 10 },
    ...(underInstall
      ? [{ key: 'installConfidence' as const, score: factor6, max: UNDER_INSTALLATION_CONFIDENCE_PTS }]
      : []),
  ]

  const weakest = factorScores.reduce((a, b) => (a.score / a.max < b.score / b.max ? a : b))

  const commitmentInsight =
    commitment.mode === 'booked'
      ? commitment.closeOverdue
        ? `Expected commissioning is overdue — reset the date or drive the site to completion.`
        : !commitment.hasConfirmation
          ? `No confirmation date — add it under Sales & Commercial when the order is confirmed.`
          : commitment.advance <= 0 || commitment.orderValue <= 0
            ? `Confirmed but no advance recorded — collect and log advance in Payment tracking.`
            : commitment.paymentWeak
              ? `Collection incomplete — chase balance / update payment status in Payment tracking.`
              : commitment.advance < commitment.orderValue * 0.5
                ? `Token advance only — push for a stronger advance to start work.`
                : `Commitment looks solid — keep collection and commissioning on track.`
      : commitment.orderValue <= 0
        ? `Add an order value so this pipeline deal can be prioritised.`
        : commitment.closeOverdue
          ? `Expected close is overdue — update commissioning or move the stage.`
          : !readExpectedClose(project)
            ? `Set expected commissioning so the team has a clear close target.`
            : `Expected close is set — keep activity moving toward confirmation.`

  // Actionable insight: stage stuck / neglect first, then payment & close hygiene.
  let insight: string
  if (factor2 === 0 && daysInStage > expectedDays * 2) {
    insight = underInstall
      ? `Install stage open for ${daysInStage} days — check material, site access, or DISCOM blockers today.`
      : `Stuck in ${stageLabel} for ${daysInStage} days — twice the expected time. Move stage or log the blocker today.`
  } else if (factor1 === 0 && daysSinceActivity > (underInstall ? 60 : 30)) {
    insight = underInstall
      ? `No remark/My Day/update in ${daysSinceActivity} days — log install progress this week.`
      : commerciallyStrong
        ? `Strong commercial deal, but no meaningful touch in ${daysSinceActivity} days — call or log a remark this week.`
        : `No meaningful touch in ${daysSinceActivity} days — log a remark or My Day update today.`
  } else if (commitment.closeOverdue) {
    insight = commitmentInsight
  } else if (commitment.mode === 'booked' && commitment.paymentWeak && commitment.hasConfirmation) {
    insight = commitmentInsight
  } else if (underInstall && score >= 75 && factor2 >= 15 && !commitment.paymentWeak) {
    insight =
      'Under Installation — booked deal in delivery/install. Keep remarks current through completion.'
  } else if (score >= 75 && factorScores.every((f) => f.score / f.max >= 0.75)) {
    insight = 'This deal looks healthy — keep the momentum going.'
  } else if (commitment.mode === 'booked' && commitment.hasConfirmation && commitment.advance <= 0) {
    insight = `Order confirmed with no advance — collect payment to protect the booking.`
  } else if (factor3 === 0) {
    insight = `No deal value entered — add an order value to qualify this lead.`
  } else if (weakest.key === 'commitment') {
    insight = commitmentInsight
  } else if (weakest.key === 'activity') {
    insight = underInstall
      ? `Last ${touchLabel.toLowerCase()} ${daysSinceActivity} days ago — a short progress remark helps the team.`
      : `Last ${touchLabel.toLowerCase()} ${daysSinceActivity} days ago — follow up and log a remark.`
  } else if (weakest.key === 'momentum') {
    insight = `${daysInStage} days in ${stageLabel} — nudge it forward.`
  } else if (weakest.key === 'value') {
    insight =
      factor3 === 20
        ? `Order value is in the ₹2L–₹8L sweet spot.`
        : value > 800_000
          ? `Larger order — slight Deal Value discount; keep focus on close and delivery.`
          : `Deal value is below the ₹2L–₹8L sweet spot — validate scope or pricing where needed.`
  } else if (weakest.key === 'installConfidence') {
    insight = 'Under Installation — protect completion and handover; this deal is already booked.'
  } else {
    insight = sourceRaw
      ? `Lead source is set — keep activity and stage movement current.`
      : `Lead source unknown — updating this improves triage and forecasting.`
  }

  const factors: DealHealthFactor[] = [
    {
      name: 'Activity',
      icon: 'Clock',
      score: factor1,
      max: 30,
      detail: factor1Detail,
    },
    {
      name: 'Momentum',
      icon: 'TrendingUp',
      score: factor2,
      max: 25,
      detail: factor2Detail,
    },
    {
      name: 'Deal Value',
      icon: 'IndianRupee',
      score: factor3,
      max: 20,
      detail: factor3Detail,
    },
    {
      name: 'Commitment',
      icon: 'Calendar',
      score: factor4,
      max: 15,
      detail: factor4Detail,
    },
    {
      name: 'Lead Source',
      icon: 'Users',
      score: factor5,
      max: 10,
      detail: factor5Detail,
    },
  ]
  if (underInstall) {
    factors.push({
      name: 'Install confidence',
      icon: 'Shield',
      score: factor6,
      max: UNDER_INSTALLATION_CONFIDENCE_PTS,
      detail: factor6Detail,
    })
  }

  return {
    score,
    grade,
    label,
    color,
    insight,
    factors,
    raw: { factor1, factor2, factor3, factor4, factor5, factor6: underInstall ? factor6 : undefined },
  }
}
