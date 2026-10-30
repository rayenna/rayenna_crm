import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { matchExactChipIntent } from './chipIntents';
import { matchAskActionIntent } from './askActions';
import { isReportNavigateCommand, matchReportAskIntent } from './reportPackAsk';
import { matchHelpLookupIntent } from './helpLookupAsk';
import { enrichInsight } from './insights';

describe('isReportNavigateCommand', () => {
  it('treats bare pack names as navigation', () => {
    expect(isReportNavigateCommand('Sales Review')).toBe(true);
    expect(isReportNavigateCommand('Open Funnel Velocity')).toBe(true);
    expect(isReportNavigateCommand('Go to Delivery Control')).toBe(true);
    expect(isReportNavigateCommand('Margin Mix')).toBe(true);
    expect(isReportNavigateCommand('Open Reports')).toBe(true);
  });

  it('does not treat analytical questions as navigation', () => {
    expect(isReportNavigateCommand('Sales Review achievement')).toBe(false);
    expect(isReportNavigateCommand('Funnel Velocity SLA red')).toBe(false);
  });
});

describe('matchReportAskIntent', () => {
  it('routes Sales Review slices by role', () => {
    expect(matchReportAskIntent('Sales Review achievement', UserRole.SALES)?.filters?.detailSlice).toBe(
      'achievement',
    );
    expect(matchReportAskIntent('Sales Review forecast', UserRole.MANAGEMENT)?.metric).toBe(
      'sales_review',
    );
    expect(matchReportAskIntent('Sales Review achievement', UserRole.OPERATIONS)).toBeNull();
  });

  it('answers Funnel Velocity SLA instead of opening the page', () => {
    const intent = matchReportAskIntent('Funnel Velocity SLA red', UserRole.SALES);
    expect(intent?.metric).toBe('funnel_velocity');
    expect(intent?.filters?.detailSlice).toBe('sla_red');
  });

  it('maps stuck deals and subsidy clock', () => {
    expect(matchReportAskIntent('stuck deals', UserRole.ADMIN)?.metric).toBe('funnel_velocity');
    expect(matchReportAskIntent('Subsidy clock', UserRole.OPERATIONS)?.filters?.detailSlice).toBe(
      'subsidy_clock',
    );
    expect(matchReportAskIntent('Thin margin jobs', UserRole.FINANCE)?.metric).toBe('margin_mix');
    expect(matchReportAskIntent('Collections outstanding', UserRole.FINANCE)?.filters?.detailSlice).toBe(
      'outstanding',
    );
  });

  it('leaves definitional questions for Help', () => {
    expect(matchReportAskIntent('What is Sales Review?', UserRole.ADMIN)).toBeNull();
    expect(matchReportAskIntent('What is Median Days on Funnel Velocity?', UserRole.SALES)).toBeNull();
  });

  it('leaves bare pack names for Go to', () => {
    expect(matchReportAskIntent('Sales Review', UserRole.SALES)).toBeNull();
    expect(matchReportAskIntent('Open Collections & Cash', UserRole.FINANCE)).toBeNull();
  });
});

describe('Ask routing vs navigation / Help', () => {
  it('keeps Go to pack names', () => {
    expect(matchAskActionIntent('Sales Review', UserRole.SALES)?.href).toBe('/reports/sales-review');
    expect(matchAskActionIntent('Funnel Velocity', UserRole.SALES)?.href).toBe(
      '/reports/funnel-velocity',
    );
    expect(matchAskActionIntent('Open Reports', UserRole.MANAGEMENT)?.href).toBe('/reports');
  });

  it('does not navigate on report data questions', () => {
    expect(matchAskActionIntent('Sales Review achievement', UserRole.SALES)).toBeNull();
    expect(matchAskActionIntent('stuck deals', UserRole.SALES)).toBeNull();
    expect(matchAskActionIntent('Thin margin jobs', UserRole.FINANCE)).toBeNull();
  });

  it('wires chips through matchExactChipIntent', () => {
    expect(matchExactChipIntent('Sales Review achievement', UserRole.SALES)?.metric).toBe(
      'sales_review',
    );
    expect(matchExactChipIntent('Funnel Velocity SLA red', UserRole.SALES)?.filters?.detailSlice).toBe(
      'sla_red',
    );
    expect(matchExactChipIntent('Delivery Control blockers', UserRole.OPERATIONS)?.metric).toBe(
      'delivery_control',
    );
    expect(matchExactChipIntent('Thin margin jobs', UserRole.SALES)).toBeNull();
  });

  it('keeps pack-authored insights instead of a generic row count', () => {
    const insight = 'Sales Review achievement (All sellers). FY2026-27 YTD closed ₹76,00,000.';
    const viz = {
      kind: 'table' as const,
      title: 'Achievement · All sellers',
      columns: [
        { key: 'metric', label: 'Metric' },
        { key: 'c0', label: 'FY2026-27 YTD' },
      ],
      rows: [{ metric: 'Closed', c0: '₹76,00,000' }],
    };
    expect(enrichInsight('sales_review', viz, insight)).toBe(insight);
  });

  it('still answers What is Sales Review from Help', () => {
    expect(matchHelpLookupIntent('What is Sales Review?', UserRole.ADMIN)?.metric).toBe('help_lookup');
  });

  it('does not treat Margin & Mix summary as seller-mix just because mix is in the pack name', () => {
    expect(matchReportAskIntent('Margin & Mix summary', UserRole.FINANCE)?.filters?.detailSlice).toBe(
      'summary',
    );
    expect(matchReportAskIntent('Margin & Mix by seller', UserRole.FINANCE)?.filters?.detailSlice).toBe(
      'mix',
    );
  });
});
