/**
 * Deal Health Score — computes 0–100 from fields on the project / row object.
 * Supports snake_case and camelCase keys.
 */

import type { HitListItem } from '../hooks/useHitList'
import type { Project } from '../types'

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
  'Under Installation': 45,
  'Submitted for Subsidy': 21,
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
  return Math.max(0, Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)))
}

/** Deal Health factor 4 (15 pts): confirmation date (Sales & Commercial) + advance vs order value (Payment tracking). */
function scoreConfirmationAndAdvance(project: Record<string, unknown>): {
  score: number
  detail: string
  hasConfirmation: boolean
  advance: number
  orderValue: number
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
  const orderValue = Number(
    (project.deal_value as number | undefined) ??
      (project.order_value as number | undefined) ??
      (project.total_amount as number | undefined) ??
      (project.projectCost as number | undefined) ??
      0,
  )

  let score = 0
  if (hasConfirmation) score += 5

  if (hasConfirmation && advance > 0 && orderValue > 0) {
    if (advance < orderValue * 0.5) {
      score += 5
    } else {
      score += 10
    }
  }

  score = Math.min(15, score)

  let detail: string
  if (!hasConfirmation) {
    detail = 'No confirmation date'
  } else if (advance <= 0 || orderValue <= 0) {
    detail = 'Confirmation set — record advance vs order value'
  } else if (advance < orderValue * 0.5) {
    detail = `Advance ${formatINR(advance)} — token (<50% of order)`
  } else {
    detail = `Advance ${formatINR(advance)} — ≥50% of order (work-ready)`
  }

  return { score, detail, hasConfirmation, advance, orderValue }
}

function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Deal Health factor 3 (max 20). Bands favour typical 3–5 kW sweet-spot order values.
 * ≥ ₹5L → 5 | ₹3L–₹5L → 10 | ₹1.75L–₹3L → 20 | ₹1.5L–₹1.75L → 10 | below ₹1.5L (but > 0) → 5 | else 0
 */
function scoreDealValueForHealth(orderValue: number): { score: number; detail: string } {
  const v = orderValue
  if (!Number.isFinite(v) || v <= 0) {
    return { score: 0, detail: 'No deal value entered' }
  }
  if (v >= 500_000) {
    return { score: 5, detail: `${formatINR(v)} — 5 pts (≥ ₹5L)` }
  }
  if (v >= 300_000) {
    return { score: 10, detail: `${formatINR(v)} — 10 pts (₹3L–₹5L)` }
  }
  if (v >= 175_000) {
    return { score: 20, detail: `${formatINR(v)} — 20 pts (sweet spot ₹1.75L–₹3L)` }
  }
  if (v >= 150_000) {
    return { score: 10, detail: `${formatINR(v)} — 10 pts (₹1.5L–₹1.75L)` }
  }
  return { score: 5, detail: `${formatINR(v)} — 5 pts (< ₹1.5L)` }
}

export function hitListItemToHealthProject(item: HitListItem): Record<string, unknown> {
  if (item.updatedAt) {
    return pipelineRowToHealthProject({
      stage: item.stage,
      updatedAt: item.updatedAt,
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
    expected_close_date: null,
    lead_source: '',
  }
}

export function pipelineRowToHealthProject(r: {
  stage: string
  updatedAt?: string
  dealValue: number
  expectedCloseDate?: string | null
  confirmationDate?: string | null
  advanceReceived?: number | null
  leadSource?: string | null
}): Record<string, unknown> {
  return {
    stage: r.stage,
    updated_at: r.updatedAt,
    last_modified_at: r.updatedAt,
    stage_changed_at: r.updatedAt,
    deal_value: r.dealValue,
    projectCost: r.dealValue,
    expected_close_date: r.expectedCloseDate,
    close_date: r.expectedCloseDate,
    confirmationDate: r.confirmationDate ?? null,
    confirmation_date: r.confirmationDate ?? null,
    advanceReceived: r.advanceReceived ?? 0,
    advance_received: r.advanceReceived ?? 0,
    lead_source: r.leadSource ?? '',
  }
}

/** Map a loaded CRM `Project` (drawer / detail) into the shape `computeDealHealth` expects. */
export function projectDetailToHealthProject(p: Project): Record<string, unknown> {
  const lead = p.leadSource
  const leadStr = lead != null ? String(lead) : ''
  return {
    projectStatus: p.projectStatus,
    updated_at: p.updatedAt,
    updatedAt: p.updatedAt,
    last_modified_at: p.updatedAt,
    lastModifiedAt: p.updatedAt,
    stage_changed_at: p.stageEnteredAt ?? p.updatedAt,
    stageChangedAt: p.stageEnteredAt ?? p.updatedAt,
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
    lead_source: leadStr,
    leadSource: leadStr,
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
  raw: { factor1: number; factor2: number; factor3: number; factor4: number; factor5: number }
}

export function computeDealHealth(project: Record<string, unknown> | null | undefined): DealHealthResult | null {
  if (!project) return null

  const stageLabel = getStageLabel(project)
  if (isExcludedStage(project, stageLabel)) return null

  const updatedAt =
    (project.updated_at as string | undefined) ??
    (project.updatedAt as string | undefined) ??
    (project.last_modified_at as string | undefined) ??
    (project.lastModifiedAt as string | undefined)

  const daysSinceActivity = daysSince(updatedAt)

  let factor1: number
  let factor1Detail: string
  if (daysSinceActivity <= 3) {
    factor1 = 30
    factor1Detail = `Updated ${daysSinceActivity}d ago`
  } else if (daysSinceActivity <= 7) {
    factor1 = 22
    factor1Detail = `Updated ${daysSinceActivity}d ago`
  } else if (daysSinceActivity <= 14) {
    factor1 = 12
    factor1Detail = `Updated ${daysSinceActivity}d ago — getting stale`
  } else if (daysSinceActivity <= 30) {
    factor1 = 5
    factor1Detail = `Updated ${daysSinceActivity}d ago — stale`
  } else {
    factor1 = 0
    factor1Detail = `No update in ${daysSinceActivity} days — neglected`
  }

  const expectedDays = EXPECTED_DAYS_PER_STAGE[stageLabel] ?? 14

  const stageAnchor =
    (project.stage_changed_at as string | undefined) ??
    (project.stageChangedAt as string | undefined) ??
    updatedAt

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

  const value = Number(
    (project.deal_value as number | undefined) ??
      (project.order_value as number | undefined) ??
      (project.total_amount as number | undefined) ??
      (project.projectCost as number | undefined) ??
      0,
  )

  const { score: factor3, detail: factor3Detail } = scoreDealValueForHealth(value)

  const closePart = scoreConfirmationAndAdvance(project)
  const factor4 = closePart.score
  const factor4Detail = closePart.detail

  const sourceRaw = String(
    (project.lead_source as string | undefined) ??
      (project.leadSource as string | undefined) ??
      (project.source as string | undefined) ??
      '',
  ).trim()
  const sourceNorm = normalizeLeadSource(sourceRaw)
  const factor5 = SOURCE_SCORES[sourceNorm] ?? SOURCE_SCORES[sourceRaw] ?? 3
  const factor5Detail = sourceRaw || 'Unknown source'

  const rawScore = factor1 + factor2 + factor3 + factor4 + factor5
  const score = Math.min(100, Math.max(0, rawScore))

  let grade: string
  let label: string
  let color: string
  if (score >= 75) {
    grade = 'A'
    label = 'Healthy'
    color = '#00D4B4'
  } else if (score >= 55) {
    grade = 'B'
    label = 'Good'
    color = '#4CAF50'
  } else if (score >= 35) {
    grade = 'C'
    label = 'At Risk'
    color = '#F5A623'
  } else if (score >= 15) {
    grade = 'D'
    label = 'Weak'
    color = '#FF6B6B'
  } else {
    grade = 'F'
    label = 'Critical'
    color = '#FF4757'
  }

  const factorScores = [
    { key: 'activity' as const, score: factor1, max: 30 },
    { key: 'momentum' as const, score: factor2, max: 25 },
    { key: 'value' as const, score: factor3, max: 20 },
    { key: 'closeDate' as const, score: factor4, max: 15 },
    { key: 'source' as const, score: factor5, max: 10 },
  ]

  const weakest = factorScores.reduce((a, b) => (a.score / a.max < b.score / b.max ? a : b))

  const closeDateInsight = !closePart.hasConfirmation
    ? `No confirmation date on record — add it under Sales & Commercial when the order is confirmed.`
    : closePart.advance <= 0 || closePart.orderValue <= 0
      ? `Record advance received in Payment tracking so the score can reflect payment vs order value.`
      : closePart.advance < closePart.orderValue * 0.5
        ? `Token advance only — push for a stronger advance to start work and material delivery.`
        : `Advance is strong vs order value — good commercial footing.`

  const INSIGHTS: Record<(typeof factorScores)[number]['key'], string> = {
    activity:
      factor1 === 0
        ? `This deal hasn't been touched in ${daysSinceActivity} days — log an update today.`
        : `Last activity ${daysSinceActivity} days ago — a follow-up would help.`,
    momentum:
      factor2 === 0
        ? `Stuck in ${stageLabel} for ${daysInStage} days — twice the expected time.`
        : `${daysInStage} days in ${stageLabel} — nudge it forward.`,
    value:
      factor3 === 0
        ? `No deal value entered — add an order value to qualify this lead.`
        : factor3 === 20
          ? `Order value is in the sweet spot band for typical 3–5 kW deals.`
          : value >= 500_000
            ? `Larger orders score fewer points on this factor by design — focus on delivery and margin.`
            : `Deal value sits outside the strongest band — validate scope or pricing where needed.`,
    closeDate: closeDateInsight,
    source: `Lead source unknown — updating this improves forecast accuracy.`,
  }

  const insight =
    score >= 75 && factorScores.every((f) => f.score / f.max >= 0.75)
      ? 'This deal looks healthy — keep the momentum going.'
      : INSIGHTS[weakest.key]

  return {
    score,
    grade,
    label,
    color,
    insight,
    factors: [
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
        name: 'Close Date',
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
    ],
    raw: { factor1, factor2, factor3, factor4, factor5 },
  }
}
