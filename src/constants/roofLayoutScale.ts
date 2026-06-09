/**
 * Authoritative roof-layout scale constants for the CRM API + layout worker.
 * Keep proposal-engine/frontend/src/lib/roofLayoutConstants.ts in sync (parity tests enforce this).
 *
 * Google Static Maps: zoom=19, size=1024, scale=2 → 2048×2048 px at ~0.149 m/px (equator).
 */

/** Metres per image pixel at the standard satellite fetch settings. */
export const ROOF_LAYOUT_METERS_PER_PIXEL = 0.149;

/** Fetched satellite image width/height in pixels. */
export const ROOF_LAYOUT_SATELLITE_IMAGE_PX = 2048;

/** Image centre in pixel space (half of ROOF_LAYOUT_SATELLITE_IMAGE_PX). */
export const ROOF_LAYOUT_SATELLITE_IMAGE_CENTER_PX = ROOF_LAYOUT_SATELLITE_IMAGE_PX / 2;

/** Typical module footprint (m²) used for seed polygon sizing. */
export const ROOF_LAYOUT_PANEL_AREA_M2 = 2.42;

/** Gap factor between modules when estimating seed roof area. */
export const ROOF_LAYOUT_PANEL_SPACING_FACTOR = 1.2;

/** Fraction of roof area treated as usable for packing estimates. */
export const ROOF_LAYOUT_USABLE_AREA_FACTOR = 0.75;

/** Width:height ratio for the initial centred seed rectangle. */
export const ROOF_LAYOUT_SEED_POLYGON_ASPECT = 1.12;

/** Minimum inset (px) from image edge when sizing seed polygon. */
export const ROOF_LAYOUT_SEED_POLYGON_EDGE_MARGIN_PX = 40;

/** Default module width/height (m) when geometry JSON omits explicit dimensions. */
export const ROOF_LAYOUT_DEFAULT_PANEL_WIDTH_M = 1.1;
export const ROOF_LAYOUT_DEFAULT_PANEL_HEIGHT_M = 2.2;

export type RoofLayoutPoint = { x: number; y: number };

export function computeSeedPolygonHalfExtentsPx(params: {
  systemSizeKw: number;
  panelWattage: number;
  imgCenter?: number;
  metersPerPixel?: number;
}): { halfWPx: number; halfHPx: number } {
  const imgCenter = params.imgCenter ?? ROOF_LAYOUT_SATELLITE_IMAGE_CENTER_PX;
  const metersPerPixel = params.metersPerPixel ?? ROOF_LAYOUT_METERS_PER_PIXEL;
  const panelsForTarget = Math.max(
    4,
    Math.ceil((params.systemSizeKw * 1000) / Math.max(params.panelWattage, 1)),
  );
  const seedRoofAreaM2 =
    (panelsForTarget * ROOF_LAYOUT_PANEL_AREA_M2 * ROOF_LAYOUT_PANEL_SPACING_FACTOR) /
    ROOF_LAYOUT_USABLE_AREA_FACTOR;
  const areaPx = seedRoofAreaM2 / (metersPerPixel * metersPerPixel);
  const heightPx = Math.sqrt(areaPx / ROOF_LAYOUT_SEED_POLYGON_ASPECT);
  const widthPx = areaPx / heightPx;
  const maxHalf = imgCenter - ROOF_LAYOUT_SEED_POLYGON_EDGE_MARGIN_PX;
  return {
    halfWPx: Math.round(Math.min(widthPx / 2, maxHalf)),
    halfHPx: Math.round(Math.min(heightPx / 2, maxHalf)),
  };
}

/** Initial roof polygon returned by POST /api/roof/ai-layout (centred rectangle). */
export function computeSeedRoofPolygonCoords(params: {
  systemSizeKw: number;
  panelWattage: number;
  imgCenter?: number;
  metersPerPixel?: number;
}): RoofLayoutPoint[] {
  const imgCenter = params.imgCenter ?? ROOF_LAYOUT_SATELLITE_IMAGE_CENTER_PX;
  const { halfWPx, halfHPx } = computeSeedPolygonHalfExtentsPx(params);
  return [
    { x: imgCenter - halfWPx, y: imgCenter - halfHPx },
    { x: imgCenter + halfWPx, y: imgCenter - halfHPx },
    { x: imgCenter + halfWPx, y: imgCenter + halfHPx },
    { x: imgCenter - halfWPx, y: imgCenter + halfHPx },
  ];
}
