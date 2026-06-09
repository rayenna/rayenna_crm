/**
 * Roof layout scale constants — must match src/constants/roofLayoutScale.ts (parity tests enforce).
 * Google Static Maps: zoom=19, size=1024, scale=2 → 2048×2048 px at ~0.149 m/px (equator).
 */
export const ROOF_LAYOUT_METERS_PER_PIXEL = 0.149;

export const ROOF_LAYOUT_SATELLITE_IMAGE_PX = 2048;
export const ROOF_LAYOUT_SATELLITE_IMAGE_CENTER_PX = ROOF_LAYOUT_SATELLITE_IMAGE_PX / 2;

export const ROOF_LAYOUT_PANEL_SPACING_M = 0.2;
export const ROOF_LAYOUT_USABLE_AREA_FACTOR = 0.75;
export const ROOF_LAYOUT_PANEL_SPACING_FACTOR = 1.2;
export const ROOF_LAYOUT_PANEL_AREA_M2 = 2.42;

export const ROOF_LAYOUT_SEED_POLYGON_ASPECT = 1.12;
export const ROOF_LAYOUT_SEED_POLYGON_EDGE_MARGIN_PX = 40;

export const ROOF_LAYOUT_DEFAULT_PANEL_WIDTH_M = 1.1;
export const ROOF_LAYOUT_DEFAULT_PANEL_HEIGHT_M = 2.2;

/** Typical module dimensions (m) by wattage band — India market common sizes. */
const WATTAGE_TO_MODULE_M: Record<number, { widthM: number; heightM: number }> = {
  400: { widthM: 1.0, heightM: 2.0 },
  440: { widthM: 1.05, heightM: 2.1 },
  480: { widthM: 1.08, heightM: 2.13 },
  500: { widthM: 1.1, heightM: 2.2 },
  530: { widthM: 1.1, heightM: 2.27 },
  540: { widthM: 1.13, heightM: 2.27 },
  550: { widthM: 1.134, heightM: 2.278 },
  580: { widthM: 1.13, heightM: 2.38 },
  600: { widthM: 1.3, heightM: 2.4 },
  650: { widthM: 1.3, heightM: 2.46 },
};

const DEFAULT_MODULE = {
  widthM: ROOF_LAYOUT_DEFAULT_PANEL_WIDTH_M,
  heightM: ROOF_LAYOUT_DEFAULT_PANEL_HEIGHT_M,
};

/** Resolve portrait module width × height in metres from CRM panel wattage. */
export function getModuleDimensionsM(panelWattage: number): { widthM: number; heightM: number } {
  const w = Math.round(panelWattage);
  if (WATTAGE_TO_MODULE_M[w]) return WATTAGE_TO_MODULE_M[w]!;
  const keys = Object.keys(WATTAGE_TO_MODULE_M)
    .map(Number)
    .sort((a, b) => a - b);
  let closest = keys[0] ?? 550;
  for (const k of keys) {
    if (Math.abs(k - w) < Math.abs(closest - w)) closest = k;
  }
  return WATTAGE_TO_MODULE_M[closest] ?? DEFAULT_MODULE;
}

export function getOrientedPanelSizeM(
  panelWattage: number,
  orientation: 'portrait' | 'landscape',
): { widthM: number; heightM: number } {
  const { widthM, heightM } = getModuleDimensionsM(panelWattage);
  return orientation === 'portrait'
    ? { widthM, heightM }
    : { widthM: heightM, heightM: widthM };
}
