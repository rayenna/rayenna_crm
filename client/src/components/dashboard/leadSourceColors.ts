/**
 * Fixed color per lead source so Revenue by Lead Source and Pipeline by Lead Source
 * use the same color for the same lead source across both charts.
 */
export const LEAD_SOURCE_COLORS: Record<string, string> = {
  Website: '#3b82f6',
  Referral: '#10b981',
  Google: '#f59e0b',
  'Channel Partner': '#ef4444',
  'Digital Marketing': '#8b5cf6',
  Sales: '#ec4899',
  'Management Connect': '#06b6d4',
  Other: '#84cc16',
}

const FALLBACK_COLORS = ['#64748b', '#94a3b8', '#cbd5e1']

export function getLeadSourceColor(leadSourceLabel: string, fallbackIndex: number): string {
  return LEAD_SOURCE_COLORS[leadSourceLabel] ?? FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length]
}
