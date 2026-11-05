/**
 * Seed geometry persisted on Generate so another device can hydrate an editable
 * roof outline even before the client finishes Konva panel packing / Save.
 */
import {
  ROOF_LAYOUT_DEFAULT_PANEL_HEIGHT_M,
  ROOF_LAYOUT_DEFAULT_PANEL_WIDTH_M,
  ROOF_LAYOUT_METERS_PER_PIXEL,
  ROOF_LAYOUT_SATELLITE_IMAGE_PX,
} from '../constants/roofLayoutScale';
import type { RoofLayoutGeometryV1 } from '../types/roofLayoutGeometry';

export function buildSeedRoofLayoutGeometry(params: {
  roofPolygon: Array<{ x: number; y: number }>;
  imageWidth?: number;
  imageHeight?: number;
  metersPerPixel?: number;
}): RoofLayoutGeometryV1 | null {
  const roofPolygon = (params.roofPolygon || []).filter(
    (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y),
  );
  if (roofPolygon.length < 3) return null;

  return {
    version: 1,
    imageWidth: params.imageWidth ?? ROOF_LAYOUT_SATELLITE_IMAGE_PX,
    imageHeight: params.imageHeight ?? ROOF_LAYOUT_SATELLITE_IMAGE_PX,
    metersPerPixel: params.metersPerPixel ?? ROOF_LAYOUT_METERS_PER_PIXEL,
    roofPolygon,
    panelRects: [],
    keepouts: [],
    panelOrientation: 'portrait',
    panelSpacingMultiplier: 1.5,
    panelWidthM: ROOF_LAYOUT_DEFAULT_PANEL_WIDTH_M,
    panelHeightM: ROOF_LAYOUT_DEFAULT_PANEL_HEIGHT_M,
  };
}
