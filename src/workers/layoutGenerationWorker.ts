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
  // 0.149 m/px at the equator. Seed a small centre polygon sized for a typical
  // commercial rooftop (~35 m × 30 m) so the user can see all four corners
  // immediately and drag them to fit the actual building.
  // Replace halfWPx/halfHPx with real detected coordinates when image analysis is added.
  const IMG_CENTER = 1024; // 2048 / 2
  const METERS_PER_PIXEL = 0.149;
  const halfWPx = Math.round((35 / METERS_PER_PIXEL) / 2); // ~117 px ≈ 35 m
  const halfHPx = Math.round((30 / METERS_PER_PIXEL) / 2); // ~101 px ≈ 30 m
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

