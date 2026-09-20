import type { QueryClient } from '@tanstack/react-query'
import type { Project } from '../types'
import type { ZenithExplorerProject } from '../types/zenithExplorer'

const STAGE_LABEL: Partial<Record<string, string>> = {
  LEAD: 'Lead',
  SITE_SURVEY: 'Site Survey',
  PROPOSAL: 'Proposal',
  CONFIRMED: 'Confirmed Order',
  UNDER_INSTALLATION: 'Under Installation',
  SUBMITTED_FOR_SUBSIDY: 'Submitted for Subsidy',
  COMPLETED: 'Completed',
  COMPLETED_SUBSIDY_CREDITED: 'Completed - Subsidy Credited',
  LOST: 'Cancelled / Lost',
}

function explorerPatchFromProject(patch: Partial<Project>): Partial<ZenithExplorerProject> {
  const out: Partial<ZenithExplorerProject> = {}
  if (patch.projectStatus != null) {
    out.projectStatus = patch.projectStatus
    out.stageLabel = STAGE_LABEL[patch.projectStatus] ?? String(patch.projectStatus)
  }
  if (patch.projectCost !== undefined) {
    out.deal_value = Number(patch.projectCost ?? 0)
    out.has_deal_value = patch.projectCost != null && Number(patch.projectCost) > 0
  }
  if (patch.confirmationDate !== undefined) {
    out.confirmation_date = patch.confirmationDate ?? null
  }
  out.updated_at = new Date().toISOString()
  return out
}

/** Keep the open Quick / Ops drawer in sync after a PUT (online or queued). */
export function patchZenithDrawerProject(
  queryClient: QueryClient,
  drawerQueryKey: readonly unknown[],
  id: string,
  patch: Partial<Project>,
): void {
  queryClient.setQueryData(drawerQueryKey, (prev: Project | undefined) =>
    prev ? { ...prev, ...patch } : prev,
  )

  const explorerPatch = explorerPatchFromProject(patch)
  queryClient.setQueriesData(
    { queryKey: ['dashboard', 'zenith-explorer'] },
    (prev: { zenithExplorerProjects?: ZenithExplorerProject[] } | undefined) => {
      if (!prev?.zenithExplorerProjects) return prev
      return {
        ...prev,
        zenithExplorerProjects: prev.zenithExplorerProjects.map((row) =>
          row.id === id ? { ...row, ...explorerPatch } : row,
        ),
      }
    },
  )
}

export function scheduleZenithAfterProjectSave(queryClient: QueryClient, id: string): void {
  void queryClient.invalidateQueries({ queryKey: ['zenith'] })
  void queryClient.invalidateQueries({ queryKey: ['zenith-focus'] })
  void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  void queryClient.invalidateQueries({ queryKey: ['projects'] })
  void queryClient.invalidateQueries({ queryKey: ['project', id] })
  void queryClient.invalidateQueries({ queryKey: ['remarks', id] })
}
