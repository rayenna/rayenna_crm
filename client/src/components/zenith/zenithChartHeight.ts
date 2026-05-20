import {
  lifecycleBrandBarChartHeight,
  lifecycleBrandPairedChartHeight,
} from '../../utils/zenithPanelInverterBrandChartData'

/** Minimum plot height for Zenith bar/line/donut charts (mobile-friendly baseline). */
export const ZENITH_CHART_HEIGHT_FLOOR = 240

/**
 * When a tab has no lifecycle inverter data, match the typical Executive layout (~10 brands)
 * so Finance / filtered views stay visually aligned with Explore charts.
 */
const ZENITH_STANDARD_CHART_REFERENCE_BRAND_ROWS = 10

/**
 * Unified height for Zenith charts in “Explore the landscape” (and matching sections),
 * excluding the bottom lifecycle brand pair. Tracks the Projects by inverter brand chart.
 */
export function zenithStandardChartHeight(
  inverterBrandCount: number,
  floor = ZENITH_CHART_HEIGHT_FLOOR,
): number {
  const rows =
    inverterBrandCount > 0 ? inverterBrandCount : ZENITH_STANDARD_CHART_REFERENCE_BRAND_ROWS
  return lifecycleBrandBarChartHeight(rows, floor)
}

/** Plot height for the bottom panel + inverter brand row (may exceed standard if panel has more rows). */
export function zenithLifecycleBrandPairChartHeight(
  panelBrandCount: number,
  inverterBrandCount: number,
  floor = ZENITH_CHART_HEIGHT_FLOOR,
): number {
  return lifecycleBrandPairedChartHeight([panelBrandCount, inverterBrandCount], floor)
}
