import fs from 'fs';
import path from 'path';

export interface LayoutRenderInput {
  projectId: string;
  roofAreaM2: number;
  usableAreaM2: number;
  panelCount: number;
  satelliteImagePath: string;
}

/**
 * Backend layout renderer with **no native dependencies**.
 *
 * The backend's responsibility is only to:
 * - fetch and cache the satellite image from Google Maps
 * - copy it into the `generated_layouts` directory
 *
 * All visual overlays (roof polygon, panel rectangles, labels) are handled
 * entirely on the frontend using React + Konva / canvas APIs.
 */
export async function renderLayoutImage(input: LayoutRenderInput): Promise<string> {
  const outputDir = path.join(process.cwd(), 'generated_layouts');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(outputDir, `${input.projectId}_ai_layout.png`);

  try {
    fs.copyFileSync(input.satelliteImagePath, filePath);
  } catch {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, Buffer.alloc(0));
    }
  }

  return filePath;
}

