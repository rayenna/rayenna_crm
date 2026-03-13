import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth';
import { generateRoofLayoutJob } from '../workers/layoutGenerationWorker';

const router = Router();

interface AiLayoutRequestBody {
  projectId: string;
  latitude: number;
  longitude: number;
  systemSizeKw: number;
  panelWattage: number;
}

router.post('/ai-layout', authenticate, async (req, res) => {
  const { projectId, latitude, longitude, systemSizeKw, panelWattage } = req.body as AiLayoutRequestBody;

  if (!projectId || latitude == null || longitude == null || !systemSizeKw || !panelWattage) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await generateRoofLayoutJob({
      projectId,
      latitude: Number(latitude),
      longitude: Number(longitude),
      systemSizeKw: Number(systemSizeKw),
      panelWattage: Number(panelWattage),
    });

    const publicUrlPath = `/api/generated_layouts/${projectId}_ai_layout.png`;

    return res.json({
      roof_area_m2: result.roofAreaM2,
      usable_area_m2: result.usableAreaM2,
      panel_count: result.panelCount,
      layout_image_url: publicUrlPath,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to generate AI roof layout:', err);
    return res.status(500).json({ error: 'Failed to generate AI roof layout' });
  }
});

router.post('/save-layout-image', authenticate, async (req, res) => {
  const { projectId, dataUrl, roof_area_m2, usable_area_m2, panel_count } = req.body as {
    projectId?: string;
    dataUrl?: string;
    roof_area_m2?: number;
    usable_area_m2?: number;
    panel_count?: number;
  };

  if (!projectId || !dataUrl || typeof dataUrl !== 'string') {
    return res.status(400).json({ error: 'projectId and dataUrl are required' });
  }

  try {
    // Expect a data URL like "data:image/png;base64,AAAA..."
    const match = dataUrl.match(/^data:image\/(png|jpeg);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid image data URL' });
    }
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const base64 = match[2];

    const generatedLayoutsDir = path.join(process.cwd(), 'generated_layouts');
    if (!fs.existsSync(generatedLayoutsDir)) {
      fs.mkdirSync(generatedLayoutsDir, { recursive: true });
    }
    const filePath = path.join(generatedLayoutsDir, `${projectId}_manual_layout.${ext}`);
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));

    // Always persist metadata so GET /manual-layout/:projectId returns 200 and the Proposal can embed the layout.
    const roof = Number.isFinite(Number(roof_area_m2)) ? Number(roof_area_m2) : 0;
    const usable = Number.isFinite(Number(usable_area_m2)) ? Number(usable_area_m2) : 0;
    const panels = Number.isFinite(Number(panel_count)) ? Number(panel_count) : 0;
    const publicUrlPath = `/api/generated_layouts/${projectId}_manual_layout.${ext}`;
    const metaPath = path.join(generatedLayoutsDir, `${projectId}_manual_layout.json`);
    fs.writeFileSync(
      metaPath,
      JSON.stringify(
        {
          projectId,
          roof_area_m2: roof,
          usable_area_m2: usable,
          panel_count: panels,
          savedAt: new Date().toISOString(),
          layout_image_url: publicUrlPath,
        },
        null,
        2,
      ),
    );
    return res.json({ layout_image_url: publicUrlPath });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to save manual roof layout image:', err);
    return res.status(500).json({ error: 'Failed to save layout image' });
  }
});

router.get('/manual-layout/:projectId', authenticate, async (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  if (!projectId) return res.status(400).json({ error: 'projectId is required' });
  try {
    const generatedLayoutsDir = path.join(process.cwd(), 'generated_layouts');
    const metaPath = path.join(generatedLayoutsDir, `${projectId}_manual_layout.json`);
    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: 'No manual layout saved' });
    }
    const raw = fs.readFileSync(metaPath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return res.json(parsed);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to load manual roof layout meta:', err);
    return res.status(500).json({ error: 'Failed to load manual layout' });
  }
});

export default router;

