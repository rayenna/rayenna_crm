import { LeadSource, ProjectStatus, ProjectType } from '../types'
import type { ZenithDateFilter } from '../components/zenith/zenithTypes'
import type { ZenithChartDrilldownDimension, ZenithExplorerProject } from '../types/zenithExplorer'
import type { DrilldownOpts } from './zenithChartDrilldown'
import { buildProjectsUrl } from './dashboardTileLinks'
import { getPeriodRange, type LeaderboardPeriod } from './leaderboardUtils'

const FORECAST_OPEN_STATUS_STRINGS: string[] = [
  ProjectStatus.LEAD,
  ProjectStatus.SITE_SURVEY,
  ProjectStatus.PROPOSAL,
  ProjectStatus.CONFIRMED,
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.SUBMITTED_FOR_SUBSIDY,
]

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

const SEGMENT_LABEL_TO_TYPE: Record<string, ProjectType> = {
  'Residential - Subsidy': ProjectType.RESIDENTIAL_SUBSIDY,
  'Residential - Non Subsidy': ProjectType.RESIDENTIAL_NON_SUBSIDY,
  'Commercial Industrial': ProjectType.COMMERCIAL_INDUSTRIAL,
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
      const t = SEGMENT_LABEL_TO_TYPE[value.trim()]
      if (!t) return null
      return buildProjectsUrl(
        {
          type: [t],
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
    case 'loan_bank': {
      const raw = sample?.financing_bank?.trim()
      if (!raw) return null
      return buildProjectsUrl({ availingLoan: true, financingBank: [raw] }, dateFilter)
    }
    default:
      return null
  }
}

export function buildForecastOpenDealsProjectsHref(dateFilter: ZenithDateFilter): string {
  return buildProjectsUrl({ status: [...FORECAST_OPEN_STATUS_STRINGS] }, dateFilter)
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
