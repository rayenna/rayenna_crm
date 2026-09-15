import { describe, expect, it } from 'vitest';
import { energyToKwh, monthFromSolisDate, parseStationList, parseStationYearPoints } from './solisEnergyUnits';

describe('solisEnergyUnits', () => {
  it('converts MWh to kWh', () => {
    expect(energyToKwh(1.5, '1.5 MWh')).toBe(1500);
    expect(energyToKwh(412, '412 kWh')).toBe(412);
  });

  it('converts Wh and mislabelled Wh (this Hub screenshot: 795200)', () => {
    expect(energyToKwh(795200, 'Wh', 5.5)).toBe(795.2);
    expect(energyToKwh(795200, 'kWh', 5.5)).toBe(795.2);
    expect(energyToKwh(800, 'kWh', 5.5)).toBe(800);
  });

  it('parses plant list page.records', () => {
    const items = parseStationList({
      data: {
        page: {
          records: [
            { id: 129846, stationName: 'Kozhikode roof', capacity: 5.5, capacityStr: '5.5kW' },
            { id: '129847', stationName: '  ' },
          ],
        },
      },
    });
    expect(items).toEqual([
      { id: '129846', name: 'Kozhikode roof', capacityKw: 5.5 },
      { id: '129847', name: 'Plant 129847', capacityKw: null },
    ]);
  });

  it('parses yearly points from timestamps in IST', () => {
    const points = parseStationYearPoints({
      data: [{ energy: 410, energyStr: '410kWh', date: Date.parse('2026-08-01T00:00:00+05:30') }],
    });
    expect(points).toEqual([{ year: 2026, month: 8, kwh: 410 }]);
  });

  it('parses YYYY-MM date strings', () => {
    expect(monthFromSolisDate('2026-01')).toEqual({ year: 2026, month: 1 });
  });
});
