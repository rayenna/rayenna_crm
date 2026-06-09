import type { RoofLayoutPoint } from './roofLayoutTypes';

function polygonCentroid(poly: RoofLayoutPoint[]): RoofLayoutPoint {
  let sx = 0;
  let sy = 0;
  for (const p of poly) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / poly.length, y: sy / poly.length };
}

function polygonAreaAbs(poly: RoofLayoutPoint[]): number {
  if (poly.length < 3) return 0;
  let twice = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    twice += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twice) / 2;
}

function inwardNormalTowardCentroid(
  a: RoofLayoutPoint,
  b: RoofLayoutPoint,
  centroid: RoofLayoutPoint,
): { nx: number; ny: number } | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;

  const n1x = -dy / len;
  const n1y = dx / len;
  const n2x = dy / len;
  const n2y = -dx / len;
  const midx = (a.x + b.x) / 2;
  const midy = (a.y + b.y) / 2;
  const toCx = centroid.x - midx;
  const toCy = centroid.y - midy;
  const dot1 = n1x * toCx + n1y * toCy;
  return dot1 >= 0 ? { nx: n1x, ny: n1y } : { nx: n2x, ny: n2y };
}

function intersectOffsetLines(
  l1: { nx: number; ny: number; c: number },
  l2: { nx: number; ny: number; c: number },
): RoofLayoutPoint | null {
  const det = l1.nx * l2.ny - l2.nx * l1.ny;
  if (Math.abs(det) < 1e-9) return null;
  const x = (l1.c * l2.ny - l2.c * l1.ny) / det;
  const y = (l1.nx * l2.c - l2.nx * l1.c) / det;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function isReasonableInset(original: RoofLayoutPoint[], inset: RoofLayoutPoint[]): boolean {
  const origArea = polygonAreaAbs(original);
  const insetArea = polygonAreaAbs(inset);
  if (origArea <= 0 || insetArea <= 0) return false;
  if (insetArea < origArea * 0.05) return false;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of original) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const slack = Math.max(maxX - minX, maxY - minY) * 0.05;
  return inset.every(
    (p) =>
      p.x >= minX - slack &&
      p.x <= maxX + slack &&
      p.y >= minY - slack &&
      p.y <= maxY + slack,
  );
}

/**
 * Inset a simple polygon inward by a uniform edge distance (pixels).
 * Uses centroid-directed edge normals. Returns null if inset collapses
 * (setback too large or irregular outline).
 */
export function insetPolygonByDistance(
  poly: RoofLayoutPoint[],
  insetPx: number,
): RoofLayoutPoint[] | null {
  if (!poly.length) return [];
  if (insetPx <= 0) return poly.map((p) => ({ x: p.x, y: p.y }));

  const n = poly.length;
  if (n < 3) return null;

  const centroid = polygonCentroid(poly);
  type OffsetLine = { nx: number; ny: number; c: number };
  const lines: OffsetLine[] = [];

  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    const normal = inwardNormalTowardCentroid(a, b, centroid);
    if (!normal) return null;
    const ox = a.x + normal.nx * insetPx;
    const oy = a.y + normal.ny * insetPx;
    lines.push({ nx: normal.nx, ny: normal.ny, c: normal.nx * ox + normal.ny * oy });
  }

  const out: RoofLayoutPoint[] = [];
  for (let i = 0; i < n; i++) {
    const pt = intersectOffsetLines(lines[(i + n - 1) % n]!, lines[i]!);
    if (!pt) return null;
    out.push(pt);
  }

  if (!isReasonableInset(poly, out)) return null;
  return out;
}

export function setbackMetersToPixels(setbackM: number, metersPerPixel: number): number {
  if (!Number.isFinite(setbackM) || setbackM <= 0) return 0;
  if (!Number.isFinite(metersPerPixel) || metersPerPixel <= 0) return 0;
  return setbackM / metersPerPixel;
}
