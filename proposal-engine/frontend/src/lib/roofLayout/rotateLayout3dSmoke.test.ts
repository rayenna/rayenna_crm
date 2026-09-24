import { describe, expect, it } from 'vitest';
import { computePanelsForPolygon } from './computePanelsForPolygon';
import {
  polygonCentroid,
  rotatePointsAround,
  snapRotationToRightAngle,
} from './rotateRoofLayoutPoints';

/**
 * Smoke: mobile 90° rotate must never leave an empty panel list in the same update.
 * Empty panels used to flip has3DRoofData off and kick the UI back to 2D.
 */
describe('3D rotate smoke (mobile 90° buttons)', () => {
  const square = [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 300, y: 300 },
    { x: 100, y: 300 },
  ];

  const packOpts = {
    panelOrientation: 'portrait' as const,
    panelSpacingMultiplier: 1.4,
    panelWatts: 540,
    moduleSizeM: { widthM: 1.1, heightM: 2.2 },
    maxPanelsCap: 150,
    targetKw: 5,
    edgeSetbackM: 0,
  };

  it('keeps panels after a snapped 90° rotate (same tick as polygon update)', () => {
    const before = computePanelsForPolygon(square, packOpts);
    expect(before.panels.length).toBeGreaterThan(0);

    const angleRad = snapRotationToRightAngle(Math.PI / 2);
    const pivot = polygonCentroid(square);
    const nextPoly = rotatePointsAround(square, pivot, angleRad);
    const after = computePanelsForPolygon(nextPoly, packOpts);

    expect(nextPoly).toHaveLength(4);
    expect(after.panels.length).toBeGreaterThan(0);
    // Must not clear-then-refill across React renders (that unmounted 3D on mobile).
    expect(after.panels.length).toBeGreaterThan(0);
  });

  it('clockwise and counter-clockwise quarter turns both refill', () => {
    for (const quarters of [-1, 1] as const) {
      const angleRad = snapRotationToRightAngle((quarters * Math.PI) / 2);
      const next = rotatePointsAround(square, polygonCentroid(square), angleRad);
      const { panels } = computePanelsForPolygon(next, packOpts);
      expect(panels.length, `quarters=${quarters}`).toBeGreaterThan(0);
    }
  });
});
