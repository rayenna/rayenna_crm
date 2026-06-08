import { rectsOverlap } from './roofLayoutPageUtils';
import type { RoofLayoutKeepout, RoofLayoutPanelRect } from './roofLayoutTypes';
import { isKeepoutCircle } from './roofLayoutTypes';

/** Panel rect overlaps a keepout (rectangle or circle). */
export function panelOverlapsKeepout(panel: RoofLayoutPanelRect, keepout: RoofLayoutKeepout): boolean {
  if (isKeepoutCircle(keepout)) {
    return rectOverlapsCircle(panel, keepout.cx, keepout.cy, keepout.r);
  }
  return rectsOverlap(panel, keepout);
}

function rectOverlapsCircle(
  rect: { x: number; y: number; w: number; h: number },
  cx: number,
  cy: number,
  r: number,
): boolean {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= r * r;
}

/** Serialize a keepout for v2 geometry JSON (server / cross-device). */
export function keepoutToGeometryJson(keepout: RoofLayoutKeepout): Record<string, unknown> {
  if (isKeepoutCircle(keepout)) {
    return {
      id: keepout.id,
      shape: 'circle',
      cx: keepout.cx,
      cy: keepout.cy,
      radius: keepout.r,
    };
  }
  return {
    id: keepout.id,
    shape: 'rect',
    x: keepout.x,
    y: keepout.y,
    width: keepout.w,
    height: keepout.h,
  };
}

/** Parse one keepout from saved geometry JSON (rect legacy or circle). */
export function keepoutFromGeometryJson(raw: unknown): RoofLayoutKeepout | null {
  if (!raw || typeof raw !== 'object') return null;
  const k = raw as Record<string, unknown>;
  const id = String(k.id ?? crypto.randomUUID());

  if (k.shape === 'circle') {
    const cx = Number(k.cx);
    const cy = Number(k.cy);
    const r = Number(k.radius ?? k.r);
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r) || r <= 0) return null;
    return { id, shape: 'circle', cx, cy, r };
  }

  const x = Number(k.x);
  const y = Number(k.y);
  const w = Number(k.width ?? k.w);
  const h = Number(k.height ?? k.h);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) {
    return null;
  }
  if (w <= 0 || h <= 0) return null;
  return { id, shape: 'rect', x, y, w, h };
}
