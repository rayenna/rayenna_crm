import { describe, expect, it } from 'vitest';
import { snapPolygonVertex } from './polygonVertexSnap';

describe('snapPolygonVertex', () => {
  const square = [
    { x: 100, y: 100 },
    { x: 400, y: 100 },
    { x: 400, y: 400 },
    { x: 100, y: 400 },
  ];

  it('returns raw point when no snap is within threshold', () => {
    const snapped = snapPolygonVertex(square, 1, 250, 180, { snapThresholdPx: 5 });
    expect(snapped).toEqual({ x: 250, y: 180 });
  });

  it('snaps to horizontal alignment with previous vertex (90°)', () => {
    const snapped = snapPolygonVertex(square, 1, 250, 108, { snapThresholdPx: 12 });
    expect(snapped.x).toBe(250);
    expect(snapped.y).toBe(100);
  });

  it('snaps to vertical alignment with previous vertex (90°)', () => {
    const snapped = snapPolygonVertex(square, 1, 405, 250, { snapThresholdPx: 12 });
    expect(snapped.x).toBe(400);
    expect(snapped.y).toBe(250);
  });

  it('snaps to a parallel edge direction through the previous vertex', () => {
    const trapezoid = [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 180, y: 100 },
      { x: 20, y: 100 },
    ];
    // Drag top-right corner; bottom edge is horizontal — snap drag to horizontal through prev.
    const snapped = snapPolygonVertex(trapezoid, 1, 210, 8, { snapThresholdPx: 15 });
    expect(snapped.y).toBe(0);
  });
});
