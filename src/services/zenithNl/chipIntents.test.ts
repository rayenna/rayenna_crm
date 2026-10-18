import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import {
  matchEquipmentMixIntent,
  matchExactChipIntent,
  matchPhraseChipIntent,
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
    expect(matchExactChipIntent('Profit summary this quarter', UserRole.MANAGEMENT)?.metric).toBe(
      'profit_summary',
    );
    expect(
      matchExactChipIntent('Quarter on quarter revenue growth', UserRole.MANAGEMENT)?.metric,
    ).toBe('period_compare');
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

describe('matchPhraseChipIntent', () => {
  it('salvages profit paraphrase without Claude', () => {
    expect(matchPhraseChipIntent("what's our profit?", UserRole.ADMIN)?.metric).toBe(
      'profit_summary',
    );
  });

  it('salvages ops workload and compliance paraphrases', () => {
    expect(matchPhraseChipIntent('how busy is ops', UserRole.OPERATIONS)?.metric).toBe(
      'ops_workload',
    );
    expect(matchPhraseChipIntent('KSEB backlog', UserRole.MANAGEMENT)?.metric).toBe(
      'compliance_backlog',
    );
  });

  it('salvages finance paraphrases', () => {
    expect(matchPhraseChipIntent('loan vs cash', UserRole.FINANCE)?.metric).toBe(
      'loan_vs_cash_revenue',
    );
    expect(matchPhraseChipIntent('unpaid invoices list', UserRole.FINANCE)?.metric).toBe(
      'unpaid_invoices',
    );
  });

  it('does not steal Deye inverter cohort for hub plants', () => {
    expect(
      matchPhraseChipIntent('Revenue of projects with Deye inverters', UserRole.ADMIN),
    ).toBeNull();
  });

  it('respects role gates', () => {
    expect(matchPhraseChipIntent('ops workload', UserRole.FINANCE)).toBeNull();
  });

  it('is wired through matchExactChipIntent', () => {
    expect(matchExactChipIntent('show me the profit summary please', UserRole.ADMIN)?.metric).toBe(
      'profit_summary',
    );
  });

  it('salvages under installation + not fully paid as projects list', () => {
    const intent = matchExactChipIntent(
      'List all Under Installation Projects where Payment is pending',
      UserRole.ADMIN,
    );
    expect(intent?.metric).toBe('projects_list_slice');
    expect(intent?.filters?.projectStatus).toBe('UNDER_INSTALLATION');
    expect(intent?.filters?.paymentStatus).toBe('NOT_FULLY_PAID');
    expect(
      matchPhraseChipIntent(
        'under installation where we have not received full payment',
        UserRole.MANAGEMENT,
      )?.filters?.paymentStatus,
    ).toBe('NOT_FULLY_PAID');
  });

  it('lists non-subsidy / subsidy projects without Claude', () => {
    const nonSub = matchExactChipIntent(
      'List all Non Subsidy Projects this FY',
      UserRole.ADMIN,
    );
    expect(nonSub?.metric).toBe('projects_list_slice');
    expect(nonSub?.filters?.projectType).toBe('NON_SUBSIDY');
    const sub = matchPhraseChipIntent('List all subsidy projects', UserRole.MANAGEMENT);
    expect(sub?.metric).toBe('projects_list_slice');
    expect(sub?.filters?.projectType).toBe('SUBSIDY');
    expect(
      matchExactChipIntent('Subsidy vs non-subsidy revenue', UserRole.MANAGEMENT)?.metric,
    ).toBe('revenue_by_project_type');
  });

  it('compares subsidy vs non-subsidy profitability (not YoY)', () => {
    const intent = matchExactChipIntent(
      'Compare Profitability of Subsidy versus Non Subsidy Projects for last FY',
      UserRole.ADMIN,
    );
    expect(intent?.metric).toBe('revenue_by_project_type');
    expect(intent?.insightHints).toMatch(/profitability/i);
    expect(intent?.viz).toBe('table');
  });

  it('looks up project by SL No without Claude', () => {
    const intent = matchExactChipIntent("What's the status of SL 123?", UserRole.ADMIN);
    expect(intent?.metric).toBe('project_detail_lookup');
    expect(intent?.filters?.search).toBe('SL:123');
  });

  it('matches payment timeline and feasibility pending detail lists', () => {
    expect(matchExactChipIntent('Payment timeline', UserRole.FINANCE)?.filters?.detailSlice).toBe(
      'payment_timeline',
    );
    expect(
      matchExactChipIntent('Projects with feasibility pending', UserRole.OPERATIONS)?.filters
        ?.detailSlice,
    ).toBe('feasibility_pending');
    expect(
      matchExactChipIntent('whose feasibility is pending', UserRole.ADMIN)?.filters?.detailSlice,
    ).toBe('feasibility_pending');
  });

  it('matches 550W panel listing and hub / PE / lost detail slices', () => {
    const panels = matchExactChipIntent('List projects with 550W panels', UserRole.MANAGEMENT);
    expect(panels?.metric).toBe('projects_ops_detail');
    expect(panels?.filters?.detailSlice).toBe('panel_wattage');
    expect(panels?.filters?.panelCapacityWMin).toBe(550);
    expect(matchExactChipIntent('Hub station IDs', UserRole.ADMIN)?.filters?.detailSlice).toBe(
      'hub_station_ids',
    );
    expect(matchExactChipIntent('PE missing BOM', UserRole.OPERATIONS)?.filters?.detailSlice).toBe(
      'pe_missing_bom',
    );
    expect(matchExactChipIntent('Lost deal details', UserRole.MANAGEMENT)?.filters?.detailSlice).toBe(
      'lost_detail',
    );
  });

  it('does not treat show Solis ID as a customer-name lookup', () => {
    const intent = matchExactChipIntent('Show Solis IDs', UserRole.ADMIN);
    expect(intent?.metric).toBe('projects_ops_detail');
    expect(intent?.filters?.detailSlice).toBe('hub_station_ids');
    expect(intent?.filters?.search).toBeUndefined();
  });

  it('matches customer detail and profitability compares', () => {
    expect(matchExactChipIntent('Customer details for Ramesh', UserRole.ADMIN)?.metric).toBe(
      'customer_detail_lookup',
    );
    expect(matchExactChipIntent('DCR vs Non-DCR profitability', UserRole.MANAGEMENT)?.metric).toBe(
      'panel_type_mix',
    );
    expect(matchExactChipIntent('Compare bank profitability', UserRole.FINANCE)?.metric).toBe(
      'loan_bank_breakdown',
    );
    expect(matchExactChipIntent('City profitability', UserRole.ADMIN)?.insightHints).toMatch(
      /profit/i,
    );
    expect(
      matchExactChipIntent('Salesperson profitability', UserRole.MANAGEMENT)?.metric,
    ).toBe('revenue_by_salesperson');
  });

  it('lists customers by city', () => {
    const intent = matchExactChipIntent('List customers in Kochi', UserRole.ADMIN);
    expect(intent?.metric).toBe('customers_list_slice');
    expect(intent?.filters?.city).toMatch(/kochi/i);
  });
});
