export type Point2 = { x: number; y: number };

export type PolygonEdgeInfo = {
  index: number;
  lengthM: number;
  mid: Point2;
};

/** Edge lengths in metres for a closed polygon (image pixel coordinates). */
export function polygonEdgesM(
  polygon: Point2[],
  metersPerPixel: number,
): PolygonEdgeInfo[] {
  if (polygon.length < 2) return [];
  const out: PolygonEdgeInfo[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const lenPx = Math.hypot(b.x - a.x, b.y - a.y);
    out.push({
      index: i,
      lengthM: lenPx * metersPerPixel,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    });
  }
  return out;
}

/** Closest edge to a pointer in stage space; returns null if farther than maxDistancePx. */
export function closestPolygonEdge(
  polygon: Point2[],
  metersPerPixel: number,
  pointer: Point2,
  maxDistancePx = 18,
): PolygonEdgeInfo | null {
  if (polygon.length < 2) return null;
  let best: PolygonEdgeInfo | null = null;
  let bestDist = Infinity;

  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const dist = pointToSegmentDistance(pointer, a, b);
    if (dist < bestDist) {
      bestDist = dist;
      const lenPx = Math.hypot(b.x - a.x, b.y - a.y);
      best = {
        index: i,
        lengthM: lenPx * metersPerPixel,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    }
  }
  return bestDist <= maxDistancePx ? best : null;
}

function pointToSegmentDistance(p: Point2, a: Point2, b: Point2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const qx = a.x + t * dx;
  const qy = a.y + t * dy;
  return Math.hypot(p.x - qx, p.y - qy);
}
