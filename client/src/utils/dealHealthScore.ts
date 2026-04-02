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

function diffDays(dateStr: string | undefined | null): number | null {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr as string)
  d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function hitListItemToHealthProject(item: HitListItem): Record<string, unknown> {
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
  leadSource?: string | null
}): Record<string, unknown> {
  return {
    stage: r.stage,
    updated_at: r.updatedAt,
    last_modified_at: r.updatedAt,
    stage_changed_at: r.updatedAt,
    deal_value: r.dealValue,
    expected_close_date: r.expectedCloseDate,
    close_date: r.expectedCloseDate,
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

  let factor3: number
  let factor3Detail: string
  if (value >= 500000) {
    factor3 = 20
    factor3Detail = formatINR(value)
  } else if (value >= 200000) {
    factor3 = 15
    factor3Detail = formatINR(value)
  } else if (value >= 50000) {
    factor3 = 10
    factor3Detail = formatINR(value)
  } else if (value > 0) {
    factor3 = 5
    factor3Detail = formatINR(value)
  } else {
    factor3 = 0
    factor3Detail = 'No deal value entered'
  }

  const closeDateStr =
    (project.expected_close_date as string | undefined) ??
    (project.expectedCloseDate as string | undefined) ??
    (project.close_date as string | undefined) ??
    (project.closeDate as string | undefined) ??
    (project.expectedCommissioningDate as string | undefined) ??
    null

  const daysToClose = diffDays(closeDateStr)

  let factor4: number
  let factor4Detail: string
  if (daysToClose === null) {
    factor4 = 0
    factor4Detail = 'No close date set'
  } else if (daysToClose > 30) {
    factor4 = 15
    factor4Detail = `Closes in ${daysToClose} days`
  } else if (daysToClose > 14) {
    factor4 = 12
    factor4Detail = `Closes in ${daysToClose} days`
  } else if (daysToClose > 7) {
    factor4 = 8
    factor4Detail = `Closes in ${daysToClose} days — approaching`
  } else if (daysToClose >= 0) {
    factor4 = 5
    factor4Detail = `Closes in ${daysToClose} days — this week`
  } else {
    factor4 = 2
    factor4Detail = `Close date passed ${Math.abs(daysToClose)}d ago`
  }

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
        : `Deal value is low — confirm scope with the customer.`,
    closeDate:
      daysToClose === null
        ? `No close date set — deals without deadlines rarely close.`
        : daysToClose < 0
          ? `Close date passed ${Math.abs(daysToClose)} days ago — update or renegotiate.`
          : `Close date approaching — make sure the customer is aligned.`,
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
