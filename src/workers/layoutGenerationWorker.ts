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

  return {
    roofAreaM2,
    usableAreaM2,
    panelCount,
    layoutImagePath,
  };
}

