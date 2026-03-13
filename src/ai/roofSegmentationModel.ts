export interface RoofMaskResult {
  roofAreaPixels: number;
}

// Stub implementation without any native dependencies.
// For now, return a fixed pixel area so the end-to-end pipeline works
// without requiring OpenCV on the server.
export async function runRoofSegmentation(imagePath: string): Promise<RoofMaskResult> {
  void imagePath;
  // Pretend we detected 500k roof pixels.
  return { roofAreaPixels: 500_000 };
}

