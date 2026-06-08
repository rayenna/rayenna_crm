import type { RoofLayoutPoint } from './roofLayoutTypes';

export type SnapVertexOptions = {
  /** Pixel distance within which a snap candidate wins (image space). */
  snapThresholdPx?: number;
  /** When false, only 90° (orthogonal) snaps apply. */
  enableParallel?: boolean;
};

const DEFAULT_THRESHOLD_PX = 12;

function dist(a: RoofLayoutPoint, b: RoofLayoutPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function unitVector(from: RoofLayoutPoint, to: RoofLayoutPoint): RoofLayoutPoint | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  return { x: dx / len, y: dy / len };
}

function perpendicularDistanceToLine(
  point: RoofLayoutPoint,
  lineOrigin: RoofLayoutPoint,
  lineDir: RoofLayoutPoint,
): number {
  const vx = point.x - lineOrigin.x;
  const vy = point.y - lineOrigin.y;
  return Math.abs(vx * lineDir.y - vy * lineDir.x);
}

function projectOntoLine(
  point: RoofLayoutPoint,
  lineOrigin: RoofLayoutPoint,
  lineDir: RoofLayoutPoint,
): RoofLayoutPoint {
  const vx = point.x - lineOrigin.x;
  const vy = point.y - lineOrigin.y;
  const t = vx * lineDir.x + vy * lineDir.y;
  return { x: lineOrigin.x + lineDir.x * t, y: lineOrigin.y + lineDir.y * t };
}

function isAdjacentEdge(
  vertexIndex: number,
  edgeStart: number,
  vertexCount: number,
): boolean {
  const edgeEnd = (edgeStart + 1) % vertexCount;
  return edgeStart === vertexIndex || edgeEnd === vertexIndex;
}

/**
 * Snap a dragged polygon vertex to nearby 90° (axis-aligned) or parallel-edge guides.
 * Pure function — safe to call on every drag move.
 */
export function snapPolygonVertex(
  polygon: RoofLayoutPoint[],
  vertexIndex: number,
  rawX: number,
  rawY: number,
  options: SnapVertexOptions = {},
): RoofLayoutPoint {
  const threshold = options.snapThresholdPx ?? DEFAULT_THRESHOLD_PX;
  const enableParallel = options.enableParallel !== false;
  const raw: RoofLayoutPoint = { x: rawX, y: rawY };

  const n = polygon.length;
  if (n < 3 || vertexIndex < 0 || vertexIndex >= n) return raw;

  const prev = polygon[(vertexIndex - 1 + n) % n]!;
  const next = polygon[(vertexIndex + 1) % n]!;

  const candidates: RoofLayoutPoint[] = [];

  // 90° — align with previous or next vertex on horizontal / vertical axes.
  candidates.push({ x: raw.x, y: prev.y });
  candidates.push({ x: prev.x, y: raw.y });
  candidates.push({ x: raw.x, y: next.y });
  candidates.push({ x: next.x, y: raw.y });
  // 90° corner — intersection of axis lines through neighbors.
  candidates.push({ x: prev.x, y: next.y });
  candidates.push({ x: next.x, y: prev.y });

  if (enableParallel) {
    for (let i = 0; i < n; i++) {
      if (isAdjacentEdge(vertexIndex, i, n)) continue;
      const a = polygon[i]!;
      const b = polygon[(i + 1) % n]!;
      const dir = unitVector(a, b);
      if (!dir) continue;
      const projected = projectOntoLine(raw, prev, dir);
      if (perpendicularDistanceToLine(raw, prev, dir) <= threshold) {
        candidates.push(projected);
      }
      // Anti-parallel is the same line; no separate case needed.
    }
  }

  let best: RoofLayoutPoint | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = dist(c, raw);
    if (d <= threshold && d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best ?? raw;
}
