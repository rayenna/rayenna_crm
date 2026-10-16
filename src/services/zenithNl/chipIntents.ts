import { UserRole } from '@prisma/client';
import {
  EXAMPLE_QUESTIONS_BY_ROLE,
  metricAllowedForRole,
  type ZenithNlIntent,
} from './catalog';

function norm(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Deterministic intents for exact example-chip questions (skip Claude). */
const CHIP_INTENT_BY_NORM: Record<string, ZenithNlIntent> = {
  [norm('Which lead sources drove the most revenue?')]: {
    metric: 'revenue_by_lead_source',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'revenue by lead source',
  },
  [norm('Show my pipeline by stage')]: {
    metric: 'pipeline_by_stage',
    viz: 'table',
    insightHints: 'pipeline by stage',
  },
  [norm('Pipeline by stage')]: {
    metric: 'pipeline_by_stage',
    viz: 'table',
    insightHints: 'pipeline by stage',
  },
  [norm('Summarise my lost deals by reason')]: {
    metric: 'lost_deals_summary',
    viz: 'table',
    insightHints: 'lost deals by reason',
  },
  [norm('Summarise lost deals by reason')]: {
    metric: 'lost_deals_summary',
    viz: 'table',
    insightHints: 'lost deals by reason',
  },
  [norm('Show installation status breakdown')]: {
    metric: 'install_by_status',
    viz: 'table',
    insightHints: 'installation by status',
  },
  [norm('How many of my projects used Adani panels?')]: {
    metric: 'cohort_summary',
    viz: 'table',
    filters: { panelBrand: 'Adani Solar' },
    insightHints: 'Adani panel projects count',
  },
  [norm('How many projects used Adani panels?')]: {
    metric: 'cohort_summary',
    viz: 'table',
    filters: { panelBrand: 'Adani Solar' },
    insightHints: 'Adani panel projects count',
  },
  [norm('Revenue of projects with Deye inverters')]: {
    metric: 'cohort_summary',
    viz: 'table',
    filters: { inverterBrand: 'Deye' },
    insightHints: 'Deye inverter revenue cohort',
  },
  [norm('Projects with Deye inverters')]: {
    metric: 'projects_list_slice',
    viz: 'table',
    filters: { inverterBrand: 'Deye' },
    insightHints: 'Deye inverter projects',
  },
  [norm('How many customers have SBI loans?')]: {
    metric: 'availing_loan',
    viz: 'table',
    filters: { financingBank: 'SBI', availingLoan: true },
    insightHints: 'SBI loan projects',
  },
  [norm('Which projects are availing loan?')]: {
    metric: 'availing_loan',
    viz: 'table',
    filters: { availingLoan: true },
    insightHints: 'availing loan',
  },
  [norm('Payment status breakdown')]: {
    metric: 'payment_status_breakdown',
    viz: 'chart',
    chartType: 'pie',
    insightHints: 'payment status',
  },
  [norm('Projects with outstanding balance')]: {
    metric: 'outstanding_balance',
    viz: 'table',
    insightHints: 'outstanding balance',
  },
  [norm('Show projects with outstanding balance')]: {
    metric: 'outstanding_balance',
    viz: 'table',
    insightHints: 'outstanding balance',
  },
  [norm('Projects pending subsidy credit')]: {
    metric: 'pending_subsidy',
    viz: 'table',
    insightHints: 'pending subsidy',
  },
  [norm('Pending subsidy projects')]: {
    metric: 'pending_subsidy',
    viz: 'table',
    insightHints: 'pending subsidy',
  },
  [norm('Revenue by salesperson')]: {
    metric: 'revenue_by_salesperson',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'revenue by salesperson',
  },
  [norm('What is my Proposal Engine status?')]: {
    metric: 'proposal_engine_buckets',
    viz: 'table',
    insightHints: 'proposal engine buckets',
  },
  [norm('Proposal Engine bucket counts')]: {
    metric: 'proposal_engine_buckets',
    viz: 'table',
    insightHints: 'proposal engine buckets',
  },
  [norm('Which customers have the highest profit?')]: {
    metric: 'top_customers_by_profit',
    viz: 'table',
    insightHints: 'top customers by profit',
  },
  [norm('Top customers by profit')]: {
    metric: 'top_customers_by_profit',
    viz: 'table',
    insightHints: 'top customers by profit',
  },
  [norm('Panel brand mix')]: {
    metric: 'panel_brand_mix',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'panel brand mix',
  },
  [norm('Which panel brands sold most?')]: {
    metric: 'panel_brand_mix',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'panel brand mix',
  },
  [norm('Loan bank breakdown')]: {
    metric: 'loan_bank_breakdown',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'loan bank mix',
  },
  [norm('Which banks are financing loans?')]: {
    metric: 'loan_bank_breakdown',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'loan bank mix',
  },
};

/**
 * Exact (case/whitespace-insensitive) match against known Ask chips.
 * Returns null when Claude (or entity salvage) should run.
 */
export function matchExactChipIntent(
  question: string,
  role: UserRole,
): ZenithNlIntent | null {
  const key = norm(question);
  const intent = CHIP_INTENT_BY_NORM[key];
  if (!intent) {
    // Also accept any role's published example string if metric is allowed.
    for (const list of Object.values(EXAMPLE_QUESTIONS_BY_ROLE)) {
      for (const chip of list) {
        if (norm(chip) === key) {
          const mapped = CHIP_INTENT_BY_NORM[norm(chip)];
          if (mapped && metricAllowedForRole(mapped.metric, role)) return { ...mapped };
        }
      }
    }
    return null;
  }
  if (!metricAllowedForRole(intent.metric, role)) return null;
  return { ...intent, filters: intent.filters ? { ...intent.filters } : undefined };
}
