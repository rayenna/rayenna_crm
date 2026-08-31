import type { ZenithExplorerProject, ZenithChartDrilldownDimension } from '../types/zenithExplorer'
import { getForecastOpenDeals, weightedDealValue } from './revenueForecast'
import {
  buildCommissioningFilterLabel,
  buildOutstandingSalesFilterLabel,
  buildPipelineAgeFilterLabel,
  filterCommissioningBucket,
  filterOutstandingBySalesperson,
  filterPipelineAgeBucket,
  type CommissioningBucketId,
  type PipelineAgeBucketId,
} from './zenithInsightCharts'

/**
 * Normalize en/em dashes and collapse whitespace so donut/chart labels match explorer `customer_segment` (customer type label)
 * even if the UI or copy uses different dash characters.
 */
function normalizeChartLabel(s: string): string {
  return String(s)
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

const LOST_STATUS = 'LOST'

/** Same early/lost + no-order-value rule as `buildProjectsByPaymentStatus` (dashboard payment pills). */
const PAYMENT_NA_PROJECT_STATUSES = new Set(['LEAD', 'SITE_SURVEY', 'PROPOSAL', 'LOST'])

export function matchesZenithPaymentNaBucket(p: ZenithExplorerProject): boolean {
  if (p.has_deal_value === false) return true
  if (PAYMENT_NA_PROJECT_STATUSES.has(p.projectStatus)) return true
  return false
}

/** Same status set as `getRevenueWhere` (dashboard + revenue-by-lead-source + sales-team revenue). */
const REVENUE_PROJECT_STATUSES = new Set([
  'CONFIRMED',
  'UNDER_INSTALLATION',
  'COMPLETED',
  'COMPLETED_SUBSIDY_CREDITED',
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
  /** Zenith panel/inverter brand chart — slice is scoped to this financial year label. */
  lifecycleMetricFy?: string
}

export function buildFilterLabel(
  dimension: ZenithChartDrilldownDimension,
  value: string,
  opts?: DrilldownOpts,
): string {
  if (dimension === 'fy') {
    return opts?.fyMetric === 'profit' ? `FY ${value} — Profit Projects` : `FY ${value} Revenue`
  }
  if (dimension === 'payment_status') {
    const names: Record<string, string> = {
      NA: 'N/A',
      FULLY_PAID: 'Fully Paid',
      PARTIAL: 'Partial',
      PENDING: 'Pending',
    }
    return `Payment — ${names[value] ?? value}`
  }
  if (dimension === 'panel_brand') {
    return opts?.lifecycleMetricFy
      ? `FY ${opts.lifecycleMetricFy} · Panel — ${value}`
      : `Panel — ${value}`
  }
  if (dimension === 'inverter_brand') {
    return opts?.lifecycleMetricFy
      ? `FY ${opts.lifecycleMetricFy} · Inverter — ${value}`
      : `Inverter — ${value}`
  }
  if (dimension === 'pipeline_age') {
    return buildPipelineAgeFilterLabel(value as PipelineAgeBucketId)
  }
  if (dimension === 'commissioning_timeline') {
    return buildCommissioningFilterLabel(value as CommissioningBucketId)
  }
  if (dimension === 'outstanding_sales') {
    return buildOutstandingSalesFilterLabel(value)
  }
  const labels: Record<ZenithChartDrilldownDimension, string> = {
    lead_source: `${value} — Lead Source`,
    assigned_to: `${value} — Sales`,
    stage: `${value} — Stage`,
    customer_segment: `${value} — Customer Type`,
    fy: `FY ${value}`,
    forecast: value,
    loan_bank: `${value} — Loan`,
    payment_status: '',
    panel_brand: `Panel — ${value}`,
    inverter_brand: `Inverter — ${value}`,
    pipeline_age: buildPipelineAgeFilterLabel(value as PipelineAgeBucketId),
    commissioning_timeline: buildCommissioningFilterLabel(value as CommissioningBucketId),
    outstanding_sales: buildOutstandingSalesFilterLabel(value),
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
      // Deep-links / legacy “all open”; tile row drills use filterForecastSliceDeals.
      return getForecastOpenDeals(all, 'all').sort(
        (a, b) => weightedDealValue(b) - weightedDealValue(a),
      )
    }
    case 'loan_bank':
      return all.filter((p) => (p.loan_bank_label ?? '') === value && (p.loan_bank_label ?? '') !== '')
    case 'payment_status': {
      if (value === 'NA') {
        return all.filter((p) => matchesZenithPaymentNaBucket(p))
      }
      return all.filter((p) => {
        if (matchesZenithPaymentNaBucket(p)) return false
        const ps = p.payment_status ?? 'PENDING'
        return ps === value
      })
    }
    case 'panel_brand': {
      const fy = opts?.lifecycleMetricFy
      return all.filter((p) => {
        if (!(p.panel_brand?.trim() && p.inverter_brand?.trim())) return false
        if (fy != null && fy !== '' && p.financial_year !== fy) return false
        return (p.panel_brand || '') === value
      })
    }
    case 'inverter_brand': {
      const fy = opts?.lifecycleMetricFy
      return all.filter((p) => {
        if (!(p.panel_brand?.trim() && p.inverter_brand?.trim())) return false
        if (fy != null && fy !== '' && p.financial_year !== fy) return false
        return (p.inverter_brand || '') === value
      })
    }
    case 'pipeline_age':
      return filterPipelineAgeBucket(all, value as PipelineAgeBucketId)
    case 'commissioning_timeline':
      return filterCommissioningBucket(all, value as CommissioningBucketId)
    case 'outstanding_sales':
      return filterOutstandingBySalesperson(all, value)
    default:
      return []
  }
}
