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

  it('parses this half year as H2 (Q3+Q4) when in Q3', () => {
    const r = parseZenithRelativeDates('Profit Summary this Half Year', NOW);
    expect(r?.selectedFYs).toEqual(['2025-26']);
    expect(r?.selectedQuarters).toEqual(['Q3', 'Q4']);
    expect(r?.phrase).toContain('this half year');
    expect(r?.phrase).toContain('H2');
  });

  it('parses this half year as H1 when in Q1', () => {
    const apr = new Date('2025-04-10T06:30:00.000Z');
    const r = parseZenithRelativeDates('revenue this half-year', apr);
    expect(r?.selectedFYs).toEqual(['2025-26']);
    expect(r?.selectedQuarters).toEqual(['Q1', 'Q2']);
  });

  it('parses last half year from H2 into same-FY H1', () => {
    const r = parseZenithRelativeDates('profit last half year', NOW);
    expect(r?.selectedFYs).toEqual(['2025-26']);
    expect(r?.selectedQuarters).toEqual(['Q1', 'Q2']);
  });

  it('parses last half year from H1 into prior-FY H2', () => {
    const may = new Date('2025-05-10T06:30:00.000Z'); // FY 2025-26 Q1
    const r = parseZenithRelativeDates('deals last half year', may);
    expect(r?.selectedFYs).toEqual(['2024-25']);
    expect(r?.selectedQuarters).toEqual(['Q3', 'Q4']);
  });

  it('parses explicit H1', () => {
    const r = parseZenithRelativeDates('profit summary H1', NOW);
    expect(r?.selectedFYs).toEqual(['2025-26']);
    expect(r?.selectedQuarters).toEqual(['Q1', 'Q2']);
  });

  it('parses next quarter', () => {
    const r = parseZenithRelativeDates('revenue next quarter', NOW);
    expect(r?.selectedFYs).toEqual(['2025-26']);
    expect(r?.selectedQuarters).toEqual(['Q4']);
    expect(r?.phrase).toContain('next quarter');
  });

  it('parses next quarter across FY boundary from Q4', () => {
    const jan = new Date('2026-01-15T06:30:00.000Z'); // FY 2025-26 Q4
    const r = parseZenithRelativeDates('profit next quarter', jan);
    expect(r?.selectedFYs).toEqual(['2026-27']);
    expect(r?.selectedQuarters).toEqual(['Q1']);
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
    const { dateFilter, relative, defaulted } = resolveAskDateFilter(
      'SBI loans last FY',
      { selectedFYs: ['2025-26'], selectedQuarters: ['Q1'], selectedMonths: [] },
      NOW,
    );
    expect(relative?.phrase).toContain('last FY');
    expect(dateFilter.selectedFYs).toEqual(['2024-25']);
    expect(dateFilter.selectedQuarters).toEqual([]);
    expect(defaulted).toBe(false);
  });

  it('defaults to this FY when command bar is empty and question has no period', () => {
    const { dateFilter, relative, defaulted, defaultPhrase } = resolveAskDateFilter(
      'Who should I call today?',
      { selectedFYs: [], selectedQuarters: [], selectedMonths: [] },
      NOW,
    );
    expect(defaulted).toBe(true);
    expect(relative).toBeNull();
    expect(dateFilter.selectedFYs).toEqual(['2025-26']);
    expect(defaultPhrase).toContain('this FY');
  });

  it('applies saved Ask default period (last quarter) when bar empty', () => {
    const { dateFilter, defaulted, defaultPhrase } = resolveAskDateFilter(
      'Who should I call today?',
      { selectedFYs: [], selectedQuarters: [], selectedMonths: [] },
      NOW,
      'last_quarter',
    );
    expect(defaulted).toBe(true);
    expect(dateFilter.selectedFYs.length).toBe(1);
    expect(dateFilter.selectedQuarters.length).toBe(1);
    expect(defaultPhrase).toMatch(/last quarter/i);
  });

  it('applies all_time Ask default with empty date filter', () => {
    const { dateFilter, defaultPhrase } = resolveAskDateFilter(
      'Revenue by salesperson',
      { selectedFYs: [], selectedQuarters: [], selectedMonths: [] },
      NOW,
      'all_time',
    );
    expect(dateFilter.selectedFYs).toEqual([]);
    expect(defaultPhrase).toMatch(/all time/i);
  });
});
