/** Pixel height for Recharts donut containers in Zenith (segment cards, payment radar, etc.). */
export const ZENITH_DONUT_CHART_HEIGHT_PX = 252

/**
 * Mobile segment cards: height for the pie ONLY (legend + values are rendered below in DOM, not inside Recharts).
 * Slightly tall to avoid subpixel / stroke clipping inside overflow:hidden slot on Android Chrome while scrolling.
 */
export const ZENITH_DONUT_PIE_ONLY_MOBILE_PX = 220
