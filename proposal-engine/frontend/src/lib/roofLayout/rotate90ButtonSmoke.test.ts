import { describe, expect, it } from 'vitest';
import { computePanelsForPolygon } from './computePanelsForPolygon';
import {
  rotatePolygonQuarterTurns,
  shouldFlipOrientationOnQuarterTurn,
} from './rotateRoofLayoutPoints';
import { orientModuleDimensions } from './resolveModuleDimensions';

/**
 * Smoke for mobile "Rotate 90°" buttons: outline rotate alone is nearly invisible on
 * seed-like near-square roofs; the button path must flip module orientation too.
 */
describe('Rotate 90° button path', () => {
  const nearSquare = [
    { x: 100, y: 100 },
    { x: 212, y: 100 },
    { x: 212, y: 200 },
    { x: 100, y: 200 },
  ]; // aspect 1.12 — matches seed polygon aspect

  const longRect = [
    { x: 50, y: 100 },
    { x: 450, y: 100 },
    { x: 450, y: 180 },
    { x: 50, y: 180 },
  ];

  it('flags near-square roofs for orientation flip', () => {
    expect(shouldFlipOrientationOnQuarterTurn(nearSquare)).toBe(true);
    expect(shouldFlipOrientationOnQuarterTurn(longRect)).toBe(false);
  });

  it('quarter-turn swaps AABB width/height on a rectangle', () => {
    const next = rotatePolygonQuarterTurns(longRect, 1);
    const xs = next.map((p) => p.x);
    const ys = next.map((p) => p.y);
    const w1 = Math.max(...xs) - Math.min(...xs);
    const h1 = Math.max(...ys) - Math.min(...ys);
    expect(w1).toBeCloseTo(80, 0);
    expect(h1).toBeCloseTo(400, 0);
  });

  it('button path: rotate + flip orientation changes panel aspect vs outline-only', () => {
    const nextPoly = rotatePolygonQuarterTurns(nearSquare, 1);
    const modulePortrait = orientModuleDimensions(
      { portraitWidthM: 1.1, portraitHeightM: 2.2 },
      'portrait',
    );
    const moduleLandscape = orientModuleDimensions(
      { portraitWidthM: 1.1, portraitHeightM: 2.2 },
      'landscape',
    );

    const outlineOnly = computePanelsForPolygon(nextPoly, {
      panelOrientation: 'portrait',
      panelSpacingMultiplier: 1.4,
      panelWatts: 540,
      moduleSizeM: modulePortrait,
      maxPanelsCap: 150,
      targetKw: 5,
    });
    const buttonPath = computePanelsForPolygon(nextPoly, {
      panelOrientation: 'landscape',
      panelSpacingMultiplier: 1.4,
      panelWatts: 540,
      moduleSizeM: moduleLandscape,
      maxPanelsCap: 150,
      targetKw: 5,
    });

    expect(outlineOnly.panels.length).toBeGreaterThan(0);
    expect(buttonPath.panels.length).toBeGreaterThan(0);

    const ratio = (p: { w: number; h: number }) => p.w / Math.max(p.h, 1e-6);
    expect(ratio(outlineOnly.panels[0]!)).not.toBeCloseTo(ratio(buttonPath.panels[0]!), 2);
  });
});
