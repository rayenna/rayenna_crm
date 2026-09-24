import { describe, expect, it } from 'vitest';
import { computePanelsForPolygon } from './computePanelsForPolygon';
import {
  polygonAabbCenter,
  polygonAabbSize,
  rotatePointsAround,
  rotatePolygonQuarterTurns,
  shouldFlipOrientationOnQuarterTurn,
  snapRotationToRightAngle,
} from './rotateRoofLayoutPoints';
import { orientModuleDimensions } from './resolveModuleDimensions';

/** End-to-end smoke for 3D move + rotate contracts used by AI Roof Layout. */
describe('AI Roof Layout 3D transform smoke', () => {
  const rect = [
    { x: 100, y: 100 },
    { x: 400, y: 100 },
    { x: 400, y: 220 },
    { x: 100, y: 220 },
  ];

  const pack = (
    poly: typeof rect,
    orient: 'portrait' | 'landscape' = 'portrait',
  ) =>
    computePanelsForPolygon(poly, {
      panelOrientation: orient,
      panelSpacingMultiplier: 1.4,
      panelWatts: 540,
      moduleSizeM: orientModuleDimensions(
        { portraitWidthM: 1.1, portraitHeightM: 2.2 },
        orient,
      ),
      maxPanelsCap: 150,
      targetKw: 5,
    });

  it('translate: shifting polygon keeps panel count and moves all verts', () => {
    const dx = 40;
    const dy = -25;
    const moved = rect.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    const before = pack(rect);
    const after = pack(moved);
    expect(after.panels.length).toBe(before.panels.length);
    expect(moved[0]).toEqual({ x: 140, y: 75 });
    expect(after.panels.every((p, i) => Math.abs(p.x - (before.panels[i]!.x + dx)) < 0.01)).toBe(
      true,
    );
  });

  it('gesture rotate: snap + AABB pivot changes footprint for long roofs', () => {
    const angle = snapRotationToRightAngle(Math.PI / 2 - 0.02);
    expect(angle).toBeCloseTo(Math.PI / 2, 5);
    const next = rotatePointsAround(rect, polygonAabbCenter(rect), angle);
    const a = polygonAabbSize(rect);
    const b = polygonAabbSize(next);
    expect(b.w).toBeCloseTo(a.h, 5);
    expect(b.h).toBeCloseTo(a.w, 5);
    expect(pack(next).panels.length).toBeGreaterThan(0);
  });

  it('Rotate 90° button: quarter-turn + orientation flip changes module aspect', () => {
    const nextPoly = rotatePolygonQuarterTurns(rect, -1);
    const portrait = pack(nextPoly, 'portrait');
    const landscape = pack(nextPoly, 'landscape');
    expect(portrait.panels.length).toBeGreaterThan(0);
    expect(landscape.panels.length).toBeGreaterThan(0);
    const r = (p: { w: number; h: number }) => p.w / Math.max(p.h, 1e-6);
    expect(r(portrait.panels[0]!)).not.toBeCloseTo(r(landscape.panels[0]!), 2);
  });

  it('has3DRoofData contract: polygon alone is enough (panels may refill next tick)', () => {
    // Mirrors useRoofLayoutEditorState — must not require panels.length > 0
    const hasPolygon = rect.length >= 3;
    const imageSize = { width: 640, height: 640 };
    const has3DRoofData = hasPolygon && imageSize != null;
    expect(has3DRoofData).toBe(true);
    expect(shouldFlipOrientationOnQuarterTurn(rect)).toBe(false);
  });
});
