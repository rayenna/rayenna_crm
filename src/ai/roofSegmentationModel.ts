export interface RoofMaskResult {
  roofAreaPixels: number;
}

// TODO: integrate real TensorFlow / OpenCV segmentation here.
// For now, return a fixed pixel area so the end-to-end pipeline can be tested.
export async function runRoofSegmentation(imagePath: string): Promise<RoofMaskResult> {
  void imagePath;
  // Stub: pretend we detected 500k roof pixels
  return { roofAreaPixels: 500_000 };
}

