import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth';
import { generateRoofLayoutJob } from '../workers/layoutGenerationWorker';
import { parseRoofLayoutGeometry, type RoofLayoutGeometryV1 } from '../types/roofLayoutGeometry';
import prisma from '../prisma';
import { Prisma, UserRole } from '@prisma/client';
import {
  configureCloudinaryIfNeeded,
  ensurePersistentLayoutImageUrl,
  ensurePersistentSatelliteImageUrl,
  ensureSatelliteOnDiskFromCloudinary,
  repairAndPersistRoofLayoutUrls,
  getGeneratedLayoutsDir,
  isCloudinaryConfigured,
  isEphemeralGeneratedLayoutsUrl,
  uploadRoofLayout3dFileToCloudinary,
  uploadRoofLayoutDataUrlToCloudinary,
  uploadRoofLayoutFileToCloudinary,
  uploadSatelliteFileToCloudinary,
} from '../services/roofLayoutImageStorage';

const router = Router();
const useCloudinary = isCloudinaryConfigured();

if (useCloudinary) {
  configureCloudinaryIfNeeded();
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Cloudinary configured for roof layouts');
  }
} else if (process.env.NODE_ENV === 'production') {
  console.warn(
    '⚠️ Roof layout images use ephemeral disk — set CLOUDINARY_* on the API service or saved layouts will be lost after deploy.',
  );
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

function manualLayoutJsonResponse(
  parsed: Record<string, unknown>,
  geomFromFile: RoofLayoutGeometryV1 | null,
) {
  return {
    ...parsed,
    source: parsed.source ?? 'MANUAL',
    ...(geomFromFile
      ? {
          geometry: geomFromFile,
          roof_polygon_coordinates: geomFromFile.roofPolygon,
          panel_coordinates: geomFromFile.panelRects,
        }
      : {}),
  };
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
    const satellitePath = path.join(getGeneratedLayoutsDir(), `${projectId}_satellite.png`);

    let layoutImageUrl = publicUrlPath;
    let satelliteImageUrl: string = `/api/generated_layouts/${projectId}_satellite.png`;

    if (useCloudinary) {
      if (fs.existsSync(satellitePath)) {
        satelliteImageUrl = await uploadSatelliteFileToCloudinary({ projectId, filePath: satellitePath });
      }
      layoutImageUrl = await uploadRoofLayoutFileToCloudinary({
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
        satelliteImageUrl,
        source: 'AI',
        layoutImage3dUrl: null,
        prefer3dForProposal: false,
      },
      update: {
        roofAreaM2: result.roofAreaM2,
        usableAreaM2: result.usableAreaM2,
        panelCount: result.panelCount,
        layoutImageUrl,
        satelliteImageUrl,
        source: 'AI',
        layoutImage3dUrl: null,
        prefer3dForProposal: false,
        geometryJson: Prisma.DbNull,
      },
    });

    return res.json({
      roof_area_m2: result.roofAreaM2,
      usable_area_m2: result.usableAreaM2,
      panel_count: result.panelCount,
      layout_image_url: layoutImageUrl,
      satellite_image_url: satelliteImageUrl,
      resolved_latitude: Number(latitude),
      resolved_longitude: Number(longitude),
      roof_polygon_coordinates: result.roofPolygonCoords,
    });
  } catch (err) {
    console.error('Failed to generate AI roof layout:', err);
    return res.status(500).json({ error: 'Failed to generate AI roof layout' });
  }
});

router.post('/save-layout-image', authenticate, async (req, res) => {
  const { projectId, dataUrl, roof_area_m2, usable_area_m2, panel_count, geometry } = req.body as {
    projectId?: string;
    dataUrl?: string;
    roof_area_m2?: number;
    usable_area_m2?: number;
    panel_count?: number;
    geometry?: unknown;
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

    const roof = Number.isFinite(Number(roof_area_m2)) ? Number(roof_area_m2) : 0;
    const usable = Number.isFinite(Number(usable_area_m2)) ? Number(usable_area_m2) : 0;
    const panels = Number.isFinite(Number(panel_count)) ? Number(panel_count) : 0;
    const publicUrlPath = `/api/generated_layouts/${projectId}_manual_layout.${ext}`;

    let layoutImageUrl = publicUrlPath;
    if (useCloudinary) {
      layoutImageUrl = await uploadRoofLayoutDataUrlToCloudinary({ projectId, dataUrl });
    }

    const satellitePath = path.join(generatedLayoutsDir, `${projectId}_satellite.png`);
    let satelliteImageUrl: string | null = null;
    if (useCloudinary && fs.existsSync(satellitePath)) {
      satelliteImageUrl = await uploadSatelliteFileToCloudinary({ projectId, filePath: satellitePath });
    } else {
      const existing = await prisma.projectRoofLayout.findUnique({
        where: { projectId },
        select: { satelliteImageUrl: true },
      });
      satelliteImageUrl = existing?.satelliteImageUrl ?? null;
      if (satelliteImageUrl) {
        satelliteImageUrl = await ensurePersistentSatelliteImageUrl(projectId, satelliteImageUrl);
      }
    }

    const parsedGeometry = geometry != null ? parseRoofLayoutGeometry(geometry) : null;
    const geometryJson = parsedGeometry ? (parsedGeometry as object) : undefined;

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
          ...(satelliteImageUrl ? { satellite_image_url: satelliteImageUrl } : {}),
          ...(parsedGeometry ? { geometry: parsedGeometry } : {}),
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
        satelliteImageUrl,
        source: 'MANUAL',
        prefer3dForProposal: false,
        ...(geometryJson != null ? { geometryJson } : {}),
      },
      update: {
        roofAreaM2: roof,
        usableAreaM2: usable,
        panelCount: panels,
        layoutImageUrl,
        ...(satelliteImageUrl != null ? { satelliteImageUrl } : {}),
        source: 'MANUAL',
        prefer3dForProposal: false,
        ...(geometryJson != null ? { geometryJson } : {}),
      },
    });

    return res.json({
      layout_image_url: layoutImageUrl,
      ...(satelliteImageUrl ? { satellite_image_url: satelliteImageUrl } : {}),
      ...(parsedGeometry ? { geometry: parsedGeometry } : {}),
    });
  } catch (err) {
    console.error('Failed to save manual roof layout image:', err);
    return res.status(500).json({ error: 'Failed to save layout image' });
  }
});

router.post('/save-3d-layout-image', authenticate, async (req, res) => {
  const { projectId, dataUrl, set_prefer_for_proposal, roof_area_m2, usable_area_m2, panel_count } =
    req.body as {
      projectId?: string;
      dataUrl?: string;
      set_prefer_for_proposal?: boolean;
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

    const existing = await prisma.projectRoofLayout.findUnique({ where: { projectId } });
    if (!existing) {
      return res.status(400).json({
        error:
          'Save a 2D roof layout to this project first (Generate or Save to Proposal with 2D), then 3D can be stored.',
      });
    }

    const trimmedUrl = String(dataUrl).trim();
    const match = trimmedUrl.match(/^data:image\/(png|jpeg|jpg);base64,([\s\S]+)$/i);
    if (!match) {
      return res.status(400).json({ error: 'Invalid image data URL (use PNG or JPEG)' });
    }
    const mimeExt = match[1]!.toLowerCase();
    const ext = mimeExt === 'png' ? 'png' : 'jpg';
    const base64 = match[2]!.replace(/\s/g, '');

    const generatedLayoutsDir = getGeneratedLayoutsDir();
    await fs.promises.mkdir(generatedLayoutsDir, { recursive: true });
    const filePath = path.join(generatedLayoutsDir, `${projectId}_3d_layout.${ext}`);
    await fs.promises.writeFile(filePath, Buffer.from(base64, 'base64'));

    const publicUrlPath = `/api/generated_layouts/${projectId}_3d_layout.${ext}`;
    let layout3dUrl = publicUrlPath;
    if (useCloudinary) {
      layout3dUrl = await uploadRoofLayout3dFileToCloudinary({ projectId, filePath });
    }

    const roof = Number.isFinite(Number(roof_area_m2)) ? Number(roof_area_m2) : existing.roofAreaM2;
    const usable = Number.isFinite(Number(usable_area_m2)) ? Number(usable_area_m2) : existing.usableAreaM2;
    const panels = Number.isFinite(Number(panel_count)) ? Number(panel_count) : existing.panelCount;

    const prefer = set_prefer_for_proposal === true;

    await prisma.projectRoofLayout.update({
      where: { projectId },
      data: {
        layoutImage3dUrl: layout3dUrl,
        ...(prefer ? { prefer3dForProposal: true } : {}),
        ...(Number.isFinite(Number(roof_area_m2)) ||
        Number.isFinite(Number(usable_area_m2)) ||
        Number.isFinite(Number(panel_count))
          ? {
              roofAreaM2: roof,
              usableAreaM2: usable,
              panelCount: panels,
            }
          : {}),
      },
    });

    return res.json({
      layout_image_3d_url: layout3dUrl,
      prefer_3d_for_proposal: prefer ? true : existing.prefer3dForProposal,
    });
  } catch (err) {
    console.error('Failed to save 3D roof layout image:', err);
    return res.status(500).json({ error: 'Failed to save 3D layout image' });
  }
});

router.post('/set-layout-embed-preference', authenticate, async (req, res) => {
  const { projectId, prefer_3d_for_proposal } = req.body as {
    projectId?: string;
    prefer_3d_for_proposal?: boolean;
  };
  if (!projectId) return res.status(400).json({ error: 'projectId is required' });
  if (typeof prefer_3d_for_proposal !== 'boolean') {
    return res.status(400).json({ error: 'prefer_3d_for_proposal boolean is required' });
  }
  try {
    const access = await ensureProjectWriteAccess(
      projectId,
      req.user!.id,
      req.user!.role as UserRole,
    );
    if (!access.ok) return res.status(access.status).json({ error: 'No access to this project' });

    const existing = await prisma.projectRoofLayout.findUnique({ where: { projectId } });
    if (!existing) return res.status(404).json({ error: 'No roof layout for this project' });

    if (prefer_3d_for_proposal === true && !existing.layoutImage3dUrl) {
      return res.status(400).json({ error: 'No saved 3D layout image for this project yet' });
    }

    await prisma.projectRoofLayout.update({
      where: { projectId },
      data: { prefer3dForProposal: prefer_3d_for_proposal },
    });
    return res.json({ ok: true, prefer_3d_for_proposal });
  } catch (err) {
    console.error('Failed to set roof layout embed preference:', err);
    return res.status(500).json({ error: 'Failed to update preference' });
  }
});

router.get('/manual-layout/:projectId', authenticate, async (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  if (!projectId) return res.status(400).json({ error: 'projectId is required' });
  try {
    const readAccess = await ensureProjectReadAccess(projectId, req.user!.id, req.user!.role as UserRole);
    if (!readAccess.ok) return res.status(readAccess.status).json({ error: 'Access denied' });

    const record = await prisma.projectRoofLayout.findUnique({ where: { projectId } });
    if (record) {
      const urls = await repairAndPersistRoofLayoutUrls(projectId);
      const geom = parseRoofLayoutGeometry(record.geometryJson);

      if (!fs.existsSync(path.join(getGeneratedLayoutsDir(), `${projectId}_satellite.png`))) {
        await ensureSatelliteOnDiskFromCloudinary(projectId);
      }

      return res.json({
        roof_area_m2: record.roofAreaM2,
        usable_area_m2: record.usableAreaM2,
        panel_count: record.panelCount,
        layout_image_url: urls.layoutImageUrl,
        layout_image_3d_url: urls.layoutImage3dUrl ?? undefined,
        satellite_image_url:
          urls.satelliteImageUrl ??
          `/api/generated_layouts/${projectId}_satellite.png`,
        prefer_3d_for_proposal: record.prefer3dForProposal,
        savedAt: record.savedAt.toISOString(),
        projectId: record.projectId,
        source: record.source,
        ...(geom
          ? {
              geometry: geom,
              roof_polygon_coordinates: geom.roofPolygon,
              panel_coordinates: geom.panelRects,
            }
          : {}),
      });
    }

    const generatedLayoutsDir = getGeneratedLayoutsDir();
    const metaPath = path.join(generatedLayoutsDir, `${projectId}_manual_layout.json`);
    if (!fs.existsSync(metaPath)) return res.status(404).json({ error: 'No manual layout saved' });

    const raw = await fs.promises.readFile(metaPath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (useCloudinary && typeof parsed.layout_image_url === 'string') {
      const layoutImageUrl = await ensurePersistentLayoutImageUrl(projectId, parsed.layout_image_url);
      const roof = Number.isFinite(Number(parsed.roof_area_m2)) ? Number(parsed.roof_area_m2) : 0;
      const usable = Number.isFinite(Number(parsed.usable_area_m2)) ? Number(parsed.usable_area_m2) : 0;
      const panels = Number.isFinite(Number(parsed.panel_count)) ? Number(parsed.panel_count) : 0;
      const satelliteImageUrl = await ensurePersistentSatelliteImageUrl(
        projectId,
        typeof parsed.satellite_image_url === 'string' ? parsed.satellite_image_url : null,
      );

      await prisma.projectRoofLayout.upsert({
        where: { projectId },
        create: {
          projectId,
          roofAreaM2: roof,
          usableAreaM2: usable,
          panelCount: panels,
          layoutImageUrl,
          satelliteImageUrl,
          source: 'MANUAL',
        },
        update: {
          roofAreaM2: roof,
          usableAreaM2: usable,
          panelCount: panels,
          layoutImageUrl,
          satelliteImageUrl,
          source: 'MANUAL',
        },
      });

      return res.json({
        roof_area_m2: roof,
        usable_area_m2: usable,
        panel_count: panels,
        layout_image_url: layoutImageUrl,
        ...(satelliteImageUrl ? { satellite_image_url: satelliteImageUrl } : {}),
        savedAt: new Date().toISOString(),
        projectId,
        source: 'MANUAL',
      });
    }

    const geomFromFile = parseRoofLayoutGeometry(parsed.geometry);
    return res.json(manualLayoutJsonResponse(parsed, geomFromFile));
  } catch (err) {
    console.error('Failed to load manual roof layout meta:', err);
    return res.status(500).json({ error: 'Failed to load manual layout' });
  }
});

export default router;
