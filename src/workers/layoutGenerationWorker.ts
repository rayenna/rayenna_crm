import { fetchSatelliteImage } from '../services/satelliteFetcher';
import { computeRoofAreaM2 } from '../services/roofSegmentationService';
import { detectObstaclesM2 } from '../services/obstacleDetector';
import { computePanelPacking } from '../services/panelPackingEngine';
import { renderLayoutImage } from '../services/layoutRenderer';

export interface LayoutJobInput {
  projectId: string;
  latitude: number;
  longitude: number;
  systemSizeKw: number;
  panelWattage: number;
}

export interface LayoutJobResult {
  roofAreaM2: number;
  usableAreaM2: number;
  panelCount: number;
  layoutImagePath: string;
  /** Initial roof polygon in image pixel space (top-left origin).
   *  Derived from the known satellite image dimensions so the frontend can
   *  start with a better-placed polygon instead of a generic centred rectangle.
   *  When real segmentation is added later, these coords become the detected roof shape. */
  roofPolygonCoords: Array<{ x: number; y: number }>;
}

export async function generateRoofLayoutJob(input: LayoutJobInput): Promise<LayoutJobResult> {
  const imagePath = await fetchSatelliteImage(input.projectId, input.latitude, input.longitude);
  const roofAreaM2 = await computeRoofAreaM2(imagePath);
  const { obstacleAreaM2 } = await detectObstaclesM2(imagePath);
  const usableAreaM2 = Math.max(roofAreaM2 - obstacleAreaM2, 0);

  const { panelCount } = computePanelPacking({
    systemSizeKw: input.systemSizeKw,
    panelWattage: input.panelWattage,
    usableAreaM2,
  });

  const layoutImagePath = await renderLayoutImage({
    projectId: input.projectId,
    roofAreaM2,
    usableAreaM2,
    panelCount,
    satelliteImagePath: imagePath,
  });

  // Satellite image is always 2048×2048 (zoom=19, size=1024x1024, scale=2).
  // Seed a centre rectangle sized from CRM system kW + module wattage (not a fixed 35×30 m box).
  const IMG_CENTER = 1024;
  const METERS_PER_PIXEL = 0.149;
  const PANEL_AREA_M2 = 2.42;
  const SPACING_FACTOR = 1.2;
  const USABLE_FACTOR = 0.75;
  const panelsForTarget = Math.max(
    4,
    Math.ceil((input.systemSizeKw * 1000) / Math.max(input.panelWattage, 1)),
  );
  const seedRoofAreaM2 = (panelsForTarget * PANEL_AREA_M2 * SPACING_FACTOR) / USABLE_FACTOR;
  const areaPx = seedRoofAreaM2 / (METERS_PER_PIXEL * METERS_PER_PIXEL);
  const aspect = 1.12;
  const heightPx = Math.sqrt(areaPx / aspect);
  const widthPx = areaPx / heightPx;
  const halfWPx = Math.round(Math.min(widthPx / 2, IMG_CENTER - 40));
  const halfHPx = Math.round(Math.min(heightPx / 2, IMG_CENTER - 40));
  const roofPolygonCoords = [
    { x: IMG_CENTER - halfWPx, y: IMG_CENTER - halfHPx },
    { x: IMG_CENTER + halfWPx, y: IMG_CENTER - halfHPx },
    { x: IMG_CENTER + halfWPx, y: IMG_CENTER + halfHPx },
    { x: IMG_CENTER - halfWPx, y: IMG_CENTER + halfHPx },
  ];

  return {
    roofAreaM2,
    usableAreaM2,
    panelCount,
    layoutImagePath,
    roofPolygonCoords,
  };
}

