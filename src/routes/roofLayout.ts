import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth';
import { generateRoofLayoutJob } from '../workers/layoutGenerationWorker';
import prisma from '../prisma';
import { v2 as cloudinary } from 'cloudinary';
import { UserRole } from '@prisma/client';

const router = Router();

// Cloudinary configuration (optional - only if env vars are set)
const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Cloudinary configured for roof layouts');
  }
}

function getGeneratedLayoutsDir(): string {
  return path.join(process.cwd(), 'generated_layouts');
}

async function uploadRoofLayoutToCloudinary(opts: {
  projectId: string;
  filePath: string;
}): Promise<string> {
  // Use deterministic public_id so the final "latest" layout URL remains stable.
  const publicId = `roof-layout-${opts.projectId}`;

  const uploadResult = await cloudinary.uploader.upload(opts.filePath, {
    folder: 'rayenna_crm',
    public_id: publicId,
    resource_type: 'image',
  });

  return uploadResult.secure_url;
}

/** Sales: project assignee OR customer's assigned salesperson (matches Proposal Engine access). */
async function salesUserHasProjectAccess(
  project: { salespersonId: string | null; customerId: string },
  userId: string,
): Promise<boolean> {
  if (project.salespersonId === userId) return true;
  const cust = await prisma.customer.findUnique({
    where: { id: project.customerId },
    select: { salespersonId: true },
  });
  return cust?.salespersonId === userId;
}

async function ensureProjectWriteAccess(projectId: string, reqUserId: string, reqUserRole: UserRole) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { ok: false, status: 404 as const };

  const roleStr = String(reqUserRole).toUpperCase();

  // Only Admin (all) or assigned Sales can write.
  if (roleStr === 'ADMIN') return { ok: true as const };

  if (reqUserRole === UserRole.SALES) {
    const allowed = await salesUserHasProjectAccess(project, reqUserId);
    if (!allowed) return { ok: false, status: 403 as const };
    return { ok: true as const };
  }

  return {
    ok: false,
    status: 403 as const,
  };
}

async function ensureProjectReadAccess(projectId: string, reqUserId: string, reqUserRole: UserRole) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { ok: false, status: 404 as const };

  // Ops/Management/Finance/Admin can view any.
  const role = reqUserRole;
  if (
    role === UserRole.OPERATIONS ||
    role === UserRole.MANAGEMENT ||
    role === UserRole.FINANCE ||
    role === UserRole.ADMIN
  ) {
    return { ok: true as const };
  }

  if (role === UserRole.SALES) {
    const allowed = await salesUserHasProjectAccess(project, reqUserId);
    if (!allowed) return { ok: false, status: 403 as const };
    return { ok: true as const };
  }

  return { ok: false, status: 403 as const };
}

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
    const access = await ensureProjectWriteAccess(
      projectId,
      req.user!.id,
      req.user!.role as UserRole,
    );
    if (!access.ok) return res.status(access.status).json({ error: 'No access to this project' });

    const result = await generateRoofLayoutJob({
      projectId,
      latitude: Number(latitude),
      longitude: Number(longitude),
      systemSizeKw: Number(systemSizeKw),
      panelWattage: Number(panelWattage),
    });

    const publicUrlPath = `/api/generated_layouts/${projectId}_ai_layout.png`;

    // Persist AI layout image + metrics.
    let layoutImageUrl = publicUrlPath;
    if (useCloudinary) {
      layoutImageUrl = await uploadRoofLayoutToCloudinary({
        projectId,
        filePath: result.layoutImagePath,
      });
    }

    await prisma.projectRoofLayout.upsert({
      where: { projectId },
      create: {
        projectId,
        roofAreaM2: result.roofAreaM2,
        usableAreaM2: result.usableAreaM2,
        panelCount: result.panelCount,
        layoutImageUrl,
        source: 'AI',
      },
      update: {
        roofAreaM2: result.roofAreaM2,
        usableAreaM2: result.usableAreaM2,
        panelCount: result.panelCount,
        layoutImageUrl,
        source: 'AI',
      },
    });

    return res.json({
      roof_area_m2: result.roofAreaM2,
      usable_area_m2: result.usableAreaM2,
      panel_count: result.panelCount,
      layout_image_url: layoutImageUrl,
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
    const access = await ensureProjectWriteAccess(
      projectId,
      req.user!.id,
      req.user!.role as UserRole,
    );
    if (!access.ok) return res.status(access.status).json({ error: 'No access to this project' });

    // Expect a data URL like "data:image/png;base64,AAAA..."
    const match = dataUrl.match(/^data:image\/(png|jpeg);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid image data URL' });
    }
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const base64 = match[2];

    const generatedLayoutsDir = getGeneratedLayoutsDir();
    await fs.promises.mkdir(generatedLayoutsDir, { recursive: true });
    const filePath = path.join(generatedLayoutsDir, `${projectId}_manual_layout.${ext}`);
    await fs.promises.writeFile(filePath, Buffer.from(base64, 'base64'));

    // Always persist metadata so GET /manual-layout/:projectId returns 200 and the Proposal can embed the layout.
    const roof = Number.isFinite(Number(roof_area_m2)) ? Number(roof_area_m2) : 0;
    const usable = Number.isFinite(Number(usable_area_m2)) ? Number(usable_area_m2) : 0;
    const panels = Number.isFinite(Number(panel_count)) ? Number(panel_count) : 0;
    const publicUrlPath = `/api/generated_layouts/${projectId}_manual_layout.${ext}`;

    // Persist image + metrics.
    let layoutImageUrl = publicUrlPath;
    if (useCloudinary) {
      layoutImageUrl = await uploadRoofLayoutToCloudinary({ projectId, filePath });
    }

    const metaPath = path.join(generatedLayoutsDir, `${projectId}_manual_layout.json`);
    await fs.promises.writeFile(
      metaPath,
      JSON.stringify(
        {
          projectId,
          roof_area_m2: roof,
          usable_area_m2: usable,
          panel_count: panels,
          savedAt: new Date().toISOString(),
          layout_image_url: layoutImageUrl,
        },
        null,
        2,
      ),
      'utf8',
    );

    await prisma.projectRoofLayout.upsert({
      where: { projectId },
      create: {
        projectId,
        roofAreaM2: roof,
        usableAreaM2: usable,
        panelCount: panels,
        layoutImageUrl,
        source: 'MANUAL',
      },
      update: {
        roofAreaM2: roof,
        usableAreaM2: usable,
        panelCount: panels,
        layoutImageUrl,
        source: 'MANUAL',
      },
    });

    return res.json({ layout_image_url: layoutImageUrl });
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
    const readAccess = await ensureProjectReadAccess(projectId, req.user!.id, req.user!.role as UserRole);
    if (!readAccess.ok) return res.status(readAccess.status).json({ error: 'Access denied' });

    // Prefer DB record so the layout is available cross-machine.
    const record = await prisma.projectRoofLayout.findUnique({ where: { projectId } });
    if (record) {
      return res.json({
        roof_area_m2: record.roofAreaM2,
        usable_area_m2: record.usableAreaM2,
        panel_count: record.panelCount,
        layout_image_url: record.layoutImageUrl,
        savedAt: record.savedAt.toISOString(),
        projectId: record.projectId,
      });
    }

    // Backwards-compatible filesystem fallback (pre-Cloudinary persistence).
    const generatedLayoutsDir = getGeneratedLayoutsDir();
    const metaPath = path.join(generatedLayoutsDir, `${projectId}_manual_layout.json`);
    if (!fs.existsSync(metaPath)) return res.status(404).json({ error: 'No manual layout saved' });

    const raw = await fs.promises.readFile(metaPath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // If Cloudinary is enabled, backfill DB so other machines can read too.
    if (useCloudinary && typeof parsed.layout_image_url === 'string') {
      const layoutUrl = parsed.layout_image_url;
      const extMatch = layoutUrl.match(/\.(png|jpe?g)(?:\?|#|$)/i);
      const ext = extMatch?.[1]?.toLowerCase().replace('jpeg', 'jpg') || 'png';
      const imageFilePath = path.join(generatedLayoutsDir, `${projectId}_manual_layout.${ext}`);

      if (fs.existsSync(imageFilePath)) {
        const layoutImageUrl = await uploadRoofLayoutToCloudinary({ projectId, filePath: imageFilePath });
        const roof = Number.isFinite(Number(parsed.roof_area_m2)) ? Number(parsed.roof_area_m2) : 0;
        const usable = Number.isFinite(Number(parsed.usable_area_m2)) ? Number(parsed.usable_area_m2) : 0;
        const panels = Number.isFinite(Number(parsed.panel_count)) ? Number(parsed.panel_count) : 0;

        await prisma.projectRoofLayout.upsert({
          where: { projectId },
          create: {
            projectId,
            roofAreaM2: roof,
            usableAreaM2: usable,
            panelCount: panels,
            layoutImageUrl,
            source: 'MANUAL',
          },
          update: {
            roofAreaM2: roof,
            usableAreaM2: usable,
            panelCount: panels,
            layoutImageUrl,
            source: 'MANUAL',
          },
        });

        return res.json({
          roof_area_m2: roof,
          usable_area_m2: usable,
          panel_count: panels,
          layout_image_url: layoutImageUrl,
          savedAt: new Date().toISOString(),
          projectId,
        });
      }
    }

    return res.json(parsed);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to load manual roof layout meta:', err);
    return res.status(500).json({ error: 'Failed to load manual layout' });
  }
});

export default router;

