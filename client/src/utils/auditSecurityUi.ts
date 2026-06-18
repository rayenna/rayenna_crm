export const AUDIT_ACTION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All actions' },
  { value: 'login', label: 'Login' },
  { value: 'password_reset_initiated', label: 'Password reset initiated' },
  { value: 'password_reset_completed', label: 'Password reset completed' },
  { value: 'user_created', label: 'User created' },
  { value: 'user_role_changed', label: 'User role changed' },
  { value: 'user_deleted', label: 'User deleted' },
  { value: 'project_created', label: 'Project created' },
  { value: 'project_status_changed', label: 'Project status changed' },
  { value: 'payment_updated', label: 'Payment updated' },
  { value: 'customer_created', label: 'Customer created' },
  { value: 'customer_updated', label: 'Customer updated' },
  { value: 'customer_deleted', label: 'Customer deleted' },
  { value: 'document_uploaded', label: 'Document uploaded' },
  { value: 'document_deleted', label: 'Document deleted' },
  { value: 'support_ticket_created', label: 'Support ticket created' },
  { value: 'support_ticket_closed', label: 'Support ticket closed' },
  { value: 'proposal_generated', label: 'Proposal generated' },
  { value: 'costing_template_saved', label: 'PE costing template saved' },
  { value: 'costing_template_deleted', label: 'PE costing template deleted' },
  { value: 'pe_limit_costing_too_large', label: 'PE costing payload too large' },
  { value: 'pe_limit_bom_too_large', label: 'PE BOM payload too large' },
  { value: 'pe_limit_proposal_too_large', label: 'PE proposal payload too large' },
  { value: 'pe_limit_share_payload_too_large', label: 'PE share payload too large' },
]

export const AUDIT_ENTITY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All entities' },
  { value: 'User', label: 'User' },
  { value: 'Customer', label: 'Customer' },
  { value: 'Project', label: 'Project' },
  { value: 'SupportTicket', label: 'Support ticket' },
  { value: 'Proposal', label: 'Proposal' },
  { value: 'Document', label: 'Document' },
  { value: 'PECOSTINGTEMPLATE', label: 'PE costing template' },
]

const ACTION_LABELS = new Map(
  AUDIT_ACTION_TYPE_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]),
)

export function auditActionLabel(actionType: string | null | undefined): string {
  if (!actionType) return '—'
  return ACTION_LABELS.get(actionType) ?? actionType.replace(/_/g, ' ')
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export type AuditDatePreset = 'today' | '7d' | '30d' | '90d'

export function auditDatePresetRange(preset: AuditDatePreset): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  if (preset === 'today') {
    return { from: toDateInputValue(to), to: toDateInputValue(to) }
  }
  const days = preset === '7d' ? 6 : preset === '30d' ? 29 : 89
  from.setDate(from.getDate() - days)
  return { from: toDateInputValue(from), to: toDateInputValue(to) }
}

export function auditEntityPath(
  entityType: string | null | undefined,
  entityId: string | null | undefined,
): string | null {
  if (!entityType || !entityId) return null
  switch (entityType) {
    case 'Project':
      return `/projects/${entityId}`
    case 'Customer':
      return `/customers/${entityId}`
    case 'User':
      return `/audit-security?userId=${encodeURIComponent(entityId)}`
    case 'SupportTicket':
      return '/support-tickets'
    default:
      return null
  }
}

export function auditEntityLinkLabel(
  entityType: string | null | undefined,
  entityId: string | null | undefined,
): string {
  if (!entityType || !entityId) return '—'
  return entityType === 'SupportTicket' ? 'Support tickets' : `${entityType}`
}

type FilterSummaryInput = {
  actionType: string
  entityType: string
  dateFrom: string
  dateTo: string
  userId: string
  userLabel?: string
  summarySearch?: string
}

export function buildAuditFilterSummary(filters: FilterSummaryInput): string | null {
  const parts: string[] = []
  if (filters.actionType) {
    parts.push(auditActionLabel(filters.actionType))
  }
  if (filters.entityType) {
    const entityLabel =
      AUDIT_ENTITY_TYPE_OPTIONS.find((o) => o.value === filters.entityType)?.label ?? filters.entityType
    parts.push(entityLabel)
  }
  if (filters.userId) {
    parts.push(filters.userLabel ? `User: ${filters.userLabel}` : 'Filtered by user')
  }
  if (filters.summarySearch?.trim()) {
    parts.push(`Search: “${filters.summarySearch.trim()}”`)
  }
  if (filters.dateFrom && filters.dateTo) {
    parts.push(`${filters.dateFrom} → ${filters.dateTo}`)
  } else if (filters.dateFrom) {
    parts.push(`From ${filters.dateFrom}`)
  } else if (filters.dateTo) {
    parts.push(`Until ${filters.dateTo}`)
  }
  if (parts.length === 0) return null
  return parts.join(' · ')
}
