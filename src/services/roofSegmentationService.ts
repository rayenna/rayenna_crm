import { runRoofSegmentation } from '../ai/roofSegmentationModel';

export async function computeRoofAreaM2(imagePath: string): Promise<number> {
  const { roofAreaPixels } = await runRoofSegmentation(imagePath);
  // Approximate conversion at zoom=19, scale=2: ~0.149 m/px → 0.149² ≈ 0.022 m²/px.
  const M2_PER_PIXEL = 0.022;
  return roofAreaPixels * M2_PER_PIXEL;
}

