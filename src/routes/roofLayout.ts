import { Router } from 'express';
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

export default router;

