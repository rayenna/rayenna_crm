import type { Task } from '../components/my-day/types'
import { UserRole } from '../types'
import {
  buildHitListFromProjects,
  hitListItemToMyDayTask,
  type HitListProjectRow,
} from '../hooks/useHitList'

export type MyDaySuggestionSource =
  | 'hit_list'
  | 'payment_overdue'
  | 'install_delayed'

export interface MyDaySuggestion {
  /** Stable key for list rendering */
  id: string
  source: MyDaySuggestionSource
  content: string
  projectId: string | null
  projectLabel: string | null
  urgency: 'critical' | 'warning' | 'info'
  /** Short context line, e.g. "OVERDUE · 3 days" */
  meta: string
}

const MAX_SUGGESTIONS = 7

function projectLabel(
  customerName: string,
  projectSerialNumber?: number | null,
): string {
  const name = customerName.trim() || '—'
  if (projectSerialNumber != null) return `#${projectSerialNumber} ${name}`.trim()
  return name
}

function taskAlreadyCoversSuggestion(task: Task, suggestion: MyDaySuggestion): boolean {
  if (task.isDone || task.isReminder) return false
  if (suggestion.projectId && task.projectId === suggestion.projectId) return true
  const label = (suggestion.projectLabel ?? '').trim().toLowerCase()
  if (label && task.content.toLowerCase().includes(label)) return true
  return false
}

function filterNewSuggestions(suggestions: MyDaySuggestion[], tasks: Task[]): MyDaySuggestion[] {
  return suggestions.filter((s) => !tasks.some((t) => taskAlreadyCoversSuggestion(t, s)))
}

type ZenithFocusPayload = {
  focusKind?: string
  salesPipeline?: { rows?: HitListProjectRow[] }
  financeRadar?: {
    overdueTop5?: Array<{
      projectId: string
      projectSerialNumber?: number | null
      customerName: string
      amount: number
      daysOverdue: number
    }>
  }
  installPulse?: {
    rows?: Array<{
      projectId: string
      projectSerialNumber?: number | null
      customerName: string
      overdue?: boolean
    }>
  }
}

function suggestionsFromHitList(
  rows: HitListProjectRow[] | undefined,
  role: UserRole,
  userId: string,
): MyDaySuggestion[] {
  const { hitList } = buildHitListFromProjects(rows, role, { id: userId })
  return hitList.map((item) => {
    const task = hitListItemToMyDayTask(item)
    return {
      id: `hit:${item.id}`,
      source: 'hit_list' as const,
      content: task.content,
      projectId: task.projectId,
      projectLabel: task.projectLabel,
      urgency: item.urgency,
      meta: `${item.label} · ${item.daysNumber} ${item.daysSubLabel}`,
    }
  })
}

function suggestionsFromFinanceOverdue(
  overdueTop5: ZenithFocusPayload['financeRadar'] extends undefined
    ? never
    : NonNullable<ZenithFocusPayload['financeRadar']>['overdueTop5'],
): MyDaySuggestion[] {
  if (!overdueTop5?.length) return []
  return [...overdueTop5]
    .sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0))
    .slice(0, 4)
    .map((row) => {
      const label = projectLabel(row.customerName, row.projectSerialNumber)
      const amountLakh = Math.round((row.amount ?? 0) / 1000) / 100
      return {
        id: `pay:${row.projectId}`,
        source: 'payment_overdue' as const,
        content: `Chase payment — ${row.customerName}`,
        projectId: row.projectId,
        projectLabel: label,
        urgency: (row.daysOverdue ?? 0) > 60 ? ('critical' as const) : ('warning' as const),
        meta: `₹${amountLakh.toFixed(2)}L outstanding · ${row.daysOverdue}d`,
      }
    })
}

function suggestionsFromInstallDelayed(
  rows: ZenithFocusPayload['installPulse'] extends undefined
    ? never
    : NonNullable<ZenithFocusPayload['installPulse']>['rows'],
): MyDaySuggestion[] {
  if (!rows?.length) return []
  return rows
    .filter((r) => r.overdue)
    .slice(0, 4)
    .map((row) => {
      const label = projectLabel(row.customerName, row.projectSerialNumber)
      return {
        id: `install:${row.projectId}`,
        source: 'install_delayed' as const,
        content: `Check delayed installation — ${row.customerName}`,
        projectId: row.projectId,
        projectLabel: label,
        urgency: 'warning' as const,
        meta: 'Installation overdue',
      }
    })
}

/**
 * Build CRM-backed My Day suggestions from zenith-focus payload.
 * Pure function — safe to unit-test; does not mutate tasks.
 */
export function buildMyDaySuggestions(args: {
  focusData: ZenithFocusPayload | null | undefined
  tasks: Task[]
  role: UserRole
  userId: string
}): MyDaySuggestion[] {
  const { focusData, tasks, role, userId } = args
  if (!focusData) return []

  const raw: MyDaySuggestion[] = []

  const pipelineRows = focusData.salesPipeline?.rows
  if (
    pipelineRows &&
    (role === UserRole.SALES ||
      role === UserRole.ADMIN ||
      role === UserRole.MANAGEMENT)
  ) {
    raw.push(...suggestionsFromHitList(pipelineRows, role, userId))
  }

  const overdue = focusData.financeRadar?.overdueTop5
  if (
    overdue &&
    (role === UserRole.FINANCE ||
      role === UserRole.ADMIN ||
      role === UserRole.MANAGEMENT)
  ) {
    raw.push(...suggestionsFromFinanceOverdue(overdue))
  }

  const installRows = focusData.installPulse?.rows
  if (
    installRows &&
    (role === UserRole.OPERATIONS ||
      role === UserRole.ADMIN ||
      role === UserRole.MANAGEMENT)
  ) {
    raw.push(...suggestionsFromInstallDelayed(installRows))
  }

  const seen = new Set<string>()
  const deduped: MyDaySuggestion[] = []
  for (const s of raw) {
    const key = s.projectId ?? s.id
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(s)
  }

  const urgencyRank = { critical: 0, warning: 1, info: 2 }
  deduped.sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency])

  return filterNewSuggestions(deduped, tasks).slice(0, MAX_SUGGESTIONS)
}
