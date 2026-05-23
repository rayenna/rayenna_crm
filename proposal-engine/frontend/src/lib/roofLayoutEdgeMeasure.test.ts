import { describe, expect, it } from 'vitest';
import { edgeLengthLabelPosition, polygonEdgesM } from './roofLayoutEdgeMeasure';

describe('edgeLengthLabelPosition', () => {
  it('offsets label away from polygon centroid', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const edge = polygonEdgesM(square, 0.1)[0]!;
    const pos = edgeLengthLabelPosition(square, edge, 20);
    const cx = 50;
    const cy = 50;
    const distFromCentroid = Math.hypot(pos.x - cx, pos.y - cy);
    const midDist = Math.hypot(edge.mid.x - cx, edge.mid.y - cy);
    expect(distFromCentroid).toBeGreaterThan(midDist);
  });
});
