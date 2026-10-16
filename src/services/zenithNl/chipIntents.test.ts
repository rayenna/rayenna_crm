import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import {
  matchEquipmentMixIntent,
  matchExactChipIntent,
  matchSupportTicketIntent,
} from './chipIntents';

describe('matchExactChipIntent', () => {
  it('matches Management panel mix chip without Claude', () => {
    const intent = matchExactChipIntent('Which panel brands sold most?', UserRole.MANAGEMENT);
    expect(intent?.metric).toBe('panel_brand_mix');
  });

  it('matches Finance bank mix chip', () => {
    const intent = matchExactChipIntent('Which banks are financing loans?', UserRole.FINANCE);
    expect(intent?.metric).toBe('loan_bank_breakdown');
  });

  it('rejects panel mix for Sales', () => {
    expect(matchExactChipIntent('Which panel brands sold most?', UserRole.SALES)).toBeNull();
  });

  it('is case/whitespace insensitive', () => {
    const intent = matchExactChipIntent(
      '  how many customers have sbi loans?  ',
      UserRole.FINANCE,
    );
    expect(intent?.metric).toBe('availing_loan');
    expect(intent?.filters?.financingBank).toBe('SBI');
  });

  it('matches free-text inverter sold most (not panel)', () => {
    const intent = matchExactChipIntent('which inverter brand sold the most', UserRole.MANAGEMENT);
    expect(intent?.metric).toBe('inverter_brand_mix');
  });

  it('matches support tickets raised chip', () => {
    const intent = matchExactChipIntent(
      'Show me the total support tickets raised',
      UserRole.ADMIN,
    );
    expect(intent?.metric).toBe('support_tickets_summary');
  });

  it('rejects support tickets for Finance', () => {
    expect(
      matchExactChipIntent('Show me the total support tickets raised', UserRole.FINANCE),
    ).toBeNull();
  });

  it('matches P1/P2 Management chips', () => {
    expect(matchExactChipIntent('Revenue by city', UserRole.MANAGEMENT)?.metric).toBe(
      'revenue_by_city',
    );
    expect(matchExactChipIntent('Profit summary', UserRole.MANAGEMENT)?.metric).toBe(
      'profit_summary',
    );
    expect(matchExactChipIntent('Compliance backlog', UserRole.MANAGEMENT)?.metric).toBe(
      'compliance_backlog',
    );
  });

  it('matches Finance unpaid invoices and payment mode', () => {
    expect(matchExactChipIntent('Unpaid invoices', UserRole.FINANCE)?.metric).toBe(
      'unpaid_invoices',
    );
    expect(matchExactChipIntent('Payment mode mix', UserRole.FINANCE)?.metric).toBe(
      'payment_mode_mix',
    );
  });

  it('matches Ops workload and AMC for Operations', () => {
    expect(matchExactChipIntent('Ops workload', UserRole.OPERATIONS)?.metric).toBe(
      'ops_workload',
    );
    expect(matchExactChipIntent('AMCs expiring', UserRole.OPERATIONS)?.metric).toBe(
      'amc_expiring',
    );
  });

  it('rejects ops workload for Finance', () => {
    expect(matchExactChipIntent('Ops workload', UserRole.FINANCE)).toBeNull();
  });
});

describe('matchSupportTicketIntent', () => {
  it('routes total raised to summary', () => {
    expect(
      matchSupportTicketIntent('Show me the total support tickets raised', UserRole.SALES)
        ?.metric,
    ).toBe('support_tickets_summary');
  });

  it('routes overdue focus', () => {
    expect(
      matchSupportTicketIntent('show overdue support tickets', UserRole.OPERATIONS)?.filters
        ?.ticketStatus,
    ).toBe('OVERDUE');
  });
});

describe('matchEquipmentMixIntent', () => {
  it('routes inverter sold-most to inverter_brand_mix', () => {
    expect(
      matchEquipmentMixIntent('which inverter brand sold the most', UserRole.ADMIN)?.metric,
    ).toBe('inverter_brand_mix');
  });

  it('routes panel sold-most to panel_brand_mix', () => {
    expect(
      matchEquipmentMixIntent('Which panel brands sold most last FY?', UserRole.ADMIN)?.metric,
    ).toBe('panel_brand_mix');
  });
});
