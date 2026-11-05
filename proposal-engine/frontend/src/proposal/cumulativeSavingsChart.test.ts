import { describe, expect, it } from 'vitest';
import {
  barFillForRow,
  buildCumulativeSavingsChartSvg,
  CHART_GOLD,
  CHART_NAVY,
  fmtChartAxis,
  renderCumulativeSavingsChartPng,
} from './cumulativeSavingsChart';
import type { YearlyRow } from './types';

function row(
  year: number,
  cumulative: number,
  paybackReached: boolean,
): YearlyRow {
  return {
    year,
    generation: 7000,
    tariffRate: 8,
    savings: 50000,
    cumulativeSavings: cumulative,
    paybackReached,
  };
}

function sampleRows(): YearlyRow[] {
  return Array.from({ length: 25 }, (_, i) => {
    const year = i + 1;
    const cumulative = 50_000 * year * (1 + year * 0.02);
    return row(year, cumulative, year >= 5);
  });
}

describe('fmtChartAxis', () => {
  it('formats lakhs and thousands', () => {
    expect(fmtChartAxis(2_65_9000)).toBe('₹26.6L');
    expect(fmtChartAxis(50000)).toBe('₹50K');
  });
});

describe('barFillForRow', () => {
  it('uses gold before payback and navy after', () => {
    expect(barFillForRow(row(1, 50_000, false))).toBe(CHART_GOLD);
    expect(barFillForRow(row(5, 4_00_000, true))).toBe(CHART_NAVY);
  });
});

describe('buildCumulativeSavingsChartSvg', () => {
  it('returns undefined for empty rows', () => {
    expect(buildCumulativeSavingsChartSvg({ rows: [] })).toBeUndefined();
  });

  it('renders title, legend, payback colors, and year labels', () => {
    const svg = buildCumulativeSavingsChartSvg({
      rows: sampleRows(),
      projectCost: 3_60_000,
    });
    expect(svg).toBeTruthy();
    expect(svg).toContain('25-YEAR CUMULATIVE SAVINGS');
    expect(svg).toContain('Pre-payback');
    expect(svg).toContain('Post-payback');
    expect(svg).toContain('Payback line');
    expect(svg).toContain(CHART_GOLD);
    expect(svg).toContain(CHART_NAVY);
    expect(svg).toContain('Yr 5');
    expect(svg).toContain('Yr 25');
    expect((svg!.match(/<rect /g) ?? []).length).toBeGreaterThan(25);
  });
});

describe('renderCumulativeSavingsChartPng', () => {
  it('returns undefined without a browser canvas', () => {
    expect(renderCumulativeSavingsChartPng({ rows: sampleRows() })).toBeUndefined();
  });
});
