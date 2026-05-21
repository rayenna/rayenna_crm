import { CUSTOMER_TYPE_CHART_HEX } from '../../utils/customerTypeColors'

/**
 * Customer-type donut colours (Dashboard + Zenith).
 * Keep in sync with Projects row/badge colours — see `utils/customerTypeStyles.ts`.
 */
export const SEGMENT_COLORS: Record<string, string> = { ...CUSTOMER_TYPE_CHART_HEX }

/** Extra slices if API returns an unexpected type */
const FALLBACK_COLORS = ['#F59E0B', '#3B8BFF', '#10B981']

export function getSegmentColor(segmentType: string, fallbackIndex: number): string {
  return SEGMENT_COLORS[segmentType] ?? FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length]
}
