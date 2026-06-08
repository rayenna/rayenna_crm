import { describe, expect, it } from 'vitest';
import { keepoutFromGeometryJson, panelOverlapsKeepout } from './keepoutGeometry';

describe('panelOverlapsKeepout', () => {
  const panel = { x: 100, y: 100, w: 50, h: 80 };

  it('detects overlap with rectangle keepout', () => {
    expect(
      panelOverlapsKeepout(panel, { id: 'r1', shape: 'rect', x: 120, y: 110, w: 40, h: 40 }),
    ).toBe(true);
    expect(
      panelOverlapsKeepout(panel, { id: 'r2', shape: 'rect', x: 200, y: 200, w: 30, h: 30 }),
    ).toBe(false);
  });

  it('detects overlap with circle keepout', () => {
    expect(
      panelOverlapsKeepout(panel, { id: 'c1', shape: 'circle', cx: 125, cy: 125, r: 30 }),
    ).toBe(true);
    expect(
      panelOverlapsKeepout(panel, { id: 'c2', shape: 'circle', cx: 300, cy: 300, r: 20 }),
    ).toBe(false);
  });
});

describe('keepoutFromGeometryJson', () => {
  it('parses legacy rectangle keepouts without shape', () => {
    const k = keepoutFromGeometryJson({ id: 'k1', x: 10, y: 20, width: 30, height: 40 });
    expect(k).toEqual({ id: 'k1', shape: 'rect', x: 10, y: 20, w: 30, h: 40 });
  });

  it('parses circle keepouts', () => {
    const k = keepoutFromGeometryJson({ id: 'k2', shape: 'circle', cx: 50, cy: 60, radius: 25 });
    expect(k).toEqual({ id: 'k2', shape: 'circle', cx: 50, cy: 60, r: 25 });
  });
});
