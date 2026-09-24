import { describe, expect, it } from 'vitest';
import {
  polygonCentroid,
  rotatePointsAround,
  snapRotationToRightAngle,
} from './rotateRoofLayoutPoints';

describe('rotateRoofLayoutPoints', () => {
  it('computes centroid', () => {
    expect(polygonCentroid([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ])).toEqual({ x: 1, y: 1 });
  });

  it('rotates 90° CCW around center', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ];
    const next = rotatePointsAround(pts, { x: 1, y: 1 }, Math.PI / 2);
    // (0,0) → (2,0); (2,0) → (2,2); (2,2) → (0,2); (0,2) → (0,0)
    expect(next[0]!.x).toBeCloseTo(2, 5);
    expect(next[0]!.y).toBeCloseTo(0, 5);
    expect(next[1]!.x).toBeCloseTo(2, 5);
    expect(next[1]!.y).toBeCloseTo(2, 5);
  });

  it('snaps near-right angles', () => {
    expect(snapRotationToRightAngle(Math.PI / 2 - 0.05)).toBeCloseTo(Math.PI / 2, 5);
    expect(snapRotationToRightAngle(0.5)).toBeCloseTo(0.5, 5);
  });
});
