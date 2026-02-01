/**
 * Fixed color per customer segment type so Revenue by Customer Segment and
 * Pipeline by Customer Segment use the same color for the same segment in both charts.
 * Aligned with other dashboard charts (red, blue, green palette).
 */
export const SEGMENT_COLORS: Record<string, string> = {
  RESIDENTIAL_SUBSIDY: '#ef4444',
  RESIDENTIAL_NON_SUBSIDY: '#3b82f6',
  COMMERCIAL_INDUSTRIAL: '#10b981',
}

const FALLBACK_COLORS = ['#64748b', '#94a3b8', '#cbd5e1']

export function getSegmentColor(segmentType: string, fallbackIndex: number): string {
  return SEGMENT_COLORS[segmentType] ?? FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length]
}
