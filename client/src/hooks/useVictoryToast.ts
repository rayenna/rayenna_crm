import { useCallback, useEffect, useState } from 'react'
import { ProjectStatus } from '../types'

export const ZENITH_DEAL_WON_EVENT = 'zenith:deal:won'

export type VictoryToastDetail = {
  id: string
  customerName: string
  dealValue: number
  closedBy: string
  stage: string
}

const WINNING: ProjectStatus[] = [
  ProjectStatus.CONFIRMED,
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.COMPLETED,
  ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
]

function isWinning(s: string | undefined): s is ProjectStatus {
  return s != null && (WINNING as string[]).includes(s)
}

export type FireVictoryProjectShape = {
  id: string
  projectStatus?: ProjectStatus | string
  customer?: { firstName?: string; customerName?: string }
  customer_name?: string
  projectCost?: number | null
  deal_value?: number
  salesperson?: { name?: string }
  assigned_to_name?: string
}

function buildDetail(project: FireVictoryProjectShape): VictoryToastDetail {
  const customerName =
    project.customer?.firstName?.trim() ||
    project.customer?.customerName?.trim() ||
    (typeof project.customer_name === 'string' ? project.customer_name.trim() : '') ||
    'Customer'
  const dealValue = Number(
    project.projectCost ?? project.deal_value ?? 0,
  )
  const closedBy =
    project.salesperson?.name?.trim() ||
    (typeof project.assigned_to_name === 'string' ? project.assigned_to_name.trim() : '') ||
    'Team'
  const stage = String(project.projectStatus ?? '')
  return {
    id: `${project.id}-${Date.now()}`,
    customerName,
    dealValue,
    closedBy,
    stage,
  }
}

/**
 * Fire after a successful stage update when the project **enters** a winning stage
 * (not when saving without a stage change, and not when leaving a winning stage).
 */
export function fireVictoryToastOnStageChange(
  previousStatus: string | undefined,
  project: FireVictoryProjectShape,
): void {
  const next = project.projectStatus
  if (!isWinning(String(next))) return
  if (previousStatus === next) return
  const detail = buildDetail(project)
  window.dispatchEvent(new CustomEvent(ZENITH_DEAL_WON_EVENT, { detail }))
}

/** Preferred call site: pass updated project + previous status (or omit prev for new transitions). */
export function fireVictoryToast(project: FireVictoryProjectShape, previousStatus?: string): void {
  fireVictoryToastOnStageChange(previousStatus, project)
}

export function useVictoryToast(): {
  toast: VictoryToastDetail | null
  dismiss: () => void
} {
  const [toast, setToast] = useState<VictoryToastDetail | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<VictoryToastDetail>
      if (ce.detail) setToast(ce.detail)
    }
    window.addEventListener(ZENITH_DEAL_WON_EVENT, handler)
    return () => window.removeEventListener(ZENITH_DEAL_WON_EVENT, handler)
  }, [])

  const dismiss = useCallback(() => setToast(null), [])

  return { toast, dismiss }
}
