import { useMemo } from 'react'
import { UserRole } from '../types'

/** Same rows as “Your pipeline today” (zenith-focus sales pipeline). */
export type HitListProjectRow = {
  projectId: string
  /** CRM Project serial number (projects.slNo) */
  projectSerialNumber?: number
  customerName: string
  stage: string
  dealValue: number
  daysSinceActivity: number
  expectedCloseDate?: string | null
  confirmationDate?: string | null
  createdAt?: string
  updatedAt?: string
  salespersonId?: string
  salespersonName?: string | null
  advanceReceived?: number | null
  leadSource?: string | null
}

export type HitListLabel = 'OVERDUE' | 'CLOSING SOON' | 'STALLED' | 'NUDGE NEEDED' | 'GOING COLD'

export type HitListItem = {
  id: string
  /** CRM Project serial number (projects.slNo) */
  projectSerialNumber?: number
  customerName: string
  stage: string
  dealValue: number
  label: HitListLabel
  urgency: 'critical' | 'warning'
  daysNumber: number
  daysSubLabel: string
  pulseNumber: boolean
  /** Pipeline parity: real recency + CRM fields for table + health. */
  salespersonName: string
  confirmationDate: string | null
  daysSinceActivity: number
  updatedAt?: string
  advanceReceived: number
  leadSource: string | null
  expectedCloseDate: string | null
}

const LABEL_ORDER: Record<HitListLabel, number> = {
  OVERDUE: 0,
  'CLOSING SOON': 1,
  STALLED: 2,
  'NUDGE NEEDED': 3,
  'GOING COLD': 4,
}

function pipelineFieldsFromRow(p: HitListProjectRow) {
  const salespersonName =
    (p.salespersonName ?? '').trim() || (p.salespersonId ? '—' : 'Unassigned')
  return {
    salespersonName,
    confirmationDate: p.confirmationDate ?? null,
    daysSinceActivity: p.daysSinceActivity ?? 0,
    updatedAt: p.updatedAt,
    advanceReceived: p.advanceReceived ?? 0,
    leadSource: p.leadSource ?? null,
    expectedCloseDate: p.expectedCloseDate ?? null,
    projectSerialNumber: p.projectSerialNumber,
  }
}

function isTerminalStage(stage: string): boolean {
  const s = stage.trim()
  if (s === 'Completed') return true
  if (s === 'Completed - Subsidy Credited') return true
  if (s === 'Subsidy Credited') return true
  if (s === 'Loan - Subsidy Credited') return true
  return false
}

function formatInrMillions(value: number): string {
  const m = value / 1_000_000
  const mm = Number.isFinite(m) ? m : 0
  return `Rs. ${mm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`
}

export function useHitList(
  projects: HitListProjectRow[] | undefined | null,
  role: UserRole | undefined,
  currentUser: { id: string } | null | undefined,
) {
  return useMemo(() => {
    const empty = {
      hitList: [] as HitListItem[],
      totalAtRisk: '₹0',
      allClear: true,
      criticalCount: 0,
      warningCount: 0,
    }

    if (!projects || !role || !currentUser?.id) {
      return empty
    }

    const relevantProjects =
      role === UserRole.ADMIN || role === UserRole.MANAGEMENT
        ? projects
        : projects.filter((p) => p.salespersonId === currentUser.id)

    const today = new Date()

    const diffDays = (date: string) => {
      const d = new Date(date)
      return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    }

    const daysSince = (date: string) =>
      Math.floor((today.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))

    const scored: HitListItem[] = []

    for (const p of relevantProjects) {
      const stage = (p.stage || '').trim()
      const dealValue = p.dealValue ?? 0
      const id = p.projectId
      const customerName = p.customerName || '—'
      const terminal = isTerminalStage(stage)

      let item: HitListItem | null = null

      const close = p.expectedCloseDate
      if (close && !terminal) {
        const d = diffDays(close)
        if (Number.isFinite(d)) {
          if (d < 0) {
            item = {
              id,
              customerName,
              stage,
              dealValue,
              label: 'OVERDUE',
              urgency: 'critical',
              daysNumber: Math.abs(d),
              daysSubLabel: 'days overdue',
              pulseNumber: true,
              ...pipelineFieldsFromRow(p),
            }
          } else if (d >= 0 && d <= 7) {
            item = {
              id,
              customerName,
              stage,
              dealValue,
              label: 'CLOSING SOON',
              urgency: 'critical',
              daysNumber: d,
              daysSubLabel: 'days left',
              pulseNumber: false,
              ...pipelineFieldsFromRow(p),
            }
          }
        }
      }

      if (!item && p.updatedAt) {
        if (stage === 'Proposal') {
          const daysU = daysSince(p.updatedAt)
          if (daysU >= 14) {
            item = {
              id,
              customerName,
              stage,
              dealValue,
              label: 'STALLED',
              urgency: 'warning',
              daysNumber: daysU,
              daysSubLabel: 'days no movement',
              pulseNumber: false,
              ...pipelineFieldsFromRow(p),
            }
          }
        } else if (stage === 'Site Survey') {
          const daysU = daysSince(p.updatedAt)
          if (daysU >= 7) {
            item = {
              id,
              customerName,
              stage,
              dealValue,
              label: 'NUDGE NEEDED',
              urgency: 'warning',
              daysNumber: daysU,
              daysSubLabel: 'days no movement',
              pulseNumber: false,
              ...pipelineFieldsFromRow(p),
            }
          }
        }
      }

      if (!item && p.createdAt && p.updatedAt && stage === 'Lead') {
        const daysC = daysSince(p.createdAt)
        const moved =
          Math.abs(new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime()) <= 86400000
        if (daysC >= 5 && moved) {
          item = {
            id,
            customerName,
            stage,
            dealValue,
            label: 'GOING COLD',
            urgency: 'warning',
            daysNumber: daysC,
            daysSubLabel: 'days since contact',
            pulseNumber: false,
            ...pipelineFieldsFromRow(p),
          }
        }
      }

      if (item) scored.push(item)
    }

    scored.sort((a, b) => {
      const la = LABEL_ORDER[a.label]
      const lb = LABEL_ORDER[b.label]
      if (la !== lb) return la - lb
      return (b.dealValue ?? 0) - (a.dealValue ?? 0)
    })

    const hitList = scored.slice(0, 7)

    // "₹… at risk" should reflect what the user is acting on *today*.
    // If there are any critical rows (OVERDUE / CLOSING SOON) in the visible hit list,
    // show the sum of just those. Otherwise show the total value of the visible hit list.
    const criticalVisibleValue = hitList
      .filter((i) => i.urgency === 'critical')
      .reduce((sum, i) => sum + (i.dealValue || 0), 0)
    const visibleValue = hitList.reduce((sum, i) => sum + (i.dealValue || 0), 0)
    const totalAtRisk = formatInrMillions(criticalVisibleValue > 0 ? criticalVisibleValue : visibleValue)

    return {
      hitList,
      totalAtRisk,
      allClear: hitList.length === 0,
      criticalCount: hitList.filter((d) => d.urgency === 'critical').length,
      warningCount: hitList.filter((d) => d.urgency === 'warning').length,
    }
  }, [projects, role, currentUser?.id])
}
