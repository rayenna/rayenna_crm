import { UserRole } from '../../types'
import { ProjectStatus } from '../../types'
import { buildProjectsUrl } from '../../utils/dashboardTileLinks'
import type { ZenithDateFilter } from './zenithTypes'

export interface ZenithFunnelStage {
  id: string
  label: string
  count: number
  to: string
  gradient: string
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
      },
      {
        id: 'survey',
        label: 'Site Survey',
        count: p?.survey ?? 0,
        to: buildProjectsUrl({ status: [ProjectStatus.SITE_SURVEY] }, t),
        gradient: 'from-indigo-600 to-blue-600',
      },
      {
        id: 'proposal',
        label: 'Proposal',
        count: p?.proposal ?? 0,
        to: buildProjectsUrl({ status: [ProjectStatus.PROPOSAL] }, t),
        gradient: 'from-amber-500 to-orange-500',
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
      },
      {
        id: 'confirmed',
        label: 'Confirmed',
        count: p?.approved ?? 0,
        to: buildProjectsUrl({ status: [ProjectStatus.CONFIRMED] }, t),
        gradient: 'from-fuchsia-600 to-pink-500',
      },
      {
        id: 'install',
        label: 'Under Installation',
        count: under,
        to: buildProjectsUrl({ status: [ProjectStatus.UNDER_INSTALLATION] }, t),
        gradient: 'from-sky-600 to-cyan-500',
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
      },
      {
        id: 'subsidy',
        label: 'Subsidy Credited',
        count: subsidy,
        to: buildProjectsUrl({ status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED] }, t),
        gradient: 'from-yellow-500 to-amber-400',
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
    },
    {
      id: 'survey',
      label: 'Site Survey',
      count: countByStatus(data, ProjectStatus.SITE_SURVEY),
      to: buildProjectsUrl({ status: [ProjectStatus.SITE_SURVEY] }, t),
      gradient: 'from-indigo-600 to-blue-600',
    },
    {
      id: 'proposal',
      label: 'Proposal',
      count: countByStatus(data, ProjectStatus.PROPOSAL),
      to: buildProjectsUrl({ status: [ProjectStatus.PROPOSAL] }, t),
      gradient: 'from-amber-500 to-orange-500',
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
    },
    {
      id: 'confirmed',
      label: 'Confirmed',
      count: countByStatus(data, ProjectStatus.CONFIRMED),
      to: buildProjectsUrl({ status: [ProjectStatus.CONFIRMED] }, t),
      gradient: 'from-fuchsia-600 to-pink-500',
    },
    {
      id: 'install',
      label: 'Under Installation',
      count: ops?.pendingInstallation ?? 0,
      to: buildProjectsUrl({ status: [ProjectStatus.UNDER_INSTALLATION] }, t),
      gradient: 'from-sky-600 to-cyan-500',
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
    },
    {
      id: 'subsidy',
      label: 'Subsidy Credited',
      count: ops?.subsidyCredited ?? 0,
      to: buildProjectsUrl({ status: [ProjectStatus.COMPLETED_SUBSIDY_CREDITED] }, t),
      gradient: 'from-yellow-500 to-amber-400',
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
    },
    {
      id: 'survey',
      label: 'Site Survey',
      count: c(ProjectStatus.SITE_SURVEY),
      to: buildProjectsUrl({ status: [ProjectStatus.SITE_SURVEY] }, t),
      gradient: 'from-indigo-600 to-blue-600',
    },
    {
      id: 'proposal',
      label: 'Proposal',
      count: c(ProjectStatus.PROPOSAL),
      to: buildProjectsUrl({ status: [ProjectStatus.PROPOSAL] }, t),
      gradient: 'from-amber-500 to-orange-500',
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
    },
    {
      id: 'confirmed',
      label: 'Confirmed',
      count: c(ProjectStatus.CONFIRMED),
      to: buildProjectsUrl({ status: [ProjectStatus.CONFIRMED] }, t),
      gradient: 'from-fuchsia-600 to-pink-500',
    },
    {
      id: 'install',
      label: 'Under Installation',
      count: c(ProjectStatus.UNDER_INSTALLATION),
      to: buildProjectsUrl({ status: [ProjectStatus.UNDER_INSTALLATION] }, t),
      gradient: 'from-sky-600 to-cyan-500',
    },
    {
      id: 'sub',
      label: 'Submitted Subsidy',
      count: c(ProjectStatus.SUBMITTED_FOR_SUBSIDY),
      to: buildProjectsUrl({ status: [ProjectStatus.SUBMITTED_FOR_SUBSIDY] }, t),
      gradient: 'from-teal-600 to-emerald-500',
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
    },
  ]
}
