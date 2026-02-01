/**
 * Fixed color per project status so Projects by Stage chart has consistent
 * legend colors aligned with other dashboard charts.
 */
export const PROJECT_STATUS_COLORS: Record<string, string> = {
  LEAD: '#94a3b8',
  SITE_SURVEY: '#3b82f6',
  PROPOSAL: '#8b5cf6',
  CONFIRMED: '#f59e0b',
  UNDER_INSTALLATION: '#06b6d4',
  SUBMITTED_FOR_SUBSIDY: '#ec4899',
  COMPLETED: '#10b981',
  COMPLETED_SUBSIDY_CREDITED: '#22c55e',
  LOST: '#ef4444',
}

const FALLBACK_COLORS = ['#64748b', '#94a3b8', '#cbd5e1']

export function getProjectStatusColor(status: string, fallbackIndex: number): string {
  return PROJECT_STATUS_COLORS[status] ?? FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length]
}
