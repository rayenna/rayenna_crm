import { describe, expect, it } from 'vitest';
import { parseModuleSpecDimensions } from './parseModuleSpecDimensions';
import { lookupModuleSkuCatalog } from './moduleSkuCatalog';
import { orientModuleDimensions, resolveModuleDimensions } from './resolveModuleDimensions';

describe('parseModuleSpecDimensions', () => {
  it('parses explicit mm dimensions', () => {
    const p = parseModuleSpecDimensions('Module 2278×1134 mm TOPCON');
    expect(p.widthM).toBeCloseTo(1.134, 3);
    expect(p.heightM).toBeCloseTo(2.278, 3);
  });

  it('parses wattage from BOM-style spec', () => {
    const p = parseModuleSpecDimensions('ADANI 600-620 DCR TOPCON MODULE');
    expect(p.wattageW).toBe(620);
  });
});

describe('lookupModuleSkuCatalog', () => {
  it('matches Waaree at 590 W', () => {
    const hit = lookupModuleSkuCatalog('Waaree', 590);
    expect(hit?.widthM).toBeCloseTo(1.134, 3);
  });

  it('returns null without brand', () => {
    expect(lookupModuleSkuCatalog('', 550)).toBeNull();
  });
});

describe('resolveModuleDimensions', () => {
  it('prefers artifact spec dimensions over catalog', () => {
    const r = resolveModuleDimensions({
      panelWattage: 550,
      panelBrand: 'Waaree',
      artifactSpecification: 'Custom 2000×1000 mm module',
    });
    expect(r.source).toBe('artifact-spec');
    expect(r.portraitWidthM).toBe(1);
    expect(r.portraitHeightM).toBe(2);
  });

  it('uses brand catalog when spec has no dimensions', () => {
    const r = resolveModuleDimensions({
      panelWattage: 610,
      panelBrand: 'Adani',
      artifactSpecification: 'ADANI 600-620 DCR TOPCON MODULE',
    });
    expect(r.source).toBe('crm-brand-catalog');
    expect(r.portraitWidthM).toBeCloseTo(1.303, 3);
  });

  it('falls back to wattage table for unknown brand', () => {
    const r = resolveModuleDimensions({
      panelWattage: 550,
      panelBrand: 'UnknownCo',
    });
    expect(r.source).toBe('wattage-table');
    expect(r.portraitWidthM).toBeCloseTo(1.134, 3);
    expect(r.portraitHeightM).toBeCloseTo(2.278, 3);
  });

  it('orientModuleDimensions swaps for landscape', () => {
    const o = orientModuleDimensions(
      { portraitWidthM: 1.1, portraitHeightM: 2.2 },
      'landscape',
    );
    expect(o).toEqual({ widthM: 2.2, heightM: 1.1 });
  });
});
