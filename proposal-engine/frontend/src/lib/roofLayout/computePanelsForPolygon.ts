import {
  ROOF_LAYOUT_METERS_PER_PIXEL,
  ROOF_LAYOUT_PANEL_SPACING_FACTOR,
  ROOF_LAYOUT_PANEL_SPACING_M,
  ROOF_LAYOUT_USABLE_AREA_FACTOR,
  getOrientedPanelSizeM,
} from '../roofLayoutConstants';
import { panelOverlapsKeepout } from './keepoutGeometry';
import type { RoofLayoutKeepout, RoofLayoutPanelRect, RoofLayoutPoint } from './roofLayoutTypes';

export type ComputePanelsOptions = {
  metersPerPixel?: number;
  panelOrientation: 'portrait' | 'landscape';
  panelSpacingMultiplier: number;
  panelWatts: number;
  maxPanelsCap?: number;
  keepoutRects?: RoofLayoutKeepout[];
  targetKw?: number | null;
};

export function computePanelsForPolygon(
  poly: RoofLayoutPoint[],
  options: ComputePanelsOptions,
): {
  panels: RoofLayoutPanelRect[];
  roofAreaM2: number;
  usableAreaM2: number;
  panelCount: number;
} {
  const metersPerPixel = options.metersPerPixel ?? ROOF_LAYOUT_METERS_PER_PIXEL;
  const maxPanelsCap = options.maxPanelsCap ?? 120;
  const keepoutRects = options.keepoutRects ?? [];

  if (!poly.length) return { panels: [], roofAreaM2: 0, usableAreaM2: 0, panelCount: 0 };

  const areaPx = Math.abs(
    poly.reduce((sum, p, idx) => {
      const next = poly[(idx + 1) % poly.length]!;
      return sum + p.x * next.y - next.x * p.y;
    }, 0) / 2,
  );

  const roofAreaM2 = areaPx * metersPerPixel * metersPerPixel;
  const usableAreaM2 = roofAreaM2 * ROOF_LAYOUT_USABLE_AREA_FACTOR;

  const { widthM, heightM } = getOrientedPanelSizeM(options.panelWatts, options.panelOrientation);
  const panelAreaM2 = widthM * heightM;

  const idealPanelCount = Math.max(
    0,
    Math.floor(usableAreaM2 / (panelAreaM2 * ROOF_LAYOUT_PANEL_SPACING_FACTOR)),
  );

  const panelWidthPx = widthM / metersPerPixel;
  const panelHeightPx = heightM / metersPerPixel;
  const spacingPx = (ROOF_LAYOUT_PANEL_SPACING_M / metersPerPixel) * options.panelSpacingMultiplier;

  let minX = poly[0]!.x;
  let maxX = poly[0]!.x;
  let minY = poly[0]!.y;
  let maxY = poly[0]!.y;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const panels: RoofLayoutPanelRect[] = [];
  const stepX = panelWidthPx + spacingPx;
  const stepY = panelHeightPx + spacingPx;

  const pointInPolygon = (pt: RoofLayoutPoint, vertices: RoofLayoutPoint[]): boolean => {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i]!.x;
      const yi = vertices[i]!.y;
      const xj = vertices[j]!.x;
      const yj = vertices[j]!.y;
      const intersect =
        yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-9) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const rectFullyInsidePolygon = (
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    vertices: RoofLayoutPoint[],
  ): boolean => {
    const corners: RoofLayoutPoint[] = [
      { x: rx, y: ry },
      { x: rx + rw, y: ry },
      { x: rx + rw, y: ry + rh },
      { x: rx, y: ry + rh },
    ];
    return corners.every((c) => pointInPolygon(c, vertices));
  };

  const approxPanelArea = panelWidthPx * panelHeightPx;
  const targetPanelCap =
    options.targetKw != null && options.targetKw > 0
      ? Math.ceil((options.targetKw * 1000) / Math.max(options.panelWatts, 1))
      : maxPanelsCap;
  const maxPanelsRendered = Math.min(
    maxPanelsCap,
    targetPanelCap,
    idealPanelCount || Math.max(1, Math.floor(areaPx / approxPanelArea)),
  );

  const panelRect = { x: 0, y: 0, w: panelWidthPx, h: panelHeightPx };

  for (let y = minY; y + panelHeightPx <= maxY; y += stepY) {
    for (let x = minX; x + panelWidthPx <= maxX; x += stepX) {
      if (!rectFullyInsidePolygon(x, y, panelWidthPx, panelHeightPx, poly)) continue;

      panelRect.x = x;
      panelRect.y = y;
      if (keepoutRects.some((k) => panelOverlapsKeepout(panelRect, k))) continue;

      panels.push({ x, y, w: panelWidthPx, h: panelHeightPx });
      if (panels.length >= maxPanelsRendered) break;
    }
    if (panels.length >= maxPanelsRendered) break;
  }

  return {
    panels,
    roofAreaM2,
    usableAreaM2,
    panelCount: panels.length,
  };
}
