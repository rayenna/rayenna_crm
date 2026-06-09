import { describe, expect, it } from 'vitest';
import {
  formatSitePlanModuleLabel,
  formatSitePlanPlacedKwHtml,
  pickScaleBarMeters,
  scaleBarWidthPercent,
} from './exportRoofLayoutSitePlanPdf';

describe('formatSitePlanPlacedKwHtml', () => {
  it('shows placed kW only when yield loss is below threshold', () => {
    expect(formatSitePlanPlacedKwHtml({ systemKw: 5.5, effectiveSystemKw: 5.48, orientationLossPercent: 0.3 })).toBe(
      '5.50 kW',
    );
  });

  it('includes effective kW and orientation loss when significant', () => {
    const html = formatSitePlanPlacedKwHtml({
      systemKw: 10,
      effectiveSystemKw: 8.75,
      orientationLossPercent: 12.5,
    });
    expect(html).toContain('10.00 kW');
    expect(html).toContain('eff. 8.75 kW');
    expect(html).toContain('−13% orient.');
  });
});

describe('formatSitePlanModuleLabel', () => {
  it('combines watts, dimensions, and source', () => {
    expect(
      formatSitePlanModuleLabel({
        moduleWatts: 550,
        moduleWidthM: 2.278,
        moduleHeightM: 1.134,
        moduleSizeSource: 'Costing/BOM spec',
      }),
    ).toBe('550 W · 2.28 × 1.13 m · Costing/BOM spec');
  });

  it('falls back to watts only when dimensions missing', () => {
    expect(formatSitePlanModuleLabel({ moduleWatts: 550 })).toBe('550 W');
  });
});

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
