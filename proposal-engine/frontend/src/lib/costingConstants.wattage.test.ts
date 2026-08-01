import { describe, expect, it } from 'vitest';
import {
  deriveSystemSizeKw,
  parseModuleWattageWatts,
  type LineItem,
} from './costingConstants';

describe('parseModuleWattageWatts', () => {
  it('reads explicit W from item name', () => {
    expect(parseModuleWattageWatts('Waaree 590W Mono', '')).toBe(590);
  });

  it('reads explicit W from specification when name has none', () => {
    expect(parseModuleWattageWatts('TopCon Module', 'Adani 620Wp DCR')).toBe(620);
  });

  it('reads max from specification range 600-620', () => {
    expect(
      parseModuleWattageWatts('TopCon Module', 'ADANI/EMMVEE 600-620 DCR TOPC'),
    ).toBe(620);
  });

  it('falls back to CRM panel wattage', () => {
    expect(parseModuleWattageWatts('TopCon Module', 'As per datasheet', 550)).toBe(550);
  });

  it('returns null when nothing available', () => {
    expect(parseModuleWattageWatts('TopCon Module', 'As per datasheet', null)).toBeNull();
  });
});

describe('deriveSystemSizeKw', () => {
  const module = (over: Partial<LineItem>): LineItem => ({
    category: 'pv-modules',
    itemName: 'TopCon Module',
    specification: '',
    quantity: '8',
    unitCost: '100',
    gstPercent: '5',
    ...over,
  });

  it('uses specification range for size', () => {
    const kw = deriveSystemSizeKw([
      module({ specification: 'ADANI/EMMVEE 600-620 DCR TOPC', quantity: '8' }),
    ]);
    // 8 × 620 W = 4.96 kW
    expect(kw).toBe(4.96);
  });

  it('uses CRM fallback when name and spec lack wattage', () => {
    const kw = deriveSystemSizeKw(
      [module({ specification: 'As per datasheet', quantity: '10' })],
      { fallbackPanelWattage: 500 },
    );
    expect(kw).toBe(5);
  });
});
