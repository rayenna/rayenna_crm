import { LeadSource, ProjectStatus } from '../types'
import type { CustomerType } from './customerRecord'
import type { ZenithDateFilter } from '../components/zenith/zenithTypes'
import type { ZenithChartDrilldownDimension, ZenithExplorerProject } from '../types/zenithExplorer'
import type { DrilldownOpts } from './zenithChartDrilldown'
import { buildProjectsUrl } from './dashboardTileLinks'
import { getPeriodRange, type LeaderboardPeriod } from './leaderboardUtils'
import type { ForecastBand, ForecastBreakdownDimension } from './revenueForecast'

const FORECAST_OPEN_STATUS_STRINGS: string[] = [
  ProjectStatus.LEAD,
  ProjectStatus.SITE_SURVEY,
  ProjectStatus.PROPOSAL,
  ProjectStatus.CONFIRMED,
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.SUBMITTED_FOR_SUBSIDY,
]

const FORECAST_EARLY_STATUS_STRINGS: string[] = [
  ProjectStatus.LEAD,
  ProjectStatus.SITE_SURVEY,
  ProjectStatus.PROPOSAL,
]

const FORECAST_COMMITTED_STATUS_STRINGS: string[] = [
  ProjectStatus.CONFIRMED,
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.SUBMITTED_FOR_SUBSIDY,
]

export function forecastOpenStatusesForBand(band: ForecastBand = 'all'): string[] {
  if (band === 'early') return [...FORECAST_EARLY_STATUS_STRINGS]
  if (band === 'committed') return [...FORECAST_COMMITTED_STATUS_STRINGS]
  return [...FORECAST_OPEN_STATUS_STRINGS]
}

const LEADERBOARD_WINNING_STRINGS: string[] = [
  ProjectStatus.CONFIRMED,
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.COMPLETED,
  ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
]

/** Explorer `stageLabel` → API `status` (matches dashboard `PROJECT_STATUS_LABELS`). */
const STAGE_LABEL_TO_STATUS: Record<string, ProjectStatus> = {
  Lead: ProjectStatus.LEAD,
  'Site Survey': ProjectStatus.SITE_SURVEY,
  Proposal: ProjectStatus.PROPOSAL,
  'Confirmed Order': ProjectStatus.CONFIRMED,
  'Under Installation': ProjectStatus.UNDER_INSTALLATION,
  'Submitted for Subsidy': ProjectStatus.SUBMITTED_FOR_SUBSIDY,
  Completed: ProjectStatus.COMPLETED,
  'Completed - Subsidy Credited': ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
  Lost: ProjectStatus.LOST,
}

const LEAD_LABEL_TO_ENUM: Record<string, LeadSource> = {
  Website: LeadSource.WEBSITE,
  Referral: LeadSource.REFERRAL,
  Google: LeadSource.GOOGLE,
  'Channel Partner': LeadSource.CHANNEL_PARTNER,
  'Digital Marketing': LeadSource.DIGITAL_MARKETING,
  Sales: LeadSource.SALES,
  'Management Connect': LeadSource.MANAGEMENT_CONNECT,
  Other: LeadSource.OTHER,
}

/** Chart slice label → Customer Master `customerType` (Projects list filter). */
const CUSTOMER_TYPE_LABEL_TO_ENUM: Record<string, CustomerType> = {
  Residential: 'RESIDENTIAL',
  Apartment: 'APARTMENT',
  Commercial: 'COMMERCIAL',
}

function normalizeChartLabel(s: string): string {
  return String(s)
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveCustomerTypeFromChartLabel(label: string): CustomerType | null {
  const key = normalizeChartLabel(label)
  if (CUSTOMER_TYPE_LABEL_TO_ENUM[key]) return CUSTOMER_TYPE_LABEL_TO_ENUM[key]
  const lower = key.toLowerCase()
  if (lower === 'residential' || lower.startsWith('residential')) return 'RESIDENTIAL'
  if (lower === 'apartment' || lower.includes('apartment')) return 'APARTMENT'
  if (lower === 'commercial' || lower.startsWith('commercial')) return 'COMMERCIAL'
  return null
}

/**
 * Build `/projects?…` for Zenith quick-drawer list mode (payment pills + chart drill-down).
 * Returns `null` when the slice cannot be expressed with supported query params.
 */
export function buildZenithDrawerListProjectsHref(
  dimension: ZenithChartDrilldownDimension,
  value: string,
  dateFilter: ZenithDateFilter,
  opts?: DrilldownOpts | null,
  sample?: ZenithExplorerProject | null,
): string | null {
  switch (dimension) {
    case 'payment_status':
      return buildProjectsUrl({ paymentStatus: [value] }, dateFilter)
    case 'stage': {
      const st = STAGE_LABEL_TO_STATUS[value]
      if (!st) return null
      return buildProjectsUrl({ status: [st] }, dateFilter)
    }
    case 'lead_source': {
      if (value === 'Unknown') {
        return buildProjectsUrl(
          {
            leadSourceIsNull: true,
            zenithSlice: opts?.leadSourceMetric === 'pipeline' ? 'pipeline' : 'revenue',
          },
          dateFilter,
        )
      }
      const ls = LEAD_LABEL_TO_ENUM[value]
      if (!ls) return null
      return buildProjectsUrl(
        {
          leadSource: [ls],
          zenithSlice: opts?.leadSourceMetric === 'pipeline' ? 'pipeline' : 'revenue',
        },
        dateFilter,
      )
    }
    case 'customer_segment': {
      const ct = resolveCustomerTypeFromChartLabel(value)
      if (!ct) return null
      return buildProjectsUrl(
        {
          customerType: [ct],
          zenithSlice: opts?.segmentChart === 'pipeline' ? 'pipeline' : 'revenue',
        },
        dateFilter,
      )
    }
    case 'assigned_to': {
      if (value === 'Unassigned') {
        return buildProjectsUrl(
          {
            salespersonUnassigned: true,
            zenithSlice: opts?.salesTeamMetric === 'pipeline' ? 'pipeline' : 'revenue',
          },
          dateFilter,
        )
      }
      if (!sample?.assigned_to_id) return null
      return buildProjectsUrl(
        {
          salespersonId: [sample.assigned_to_id],
          zenithSlice: opts?.salesTeamMetric === 'pipeline' ? 'pipeline' : 'revenue',
        },
        dateFilter,
      )
    }
    case 'fy': {
      const fyOnly = { selectedFYs: [value], selectedQuarters: [], selectedMonths: [] }
      if (opts?.fyMetric === 'profit') {
        return buildProjectsUrl(
          { zenithSlice: 'revenue', zenithFyProfit: true },
          fyOnly,
        )
      }
      return buildProjectsUrl({ zenithSlice: 'revenue' }, fyOnly)
    }
    case 'forecast':
      return buildProjectsUrl({ status: [...FORECAST_OPEN_STATUS_STRINGS] }, dateFilter)
    case 'outstanding_sales': {
      const paymentStatus = ['PENDING', 'PARTIAL']
      if (value === 'Unassigned') {
        return buildProjectsUrl({ paymentStatus, salespersonUnassigned: true }, dateFilter)
      }
      if (sample?.assigned_to_id) {
        return buildProjectsUrl(
          { paymentStatus, salespersonId: [sample.assigned_to_id] },
          dateFilter,
        )
      }
      const name = value.trim()
      if (!name) return null
      return buildProjectsUrl({ paymentStatus, salespersonName: name }, dateFilter)
    }
    case 'loan_bank': {
      const raw = sample?.financing_bank?.trim()
      if (!raw) return null
      return buildProjectsUrl({ availingLoan: true, financingBank: [raw] }, dateFilter)
    }
    case 'panel_brand': {
      const fy =
        opts?.lifecycleMetricFy != null && opts.lifecycleMetricFy !== ''
          ? { selectedFYs: [opts.lifecycleMetricFy], selectedQuarters: [], selectedMonths: [] }
          : dateFilter
      return buildProjectsUrl(
        { panelBrand: value, lifecycleSpecsComplete: true },
        fy,
      )
    }
    case 'inverter_brand': {
      const fy =
        opts?.lifecycleMetricFy != null && opts.lifecycleMetricFy !== ''
          ? { selectedFYs: [opts.lifecycleMetricFy], selectedQuarters: [], selectedMonths: [] }
          : dateFilter
      return buildProjectsUrl(
        { inverterBrand: value, lifecycleSpecsComplete: true },
        fy,
      )
    }
    default:
      return null
  }
}

export type ForecastProjectsHrefSlice = {
  /** `top` = concentration (Top 3 deals) — cannot be expressed as Projects filters. */
  kind: 'slice' | 'top'
  dimension?: ForecastBreakdownDimension
  label?: string
  band?: ForecastBand
  sample?: ZenithExplorerProject | null
}

/**
 * Open-pipeline Projects URL for Weighted open pipeline.
 * Always includes the open-stage set (or the Early/Committed subset). Slice tabs add
 * salesperson / lead source / customer type / stage so Open in Projects matches the bar.
 */
export function buildForecastOpenDealsProjectsHref(
  dateFilter: ZenithDateFilter,
  slice?: ForecastProjectsHrefSlice | null,
): string | null {
  if (slice?.kind === 'top') return null

  const band = slice?.band ?? 'all'
  const params: Parameters<typeof buildProjectsUrl>[0] = {
    status: forecastOpenStatusesForBand(band),
  }

  if (slice?.kind === 'slice' && slice.dimension && slice.label) {
    switch (slice.dimension) {
      case 'sales': {
        if (slice.label === 'Unassigned') {
          params.salespersonUnassigned = true
          break
        }
        if (slice.sample?.assigned_to_id) {
          params.salespersonId = [slice.sample.assigned_to_id]
        } else if (slice.label.trim()) {
          params.salespersonName = slice.label.trim()
        }
        break
      }
      case 'source': {
        if (slice.label === 'Unknown') {
          params.leadSourceIsNull = true
          break
        }
        const ls = LEAD_LABEL_TO_ENUM[slice.label]
        if (ls) params.leadSource = [ls]
        break
      }
      case 'segment': {
        const ct = resolveCustomerTypeFromChartLabel(slice.label)
        if (ct) params.customerType = [ct]
        break
      }
      case 'stage': {
        const st = STAGE_LABEL_TO_STATUS[slice.label]
        if (st) params.status = [st]
        break
      }
    }
  }

  return buildProjectsUrl(params, dateFilter)
}

/** Payload for Weighted open pipeline → Quick Actions list (href matches the clicked bar). */
export function buildForecastDrawerOpenPayload(
  dateFilter: ZenithDateFilter,
  args: {
    filterLabel: string
    filteredProjects: ZenithExplorerProject[]
    kind: 'slice' | 'top'
    dimension?: ForecastBreakdownDimension
    label?: string
    band: ForecastBand
  },
): {
  filterLabel: string
  filteredProjects: ZenithExplorerProject[]
  listAmountMode: 'weighted_pipeline'
  projectsPageHref: string | null
} {
  const sample =
    args.dimension === 'sales'
      ? args.filteredProjects.find((p) => p.assigned_to_id) ?? args.filteredProjects[0] ?? null
      : args.filteredProjects[0] ?? null
  return {
    filterLabel: args.filterLabel,
    filteredProjects: args.filteredProjects,
    listAmountMode: 'weighted_pipeline',
    projectsPageHref: buildForecastOpenDealsProjectsHref(dateFilter, {
      kind: args.kind,
      dimension: args.dimension,
      label: args.label,
      band: args.band,
      sample,
    }),
  }
}

export function buildLeaderboardPeriodProjectsHref(
  period: LeaderboardPeriod,
  dateFilter: ZenithDateFilter,
  opts?: { salespersonId?: string | null; unassignedOnly?: boolean },
): string {
  const { start, end } = getPeriodRange(period)
  return buildProjectsUrl(
    {
      status: [...LEADERBOARD_WINNING_STRINGS],
      zenithClosedFrom: start.toISOString(),
      zenithClosedTo: end.toISOString(),
      salespersonId:
        opts?.unassignedOnly || !opts?.salespersonId ? undefined : [opts.salespersonId],
      salespersonUnassigned: opts?.unassignedOnly === true,
    },
    dateFilter,
  )
}
