/**
 * Customer-type donut colours (Dashboard + Zenith).
 * Uses Rayenna accent hues so slices are vivid and easy to tell apart on light/dark cards.
 */
export const SEGMENT_COLORS: Record<string, string> = {
  /** Warm gold — residential / home */
  RESIDENTIAL: '#F5A623',
  /** Indigo — apartment / society (distinct from teal commercial) */
  APARTMENT: '#7C6CF0',
  /** Brand teal — commercial */
  COMMERCIAL: '#00D4B4',
}

/** Extra slices if API returns an unexpected type */
const FALLBACK_COLORS = ['#F59E0B', '#3B8BFF', '#10B981']

export function getSegmentColor(segmentType: string, fallbackIndex: number): string {
  return SEGMENT_COLORS[segmentType] ?? FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length]
}
