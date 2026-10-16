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
  [norm('Which inverter brands sold most?')]: {
    metric: 'inverter_brand_mix',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'inverter brand mix',
  },
  [norm('Which inverter brand sold the most?')]: {
    metric: 'inverter_brand_mix',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'inverter brand mix',
  },
  [norm('which inverter brand sold the most')]: {
    metric: 'inverter_brand_mix',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'inverter brand mix',
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
  [norm('Show me the total support tickets raised')]: {
    metric: 'support_tickets_summary',
    viz: 'chart',
    chartType: 'pie',
    insightHints: 'support tickets raised',
  },
  [norm('Show open support tickets')]: {
    metric: 'support_tickets_summary',
    viz: 'chart',
    chartType: 'pie',
    filters: { ticketStatus: 'OPEN' },
    insightHints: 'open support tickets',
  },
  [norm('Show overdue support tickets')]: {
    metric: 'support_tickets_summary',
    viz: 'chart',
    chartType: 'pie',
    filters: { ticketStatus: 'OVERDUE' },
    insightHints: 'overdue support tickets',
  },
  [norm('Subsidy vs non-subsidy revenue')]: {
    metric: 'revenue_by_project_type',
    viz: 'chart',
    chartType: 'pie',
    insightHints: 'subsidy vs non-subsidy',
  },
  [norm('DCR vs Non-DCR mix')]: {
    metric: 'panel_type_mix',
    viz: 'chart',
    chartType: 'pie',
    insightHints: 'DCR mix',
  },
  [norm('Revenue by customer type')]: {
    metric: 'revenue_by_customer_type',
    viz: 'chart',
    chartType: 'pie',
    insightHints: 'customer type revenue',
  },
  [norm('Service type mix')]: {
    metric: 'service_type_mix',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'service type mix',
  },
  [norm('Roof type mix')]: {
    metric: 'roof_type_mix',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'roof type mix',
  },
  [norm('System type mix')]: {
    metric: 'system_type_mix',
    viz: 'chart',
    chartType: 'pie',
    insightHints: 'system type mix',
  },
  [norm('Capacity sold by size band')]: {
    metric: 'capacity_by_band',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'capacity bands',
  },
  [norm('Revenue by city')]: {
    metric: 'revenue_by_city',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'city revenue',
  },
  [norm('Ops workload')]: {
    metric: 'ops_workload',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'ops workload',
  },
  [norm('Project stage mix')]: {
    metric: 'project_stage_mix',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'stage mix',
  },
  [norm('SLA status indicators')]: {
    metric: 'sla_indicator_mix',
    viz: 'chart',
    chartType: 'pie',
    insightHints: 'SLA mix',
  },
  [norm('Lost to competition reasons')]: {
    metric: 'lost_competition_breakdown',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'competition lost',
  },
  [norm('Loan vs cash revenue')]: {
    metric: 'loan_vs_cash_revenue',
    viz: 'chart',
    chartType: 'pie',
    insightHints: 'loan share',
  },
  [norm('Outstanding by salesperson')]: {
    metric: 'outstanding_by_salesperson',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'AR by sales',
  },
  [norm('Profit summary')]: {
    metric: 'profit_summary',
    viz: 'table',
    insightHints: 'profit summary',
  },
  [norm('Support tickets by salesperson')]: {
    metric: 'tickets_by_salesperson',
    viz: 'chart',
    chartType: 'bar',
    insightHints: 'tickets by sales',
  },
  [norm('Compliance backlog')]: {
    metric: 'compliance_backlog',
    viz: 'table',
    insightHints: 'compliance',
  },
  [norm('Subsidy funnel')]: {
    metric: 'subsidy_funnel',
    viz: 'table',
    insightHints: 'subsidy funnel',
  },
  [norm('Payment mode mix')]: {
    metric: 'payment_mode_mix',
    viz: 'chart',
    chartType: 'pie',
    insightHints: 'payment modes',
  },
  [norm('Unpaid invoices')]: {
    metric: 'unpaid_invoices',
    viz: 'table',
    insightHints: 'unpaid invoices',
  },
  [norm('AMCs expiring')]: {
    metric: 'amc_expiring',
    viz: 'table',
    insightHints: 'AMC expiring',
  },
  [norm('Ticket resolution time')]: {
    metric: 'ticket_resolution_time',
    viz: 'table',
    insightHints: 'resolution time',
  },
  [norm('Hub plant link status')]: {
    metric: 'hub_plant_link_summary',
    viz: 'chart',
    chartType: 'pie',
    insightHints: 'hub plants',
  },
};

/**
 * Deterministic support-ticket intents (skip Claude).
 * Matches phrases like "total support tickets raised", "open tickets", "overdue tickets".
 */
export function matchSupportTicketIntent(
  question: string,
  role: UserRole,
): ZenithNlIntent | null {
  if (!metricAllowedForRole('support_tickets_summary', role)) return null;
  const q = norm(question);
  // Create/raise → Ask action (navigation), not analytics summary.
  if (/\b(create|raise|add)\b/.test(q) && /\b(support\s+)?tickets?\b/.test(q)) {
    return null;
  }
  const mentionsTickets =
    /\bsupport\s+tickets?\b/.test(q) ||
    (/\btickets?\b/.test(q) && /\b(raised|open|overdue|closed|solar\s*hub)\b/.test(q));
  if (!mentionsTickets) return null;

  if (/\boverdue\b/.test(q)) {
    return {
      metric: 'support_tickets_summary',
      viz: 'chart',
      chartType: 'pie',
      filters: { ticketStatus: 'OVERDUE' },
      insightHints: 'overdue support tickets',
    };
  }
  if (/\bin[\s-]?progress\b/.test(q)) {
    return {
      metric: 'support_tickets_summary',
      viz: 'chart',
      chartType: 'pie',
      filters: { ticketStatus: 'IN_PROGRESS' },
      insightHints: 'in-progress support tickets',
    };
  }
  if (/\bclosed\b/.test(q) && !/\bopen\b/.test(q)) {
    return {
      metric: 'support_tickets_summary',
      viz: 'chart',
      chartType: 'pie',
      filters: { ticketStatus: 'CLOSED' },
      insightHints: 'closed support tickets',
    };
  }
  if (/\bopen\b/.test(q) && !/\bclosed\b/.test(q) && !/\braised\b|\btotal\b/.test(q)) {
    return {
      metric: 'support_tickets_summary',
      viz: 'chart',
      chartType: 'pie',
      filters: { ticketStatus: 'OPEN' },
      insightHints: 'open support tickets',
    };
  }
  if (/\b(solar\s*hub|consumer\s*app)\b/.test(q)) {
    return {
      metric: 'support_tickets_summary',
      viz: 'chart',
      chartType: 'pie',
      filters: { ticketSource: 'CONSUMER_APP' },
      insightHints: 'Solar Hub support tickets',
    };
  }
  return {
    metric: 'support_tickets_summary',
    viz: 'chart',
    chartType: 'pie',
    insightHints: 'support tickets raised',
  };
}

/**
 * Deterministic mix intents for free-text "which X brand sold most" (skip Claude).
 * Prevents inverter questions from falling through to panel_brand_mix.
 */
export function matchEquipmentMixIntent(
  question: string,
  role: UserRole,
): ZenithNlIntent | null {
  const q = norm(question);
  const soldMost =
    /\b(sold\s+the\s+most|sold\s+most|brand\s+mix|brands?\s+sold|most\s+sold|top\s+brand)\b/.test(
      q,
    ) || /\bwhich\s+\w+\s+brands?\b/.test(q);
  if (!soldMost && !/\b(mix|breakdown|share)\b/.test(q)) return null;

  if (/\binverters?\b/.test(q)) {
    if (!metricAllowedForRole('inverter_brand_mix', role)) return null;
    return {
      metric: 'inverter_brand_mix',
      viz: 'chart',
      chartType: 'bar',
      insightHints: 'inverter brand mix',
    };
  }
  if (/\bpanels?\b|\bmodules?\b/.test(q)) {
    if (!metricAllowedForRole('panel_brand_mix', role)) return null;
    return {
      metric: 'panel_brand_mix',
      viz: 'chart',
      chartType: 'bar',
      insightHints: 'panel brand mix',
    };
  }
  return null;
}

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
    return (
      matchSupportTicketIntent(question, role) || matchEquipmentMixIntent(question, role)
    );
  }
  if (!metricAllowedForRole(intent.metric, role)) return null;
  return { ...intent, filters: intent.filters ? { ...intent.filters } : undefined };
}
