import fs from 'fs';
import path from 'path';

export interface LayoutRenderInput {
  projectId: string;
  roofAreaM2: number;
  usableAreaM2: number;
  panelCount: number;
  satelliteImagePath: string;
}

export async function renderLayoutImage(input: LayoutRenderInput): Promise<string> {
  const outputDir = path.join(process.cwd(), 'generated_layouts');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(outputDir, `${input.projectId}_ai_layout.png`);

  // Interim implementation: reuse the downloaded satellite image as the layout preview.
  // This gives a meaningful visual while we work towards a rich overlay renderer.
  try {
    fs.copyFileSync(input.satelliteImagePath, filePath);
  } catch {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, Buffer.alloc(0));
    }
  }

  return filePath;
}

