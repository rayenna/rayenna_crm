import { describe, expect, it } from 'vitest';
import { parseDeyeHistoryPoints, parseDeyeStationList } from './deyeEnergyUnits';

describe('deyeEnergyUnits', () => {
  it('parses station list ids and kW capacity', () => {
    const items = parseDeyeStationList({
      success: true,
      stationList: [
        { id: 70681, name: 'SESSY ANTONY', installedCapacity: 6 },
        { stationId: '45425', stationName: 'RAJESH K G', capacity: 3000 },
      ],
    });
    expect(items).toEqual([
      { id: '70681', name: 'SESSY ANTONY', capacityKw: 6 },
      { id: '45425', name: 'RAJESH K G', capacityKw: 3 },
    ]);
  });

  it('parses monthly generationValue and skips month 0 year totals', () => {
    const points = parseDeyeHistoryPoints(
      {
        stationDataItems: [
          { generationValue: 412.4, year: 2026, month: 9 },
          { generationValue: 182.6, year: 2024, month: 0 },
          { generationValue: 210.1, dateTime: '2026-08-01 00:00:00' },
        ],
      },
      3,
    );
    expect(points).toEqual([
      { year: 2026, month: 8, kwh: 210 },
      { year: 2026, month: 9, kwh: 412 },
    ]);
  });

  it('converts Wh labelled as kWh using plant size', () => {
    const points = parseDeyeHistoryPoints(
      { stationDataItems: [{ generationValue: 412400, year: 2026, month: 6 }] },
      3,
    );
    expect(points).toEqual([{ year: 2026, month: 6, kwh: 412 }]);
  });
});
