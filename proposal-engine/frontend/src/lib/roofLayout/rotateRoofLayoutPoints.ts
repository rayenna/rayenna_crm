import type { RoofLayoutPoint } from './roofLayoutTypes';

/** Centroid of a polygon in image pixel space (simple average of vertices). */
export function polygonCentroid(points: RoofLayoutPoint[]): RoofLayoutPoint {
  if (!points.length) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / points.length, y: sy / points.length };
}

/** Axis-aligned bounding-box center (preferred pivot for rectangular roof outlines). */
export function polygonAabbCenter(points: RoofLayoutPoint[]): RoofLayoutPoint {
  if (!points.length) return { x: 0, y: 0 };
  let minX = points[0]!.x;
  let maxX = points[0]!.x;
  let minY = points[0]!.y;
  let maxY = points[0]!.y;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

export function polygonAabbSize(points: RoofLayoutPoint[]): { w: number; h: number } {
  if (!points.length) return { w: 0, h: 0 };
  let minX = points[0]!.x;
  let maxX = points[0]!.x;
  let minY = points[0]!.y;
  let maxY = points[0]!.y;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { w: maxX - minX, h: maxY - minY };
}

/**
 * Rotate points CCW around a pivot in image / Y-down pixel space.
 * (Same convention as Konva / satellite image coordinates.)
 */
export function rotatePointsAround(
  points: RoofLayoutPoint[],
  pivot: RoofLayoutPoint,
  angleRad: number,
): RoofLayoutPoint[] {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return points.map((p) => {
    const dx = p.x - pivot.x;
    const dy = p.y - pivot.y;
    return {
      x: pivot.x + dx * c - dy * s,
      y: pivot.y + dx * s + dy * c,
    };
  });
}

/** Snap to nearest 90° when within `thresholdRad` (default ~15°). */
export function snapRotationToRightAngle(angleRad: number, thresholdRad = Math.PI / 12): number {
  const quarter = Math.PI / 2;
  const nearest = Math.round(angleRad / quarter) * quarter;
  return Math.abs(angleRad - nearest) <= thresholdRad ? nearest : angleRad;
}

/**
 * Apply N quarter-turns (CCW if positive) around the AABB center.
 * Used by mobile/desktop "Rotate 90°" controls.
 */
export function rotatePolygonQuarterTurns(
  points: RoofLayoutPoint[],
  quarters: number,
): RoofLayoutPoint[] {
  if (!points.length || !Number.isFinite(quarters) || quarters === 0) {
    return points.map((p) => ({ ...p }));
  }
  const angleRad = (quarters * Math.PI) / 2;
  const pivot = polygonAabbCenter(points);
  return rotatePointsAround(points, pivot, angleRad).map((p) => ({
    x: Math.round(p.x * 100) / 100,
    y: Math.round(p.y * 100) / 100,
  }));
}

/**
 * Axis-aligned panel packing makes a pure outline rotate look like a no-op when the
 * roof AABB is nearly square (seed aspect is ~1.12). Flipping module orientation makes
 * the 90° button change visibly match "turn the panels".
 */
export function shouldFlipOrientationOnQuarterTurn(points: RoofLayoutPoint[]): boolean {
  const { w, h } = polygonAabbSize(points);
  const short = Math.min(w, h);
  const long = Math.max(w, h);
  if (short < 1) return true;
  return long / short < 1.35;
}
