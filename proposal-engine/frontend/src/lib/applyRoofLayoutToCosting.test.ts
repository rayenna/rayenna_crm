import { describe, expect, it } from 'vitest';
import { applyRoofLayoutToModuleLines } from './applyRoofLayoutToCosting';
import { deriveSystemSizeKw } from './costingConstants';
import type { LineItem } from './costingConstants';

const moduleLine = (partial: Partial<LineItem> = {}): LineItem => ({
  category: 'pv-modules',
  itemName: 'TopCon Module',
  specification: 'ADANI 600-620 DCR TOPCON MODULE',
  quantity: '5',
  unitCost: '17050',
  gstPercent: '5',
  ...partial,
});

describe('applyRoofLayoutToModuleLines', () => {
  it('sets quantity and exact watts so derived kW matches the placed panels', () => {
    const applied = applyRoofLayoutToModuleLines([moduleLine()], {
      panelCount: 10,
      moduleWatts: 600,
    });
    expect(applied.items[0].quantity).toBe('10');
    expect(applied.items[0].specification).toContain('600W');
    expect(applied.items[0].specification).not.toContain('600-620');
    expect(applied.items[0].unitCost).toBe('17050');
    expect(deriveSystemSizeKw(applied.items)).toBe(6);
  });

  it('zeros extra module lines so they do not add a second array size', () => {
    const applied = applyRoofLayoutToModuleLines(
      [moduleLine(), moduleLine({ itemName: 'Spare module', quantity: '2' })],
      { panelCount: 8, moduleWatts: 550 },
    );
    expect(applied.items[0].quantity).toBe('8');
    expect(applied.items[1].quantity).toBe('0');
    expect(applied.summary).toContain('quantity 0');
  });

  it('inserts a module line when the sheet has none', () => {
    const applied = applyRoofLayoutToModuleLines([], {
      panelCount: 6,
      moduleWatts: 540,
      panelBrand: 'Waaree',
    });
    expect(applied.items[0]).toMatchObject({
      category: 'pv-modules',
      itemName: 'Waaree PV Module',
      quantity: '6',
      specification: '540W',
      gstPercent: '5',
    });
  });

  it('keeps an existing specification when watts are unknown', () => {
    const applied = applyRoofLayoutToModuleLines([moduleLine()], {
      panelCount: 7,
      moduleWatts: null,
    });
    expect(applied.items[0].quantity).toBe('7');
    expect(applied.items[0].specification).toContain('600-620');
  });
});
