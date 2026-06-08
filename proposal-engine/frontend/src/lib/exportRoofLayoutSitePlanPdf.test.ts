import { describe, expect, it } from 'vitest';
import { pickScaleBarMeters, scaleBarWidthPercent } from './exportRoofLayoutSitePlanPdf';

describe('pickScaleBarMeters', () => {
  it('returns a round metre value for typical satellite width', () => {
    const bar = pickScaleBarMeters(2048, 0.149);
    expect(bar).toBeGreaterThan(0);
    expect([5, 10, 15, 20, 25, 50, 100, 200]).toContain(bar);
  });

  it('falls back when inputs are invalid', () => {
    expect(pickScaleBarMeters(0, 0.149)).toBe(10);
    expect(pickScaleBarMeters(2048, 0)).toBe(10);
  });
});

describe('scaleBarWidthPercent', () => {
  it('computes bar width as fraction of image width', () => {
    const pct = scaleBarWidthPercent(20, 2048, 0.149);
    expect(pct).toBeGreaterThanOrEqual(8);
    expect(pct).toBeLessThanOrEqual(45);
  });
});
