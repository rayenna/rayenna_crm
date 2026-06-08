import type { AiRoofLayoutResponse } from '../api/roofLayout';
import { getApiBaseUrl } from '../api/core';
import {
  ROOF_LAYOUT_METERS_PER_PIXEL,
  ROOF_LAYOUT_PANEL_AREA_M2,
  ROOF_LAYOUT_PANEL_SPACING_FACTOR,
  ROOF_LAYOUT_USABLE_AREA_FACTOR,
} from '../roofLayoutConstants';
import type { RoofLayoutPoint } from './roofLayoutTypes';

/** Scroll padding around the 2D Konva map — 0 = scroll extent matches scaled image only. */
export const ROOF_LAYOUT_SCROLL_BUFFER_PX = 0;

export function focalPointForSavedView(
  imageSize: { width: number; height: number },
  result: AiRoofLayoutResponse | null,
): RoofLayoutPoint {
  const poly = result?.roof_polygon_coordinates;
  if (poly && poly.length >= 2) {
    let sx = 0;
    let sy = 0;
    for (const p of poly) {
      sx += p.x;
      sy += p.y;
    }
    const x = sx / poly.length;
    const y = sy / poly.length;
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return {
        x: Math.max(0, Math.min(imageSize.width, x)),
        y: Math.max(0, Math.min(imageSize.height, y)),
      };
    }
  }
  const panels = result?.panel_coordinates;
  if (panels && panels.length) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const r of panels) {
      const x2 = r.x + r.width;
      const y2 = r.y + r.height;
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, x2);
      maxY = Math.max(maxY, y2);
    }
    if (Number.isFinite(minX) && Number.isFinite(maxX)) {
      const x = (minX + maxX) / 2;
      const y = (minY + maxY) / 2;
      return {
        x: Math.max(0, Math.min(imageSize.width, x)),
        y: Math.max(0, Math.min(imageSize.height, y)),
      };
    }
  }
  return { x: imageSize.width / 2, y: imageSize.height / 2 };
}

export function focalPointForEditingPolygon(
  imageSize: { width: number; height: number },
  polygon: RoofLayoutPoint[],
): RoofLayoutPoint {
  let sx = 0;
  let sy = 0;
  for (const p of polygon) {
    sx += p.x;
    sy += p.y;
  }
  const x = sx / polygon.length;
  const y = sy / polygon.length;
  return {
    x: Math.max(0, Math.min(imageSize.width, x)),
    y: Math.max(0, Math.min(imageSize.height, y)),
  };
}

export function scrollLayoutPreviewToFocal(
  el: HTMLDivElement,
  focalImageX: number,
  focalImageY: number,
  zoom: number,
  scrollBuffer = ROOF_LAYOUT_SCROLL_BUFFER_PX,
) {
  const cw = el.clientWidth;
  const ch = el.clientHeight;
  const sw = el.scrollWidth;
  const sh = el.scrollHeight;
  const cx = focalImageX * zoom + scrollBuffer;
  const cy = focalImageY * zoom + scrollBuffer;
  el.scrollLeft = Math.max(0, Math.min(Math.max(0, sw - cw), cx - cw / 2));
  el.scrollTop = Math.max(0, Math.min(Math.max(0, sh - ch), cy - ch / 2));
}

export function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

export function cacheBustImageUrl(url: string | null, version?: number): string | null {
  if (!url || !String(url).trim()) return null;
  const v = version ?? Date.now();
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${v}`;
}

export function initialPolygonHalfExtentsPx(
  systemSizeKw: number,
  panelWattage: number,
  imgCenter: number,
  metersPerPixel = ROOF_LAYOUT_METERS_PER_PIXEL,
): { halfWPx: number; halfHPx: number } {
  const panelsForTarget = Math.max(
    4,
    Math.ceil((systemSizeKw * 1000) / Math.max(panelWattage, 1)),
  );
  const seedRoofAreaM2 =
    (panelsForTarget * ROOF_LAYOUT_PANEL_AREA_M2 * ROOF_LAYOUT_PANEL_SPACING_FACTOR) /
    ROOF_LAYOUT_USABLE_AREA_FACTOR;
  const areaPx = seedRoofAreaM2 / (metersPerPixel * metersPerPixel);
  const aspect = 1.12;
  const heightPx = Math.sqrt(areaPx / aspect);
  const widthPx = areaPx / heightPx;
  return {
    halfWPx: Math.round(Math.min(widthPx / 2, imgCenter - 40)),
    halfHPx: Math.round(Math.min(heightPx / 2, imgCenter - 40)),
  };
}

export function absolutizeLayoutImageUrl(raw: string | null | undefined): string | null {
  if (!raw || !String(raw).trim()) return null;
  const s = String(raw).trim();
  if (s.startsWith('http')) return s;
  const base = getApiBaseUrl() || '';
  return `${base}${s.startsWith('/') ? s : `/${s}`}`;
}

export function satelliteEditorUrlForProject(projectId: string): string | null {
  const base = getApiBaseUrl() || '';
  return `${base}/api/generated_layouts/${projectId}_satellite.png`;
}

export type { RoofLayoutPanelRect, RoofLayoutPoint, RoofLayoutKeepoutRect } from './roofLayoutTypes';
