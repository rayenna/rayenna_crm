import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import {
  formatGrowthPct,
  growthPct,
  parsePeriodCompare,
  periodCompareIntent,
} from './periodCompare';
import { matchExactChipIntent } from './chipIntents';

/** 15 Oct 2025 → FY 2025-26 */
const NOW = new Date('2025-10-15T06:30:00.000Z');

describe('parsePeriodCompare', () => {
  it('detects year on year revenue growth this FY', () => {
    const r = parsePeriodCompare(
      'what is my year on year growth on revenue this FY',
      NOW,
    );
    expect(r).not.toBeNull();
    expect(r!.primaryFy).toBe('2025-26');
    expect(r!.priorFy).toBe('2024-25');
    expect(r!.focus).toBe('revenue');
    expect(r!.phrase).toContain('Comparing this FY');
  });

  it('detects average profit margin this vs last (and Prophet typo)', () => {
    const r = parsePeriodCompare(
      'what is my average Prophet margin this financial year versus last',
      NOW,
    );
    expect(r).not.toBeNull();
    expect(r!.focus).toBe('margin');
    expect(r!.primaryFy).toBe('2025-26');
    expect(r!.priorFy).toBe('2024-25');
  });

  it('detects YoY shorthand', () => {
    const r = parsePeriodCompare('YoY revenue growth', NOW);
    expect(r?.focus).toBe('revenue');
  });

  it('returns null for non-compare questions', () => {
    expect(parsePeriodCompare('Profit summary', NOW)).toBeNull();
    expect(parsePeriodCompare('loan vs cash revenue', NOW)).toBeNull();
  });
});

describe('growthPct', () => {
  it('computes percent change', () => {
    expect(growthPct(120, 100)).toBe(20);
    expect(growthPct(80, 100)).toBe(-20);
  });

  it('handles zero prior', () => {
    expect(growthPct(50, 0)).toBeNull();
    expect(growthPct(0, 0)).toBe(0);
    expect(formatGrowthPct(null)).toBe('—');
    expect(formatGrowthPct(12.5)).toBe('+12.5%');
  });
});

describe('periodCompareIntent + chip path', () => {
  it('builds period_compare intent', () => {
    const parse = parsePeriodCompare('revenue YoY this FY', NOW)!;
    const intent = periodCompareIntent(parse);
    expect(intent.metric).toBe('period_compare');
    expect(intent.filters?.compareFocus).toBe('revenue');
  });

  it('does not steal loan vs cash via matchExactChipIntent', () => {
    expect(matchExactChipIntent('Loan vs cash revenue', UserRole.FINANCE)?.metric).toBe(
      'loan_vs_cash_revenue',
    );
  });
});
