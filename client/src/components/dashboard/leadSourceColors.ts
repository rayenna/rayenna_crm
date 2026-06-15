import { LEAD_SOURCE_LABELS } from '../../utils/leadSourceDisplay'

/**
 * Fixed color per lead source so Revenue by Lead Source and Pipeline by Lead Source
 * use the same color for the same lead source across both charts.
 * Hex values align with theme tokens in tokens.css / leadSourceDisplay.tsx.
 */
export const LEAD_SOURCE_COLORS: Record<string, string> = {
  [LEAD_SOURCE_LABELS.WEBSITE]: '#3b82f6',
  [LEAD_SOURCE_LABELS.REFERRAL]: '#10b981',
  [LEAD_SOURCE_LABELS.GOOGLE]: '#f59e0b',
  [LEAD_SOURCE_LABELS.CHANNEL_PARTNER]: '#ef4444',
  [LEAD_SOURCE_LABELS.DIGITAL_MARKETING]: '#8b5cf6',
  [LEAD_SOURCE_LABELS.SALES]: '#ec4899',
  [LEAD_SOURCE_LABELS.MANAGEMENT_CONNECT]: '#06b6d4',
  [LEAD_SOURCE_LABELS.OTHER]: '#84cc16',
}

const FALLBACK_COLORS = ['#64748b', '#94a3b8', '#cbd5e1']

export function getLeadSourceColor(leadSourceLabel: string, fallbackIndex: number): string {
  return LEAD_SOURCE_COLORS[leadSourceLabel] ?? FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length]
}
