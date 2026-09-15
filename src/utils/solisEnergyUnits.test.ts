import { describe, expect, it } from 'vitest';
import { energyToKwh, monthFromSolisDate, parseStationList, parseStationYearPoints, quoteOversizedJsonInts } from './solisEnergyUnits';

describe('solisEnergyUnits', () => {
  it('converts MWh to kWh', () => {
    expect(energyToKwh(1.5, '1.5 MWh')).toBe(1500);
    expect(energyToKwh(412, '412 kWh')).toBe(412);
  });

  it('prefers the number inside energyStr when Solis sends Wh in energy', () => {
    expect(energyToKwh(795200, '795.20kWh', 5.5)).toBe(795.2);
  });

  it('converts Wh mislabelled as kWh for rooftop plants (Angelo / Byju vs Hyder)', () => {
    expect(energyToKwh(795200, 'kWh', 5.5)).toBe(795.2);
    expect(energyToKwh(769100, 'kWh', 3)).toBe(769.1);
    expect(energyToKwh(958000, 'kWh', 5.5)).toBe(958);
    expect(energyToKwh(393, 'kWh', 5.5)).toBe(393);
    expect(energyToKwh(800, 'kWh', 5.5)).toBe(800);
  });

  it('still converts when CRM/Solis capacity is huge (watts or MW leftovers)', () => {
    expect(energyToKwh(795200, 'kWh', 5500)).toBe(795.2);
    expect(energyToKwh(795200, 'kWh', 1_500_000)).toBe(795.2);
    expect(energyToKwh(795200, 'kWh')).toBe(795.2);
  });

  it('keeps real commercial monthly kWh', () => {
    expect(energyToKwh(12000, 'kWh', 100)).toBe(12000);
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

  it('parses yearly points nested in stationDataItems', () => {
    const points = parseStationYearPoints(
      {
        data: {
          stationDataItems: [{ energy: 795200, energyStr: 'kWh', date: '2026-09' }],
        },
      },
      5.5,
    );
    expect(points).toEqual([{ year: 2026, month: 9, kwh: 795 }]);
  });

  it('prefers a 12-month series over nested daily rows', () => {
    const points = parseStationYearPoints(
      {
        data: {
          days: [
            { energy: 1, energyStr: 'kWh', date: '2026-09-01' },
            { energy: 1, energyStr: 'kWh', date: '2026-09-02' },
          ],
          stationDataItems: [{ energy: 412, energyStr: 'kWh', date: '2026-09' }],
        },
      },
      5.5,
    );
    expect(points).toEqual([{ year: 2026, month: 9, kwh: 412 }]);
  });

  it('sums daily rows into one month when that is all Solis returns', () => {
    const points = parseStationYearPoints(
      {
        data: [
          { energy: 10, energyStr: 'kWh', date: '2026-06-01' },
          { energy: 20, energyStr: 'kWh', date: '2026-06-02' },
          { energy: 30, energyStr: 'kWh', date: '2026-06-03' },
        ],
      },
      5.5,
    );
    expect(points).toEqual([{ year: 2026, month: 6, kwh: 60 }]);
  });

  it('quotes Solis plant ids that JSON.parse would corrupt', () => {
    const raw = '{"data":{"page":{"records":[{"id":1298491919450109891,"stationName":"SAJAN P S"}]}}}';
    const parsed = JSON.parse(quoteOversizedJsonInts(raw)) as {
      data: { page: { records: Array<{ id: string }> } };
    };
    expect(parsed.data.page.records[0].id).toBe('1298491919450109891');
    expect(String(Number('1298491919450109891'))).not.toBe('1298491919450109891');
  });

  it('parses YYYY-MM date strings', () => {
    expect(monthFromSolisDate('2026-01')).toEqual({ year: 2026, month: 1 });
  });
});
