import { UserRole } from '../types'
import {
  buildHitListFromProjects,
  hitListItemToMyDayTask,
  type HitListProjectRow,
} from '../hooks/useHitList'
import {
  myDayTaskContentForLifecycleGap,
  projectDisplayLabel,
  lifecycleBrandMissingLabel,
  lifecycleBrandMissingKind,
} from '../utils/zenithBriefingMissingBrands'

export type MyDaySuggestionSource =
  | 'hit_list'
  | 'payment_overdue'
  | 'install_delayed'
  | 'lifecycle_brands'
  | 'support_ticket'

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
  lifecycleBrandGaps?: Array<{
    projectId: string
    projectSerialNumber?: number | null
    customerName: string
    stageLabel: string
    missingPanel: boolean
    missingInverter: boolean
  }>
  supportQueue?: {
    open?: number
    overdue?: number
    hubOpen?: number
    overdueTickets?: Array<{
      ticketId: string
      ticketNumber: string
      title: string
      projectId: string
      projectSerialNumber: number | null
      customerName: string
      source: string
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

function suggestionsFromLifecycleBrandGaps(
  gaps: ZenithFocusPayload['lifecycleBrandGaps'],
): MyDaySuggestion[] {
  if (!gaps?.length) return []
  return gaps.slice(0, 4).map((gap) => {
    const kind = lifecycleBrandMissingKind({
      panel_brand: gap.missingPanel ? null : 'ok',
      inverter_brand: gap.missingInverter ? null : 'ok',
    })
    const label = projectDisplayLabel({
      customer_name: gap.customerName,
      project_serial_number: gap.projectSerialNumber ?? null,
    })
    return {
      id: `lifecycle:${gap.projectId}`,
      source: 'lifecycle_brands' as const,
      content: myDayTaskContentForLifecycleGap({
        customer_name: gap.customerName,
        panel_brand: gap.missingPanel ? null : 'ok',
        inverter_brand: gap.missingInverter ? null : 'ok',
      }),
      projectId: gap.projectId,
      projectLabel: label,
      urgency: 'warning' as const,
      meta: `${gap.stageLabel} · ${lifecycleBrandMissingLabel(kind)} missing`,
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

function suggestionsFromOverdueTickets(
  overdueTickets: NonNullable<ZenithFocusPayload['supportQueue']>['overdueTickets'],
): MyDaySuggestion[] {
  if (!overdueTickets?.length) return []
  return overdueTickets.slice(0, 4).map((row) => {
    const label = projectLabel(row.customerName, row.projectSerialNumber)
    const hub = row.source === 'CONSUMER_APP' ? 'Solar Hub · ' : ''
    return {
      id: `ticket:${row.ticketId}`,
      source: 'support_ticket' as const,
      content: `Follow up ticket ${row.ticketNumber} — ${row.title}`,
      projectId: row.projectId,
      projectLabel: label,
      urgency: 'critical' as const,
      meta: `${hub}Overdue · ${row.ticketNumber}`,
    }
  })
}

export function buildMyDaySuggestions(args: {
  focusData: ZenithFocusPayload | null | undefined
  role: UserRole
  userId: string
}): MyDaySuggestion[] {
  const { focusData, role, userId } = args
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

  const lifecycleGaps = focusData.lifecycleBrandGaps
  if (
    lifecycleGaps &&
    (role === UserRole.SALES ||
      role === UserRole.OPERATIONS ||
      role === UserRole.ADMIN)
  ) {
    raw.push(...suggestionsFromLifecycleBrandGaps(lifecycleGaps))
  }

  const ticketRows = focusData.supportQueue?.overdueTickets
  if (
    ticketRows &&
    (role === UserRole.SALES ||
      role === UserRole.OPERATIONS ||
      role === UserRole.ADMIN ||
      role === UserRole.MANAGEMENT)
  ) {
    raw.push(...suggestionsFromOverdueTickets(ticketRows))
  }

  const seen = new Set<string>()
  const deduped: MyDaySuggestion[] = []
  for (const s of raw) {
    const key = s.source === 'support_ticket' ? s.id : (s.projectId ?? s.id)
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(s)
  }

  const urgencyRank = { critical: 0, warning: 1, info: 2 }
  deduped.sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency])

  return deduped.slice(0, MAX_SUGGESTIONS)
}
