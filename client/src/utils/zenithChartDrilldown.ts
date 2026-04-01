import type { ZenithExplorerProject, ZenithChartDrilldownDimension } from '../types/zenithExplorer'

/**
 * Normalize en/em dashes and collapse whitespace so donut/chart labels match explorer `customer_segment`
 * even if the UI or copy uses different dash characters.
 */
function normalizeChartLabel(s: string): string {
  return String(s)
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

const LOST_STATUS = 'LOST'

/** Same status set as `getRevenueWhere` (dashboard + revenue-by-lead-source + sales-team revenue). */
const REVENUE_PROJECT_STATUSES = new Set([
  'CONFIRMED',
  'UNDER_INSTALLATION',
  'COMPLETED',
  'COMPLETED_SUBSIDY_CREDITED',
])

/** Open pipeline forecast / “+N more” — deals we treat as closed or lost (not weighted forecast). */
const FORECAST_EXCLUDED_STAGE_LABELS = new Set([
  'Completed',
  'Completed - Subsidy Credited',
  'Lost',
])

/** Mirrors `getPipelineWhere`: not LOST, order value present (projectCost not null in DB). */
export function inDashboardPipelineSlice(p: ZenithExplorerProject): boolean {
  if (p.projectStatus === LOST_STATUS) return false
  if (p.has_deal_value === false) return false
  return true
}

/**
 * Mirrors `getRevenueWhere`: revenue statuses + projectStage null or not SURVEY/PROPOSAL.
 * Explorer must include `projectStatus`, `project_stage`, `has_deal_value`.
 */
export function matchesDashboardRevenueWhere(p: ZenithExplorerProject): boolean {
  if (!inDashboardPipelineSlice(p)) return false
  if (!REVENUE_PROJECT_STATUSES.has(p.projectStatus)) return false
  const ps = p.project_stage
  if (ps == null || ps === '') return true
  if (ps === 'SURVEY' || ps === 'PROPOSAL') return false
  return true
}

function segmentMatches(p: ZenithExplorerProject, clickedLabel: string): boolean {
  return normalizeChartLabel(p.customer_segment || '') === normalizeChartLabel(clickedLabel)
}

export type DrilldownOpts = {
  leadSourceMetric?: 'revenue' | 'pipeline'
  salesTeamMetric?: 'revenue' | 'pipeline'
  segmentChart?: 'revenue' | 'pipeline'
  fyMetric?: 'revenue' | 'profit'
}

export function buildFilterLabel(
  dimension: ZenithChartDrilldownDimension,
  value: string,
  opts?: DrilldownOpts,
): string {
  if (dimension === 'fy') {
    return opts?.fyMetric === 'profit' ? `FY ${value} — Profit Projects` : `FY ${value} Revenue`
  }
  const labels: Record<ZenithChartDrilldownDimension, string> = {
    lead_source: `${value} — Lead Source`,
    assigned_to: `${value} — Sales`,
    stage: `${value} — Stage`,
    customer_segment: `${value} — Segment`,
    fy: `FY ${value}`,
    forecast: value,
    loan_bank: `${value} — Loan`,
  }
  return labels[dimension] ?? value
}

export function filterProjectsByChartSlice(
  all: ZenithExplorerProject[],
  dimension: ZenithChartDrilldownDimension,
  value: string,
  opts?: DrilldownOpts,
): ZenithExplorerProject[] {
  switch (dimension) {
    case 'lead_source': {
      if (opts?.leadSourceMetric === 'revenue') {
        return all.filter(
          (p) => (p.lead_source || 'Unknown') === value && matchesDashboardRevenueWhere(p),
        )
      }
      return all.filter((p) => (p.lead_source || 'Unknown') === value && inDashboardPipelineSlice(p))
    }
    case 'assigned_to': {
      if (opts?.salesTeamMetric === 'revenue') {
        return all.filter(
          (p) =>
            (p.assigned_to_name || 'Unassigned') === value && matchesDashboardRevenueWhere(p),
        )
      }
      return all.filter(
        (p) => (p.assigned_to_name || 'Unassigned') === value && inDashboardPipelineSlice(p),
      )
    }
    case 'stage':
      return all.filter((p) => p.stageLabel === value)
    case 'customer_segment': {
      if (opts?.segmentChart === 'revenue') {
        return all.filter((p) => segmentMatches(p, value) && matchesDashboardRevenueWhere(p))
      }
      return all.filter((p) => segmentMatches(p, value) && inDashboardPipelineSlice(p))
    }
    case 'fy': {
      if (opts?.fyMetric === 'profit') {
        return all.filter(
          (p) =>
            p.financial_year === value && matchesDashboardRevenueWhere(p) && p.gross_profit != null,
        )
      }
      return all.filter((p) => p.financial_year === value && matchesDashboardRevenueWhere(p))
    }
    case 'forecast': {
      const open = all.filter((p) => !FORECAST_EXCLUDED_STAGE_LABELS.has(p.stageLabel))
      return [...open].sort((a, b) => weightedForecastSortKey(b) - weightedForecastSortKey(a))
    }
    case 'loan_bank':
      return all.filter((p) => (p.loan_bank_label ?? '') === value && (p.loan_bank_label ?? '') !== '')
    default:
      return []
  }
}

function weightedForecastSortKey(p: ZenithExplorerProject): number {
  const v = Number(p.deal_value ?? 0)
  const mult =
    p.stageLabel === 'Lead'
      ? 0.1
      : p.stageLabel === 'Site Survey'
        ? 0.25
        : p.stageLabel === 'Proposal'
          ? 0.45
          : p.stageLabel === 'Confirmed Order'
            ? 0.85
            : p.stageLabel === 'Under Installation'
              ? 0.9
              : p.stageLabel === 'Submitted for Subsidy'
                ? 0.95
                : 0.1
  return v * mult
}
