import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import prisma from '../prisma';

export const ROOF_LAYOUT_CLOUD_FOLDER = 'rayenna_crm';

export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export function configureCloudinaryIfNeeded(): void {
  if (!isCloudinaryConfigured()) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export function getGeneratedLayoutsDir(): string {
  return path.join(process.cwd(), 'generated_layouts');
}

export function layoutPublicId(projectId: string): string {
  return `${ROOF_LAYOUT_CLOUD_FOLDER}/roof-layout-${projectId}`;
}

export function layout3dPublicId(projectId: string): string {
  return `${ROOF_LAYOUT_CLOUD_FOLDER}/roof-layout-3d-${projectId}`;
}

export function satellitePublicId(projectId: string): string {
  return `${ROOF_LAYOUT_CLOUD_FOLDER}/roof-satellite-${projectId}`;
}

export function isEphemeralGeneratedLayoutsUrl(url: string): boolean {
  const s = String(url || '').trim();
  return s.startsWith('/generated_layouts/') || s.startsWith('/api/generated_layouts/');
}

async function cloudinaryResourceExists(publicId: string): Promise<boolean> {
  try {
    await cloudinary.api.resource(publicId, { resource_type: 'image', type: 'upload' });
    return true;
  } catch {
    return false;
  }
}

function secureUrlForPublicId(publicId: string): string {
  return cloudinary.url(publicId, { secure: true, resource_type: 'image' });
}

export async function uploadRoofLayoutFileToCloudinary(opts: {
  projectId: string;
  filePath: string;
}): Promise<string> {
  const uploadResult = await cloudinary.uploader.upload(opts.filePath, {
    folder: ROOF_LAYOUT_CLOUD_FOLDER,
    public_id: `roof-layout-${opts.projectId}`,
    resource_type: 'image',
    overwrite: true,
  });
  return uploadResult.secure_url;
}

export async function uploadRoofLayoutDataUrlToCloudinary(opts: {
  projectId: string;
  dataUrl: string;
}): Promise<string> {
  const uploadResult = await cloudinary.uploader.upload(opts.dataUrl, {
    folder: ROOF_LAYOUT_CLOUD_FOLDER,
    public_id: `roof-layout-${opts.projectId}`,
    resource_type: 'image',
    overwrite: true,
  });
  return uploadResult.secure_url;
}

export async function uploadRoofLayout3dFileToCloudinary(opts: {
  projectId: string;
  filePath: string;
}): Promise<string> {
  const uploadResult = await cloudinary.uploader.upload(opts.filePath, {
    folder: ROOF_LAYOUT_CLOUD_FOLDER,
    public_id: `roof-layout-3d-${opts.projectId}`,
    resource_type: 'image',
    overwrite: true,
  });
  return uploadResult.secure_url;
}

export async function uploadSatelliteFileToCloudinary(opts: {
  projectId: string;
  filePath: string;
}): Promise<string> {
  const uploadResult = await cloudinary.uploader.upload(opts.filePath, {
    folder: ROOF_LAYOUT_CLOUD_FOLDER,
    public_id: `roof-satellite-${opts.projectId}`,
    resource_type: 'image',
    overwrite: true,
  });
  return uploadResult.secure_url;
}

/** Prefer Cloudinary; upload local file when present; else resolve existing Cloudinary asset. */
export async function ensurePersistentLayout3dImageUrl(
  projectId: string,
  layoutImageUrl: string,
): Promise<string> {
  const trimmed = String(layoutImageUrl || '').trim();
  if (!trimmed) return trimmed;
  if (!isEphemeralGeneratedLayoutsUrl(trimmed) && trimmed.startsWith('http')) return trimmed;
  if (!isCloudinaryConfigured()) return trimmed;

  configureCloudinaryIfNeeded();
  const dir = getGeneratedLayoutsDir();
  const candidates = [
    path.join(dir, `${projectId}_3d_layout.png`),
    path.join(dir, `${projectId}_3d_layout.jpg`),
  ];
  for (const fp of candidates) {
    if (fs.existsSync(fp)) {
      return uploadRoofLayout3dFileToCloudinary({ projectId, filePath: fp });
    }
  }

  const pid = layout3dPublicId(projectId);
  if (await cloudinaryResourceExists(pid)) {
    return secureUrlForPublicId(pid);
  }
  return trimmed;
}

export async function ensurePersistentLayoutImageUrl(
  projectId: string,
  layoutImageUrl: string,
): Promise<string> {
  const trimmed = String(layoutImageUrl || '').trim();
  if (!trimmed) return trimmed;
  if (!isEphemeralGeneratedLayoutsUrl(trimmed) && trimmed.startsWith('http')) return trimmed;
  if (!isCloudinaryConfigured()) return trimmed;

  configureCloudinaryIfNeeded();
  const dir = getGeneratedLayoutsDir();
  const candidates = [
    path.join(dir, `${projectId}_manual_layout.jpg`),
    path.join(dir, `${projectId}_manual_layout.png`),
    path.join(dir, `${projectId}_manual_layout.jpeg`),
    path.join(dir, `${projectId}_ai_layout.png`),
  ];
  for (const fp of candidates) {
    if (fs.existsSync(fp)) {
      return uploadRoofLayoutFileToCloudinary({ projectId, filePath: fp });
    }
  }

  const pid = layoutPublicId(projectId);
  if (await cloudinaryResourceExists(pid)) {
    return secureUrlForPublicId(pid);
  }
  return trimmed;
}

export async function ensurePersistentSatelliteImageUrl(
  projectId: string,
  satelliteImageUrl: string | null | undefined,
): Promise<string | null> {
  const trimmed = satelliteImageUrl != null ? String(satelliteImageUrl).trim() : '';
  if (trimmed && !isEphemeralGeneratedLayoutsUrl(trimmed) && trimmed.startsWith('http')) {
    return trimmed;
  }
  if (!isCloudinaryConfigured()) {
    return trimmed || null;
  }

  configureCloudinaryIfNeeded();
  const localPath = path.join(getGeneratedLayoutsDir(), `${projectId}_satellite.png`);
  if (fs.existsSync(localPath)) {
    return uploadSatelliteFileToCloudinary({ projectId, filePath: localPath });
  }

  const pid = satellitePublicId(projectId);
  if (await cloudinaryResourceExists(pid)) {
    return secureUrlForPublicId(pid);
  }

  return trimmed || null;
}

/** Repair ephemeral `/api/generated_layouts/...` URLs to Cloudinary and persist on the DB row. */
export async function repairAndPersistRoofLayoutUrls(projectId: string): Promise<{
  layoutImageUrl: string;
  layoutImage3dUrl: string | null;
  satelliteImageUrl: string | null;
  repaired: boolean;
}> {
  const record = await prisma.projectRoofLayout.findUnique({ where: { projectId } });
  if (!record) {
    return { layoutImageUrl: '', layoutImage3dUrl: null, satelliteImageUrl: null, repaired: false };
  }

  const layoutImageUrl = await ensurePersistentLayoutImageUrl(projectId, record.layoutImageUrl);
  let layoutImage3dUrl = record.layoutImage3dUrl;
  if (layoutImage3dUrl && isEphemeralGeneratedLayoutsUrl(layoutImage3dUrl)) {
    layoutImage3dUrl = await ensurePersistentLayout3dImageUrl(projectId, layoutImage3dUrl);
  }

  const satelliteImageUrl = await ensurePersistentSatelliteImageUrl(
    projectId,
    record.satelliteImageUrl ?? `/api/generated_layouts/${projectId}_satellite.png`,
  );

  const repaired =
    layoutImageUrl !== record.layoutImageUrl ||
    layoutImage3dUrl !== record.layoutImage3dUrl ||
    satelliteImageUrl !== record.satelliteImageUrl;

  if (repaired) {
    await prisma.projectRoofLayout.update({
      where: { projectId },
      data: {
        layoutImageUrl,
        layoutImage3dUrl,
        satelliteImageUrl,
      },
    });
  }

  return { layoutImageUrl, layoutImage3dUrl, satelliteImageUrl, repaired };
}

const LOCAL_ROOF_LAYOUT_SUFFIXES = [
  '_satellite.png',
  '_ai_layout.png',
  '_manual_layout.json',
  '_manual_layout.jpg',
  '_manual_layout.png',
  '_manual_layout.jpeg',
  '_3d_layout.png',
  '_3d_layout.jpg',
] as const;

/** Remove on-disk (and Cloudinary, when configured) roof layout assets for a CRM project. */
export async function deleteProjectRoofLayoutArtifacts(projectId: string): Promise<void> {
  const pid = String(projectId || '').trim();
  if (!pid) return;

  const dir = getGeneratedLayoutsDir();
  await Promise.all(
    LOCAL_ROOF_LAYOUT_SUFFIXES.map((suffix) =>
      fs.promises.unlink(path.join(dir, `${pid}${suffix}`)).catch(() => undefined),
    ),
  );

  if (!isCloudinaryConfigured()) return;

  configureCloudinaryIfNeeded();
  const publicIds = [layoutPublicId(pid), layout3dPublicId(pid), satellitePublicId(pid)];
  await Promise.all(
    publicIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true }).catch(() => undefined),
    ),
  );
}

export async function ensureSatelliteOnDiskFromCloudinary(projectId: string): Promise<string | null> {
  if (!isCloudinaryConfigured()) return null;
  configureCloudinaryIfNeeded();
  const pid = satellitePublicId(projectId);
  if (!(await cloudinaryResourceExists(pid))) return null;

  const dir = getGeneratedLayoutsDir();
  await fs.promises.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${projectId}_satellite.png`);
  const url = secureUrlForPublicId(pid);
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(filePath, buf);
  return filePath;
}
