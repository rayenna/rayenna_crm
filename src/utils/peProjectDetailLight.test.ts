import { describe, expect, it } from 'vitest';
import { jsonArrayLength, slimRoiResultForClient } from './peProjectDetailLight';

describe('jsonArrayLength', () => {
  it('counts arrays and treats missing as zero', () => {
    expect(jsonArrayLength([1, 2, 3])).toBe(3);
    expect(jsonArrayLength([])).toBe(0);
    expect(jsonArrayLength(null)).toBe(0);
    expect(jsonArrayLength({ length: 4 })).toBe(0);
  });
});

describe('slimRoiResultForClient', () => {
  it('clears yearlyBreakdown and keeps summary fields', () => {
    const slim = slimRoiResultForClient({
      paybackYears: 4.2,
      totalSavings25Years: 100,
      roiPercent: 18,
      inputs: { systemSizeKw: 5 },
      yearlyBreakdown: [{ year: 1 }, { year: 2 }],
    }) as Record<string, unknown>;
    expect(slim.paybackYears).toBe(4.2);
    expect(slim.inputs).toEqual({ systemSizeKw: 5 });
    expect(slim.yearlyBreakdown).toEqual([]);
  });
});
