import { describe, expect, it } from 'vitest';
import { parseZenithRelativeDates, resolveAskDateFilter } from './relativeDates';

/** Fixed IST-friendly instant: 15 Oct 2025 → FY 2025-26, Q3, month 10 */
const NOW = new Date('2025-10-15T06:30:00.000Z');

describe('parseZenithRelativeDates', () => {
  it('parses last FY', () => {
    const r = parseZenithRelativeDates('revenue last financial year', NOW);
    expect(r?.selectedFYs).toEqual(['2024-25']);
    expect(r?.selectedQuarters).toEqual([]);
    expect(r?.phrase).toContain('last FY');
  });

  it('parses this quarter', () => {
    const r = parseZenithRelativeDates('pipeline this quarter', NOW);
    expect(r?.selectedFYs).toEqual(['2025-26']);
    expect(r?.selectedQuarters).toEqual(['Q3']);
  });

  it('parses last quarter across FY boundary from Q1', () => {
    const apr = new Date('2025-04-10T06:30:00.000Z'); // FY 2025-26 Q1
    const r = parseZenithRelativeDates('deals last quarter', apr);
    expect(r?.selectedFYs).toEqual(['2024-25']);
    expect(r?.selectedQuarters).toEqual(['Q4']);
  });

  it('parses explicit FY', () => {
    const r = parseZenithRelativeDates('Adani panels in FY 2023-24', NOW);
    expect(r?.selectedFYs).toEqual(['2023-24']);
  });

  it('returns null when no date phrase', () => {
    expect(parseZenithRelativeDates('payment status breakdown', NOW)).toBeNull();
  });
});

describe('resolveAskDateFilter', () => {
  it('overrides command bar when question has last FY', () => {
    const { dateFilter, relative } = resolveAskDateFilter(
      'SBI loans last FY',
      { selectedFYs: ['2025-26'], selectedQuarters: ['Q1'], selectedMonths: [] },
      NOW,
    );
    expect(relative?.phrase).toContain('last FY');
    expect(dateFilter.selectedFYs).toEqual(['2024-25']);
    expect(dateFilter.selectedQuarters).toEqual([]);
  });
});
