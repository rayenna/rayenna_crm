import type { RefObject } from 'react';
import type { RoofLayoutCaptureRefs, RoofLayoutPanelRect, RoofLayoutPoint } from './roofLayoutTypes';

export function computeProposalExportCrop(
  poly: RoofLayoutPoint[],
  panelRects: RoofLayoutPanelRect[],
  imgSize: { width: number; height: number },
): { x: number; y: number; width: number; height: number } | undefined {
  if (!poly || poly.length < 3) return undefined;

  let bbMinX = Infinity,
    bbMaxX = -Infinity,
    bbMinY = Infinity,
    bbMaxY = -Infinity;
  if (panelRects.length) {
    for (const r of panelRects) {
      bbMinX = Math.min(bbMinX, r.x);
      bbMaxX = Math.max(bbMaxX, r.x + r.w);
      bbMinY = Math.min(bbMinY, r.y);
      bbMaxY = Math.max(bbMaxY, r.y + r.h);
    }
  } else {
    for (const p of poly) {
      bbMinX = Math.min(bbMinX, p.x);
      bbMaxX = Math.max(bbMaxX, p.x);
      bbMinY = Math.min(bbMinY, p.y);
      bbMaxY = Math.max(bbMaxY, p.y);
    }
  }
  if (!Number.isFinite(bbMinX)) return undefined;

  const bbW0 = Math.max(1, bbMaxX - bbMinX);
  const bbH0 = Math.max(1, bbMaxY - bbMinY);

  const padFrac = 0.2;
  let cropW = bbW0 * (1 + 2 * padFrac);
  let cropH = bbH0 * (1 + 2 * padFrac);

  const minFrac = 0.4;
  cropW = Math.max(cropW, imgSize.width * minFrac);
  cropH = Math.max(cropH, imgSize.height * minFrac);

  const maxFrac = 0.62;
  cropW = Math.min(imgSize.width * maxFrac, cropW);
  cropH = Math.min(imgSize.height * maxFrac, cropH);

  cropW = Math.min(imgSize.width, cropW);
  cropH = Math.min(imgSize.height, cropH);

  const focalX = panelRects.length
    ? (bbMinX + bbMaxX) / 2
    : poly.reduce((s, p) => s + p.x, 0) / poly.length;
  const focalY = panelRects.length
    ? (bbMinY + bbMaxY) / 2
    : poly.reduce((s, p) => s + p.y, 0) / poly.length;

  let x = focalX - cropW / 2;
  let y = focalY - cropH / 2;
  x = Math.max(0, Math.min(x, imgSize.width - cropW));
  y = Math.max(0, Math.min(y, imgSize.height - cropH));

  if (cropW < 20 || cropH < 20) return undefined;
  return { x, y, width: cropW, height: cropH };
}

export async function waitForKonvaStageReady(
  stageRef: RefObject<{ batchDraw?: () => void } | null>,
  timeoutMs = 900,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (stageRef.current) {
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      try {
        stageRef.current.batchDraw?.();
      } catch {
        /* ignore */
      }
      return true;
    }
    await new Promise((r) => setTimeout(r, 20));
  }
  return false;
}

export async function captureLayoutImage(
  refs: RoofLayoutCaptureRefs,
  options?: {
    format?: 'png' | 'jpeg';
    quality?: number;
    pixelRatio?: number;
    crop?: { x: number; y: number; width: number; height: number };
  },
): Promise<string | null> {
  if (!refs.stageRef.current) return null;
  const format = options?.format ?? 'png';
  const pixelRatio = options?.pixelRatio ?? 2;
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const quality = format === 'jpeg' ? (options?.quality ?? 0.82) : undefined;

  const handlesLayer = refs.handlesLayerRef.current;
  const polygonOutlineLayer = refs.polygonOutlineLayerRef.current;
  const polygonDragLayer = refs.polygonDragLayerRef.current;
  const keepoutLayer = refs.keepoutLayerRef.current;
  if (handlesLayer) handlesLayer.visible(false);
  if (polygonOutlineLayer) polygonOutlineLayer.visible(false);
  if (polygonDragLayer) polygonDragLayer.visible(false);
  if (keepoutLayer) keepoutLayer.visible(false);
  refs.stageRef.current.batchDraw?.();
  const dataUrl = refs.stageRef.current.toDataURL({
    pixelRatio,
    mimeType: mime,
    quality,
    ...(options?.crop ?? {}),
  });
  if (handlesLayer) handlesLayer.visible(true);
  if (polygonOutlineLayer) polygonOutlineLayer.visible(true);
  if (polygonDragLayer) polygonDragLayer.visible(true);
  if (keepoutLayer) keepoutLayer.visible(true);
  refs.stageRef.current.batchDraw?.();
  return dataUrl;
}
