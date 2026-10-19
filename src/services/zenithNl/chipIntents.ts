import { UserRole } from '@prisma/client';
import {
  EXAMPLE_QUESTIONS_BY_ROLE,
  metricAllowedForRole,
  type ZenithNlIntent,
} from './catalog';
import {
  matchProjectDetailLookupIntent,
  matchProjectsOpsDetailIntent,
} from './projectDetailAsk';
import {
  matchCustomerDetailLookupIntent,
  matchCustomersListIntent,
} from './customerDetailAsk';
import { matchPipelineHealthIntent } from './pipelineHealthAsk';
import { matchProjectsListFilterIntent } from './listFilterAsk';

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
  [norm('Show my stalled pipeline')]: {
    metric: 'pipeline_health',
    viz: 'table',
    filters: { detailSlice: 'stalled' },
    insightHints: 'stalled pipeline',
  },
  [norm('Show my ageing pipeline')]: {
    metric: 'pipeline_health',
    viz: 'table',
    filters: { detailSlice: 'ageing' },
    insightHints: 'ageing pipeline',
  },
  [norm('Show my aging pipeline')]: {
    metric: 'pipeline_health',
    viz: 'table',
    filters: { detailSlice: 'ageing' },
    insightHints: 'ageing pipeline',
  },
  [norm('Give me a pipeline analysis')]: {
    metric: 'pipeline_health',
    viz: 'table',
    filters: { detailSlice: 'analysis' },
    insightHints: 'pipeline analysis',
  },
  [norm('Pipeline analysis')]: {
    metric: 'pipeline_health',
    viz: 'table',
    filters: { detailSlice: 'analysis' },
    insightHints: 'pipeline analysis',
  },
  [norm('Show all apartments in customer master')]: {
    metric: 'customers_list_slice',
    viz: 'table',
    filters: { customerType: 'APARTMENT' },
    insightHints: 'apartment customers',
  },
  [norm('List apartment customers')]: {
    metric: 'customers_list_slice',
    viz: 'table',
    filters: { customerType: 'APARTMENT' },
    insightHints: 'apartment customers',
  },
  [norm('List residential customers')]: {
    metric: 'customers_list_slice',
    viz: 'table',
    filters: { customerType: 'RESIDENTIAL' },
    insightHints: 'residential customers',
  },
  [norm('List commercial customers')]: {
    metric: 'customers_list_slice',
    viz: 'table',
    filters: { customerType: 'COMMERCIAL' },
    insightHints: 'commercial customers',
  },
  [norm('Show all residential in customer master')]: {
    metric: 'customers_list_slice',
    viz: 'table',
    filters: { customerType: 'RESIDENTIAL' },
    insightHints: 'residential customers',
  },
  [norm('Show all commercial in customer master')]: {
    metric: 'customers_list_slice',
    viz: 'table',
    filters: { customerType: 'COMMERCIAL' },
    insightHints: 'commercial customers',
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
    metric: 'installation_model_status',
    viz: 'chart',
    chartType: 'pie',
    insightHints: 'installation status (records)',
  },
  [norm('Show late-stage project status')]: {
    metric: 'install_by_status',
    viz: 'table',
    insightHints: 'late-stage project status',
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
  [norm('List all Under Installation Projects where Payment is pending')]: {
    metric: 'projects_list_slice',
    viz: 'table',
    filters: {
      projectStatus: 'UNDER_INSTALLATION',
      paymentStatus: 'NOT_FULLY_PAID',
    },
    insightHints: 'under installation not fully paid',
  },
  [norm('Under installation projects not fully paid')]: {
    metric: 'projects_list_slice',
    viz: 'table',
    filters: {
      projectStatus: 'UNDER_INSTALLATION',
      paymentStatus: 'NOT_FULLY_PAID',
    },
    insightHints: 'under installation not fully paid',
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
  [norm('Payment timeline')]: {
    metric: 'projects_ops_detail',
    viz: 'table',
    filters: { detailSlice: 'payment_timeline' },
    insightHints: 'payment timeline',
  },
  [norm('Projects with advance only')]: {
    metric: 'projects_ops_detail',
    viz: 'table',
    filters: { detailSlice: 'advance_only' },
    insightHints: 'advance only',
  },
  [norm('Projects with no P2')]: {
    metric: 'projects_ops_detail',
    viz: 'table',
    filters: { detailSlice: 'no_p2' },
    insightHints: 'no p2',
  },
  [norm('Projects with feasibility pending')]: {
    metric: 'projects_ops_detail',
    viz: 'table',
    filters: { detailSlice: 'feasibility_pending' },
    insightHints: 'feasibility pending',
  },
  [norm('Overdue commissioning')]: {
    metric: 'projects_ops_detail',
    viz: 'table',
    filters: { detailSlice: 'commissioning_overdue' },
    insightHints: 'overdue commissioning',
  },
  [norm('Confirmed projects with no documents')]: {
    metric: 'projects_ops_detail',
    viz: 'table',
    filters: { detailSlice: 'missing_documents', projectStatus: 'CONFIRMED' },
    insightHints: 'confirmed missing documents',
  },
  [norm('Projects missing documents')]: {
    metric: 'projects_ops_detail',
    viz: 'table',
    filters: { detailSlice: 'missing_documents' },
    insightHints: 'missing documents',
  },
  [norm('Hub unlinked projects')]: {
    metric: 'projects_ops_detail',
    viz: 'table',
    filters: { detailSlice: 'hub_unlinked' },
    insightHints: 'hub unlinked',
  },
  [norm('Incentive eligible projects')]: {
    metric: 'projects_ops_detail',
    viz: 'table',
    filters: { detailSlice: 'incentive_eligible' },
    insightHints: 'incentive eligible',
  },
  [norm('Lost deal details')]: {
    metric: 'projects_ops_detail',
    viz: 'table',
    filters: { detailSlice: 'lost_detail' },
    insightHints: 'lost detail',
  },
  [norm('Hub station IDs')]: {
    metric: 'projects_ops_detail',
    viz: 'table',
    filters: { detailSlice: 'hub_station_ids' },
    insightHints: 'hub station ids',
  },
  [norm('PE missing BOM')]: {
    metric: 'projects_ops_detail',
    viz: 'table',
    filters: { detailSlice: 'pe_missing_bom' },
    insightHints: 'pe missing bom',
  },
  [norm('Customer details for Ramesh')]: {
    metric: 'customer_detail_lookup',
    viz: 'table',
    filters: { search: 'Ramesh' },
    insightHints: 'customer Ramesh',
  },
  [norm('DCR vs Non-DCR profitability')]: {
    metric: 'panel_type_mix',
    viz: 'table',
    insightHints: 'dcr profitability',
  },
  [norm('Compare bank profitability')]: {
    metric: 'loan_bank_breakdown',
    viz: 'table',
    insightHints: 'bank profitability',
  },
  [norm('City profitability')]: {
    metric: 'revenue_by_city',
    viz: 'table',
    insightHints: 'city profitability',
  },
  [norm('Salesperson profitability')]: {
    metric: 'revenue_by_salesperson',
    viz: 'table',
    insightHints: 'salesperson profitability',
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
  [norm('Compare Profitability of Subsidy versus Non Subsidy Projects for last FY')]: {
    metric: 'revenue_by_project_type',
    viz: 'table',
    insightHints: 'subsidy vs non-subsidy profitability',
  },
  [norm('Compare profitability of subsidy versus non-subsidy projects')]: {
    metric: 'revenue_by_project_type',
    viz: 'table',
    insightHints: 'subsidy vs non-subsidy profitability',
  },
  [norm('List all Non Subsidy Projects this FY')]: {
    metric: 'projects_list_slice',
    viz: 'table',
    filters: { projectType: 'NON_SUBSIDY' },
    insightHints: 'non-subsidy projects',
  },
  [norm('List all Non-Subsidy Projects')]: {
    metric: 'projects_list_slice',
    viz: 'table',
    filters: { projectType: 'NON_SUBSIDY' },
    insightHints: 'non-subsidy projects',
  },
  [norm('List all Subsidy Projects')]: {
    metric: 'projects_list_slice',
    viz: 'table',
    filters: { projectType: 'SUBSIDY' },
    insightHints: 'subsidy projects',
  },
  [norm('Non subsidy projects')]: {
    metric: 'projects_list_slice',
    viz: 'table',
    filters: { projectType: 'NON_SUBSIDY' },
    insightHints: 'non-subsidy projects',
  },
  [norm('Subsidy projects')]: {
    metric: 'projects_list_slice',
    viz: 'table',
    filters: { projectType: 'SUBSIDY' },
    insightHints: 'subsidy projects',
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
  [norm('Profit summary this quarter')]: {
    metric: 'profit_summary',
    viz: 'table',
    insightHints: 'profit summary this quarter',
  },
  [norm('Profit summary last quarter')]: {
    metric: 'profit_summary',
    viz: 'table',
    insightHints: 'profit summary last quarter',
  },
  [norm('Profit summary next quarter')]: {
    metric: 'profit_summary',
    viz: 'table',
    insightHints: 'profit summary next quarter',
  },
  [norm('Profit summary this half year')]: {
    metric: 'profit_summary',
    viz: 'table',
    insightHints: 'profit summary this half year',
  },
  [norm('Profit summary last half year')]: {
    metric: 'profit_summary',
    viz: 'table',
    insightHints: 'profit summary last half year',
  },
  [norm('Revenue this quarter')]: {
    metric: 'profit_summary',
    viz: 'table',
    insightHints: 'revenue this quarter',
  },
  [norm('Revenue last quarter')]: {
    metric: 'profit_summary',
    viz: 'table',
    insightHints: 'revenue last quarter',
  },
  [norm('Quarter on quarter revenue growth')]: {
    metric: 'period_compare',
    viz: 'table',
    filters: { compareFocus: 'revenue' },
    insightHints: 'QoQ revenue',
  },
  [norm('Year on year revenue growth')]: {
    metric: 'period_compare',
    viz: 'table',
    filters: { compareFocus: 'revenue' },
    insightHints: 'YoY revenue',
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
 * Phrase salvage — free-text paraphrases that commonly hit clarify when Claude
 * is slow/unavailable. Ordered: first match wins (more specific patterns first).
 */
type PhraseSalvage = {
  test: (q: string) => boolean;
  intent: ZenithNlIntent;
};

const PHRASE_SALVAGE: PhraseSalvage[] = [
  {
    // Under installation where payment is not complete (PENDING + PARTIAL).
    test: (q) =>
      /\bunder[\s-]+installation\b/.test(q) &&
      /\b(not\s+(yet\s+)?(fully\s+)?paid|not\s+received\s+full\s+payment|haven'?t\s+received\s+full\s+payment|full\s+payment\s+not\s+received|incomplete\s+payment|payment\s+(is\s+)?pending|pending\s+payment|partial(ly)?\s+(paid|payment)|payment\s+partial|outstanding(\s+balance|\s+payment)?|balance\s+(due|pending|outstanding)|unpaid)\b/.test(
        q,
      ),
    intent: {
      metric: 'projects_list_slice',
      viz: 'table',
      filters: {
        projectStatus: 'UNDER_INSTALLATION',
        paymentStatus: 'NOT_FULLY_PAID',
      },
      insightHints: 'under installation not fully paid',
    },
  },
  {
    // List subsidy / non-subsidy projects (not mix, funnel, or pending credit).
    test: (q) =>
      !/\b(vs|versus|mix|breakdown|share|funnel|pending\s+subsidy|subsidy\s+credit)\b/.test(q) &&
      /\b(list|show|all|which)\b/.test(q) &&
      /\bprojects?\b/.test(q) &&
      /\bnon[-\s]?subsid/.test(q),
    intent: {
      metric: 'projects_list_slice',
      viz: 'table',
      filters: { projectType: 'NON_SUBSIDY' },
      insightHints: 'non-subsidy projects',
    },
  },
  {
    test: (q) =>
      !/\b(vs|versus|mix|breakdown|share|funnel|pending\s+subsidy|subsidy\s+credit|non[-\s]?subsid)\b/.test(
        q,
      ) &&
      /\b(list|show|all|which)\b/.test(q) &&
      /\bprojects?\b/.test(q) &&
      /\bsubsid/.test(q),
    intent: {
      metric: 'projects_list_slice',
      viz: 'table',
      filters: { projectType: 'SUBSIDY' },
      insightHints: 'subsidy projects',
    },
  },
  {
    // Short labels without “list” — still a project list, not revenue mix.
    test: (q) =>
      !/\b(vs|versus|mix|breakdown|share|funnel|pending\s+subsidy|subsidy\s+credit|revenue|how\s+many)\b/.test(
        q,
      ) &&
      /^(non[-\s]?subsidy|non\s+subsidy)\s+projects?\b/.test(q),
    intent: {
      metric: 'projects_list_slice',
      viz: 'table',
      filters: { projectType: 'NON_SUBSIDY' },
      insightHints: 'non-subsidy projects',
    },
  },
  {
    test: (q) =>
      !/\b(vs|versus|mix|breakdown|share|funnel|pending\s+subsidy|subsidy\s+credit|revenue|how\s+many|non[-\s]?subsid)\b/.test(
        q,
      ) && /^subsidy\s+projects?\b/.test(q),
    intent: {
      metric: 'projects_list_slice',
      viz: 'table',
      filters: { projectType: 'SUBSIDY' },
      insightHints: 'subsidy projects',
    },
  },
  // Dimension profitability cuts — before portfolio profit_summary (half year / FY dates apply).
  {
    test: (q) =>
      /\bsales(?:person|people|man)?\b/.test(q) &&
      /\b(profit|margin|profitability)\b/.test(q) &&
      !/\bprofit\s+summary\b/.test(q) &&
      !/\btickets?\b/.test(q),
    intent: {
      metric: 'revenue_by_salesperson',
      viz: 'table',
      insightHints: 'salesperson profitability',
    },
  },
  {
    test: (q) =>
      /\b(bank|financing)\b/.test(q) &&
      /\b(profit|margin|profitability)\b/.test(q) &&
      !/\bprofit\s+summary\b/.test(q),
    intent: {
      metric: 'loan_bank_breakdown',
      viz: 'table',
      insightHints: 'bank profitability',
    },
  },
  {
    test: (q) =>
      /\bcit(y|ies)\b/.test(q) &&
      /\b(profit|margin|profitability)\b/.test(q) &&
      !/\brevenue\s+by\s+city\b/.test(q) &&
      !/\bprofit\s+summary\b/.test(q),
    intent: {
      metric: 'revenue_by_city',
      viz: 'table',
      insightHints: 'city profitability',
    },
  },
  {
    test: (q) =>
      /\bdcr\b/.test(q) &&
      /\b(profit|margin|profitability)\b/.test(q),
    intent: {
      metric: 'panel_type_mix',
      viz: 'table',
      insightHints: 'dcr profitability',
    },
  },
  {
    // Single-period revenue / profitability (dates come from relativeDates on the question).
    test: (q) =>
      !/\b(quarter[\s-]?on[\s-]?quarter|quarter[\s-]?over[\s-]?quarter|\bqoq\b|year[\s-]?on[\s-]?year|\byoy\b|versus|vs\.?|compared\s+to)\b/.test(
        q,
      ) &&
      !/\b(sales(?:person|people|man)?|bank|cit(y|ies)|dcr|panel\s+type)\b.{0,20}\b(profit|margin|profitability)\b/.test(
        q,
      ) &&
      !/\b(profit|margin|profitability)\b.{0,20}\b(by\s+)?(sales(?:person|people|man)?|bank|cit(y|ies)|dcr)\b/.test(
        q,
      ) &&
      ((/\b(profit\s+summary|gross\s+profit|margin\s+summary|how\s+(much|is)\s+(our\s+)?profit|what('?s|\s+is)\s+(our\s+)?profit)\b/.test(
        q,
      ) ||
        /\b(show|give)\s+(me\s+)?(the\s+)?profit\b/.test(q) ||
        (/\b(revenue|order\s+value|profitability)\b/.test(q) &&
          /\b(this|last|next|current|previous|prior|upcoming)\s+(quarter|half[\s-]?year|halfyear|fy|financial\s+year|month)\b/.test(
            q,
          ))) &&
        !/\b(by\s+(city|sales|lead|type)|loan\s+vs|panel|inverter)\b/.test(q)),
    intent: { metric: 'profit_summary', viz: 'table', insightHints: 'profit summary' },
  },
  {
    test: (q) =>
      /\b(ops\s+workload|operations?\s+workload|ops\s+(load|capacity)|how\s+(busy|loaded)\s+(is\s+)?ops)\b/.test(
        q,
      ),
    intent: {
      metric: 'ops_workload',
      viz: 'chart',
      chartType: 'bar',
      insightHints: 'ops workload',
    },
  },
  {
    test: (q) =>
      /\b(compliance\s+backlog|compliance\s+gaps?|kseb\s+(backlog|gaps?|pending)|mnre\s+(backlog|pending)|subsidy\s+compliance)\b/.test(
        q,
      ),
    intent: { metric: 'compliance_backlog', viz: 'table', insightHints: 'compliance' },
  },
  {
    test: (q) =>
      /\b(hub\s+plant|plant\s+link|linked\s+plants?|hub\s+plants?\s+(link\s+)?status|plants?\s+linked\s+to\s+(the\s+)?hub)\b/.test(
        q,
      ) ||
      (/\b(solis|deye|sunways)\b/.test(q) &&
        /\b(hub|station\s+id|plant\s+link|linked\s+to\s+hub)\b/.test(q)),
    intent: {
      metric: 'hub_plant_link_summary',
      viz: 'chart',
      chartType: 'pie',
      insightHints: 'hub plants',
    },
  },
  {
    test: (q) =>
      /\b(outstanding\s+by\s+sales|ar\s+by\s+sales|receivables?\s+by\s+sales|who\s+has\s+(the\s+)?(most\s+)?outstanding)\b/.test(
        q,
      ),
    intent: {
      metric: 'outstanding_by_salesperson',
      viz: 'chart',
      chartType: 'bar',
      insightHints: 'AR by sales',
    },
  },
  {
    test: (q) =>
      /\b(loan\s+vs\s+cash|cash\s+vs\s+loan|loan\s+share|financing\s+mix|how\s+much\s+(is\s+)?on\s+loan)\b/.test(
        q,
      ),
    intent: {
      metric: 'loan_vs_cash_revenue',
      viz: 'chart',
      chartType: 'pie',
      insightHints: 'loan share',
    },
  },
  {
    test: (q) =>
      /\b(payment\s+mode|upi\s+vs\s+bank|how\s+(did|do)\s+(customers?\s+)?pay|cheque\s+vs\s+upi)\b/.test(
        q,
      ),
    intent: {
      metric: 'payment_mode_mix',
      viz: 'chart',
      chartType: 'pie',
      insightHints: 'payment modes',
    },
  },
  {
    test: (q) =>
      /\b(unpaid\s+invoices?|invoices?\s+(that\s+are\s+)?unpaid|open\s+invoices?|part[- ]?paid\s+invoices?)\b/.test(
        q,
      ),
    intent: { metric: 'unpaid_invoices', viz: 'table', insightHints: 'unpaid invoices' },
  },
  {
    test: (q) =>
      /\b(amcs?\s+expir|expir\w*\s+amcs?|amc\s+(ending|due)|warranty\s+expir)/.test(q),
    intent: { metric: 'amc_expiring', viz: 'table', insightHints: 'AMC expiring' },
  },
  {
    test: (q) =>
      /\b(subsidy\s+funnel|subsidy\s+(pipeline|status|stages?)|where\s+are\s+subsidy\s+projects)\b/.test(
        q,
      ),
    intent: { metric: 'subsidy_funnel', viz: 'table', insightHints: 'subsidy funnel' },
  },
  {
    test: (q) =>
      /\b(revenue\s+by\s+cit(y|ies)|city\s+revenue|which\s+cit(y|ies)\s+(drove|sold|earned))\b/.test(
        q,
      ),
    intent: {
      metric: 'revenue_by_city',
      viz: 'chart',
      chartType: 'bar',
      insightHints: 'city revenue',
    },
  },
  {
    test: (q) =>
      /\b(sla\s+(status|mix|indicators?)|red\s+sla|amber\s+sla|projects?\s+on\s+(red|amber)\s+sla)\b/.test(
        q,
      ),
    intent: {
      metric: 'sla_indicator_mix',
      viz: 'chart',
      chartType: 'pie',
      insightHints: 'SLA mix',
    },
  },
  {
    test: (q) =>
      /\b(project\s+stage\s+mix|stage\s+mix|mix\s+by\s+stage|breakdown\s+by\s+project\s+stage)\b/.test(
        q,
      ),
    intent: {
      metric: 'project_stage_mix',
      viz: 'chart',
      chartType: 'bar',
      insightHints: 'stage mix',
    },
  },
  {
    test: (q) =>
      /\b(ticket\s+resolution|resolution\s+time|how\s+long\s+to\s+(close|resolve)\s+tickets?|avg(erage)?\s+ticket\s+(close|resolve))\b/.test(
        q,
      ),
    intent: {
      metric: 'ticket_resolution_time',
      viz: 'table',
      insightHints: 'resolution time',
    },
  },
  {
    test: (q) =>
      /\b(tickets?\s+by\s+sales|support\s+by\s+sales|which\s+salesperson\s+has\s+(the\s+)?most\s+tickets?)\b/.test(
        q,
      ),
    intent: {
      metric: 'tickets_by_salesperson',
      viz: 'chart',
      chartType: 'bar',
      insightHints: 'tickets by sales',
    },
  },
  {
    test: (q) =>
      /\bsubsid/.test(q) &&
      /\bnon[-\s]?subsid/.test(q) &&
      /\b(versus|vs\.?|compared\s+to|compared\s+with|compare[d]?)\b/.test(q) &&
      /\b(profit|margin|profitability)\b/.test(q),
    intent: {
      metric: 'revenue_by_project_type',
      viz: 'table',
      insightHints: 'subsidy vs non-subsidy profitability',
    },
  },
  {
    test: (q) =>
      /\b(subsidy\s+vs\s+non[- ]?subsidy|non[- ]?subsidy\s+vs\s+subsidy|subsidy\s+mix\s+revenue)\b/.test(
        q,
      ) && !/\b(profit|margin|profitability)\b/.test(q),
    intent: {
      metric: 'revenue_by_project_type',
      viz: 'chart',
      chartType: 'pie',
      insightHints: 'subsidy vs non-subsidy',
    },
  },
  {
    test: (q) =>
      /\b(dcr\s+vs\s+non[- ]?dcr|panel\s+type\s+mix|dcr\s+mix)\b/.test(q),
    intent: {
      metric: 'panel_type_mix',
      viz: 'chart',
      chartType: 'pie',
      insightHints: 'DCR mix',
    },
  },
  {
    test: (q) =>
      /\b(lead\s+sources?\s+(drove|revenue|mix)|revenue\s+by\s+lead\s+source|which\s+lead\s+sources?)\b/.test(
        q,
      ),
    intent: {
      metric: 'revenue_by_lead_source',
      viz: 'chart',
      chartType: 'bar',
      insightHints: 'revenue by lead source',
    },
  },
  {
    test: (q) =>
      /\b(pipeline\s+by\s+stage|show\s+(my\s+)?pipeline|deals?\s+by\s+stage)\b/.test(q) &&
      !/\blost\b/.test(q) &&
      !/\b(stalled|age?ing|aeging|analys[ei]s|health|at[- ]?risk|stuck|neglected)\b/.test(q),
    intent: {
      metric: 'pipeline_by_stage',
      viz: 'table',
      insightHints: 'pipeline by stage',
    },
  },
  {
    test: (q) =>
      /\b(lost\s+deals?\s+by\s+reason|summaris[ea]\s+(my\s+)?lost\s+deals?|why\s+(did\s+we\s+)?lose)\b/.test(
        q,
      ) ||
      (/\blost\s+deals?\b/.test(q) && /\b(reason|summary|summar)/.test(q)),
    intent: {
      metric: 'lost_deals_summary',
      viz: 'table',
      insightHints: 'lost deals by reason',
    },
  },
  {
    test: (q) =>
      /\b(outstanding\s+balance|projects?\s+with\s+outstanding|who\s+owes|balance\s+outstanding)\b/.test(
        q,
      ) && !/\bby\s+sales/.test(q),
    intent: {
      metric: 'outstanding_balance',
      viz: 'table',
      insightHints: 'outstanding balance',
    },
  },
  {
    test: (q) =>
      /\b(payment\s+status|payments?\s+breakdown|paid\s+vs\s+pending)\b/.test(q) &&
      !/\bmode\b/.test(q),
    intent: {
      metric: 'payment_status_breakdown',
      viz: 'chart',
      chartType: 'pie',
      insightHints: 'payment status',
    },
  },
  {
    test: (q) =>
      /\b(pending\s+subsidy|subsidy\s+credit\s+pending|awaiting\s+subsidy)\b/.test(q),
    intent: {
      metric: 'pending_subsidy',
      viz: 'table',
      insightHints: 'pending subsidy',
    },
  },
  {
    test: (q) =>
      /\b(availing\s+loan|on\s+loan|loan\s+projects?|projects?\s+(that\s+are\s+)?financed)\b/.test(
        q,
      ) && !/\b(vs\s+cash|share|bank)\b/.test(q),
    intent: {
      metric: 'availing_loan',
      viz: 'table',
      filters: { availingLoan: true },
      insightHints: 'availing loan',
    },
  },
  {
    test: (q) =>
      /\b(loan\s+bank|which\s+banks?\s+(are\s+)?financ|financing\s+banks?|bank\s+breakdown)\b/.test(
        q,
      ),
    intent: {
      metric: 'loan_bank_breakdown',
      viz: 'chart',
      chartType: 'bar',
      insightHints: 'loan bank mix',
    },
  },
  {
    test: (q) =>
      /\b(top\s+customers?\s+by\s+profit|highest\s+profit\s+customers?|most\s+profitable\s+customers?)\b/.test(
        q,
      ),
    intent: {
      metric: 'top_customers_by_profit',
      viz: 'table',
      insightHints: 'top customers by profit',
    },
  },
  {
    test: (q) =>
      /\b(revenue\s+by\s+sales|which\s+salesperson\s+(drove|sold|earned)|sales\s+team\s+revenue)\b/.test(
        q,
      ),
    intent: {
      metric: 'revenue_by_salesperson',
      viz: 'chart',
      chartType: 'bar',
      insightHints: 'revenue by salesperson',
    },
  },
  {
    test: (q) =>
      /\b(proposal\s+engine|pe\s+(status|buckets?)|proposal[- ]ready)\b/.test(q),
    intent: {
      metric: 'proposal_engine_buckets',
      viz: 'table',
      insightHints: 'proposal engine buckets',
    },
  },
  {
    // Installation Status field (Pending / In progress / Completed records)
    test: (q) =>
      /\binstallation\s+status\b/.test(q) ||
      /\binstall(?:ation)?\s+records?\b/.test(q) ||
      (/\binstall(?:ation)?\s+(pending|in\s+progress|completed)\b/.test(q) &&
        /\b(mix|breakdown|by\s+status|how\s+many)\b/.test(q)),
    intent: {
      metric: 'installation_model_status',
      viz: 'chart',
      chartType: 'pie',
      insightHints: 'installation status (records)',
    },
  },
  {
    // Late-stage Project Status cohort (Under installation → Subsidy credited)
    test: (q) =>
      /\b(late[\s-]?stage\s+project\s+status|install\s+by\s+status|project\s+status\s+under\s+installation)\b/.test(
        q,
      ),
    intent: {
      metric: 'install_by_status',
      viz: 'table',
      insightHints: 'late-stage project status',
    },
  },
  {
    test: (q) =>
      /\b(lost\s+to\s+competition|competition\s+(lost|reasons?))\b/.test(q),
    intent: {
      metric: 'lost_competition_breakdown',
      viz: 'chart',
      chartType: 'bar',
      insightHints: 'competition lost',
    },
  },
  {
    test: (q) =>
      /\b(capacity\s+(sold\s+)?by\s+(size\s+)?band|kw\s+bands?|size\s+band)\b/.test(q),
    intent: {
      metric: 'capacity_by_band',
      viz: 'chart',
      chartType: 'bar',
      insightHints: 'capacity bands',
    },
  },
  {
    test: (q) =>
      /\b(customer\s+type\s+(mix|revenue)|revenue\s+by\s+customer\s+type)\b/.test(q),
    intent: {
      metric: 'revenue_by_customer_type',
      viz: 'chart',
      chartType: 'pie',
      insightHints: 'customer type revenue',
    },
  },
  {
    test: (q) => /\b(roof\s+type\s+mix|mix\s+by\s+roof)\b/.test(q),
    intent: {
      metric: 'roof_type_mix',
      viz: 'chart',
      chartType: 'bar',
      insightHints: 'roof type mix',
    },
  },
  {
    test: (q) => /\b(system\s+type\s+mix|on[- ]grid\s+vs\s+off[- ]grid|hybrid\s+mix)\b/.test(q),
    intent: {
      metric: 'system_type_mix',
      viz: 'chart',
      chartType: 'pie',
      insightHints: 'system type mix',
    },
  },
  {
    test: (q) => /\b(service\s+type\s+mix|mix\s+by\s+service\s+type)\b/.test(q),
    intent: {
      metric: 'service_type_mix',
      viz: 'chart',
      chartType: 'bar',
      insightHints: 'service type mix',
    },
  },
];

/**
 * Fuzzy paraphrase → catalog metric (skip Claude when confident).
 */
export function matchPhraseChipIntent(
  question: string,
  role: UserRole,
): ZenithNlIntent | null {
  const q = norm(question);
  if (!q || q.length < 4) return null;
  for (const row of PHRASE_SALVAGE) {
    if (!row.test(q)) continue;
    if (!metricAllowedForRole(row.intent.metric, role)) return null;
    return {
      ...row.intent,
      filters: row.intent.filters ? { ...row.intent.filters } : undefined,
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
      matchPipelineHealthIntent(question, role) ||
      matchCustomerDetailLookupIntent(question, role) ||
      matchCustomersListIntent(question, role) ||
      matchProjectDetailLookupIntent(question, role) ||
      matchProjectsOpsDetailIntent(question, role) ||
      matchProjectsListFilterIntent(question, role) ||
      matchSupportTicketIntent(question, role) ||
      matchEquipmentMixIntent(question, role) ||
      matchPhraseChipIntent(question, role)
    );
  }
  if (!metricAllowedForRole(intent.metric, role)) return null;
  return { ...intent, filters: intent.filters ? { ...intent.filters } : undefined };
}
