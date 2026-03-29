import { UserRole } from '../../types'
import { ProjectStatus } from '../../types'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import type { ZenithDateFilter } from './zenithTypes'

export interface ZenithFunnelStage {
  id: string
  label: string
  count: number
  to: string
  /** Legacy mobile row gradient (optional; desktop SVG uses gold→teal ramp). */
  gradient: string
  /** Mean days in current status (from API); null for composite stages (e.g. Open Deals). */
  avgDaysInStage?: number | null
}

type StatusRow = { status: string; avgDaysInStage?: number | null }

function avgDaysForStatus(data: Record<string, unknown>, status: ProjectStatus): number | null {
  const list = (data?.projectsByStatus ?? []) as StatusRow[]
  const row = list.find((p) => p.status === status)
  const v = row?.avgDaysInStage
  return v != null && Number.isFinite(v) ? v : null
}

/** Weighted mean of avg days for composite funnel stages (e.g. Completed + Subsidy). */
function avgDaysComposite(data: Record<string, unknown>, statuses: ProjectStatus[]): number | null {
  const list = (data?.projectsByStatus ?? []) as (StatusRow & { count?: number })[]
  let sum = 0
  let w = 0
  for (const st of statuses) {
    const row = list.find((p) => p.status === st)
    const days = row?.avgDaysInStage
    const c = row && 'count' in row ? Number(row.count) : 0
    if (days != null && Number.isFinite(days) && c > 0) {
      sum += days * c
      w += c
    }
  }
  if (w <= 0) return null
  return Math.round((sum / w) * 10) / 10
}

function countByStatus(data: Record<string, unknown>, status: ProjectStatus): number {
  const list = (data?.projectsByStatus ?? []) as { status: string; count: number }[]
  return list.find((p) => p.status === status)?.count ?? 0
}

const tile = (f: ZenithDateFilter) => ({
  selectedFYs: f.selectedFYs,
  selectedQuarters: f.selectedQuarters,
  selectedMonths: f.selectedMonths,
})

export function buildZenithFunnelStages(
  role: UserRole,
  data: Record<string, unknown>,
  dateFilter: ZenithDateFilter,
): ZenithFunnelStage[] {
  const t = tile(dateFilter)

  if (role === UserRole.SALES) {
    const p = data?.pipeline as
      | { atRisk?: number; survey?: number; proposal?: number; approved?: number }
      | undefined
    const projectsByStatus = (data?.projectsByStatus ?? []) as { status: string; count: number }[]
    const under =
      projectsByStatus.find((x) => x.status === ProjectStatus.UNDER_INSTALLATION)?.count ?? 0
    const completed =
      (projectsByStatus.find((x) => x.status === ProjectStatus.COMPLETED)?.count ?? 0) +
      (projectsByStatus.find((x) => x.status === ProjectStatus.COMPLETED_SUBSIDY_CREDITED)?.count ??
        0)
    const subsidy =
      projectsByStatus.find((x) => x.status === ProjectStatus.COMPLETED_SUBSIDY_CREDITED)?.count ?? 0
    const leads = Number((data?.leads as { total?: number })?.total ?? 0)

    return [
      {
        id: 'lead',
        label: 'Leads',
        count: leads,
        to: buildProjectsUrl({ status: [ProjectStatus.LEAD] }, t),
        gradient: 'from-violet-600 to-indigo-500',
        avgDaysInStage: avgDaysForStatus(data, ProjectStatus.LEAD),
      },
      {
        id: 'survey',
        label: 'Site Survey',
        count: p?.survey ?? 0,
        to: buildProjectsUrl({ status: [ProjectStatus.SITE_SURVEY] }, t),
        gradient: 'from-indigo-600 to-blue-600',
        avgDaysInStage: avgDaysForStatus(data, ProjectStatus.SITE_SURVEY),
      },
      {
        id: 'proposal',
        label: 'Proposal',
        count: p?.proposal ?? 0,
        to: buildProjectsUrl({ status: [ProjectStatus.PROPOSAL] }, t),
        gradient: 'from-amber-500 to-orange-500',
        avgDaysInStage: avgDaysForStatus(data, ProjectStatus.PROPOSAL),
      },
      {
        id: 'open',
        label: 'Open Deals',
        count: p?.atRisk ?? 0,
        to: buildProjectsUrl(
          { status: [ProjectStatus.LEAD, ProjectStatus.SITE_SURVEY, ProjectStatus.PROPOSAL] },
          t,
        ),
        gradient: 'from-rose-600 to-red-500',
        avgDaysInStage: null,
      },
      {
        id: 'confirmed',
        label: 'Confirmed',
        count: p?.approved ?? 0,
        to: buildProjectsUrl({ status: [ProjectStatus.CONFIRMED] }, t),
        gradient: 'from-fuchsia-600 to-pink-500',
        avgDaysInStage: avgDaysForStatus(data, ProjectStatus.CONFIRMED),
      },
      {
        id: 'install',
        label: 'Under Installation',
        count: under,
        to: buildProjectsUrl({ status: [ProjectStatus.UNDER_INSTALLATION] }, t),
        gradient: 'from-sky-600 to-cyan-500',
        avgDaysInStage: avgDaysForStatus(data, ProjectStatus.UNDER_INSTALLATION),
      },
      {
        id: 'completed',
        label: 'Completed',
        count: completed,
        to: buildProjectsUrl(
          { status: [ProjectStatus.COMPLETED, ProjectStatus.COMPLETED_SUBSIDY_CREDITED] },
          t,
        ),
        gradient: 'from-emerald-600 to-teal-500',
        avgDaysInStage: avgDaysComposite(data, [
          ProjectStatus.COMPLETED,
          ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
        ]),
      },
      {
        id: 'subsidy',
        label: 'Subsidy Credited',
        count: subsidy,
        to: buildProjectsUrl({ status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED] }, t),
        gradient: 'from-yellow-500 to-amber-400',
        avgDaysInStage: avgDaysForStatus(data, ProjectStatus.COMPLETED_SUBSIDY_CREDITED),
      },
    ]
  }

  /* Management & Admin — same tile semantics as ManagementDashboard */
  const sales = data?.sales as { totalLeads?: number } | undefined
  const ops = data?.operations as { pendingInstallation?: number; subsidyCredited?: number } | undefined
  const pipelineAtRisk = Number(data?.pipeline && (data.pipeline as { atRisk?: number }).atRisk)

  return [
    {
      id: 'lead',
      label: 'Leads',
      count: sales?.totalLeads ?? 0,
      to: buildProjectsUrl({ status: [ProjectStatus.LEAD] }, t),
      gradient: 'from-violet-600 to-indigo-500',
      avgDaysInStage: avgDaysForStatus(data, ProjectStatus.LEAD),
    },
    {
      id: 'survey',
      label: 'Site Survey',
      count: countByStatus(data, ProjectStatus.SITE_SURVEY),
      to: buildProjectsUrl({ status: [ProjectStatus.SITE_SURVEY] }, t),
      gradient: 'from-indigo-600 to-blue-600',
      avgDaysInStage: avgDaysForStatus(data, ProjectStatus.SITE_SURVEY),
    },
    {
      id: 'proposal',
      label: 'Proposal',
      count: countByStatus(data, ProjectStatus.PROPOSAL),
      to: buildProjectsUrl({ status: [ProjectStatus.PROPOSAL] }, t),
      gradient: 'from-amber-500 to-orange-500',
      avgDaysInStage: avgDaysForStatus(data, ProjectStatus.PROPOSAL),
    },
    {
      id: 'open',
      label: 'Open Deals',
      count: pipelineAtRisk,
      to: buildProjectsUrl(
        { status: [ProjectStatus.LEAD, ProjectStatus.SITE_SURVEY, ProjectStatus.PROPOSAL] },
        t,
      ),
      gradient: 'from-rose-600 to-red-500',
      avgDaysInStage: null,
    },
    {
      id: 'confirmed',
      label: 'Confirmed',
      count: countByStatus(data, ProjectStatus.CONFIRMED),
      to: buildProjectsUrl({ status: [ProjectStatus.CONFIRMED] }, t),
      gradient: 'from-fuchsia-600 to-pink-500',
      avgDaysInStage: avgDaysForStatus(data, ProjectStatus.CONFIRMED),
    },
    {
      id: 'install',
      label: 'Under Installation',
      count: ops?.pendingInstallation ?? 0,
      to: buildProjectsUrl({ status: [ProjectStatus.UNDER_INSTALLATION] }, t),
      gradient: 'from-sky-600 to-cyan-500',
      avgDaysInStage: avgDaysForStatus(data, ProjectStatus.UNDER_INSTALLATION),
    },
    {
      id: 'completed',
      label: 'Completed',
      count:
        countByStatus(data, ProjectStatus.COMPLETED) +
        countByStatus(data, ProjectStatus.COMPLETED_SUBSIDY_CREDITED),
      to: buildProjectsUrl(
        { status: [ProjectStatus.COMPLETED, ProjectStatus.COMPLETED_SUBSIDY_CREDITED] },
        t,
      ),
      gradient: 'from-emerald-600 to-teal-500',
      avgDaysInStage: avgDaysComposite(data, [
        ProjectStatus.COMPLETED,
        ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
      ]),
    },
    {
      id: 'subsidy',
      label: 'Subsidy Credited',
      count: ops?.subsidyCredited ?? 0,
      to: buildProjectsUrl({ status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED] }, t),
      gradient: 'from-yellow-500 to-amber-400',
      avgDaysInStage: avgDaysForStatus(data, ProjectStatus.COMPLETED_SUBSIDY_CREDITED),
    },
  ]
}

/** Operations / Finance: funnel from projectsByStatus only */
export function buildZenithFunnelFromStatuses(
  data: Record<string, unknown>,
  dateFilter: ZenithDateFilter,
): ZenithFunnelStage[] {
  const t = tile(dateFilter)
  const c = (s: ProjectStatus) => countByStatus(data, s)
  const open =
    c(ProjectStatus.LEAD) + c(ProjectStatus.SITE_SURVEY) + c(ProjectStatus.PROPOSAL)
  const completed = c(ProjectStatus.COMPLETED) + c(ProjectStatus.COMPLETED_SUBSIDY_CREDITED)

  return [
    {
      id: 'lead',
      label: 'Leads',
      count: c(ProjectStatus.LEAD),
      to: buildProjectsUrl({ status: [ProjectStatus.LEAD] }, t),
      gradient: 'from-violet-600 to-indigo-500',
      avgDaysInStage: avgDaysForStatus(data, ProjectStatus.LEAD),
    },
    {
      id: 'survey',
      label: 'Site Survey',
      count: c(ProjectStatus.SITE_SURVEY),
      to: buildProjectsUrl({ status: [ProjectStatus.SITE_SURVEY] }, t),
      gradient: 'from-indigo-600 to-blue-600',
      avgDaysInStage: avgDaysForStatus(data, ProjectStatus.SITE_SURVEY),
    },
    {
      id: 'proposal',
      label: 'Proposal',
      count: c(ProjectStatus.PROPOSAL),
      to: buildProjectsUrl({ status: [ProjectStatus.PROPOSAL] }, t),
      gradient: 'from-amber-500 to-orange-500',
      avgDaysInStage: avgDaysForStatus(data, ProjectStatus.PROPOSAL),
    },
    {
      id: 'open',
      label: 'Open Deals',
      count: open,
      to: buildProjectsUrl(
        { status: [ProjectStatus.LEAD, ProjectStatus.SITE_SURVEY, ProjectStatus.PROPOSAL] },
        t,
      ),
      gradient: 'from-rose-600 to-red-500',
      avgDaysInStage: null,
    },
    {
      id: 'confirmed',
      label: 'Confirmed',
      count: c(ProjectStatus.CONFIRMED),
      to: buildProjectsUrl({ status: [ProjectStatus.CONFIRMED] }, t),
      gradient: 'from-fuchsia-600 to-pink-500',
      avgDaysInStage: avgDaysForStatus(data, ProjectStatus.CONFIRMED),
    },
    {
      id: 'install',
      label: 'Under Installation',
      count: c(ProjectStatus.UNDER_INSTALLATION),
      to: buildProjectsUrl({ status: [ProjectStatus.UNDER_INSTALLATION] }, t),
      gradient: 'from-sky-600 to-cyan-500',
      avgDaysInStage: avgDaysForStatus(data, ProjectStatus.UNDER_INSTALLATION),
    },
    {
      id: 'completed',
      label: 'Completed',
      count: completed,
      to: buildProjectsUrl(
        { status: [ProjectStatus.COMPLETED, ProjectStatus.COMPLETED_SUBSIDY_CREDITED] },
        t,
      ),
      gradient: 'from-emerald-600 to-teal-500',
      avgDaysInStage: avgDaysComposite(data, [
        ProjectStatus.COMPLETED,
        ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
      ]),
    },
    {
      id: 'subsidy',
      label: 'Subsidy Credited',
      count: c(ProjectStatus.COMPLETED_SUBSIDY_CREDITED),
      to: buildProjectsUrl({ status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED] }, t),
      gradient: 'from-yellow-500 to-amber-400',
      avgDaysInStage: avgDaysForStatus(data, ProjectStatus.COMPLETED_SUBSIDY_CREDITED),
    },
  ]
}

/** Operations Zenith: execution-only stages (Confirmed → Subsidy Credited). */
const OPERATIONS_EXECUTION_FUNNEL_IDS = new Set(['confirmed', 'install', 'completed', 'subsidy'])

export function buildZenithOperationsExecutionFunnel(
  data: Record<string, unknown>,
  dateFilter: ZenithDateFilter,
): ZenithFunnelStage[] {
  return buildZenithFunnelFromStatuses(data, dateFilter).filter((s) =>
    OPERATIONS_EXECUTION_FUNNEL_IDS.has(s.id),
  )
}
