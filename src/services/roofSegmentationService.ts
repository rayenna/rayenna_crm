import { runRoofSegmentation } from '../ai/roofSegmentationModel';

export async function computeRoofAreaM2(imagePath: string): Promise<number> {
  const { roofAreaPixels } = await runRoofSegmentation(imagePath);
  // Approximate conversion: assume each pixel represents ~0.05 m² at zoom 20.
  const M2_PER_PIXEL = 0.05;
  return roofAreaPixels * M2_PER_PIXEL;
}

