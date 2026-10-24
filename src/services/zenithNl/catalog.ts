import { UserRole } from '@prisma/client';

/** Closed metric catalog for Zenith NL Ask. */
export const ZENITH_NL_METRICS = [
  'revenue_by_lead_source',
  'revenue_by_salesperson',
  'pipeline_by_stage',
  'pipeline_health',
  'who_to_call',
  'payment_status_breakdown',
  'capacity_sold',
  'outstanding_balance',
  'top_customers_by_profit',
  'lost_deals_summary',
  'proposal_engine_buckets',
  'projects_list_slice',
  'cohort_summary',
  'panel_brand_mix',
  'inverter_brand_mix',
  'loan_bank_breakdown',
  'support_tickets_summary',
  'install_by_status',
  'pending_subsidy',
  'availing_loan',
  'revenue_by_project_type',
  'revenue_by_customer_type',
  'service_type_mix',
  'panel_type_mix',
  'roof_type_mix',
  'system_type_mix',
  'capacity_by_band',
  'revenue_by_city',
  'ops_workload',
  'project_stage_mix',
  'sla_indicator_mix',
  'lost_competition_breakdown',
  'loan_vs_cash_revenue',
  'outstanding_by_salesperson',
  'profit_summary',
  'tickets_by_salesperson',
  'compliance_backlog',
  'subsidy_funnel',
  'installation_model_status',
  'payment_mode_mix',
  'unpaid_invoices',
  'amc_expiring',
  'ticket_resolution_time',
  'hub_plant_link_summary',
  'period_compare',
  'project_detail_lookup',
  'projects_ops_detail',
  'customer_detail_lookup',
  'customers_list_slice',
  'clarify',
] as const;

export type ZenithNlMetric = (typeof ZENITH_NL_METRICS)[number];

export type ZenithNlVizKind = 'chart' | 'table';
export type ZenithNlChartType = 'bar' | 'pie';

export type ZenithNlIntent = {
  metric: ZenithNlMetric;
  viz: ZenithNlVizKind;
  chartType?: ZenithNlChartType;
  filters?: {
    /** CRM project stage: LEAD, SITE_SURVEY, PROPOSAL, CONFIRMED, UNDER_INSTALLATION, … */
    projectStatus?: string;
    /** Customer payment: PENDING | PARTIAL | FULLY_PAID | NOT_FULLY_PAID */
    paymentStatus?: string;
    /** Installation record status: PENDING | IN_PROGRESS | COMPLETED (not project stage) */
    installationStatus?: string;
    peBucket?: 'proposal-ready' | 'draft' | 'not-started' | 'rest' | 'active';
    leadSource?: string;
    search?: string;
    /** Canonical panel brand label (e.g. Adani Solar) or distinctive token. */
    panelBrand?: string;
    /** Canonical inverter brand label (e.g. Deye). */
    inverterBrand?: string;
    /** Stored financingBank enum (e.g. SBI, HDFC_BANK). */
    financingBank?: string;
    /** Restrict to projects availing loan. */
    availingLoan?: boolean;
    /** Support ticket status: OPEN | IN_PROGRESS | CLOSED | OVERDUE (queue focus) */
    ticketStatus?: string;
    /** Support ticket source: CRM | CONSUMER_APP */
    ticketSource?: string;
    /** Project.type: SUBSIDY | NON_SUBSIDY */
    projectType?: string;
    /** Project.projectServiceType enum */
    projectServiceType?: string;
    /** Customer.customerType enum */
    customerType?: string;
    /** Panel type: DCR | Non-DCR */
    panelType?: string;
    /** SystemType: ON_GRID | OFF_GRID | HYBRID */
    systemType?: string;
    /** Roof type label (e.g. Metal, Concrete-Flat) */
    roofType?: string;
    /** System capacity kW inclusive bounds */
    capacityMin?: number;
    capacityMax?: number;
    /** Salesperson display name (resolved to id at exec) */
    salespersonName?: string;
    /** Projects with no salesperson */
    salespersonUnassigned?: boolean;
    /** Customer city contains */
    city?: string;
    /** Ops person display name (resolved at exec) */
    opsName?: string;
    /** Project.projectStage enum */
    projectStage?: string;
    /** SLA statusIndicator: GREEN | AMBER | RED */
    statusIndicator?: string;
    /** Projects with null leadSource */
    leadSourceIsNull?: boolean;
    incentiveEligible?: boolean;
    hasDocuments?: boolean;
    /** Projects with no uploaded documents */
    missingDocuments?: boolean;
    /** Completed subsidy projects (Projects list pendingSubsidy) */
    pendingSubsidy?: boolean;
    lifecycleSpecsIncomplete?: boolean;
    dataSenseNeedsReview?: boolean;
    /** Any of solis/deye/sunways station ids set */
    hubPlantLinked?: boolean;
    panelCapacityWMin?: number;
    panelCapacityWMax?: number;
    inverterCapacityKwMin?: number;
    inverterCapacityKwMax?: number;
    /** YoY / QoQ compare focus for period_compare */
    compareFocus?: 'revenue' | 'margin' | 'profit' | 'all';
    /**
     * Ops/detail list slice for projects_ops_detail
     * (payment_timeline, feasibility_pending, missing_documents, pe_missing_bom, …).
     */
    detailSlice?: string;
  };
  insightHints?: string;
};

export type ZenithNlPriorContext = {
  question: string;
  metric: string;
  filters?: ZenithNlIntent['filters'];
};

export type ZenithNlTableColumn = { key: string; label: string };
/** Row cells plus optional drill-down `href` (not rendered as a column). */
export type ZenithNlTableRow = {
  href?: string;
  [key: string]: string | number | null | undefined;
};

export type ZenithNlChartSeriesPoint = {
  label: string;
  value: number;
  count?: number;
  /** Optional Projects / Tickets drill-down for this slice. */
  href?: string;
};

export type ZenithNlViz =
  | {
      kind: 'table';
      title: string;
      columns: ZenithNlTableColumn[];
      rows: ZenithNlTableRow[];
    }
  | {
      kind: 'chart';
      title: string;
      chartType: ZenithNlChartType;
      series: ZenithNlChartSeriesPoint[];
      valueLabel?: string;
    };

export type ZenithNlEffectiveDateFilter = {
  selectedFYs: string[];
  selectedQuarters: string[];
  selectedMonths: string[];
  /** command_bar = Zenith filters; question = relative/explicit phrase in the Ask. */
  source: 'command_bar' | 'question';
  /** e.g. "last FY (2024-25)" when source is question. */
  phrase?: string;
};

export type ZenithNlQueryMetricSuccess = {
  ok: true;
  kind: 'metric';
  question: string;
  insight: string;
  viz: ZenithNlViz;
  projectsHref: string | null;
  intent: ZenithNlIntent;
  suggestedQuestions?: string[];
  followUps?: string[];
  effectiveDateFilter?: ZenithNlEffectiveDateFilter;
  /** True when intent came from an exact example-chip match (no Claude). */
  chipMatch?: boolean;
};

/** Navigate / create from the Ask box (not an analytics answer). */
export type ZenithNlQueryActionSuccess = {
  ok: true;
  kind: 'action';
  question: string;
  action: string;
  label: string;
  message: string;
  href: string;
  autoNavigate: boolean;
  suggestedQuestions?: string[];
  chipMatch?: boolean;
  effectiveDateFilter?: ZenithNlEffectiveDateFilter;
};

export type ZenithNlQuerySuccess = ZenithNlQueryMetricSuccess | ZenithNlQueryActionSuccess;

/** Role-filtered metric browser for clarify UX. */
export type ZenithNlCatalogHint = {
  metric: ZenithNlMetric;
  title: string;
  description: string;
  /** Short question to run when the user picks this catalog row. */
  ask: string;
};

/** Empty project/customer lookup → clarify with did-you-mean asks. */
export type ZenithNlLookupMiss = {
  query: string;
  suggestions: string[];
};

export type ZenithNlQueryClarify = {
  ok: false;
  clarify: true;
  question: string;
  message: string;
  suggestedQuestions: string[];
  /** Searchable catalog of metrics allowed for this role. */
  catalogHints?: ZenithNlCatalogHint[];
  effectiveDateFilter?: ZenithNlEffectiveDateFilter;
};

export type ZenithNlQueryResult = ZenithNlQuerySuccess | ZenithNlQueryClarify;

const ALL_ASK: UserRole[] = [
  UserRole.SALES,
  UserRole.MANAGEMENT,
  UserRole.ADMIN,
  UserRole.OPERATIONS,
  UserRole.FINANCE,
];
const EXEC: UserRole[] = [UserRole.SALES, UserRole.MANAGEMENT, UserRole.ADMIN];
/** Lost deals: Sales sees own book (salespersonId scoped in the route). */
const LOST_DEALS_ROLES: UserRole[] = [
  UserRole.SALES,
  UserRole.MANAGEMENT,
  UserRole.ADMIN,
];
const FINANCE_PLUS: UserRole[] = [
  UserRole.FINANCE,
  UserRole.MANAGEMENT,
  UserRole.ADMIN,
  UserRole.SALES,
];
const OPS_PLUS: UserRole[] = [
  UserRole.OPERATIONS,
  UserRole.MANAGEMENT,
  UserRole.ADMIN,
];
/** Install status: Ops pack + Sales own-book. */
const INSTALL_ROLES: UserRole[] = [...OPS_PLUS, UserRole.SALES];
/** Mix charts for exec finance stakeholders. */
const MIX_CHART_ROLES: UserRole[] = [
  UserRole.MANAGEMENT,
  UserRole.ADMIN,
  UserRole.FINANCE,
];
/** Support Tickets module roles (Finance has no tickets queue). */
const SUPPORT_TICKET_ROLES: UserRole[] = [
  UserRole.SALES,
  UserRole.OPERATIONS,
  UserRole.MANAGEMENT,
  UserRole.ADMIN,
];

export type MetricCatalogEntry = {
  metric: ZenithNlMetric;
  description: string;
  defaultViz: ZenithNlVizKind;
  defaultChartType?: ZenithNlChartType;
  roles: UserRole[];
};

export const METRIC_CATALOG: MetricCatalogEntry[] = [
  {
    metric: 'revenue_by_lead_source',
    description: 'Revenue (order value) grouped by lead source for confirmed/completed deals',
    defaultViz: 'chart',
    defaultChartType: 'bar',
    roles: [...EXEC, UserRole.FINANCE],
  },
  {
    metric: 'revenue_by_salesperson',
    description: 'Revenue (order value) grouped by salesperson',
    defaultViz: 'chart',
    defaultChartType: 'bar',
    roles: EXEC,
  },
  {
    metric: 'pipeline_by_stage',
    description:
      'Open pipeline deal counts, order value, and expected value (order value × Sales Probability) by stage',
    defaultViz: 'table',
    roles: [...EXEC, UserRole.OPERATIONS, UserRole.FINANCE],
  },
  {
    metric: 'pipeline_health',
    description:
      'Stalled / ageing pipeline and Deal Health analysis (quiet deals, over-SLA stages, weakest scores)',
    defaultViz: 'table',
    roles: [...EXEC, UserRole.OPERATIONS],
  },
  {
    metric: 'who_to_call',
    description:
      'Who to call today: Hit List (overdue / stalled / going cold) plus outstanding payment chase — named people with a reason',
    defaultViz: 'table',
    roles: ALL_ASK,
  },
  {
    metric: 'payment_status_breakdown',
    description: 'Payment status counts and outstanding balance',
    defaultViz: 'chart',
    defaultChartType: 'pie',
    roles: FINANCE_PLUS,
  },
  {
    metric: 'capacity_sold',
    description: 'System capacity (kW) sold for revenue-stage projects',
    defaultViz: 'table',
    roles: [...EXEC, UserRole.OPERATIONS, UserRole.FINANCE],
  },
  {
    metric: 'outstanding_balance',
    description: 'Projects with outstanding balance (amount due)',
    defaultViz: 'table',
    roles: FINANCE_PLUS,
  },
  {
    metric: 'top_customers_by_profit',
    description: 'Top customers by gross profit',
    defaultViz: 'table',
    roles: EXEC,
  },
  {
    metric: 'lost_deals_summary',
    description:
      'Lost deals summary by reason (Management / Admin company-wide; Sales own book)',
    defaultViz: 'table',
    roles: LOST_DEALS_ROLES,
  },
  {
    metric: 'proposal_engine_buckets',
    description:
      'Proposal Engine bucket counts (Ready, Draft, Not Yet Created, Rest). For a deal list use projects_list_slice with peBucket active|proposal-ready|draft',
    defaultViz: 'table',
    roles: EXEC,
  },
  {
    metric: 'projects_list_slice',
    description:
      'Show a filtered list of projects/deals matching status, payment, PE bucket (including active = PE Ready or Draft), customer search, panel brand, inverter brand, or financing bank. Lost + active PE → projectStatus=LOST and peBucket=active',
    defaultViz: 'table',
    roles: ALL_ASK,
  },
  {
    metric: 'cohort_summary',
    description:
      'Count + total order value for a filtered cohort — use for how-many / revenue questions about panel brand, inverter brand, financing bank, or loan projects (e.g. Adani panels, Deye inverters, SBI loans)',
    defaultViz: 'table',
    roles: ALL_ASK,
  },
  {
    metric: 'panel_brand_mix',
    description:
      'Project count and order value grouped by panel brand (mix / share chart). Use for panel brands sold most — NOT for inverters.',
    defaultViz: 'chart',
    defaultChartType: 'bar',
    roles: MIX_CHART_ROLES,
  },
  {
    metric: 'inverter_brand_mix',
    description:
      'Project count and order value grouped by inverter brand (mix / share chart). Use for inverter brands sold most / which inverter sold most — NOT for panels.',
    defaultViz: 'chart',
    defaultChartType: 'bar',
    roles: MIX_CHART_ROLES,
  },
  {
    metric: 'loan_bank_breakdown',
    description:
      'Availing-loan projects grouped by financing bank (bank mix chart)',
    defaultViz: 'chart',
    defaultChartType: 'bar',
    roles: MIX_CHART_ROLES,
  },
  {
    metric: 'support_tickets_summary',
    description:
      'Open / overdue / oldest / mine ticket queue (one row per ticket with age and owner) or a status pie for totals raised. Date filters apply to ticket created date.',
    defaultViz: 'chart',
    defaultChartType: 'pie',
    roles: SUPPORT_TICKET_ROLES,
  },
  {
    metric: 'revenue_by_project_type',
    description:
      'Revenue (order value) and deal counts for Subsidy vs Non-Subsidy projects',
    defaultViz: 'chart',
    defaultChartType: 'pie',
    roles: MIX_CHART_ROLES,
  },
  {
    metric: 'revenue_by_customer_type',
    description:
      'Revenue (order value) by customer type: Residential, Apartment, Commercial',
    defaultViz: 'chart',
    defaultChartType: 'pie',
    roles: MIX_CHART_ROLES,
  },
  {
    metric: 'service_type_mix',
    description:
      'Projects grouped by service type (EPC, Panel Cleaning, Maintenance, Repair, etc.)',
    defaultViz: 'chart',
    defaultChartType: 'bar',
    roles: [...OPS_PLUS, UserRole.SALES, UserRole.FINANCE],
  },
  {
    metric: 'panel_type_mix',
    description: 'DCR vs Non-DCR panel type mix (count and order value)',
    defaultViz: 'chart',
    defaultChartType: 'pie',
    roles: MIX_CHART_ROLES,
  },
  {
    metric: 'roof_type_mix',
    description: 'Projects grouped by roof type (Concrete-Flat, Metal, Tile, etc.)',
    defaultViz: 'chart',
    defaultChartType: 'bar',
    roles: [...OPS_PLUS, UserRole.SALES, UserRole.MANAGEMENT, UserRole.ADMIN],
  },
  {
    metric: 'system_type_mix',
    description: 'On-grid vs Off-grid vs Hybrid system type mix',
    defaultViz: 'chart',
    defaultChartType: 'pie',
    roles: MIX_CHART_ROLES,
  },
  {
    metric: 'capacity_by_band',
    description:
      'Projects and capacity sold by system size band (under 3 kW, 3–5, 6–10, above 10 kW)',
    defaultViz: 'chart',
    defaultChartType: 'bar',
    roles: [...MIX_CHART_ROLES, UserRole.OPERATIONS, UserRole.SALES],
  },
  {
    metric: 'revenue_by_city',
    description: 'Revenue (order value) grouped by customer city',
    defaultViz: 'chart',
    defaultChartType: 'bar',
    roles: MIX_CHART_ROLES,
  },
  {
    metric: 'ops_workload',
    description: 'Active install-stage projects counted by assigned ops person',
    defaultViz: 'chart',
    defaultChartType: 'bar',
    roles: [...OPS_PLUS, UserRole.ADMIN],
  },
  {
    metric: 'project_stage_mix',
    description: 'Projects grouped by lifecycle projectStage (Survey → AMC)',
    defaultViz: 'chart',
    defaultChartType: 'bar',
    roles: [...OPS_PLUS, UserRole.SALES, UserRole.MANAGEMENT, UserRole.ADMIN],
  },
  {
    metric: 'sla_indicator_mix',
    description: 'SLA status indicators GREEN / AMBER / RED on open projects',
    defaultViz: 'chart',
    defaultChartType: 'pie',
    roles: [...OPS_PLUS, UserRole.MANAGEMENT, UserRole.ADMIN],
  },
  {
    metric: 'lost_competition_breakdown',
    description: 'Lost-to-competition deals by subtype (price, features, timeline, brand, relationship)',
    defaultViz: 'chart',
    defaultChartType: 'bar',
    roles: LOST_DEALS_ROLES,
  },
  {
    metric: 'loan_vs_cash_revenue',
    description: 'Share of revenue on availing-loan vs not-on-loan projects',
    defaultViz: 'chart',
    defaultChartType: 'pie',
    roles: FINANCE_PLUS,
  },
  {
    metric: 'outstanding_by_salesperson',
    description: 'Outstanding balance grouped by salesperson',
    defaultViz: 'chart',
    defaultChartType: 'bar',
    roles: FINANCE_PLUS,
  },
  {
    metric: 'profit_summary',
    description:
      'Totals: order value, gross profit, avg margin %, collected, outstanding, capacity',
    defaultViz: 'table',
    roles: FINANCE_PLUS,
  },
  {
    metric: 'period_compare',
    description:
      'YoY (this FY vs last FY) or QoQ (this quarter vs last quarter) comparison for revenue (order value), gross profit, and avg margin %',
    defaultViz: 'table',
    roles: FINANCE_PLUS,
  },
  {
    metric: 'tickets_by_salesperson',
    description: 'Support ticket volume grouped by project salesperson',
    defaultViz: 'chart',
    defaultChartType: 'bar',
    roles: SUPPORT_TICKET_ROLES,
  },
  {
    metric: 'compliance_backlog',
    description:
      'Subsidy compliance gaps: KSEB feasibility/registration, install, MNRE portal, subsidy credit',
    defaultViz: 'table',
    roles: [...OPS_PLUS, UserRole.MANAGEMENT, UserRole.ADMIN],
  },
  {
    metric: 'subsidy_funnel',
    description: 'Subsidy projects by late status (Confirmed → Subsidy credited)',
    defaultViz: 'table',
    roles: [...OPS_PLUS, UserRole.FINANCE, UserRole.MANAGEMENT, UserRole.ADMIN],
  },
  {
    metric: 'installation_model_status',
    description:
      'Installation Status (Installation records): Pending / In progress / Completed — not Project Status',
    defaultViz: 'chart',
    defaultChartType: 'pie',
    roles: INSTALL_ROLES,
  },
  {
    metric: 'payment_mode_mix',
    description: 'Invoice payment amounts by mode (UPI / Bank / Cheque)',
    defaultViz: 'chart',
    defaultChartType: 'pie',
    roles: FINANCE_PLUS,
  },
  {
    metric: 'unpaid_invoices',
    description: 'Unpaid and part-paid invoices list with totals',
    defaultViz: 'table',
    roles: FINANCE_PLUS,
  },
  {
    metric: 'amc_expiring',
    description: 'AMC contracts ending in the next 90 days',
    defaultViz: 'table',
    roles: [...OPS_PLUS, UserRole.FINANCE, UserRole.MANAGEMENT, UserRole.ADMIN],
  },
  {
    metric: 'ticket_resolution_time',
    description: 'Average / median days to close support tickets',
    defaultViz: 'table',
    roles: SUPPORT_TICKET_ROLES,
  },
  {
    metric: 'hub_plant_link_summary',
    description: 'Projects with vs without Solis/Deye/Sunways Hub plant station ids',
    defaultViz: 'chart',
    defaultChartType: 'pie',
    roles: [UserRole.ADMIN, UserRole.OPERATIONS, UserRole.MANAGEMENT],
  },
  {
    metric: 'install_by_status',
    description:
      'Late-stage Project Status counts (Under installation → Subsidy credited) — not Installation Status field',
    defaultViz: 'table',
    roles: INSTALL_ROLES,
  },
  {
    metric: 'pending_subsidy',
    description: 'Subsidy projects completed but awaiting subsidy credit',
    defaultViz: 'table',
    roles: [...OPS_PLUS, UserRole.FINANCE],
  },
  {
    metric: 'availing_loan',
    description:
      'Projects availing loan / financing (not Lost); filter by financingBank when a bank is named (SBI, HDFC, etc.)',
    defaultViz: 'table',
    roles: FINANCE_PLUS,
  },
  {
    metric: 'project_detail_lookup',
    description:
      'Single project detail card by SL No or customer name (status, payments, compliance dates, PE/hub, remarks)',
    defaultViz: 'table',
    roles: ALL_ASK,
  },
  {
    metric: 'projects_ops_detail',
    description:
      'Detail lists: payment timeline, KSEB/MNRE gaps, commissioning, remarks, missing docs/survey/install/invoice/PE/roof, hub IDs, incentive, panel W, lost reasons — pair with salesperson/ops name filters',
    defaultViz: 'table',
    roles: ALL_ASK,
  },
  {
    metric: 'customer_detail_lookup',
    description:
      'Single customer record by name or customer ID (contact, city, GST, linked projects)',
    defaultViz: 'table',
    roles: ALL_ASK,
  },
  {
    metric: 'customers_list_slice',
    description: 'List customers filtered by city, type, or salesperson',
    defaultViz: 'table',
    roles: ALL_ASK,
  },
  {
    metric: 'clarify',
    description: 'Use when the question is ambiguous or outside the catalog',
    defaultViz: 'table',
    roles: ALL_ASK,
  },
];

export function metricAllowedForRole(metric: ZenithNlMetric, role: UserRole): boolean {
  const entry = METRIC_CATALOG.find((m) => m.metric === metric);
  if (!entry) return false;
  return entry.roles.includes(role);
}

export function isZenithNlMetric(v: unknown): v is ZenithNlMetric {
  return typeof v === 'string' && (ZENITH_NL_METRICS as readonly string[]).includes(v);
}

/**
 * Canonical Ask examples by role.
 * `{customer}` is filled from the user’s book (dropped when no live name).
 * Keep fallbacks in `client/src/constants/zenithAskExamples.ts` in the same order.
 * Dates come from the Zenith command bar — avoid “this FY” in chip copy.
 */
export const EXAMPLE_QUESTIONS_BY_ROLE: Record<string, string[]> = {
  SALES: [
    'Who should I call today?',
    'Why is my pipeline stalling?',
    'Which lead sources drove the most revenue?',
    'Summarise my lost deals by reason',
    'Customer details for {customer}',
  ],
  MANAGEMENT: [
    'Who should I call today?',
    'Why is my pipeline stalling?',
    'Subsidy vs non-subsidy revenue',
    'Show open support tickets',
    'Customer details for {customer}',
  ],
  ADMIN: [
    'Who should I call today?',
    'Why is my pipeline stalling?',
    'Show open support tickets',
    'List pending subsidy projects',
    'Customer details for {customer}',
  ],
  OPERATIONS: [
    'Who should I call today?',
    'List pending subsidy projects',
    'Projects missing documents',
    'Show open support tickets',
    'AMCs expiring',
  ],
  FINANCE: [
    'Who should I call today?',
    'Unpaid invoices',
    'Payment status breakdown',
    'Profit summary this quarter',
    'Payment mode mix',
  ],
};

export const EXAMPLE_MORE_QUESTIONS_BY_ROLE: Record<string, string[]> = {
  SALES: [
    'Show my ageing pipeline',
    'Show my pipeline by stage',
    'List lost deals with active PE proposals',
    'List deals with PE Ready or Draft proposals',
  ],
  MANAGEMENT: [
    'DCR vs Non-DCR profitability',
    'List lost deals with active PE proposals',
    'List deals with PE Ready or Draft proposals',
    "What's my weighted pipeline?",
  ],
  ADMIN: [
    'List lost deals with active PE proposals',
    'List deals with PE Ready or Draft proposals',
    'PE missing BOM',
    "What's my weighted pipeline?",
  ],
  OPERATIONS: [
    'Projects with feasibility pending',
    'Payment timeline',
    'Hub station IDs',
    'PE missing BOM',
  ],
  FINANCE: [
    'Payment timeline',
    'Availing loan',
    'Incentive eligible projects',
    "What's my weighted pipeline?",
  ],
};

/** Spoken questions for catalog rows — never fall back to Title Case metric ids. */
const METRIC_EXAMPLE_ASK: Partial<Record<ZenithNlMetric, string>> = {
  revenue_by_lead_source: 'Which lead sources drove the most revenue?',
  revenue_by_salesperson: 'Revenue by salesperson',
  pipeline_by_stage: 'Show my pipeline by stage',
  pipeline_health: 'Why is my pipeline stalling?',
  who_to_call: 'Who should I call today?',
  payment_status_breakdown: 'Payment status breakdown',
  capacity_sold: 'Capacity sold',
  outstanding_balance: 'Show projects with outstanding balance',
  top_customers_by_profit: 'Show top customers by profit',
  lost_deals_summary: 'Summarise my lost deals by reason',
  proposal_engine_buckets: 'Proposal Engine buckets',
  projects_list_slice: 'List under installation projects not fully paid',
  cohort_summary: 'How many of my projects used Adani panels?',
  panel_brand_mix: 'Which panel brands sold most?',
  inverter_brand_mix: 'Which inverter brands sold most?',
  loan_bank_breakdown: 'Which banks are financing loans?',
  support_tickets_summary: 'Show open support tickets',
  install_by_status: 'Show installation status breakdown',
  pending_subsidy: 'List pending subsidy projects',
  availing_loan: 'Which projects are availing loan?',
  revenue_by_project_type: 'Subsidy vs non-subsidy revenue',
  revenue_by_customer_type: 'Revenue by customer type',
  service_type_mix: 'Service type mix',
  panel_type_mix: 'DCR vs Non-DCR profitability',
  roof_type_mix: 'Roof type mix',
  system_type_mix: 'System type mix',
  capacity_by_band: 'Capacity sold by size band',
  revenue_by_city: 'Revenue by city',
  ops_workload: 'Ops workload',
  project_stage_mix: 'Project stage mix',
  sla_indicator_mix: 'SLA status indicators',
  lost_competition_breakdown: 'Lost to competition reasons',
  loan_vs_cash_revenue: 'Loan vs cash revenue',
  outstanding_by_salesperson: 'Outstanding by salesperson',
  profit_summary: 'Profit summary this quarter',
  tickets_by_salesperson: 'Support tickets by salesperson',
  compliance_backlog: 'Compliance backlog',
  subsidy_funnel: 'Subsidy funnel',
  installation_model_status: 'Show installation status breakdown',
  payment_mode_mix: 'Payment mode mix',
  unpaid_invoices: 'Unpaid invoices',
  amc_expiring: 'AMCs expiring',
  ticket_resolution_time: 'Ticket resolution time',
  hub_plant_link_summary: 'Hub plant link status',
  period_compare: 'Quarter on quarter revenue growth',
  project_detail_lookup: 'Status of SL 1',
  projects_ops_detail: 'Projects missing documents',
  customer_detail_lookup: 'Customer details for {customer}',
  customers_list_slice: 'List customers in Kochi',
};

export function fillAskPlaceholders(
  questions: string[],
  live: { customerName?: string | null },
): string[] {
  const name = live.customerName?.trim();
  const out: string[] = [];
  for (const q of questions) {
    if (q.includes('{customer}')) {
      if (!name || name.length < 2) continue;
      out.push(q.split('{customer}').join(name));
    } else {
      out.push(q);
    }
  }
  return out;
}

export function suggestedQuestionsForRole(role: UserRole, live?: { customerName?: string | null }): string[] {
  const list = EXAMPLE_QUESTIONS_BY_ROLE[role] ?? EXAMPLE_QUESTIONS_BY_ROLE.MANAGEMENT ?? [];
  return fillAskPlaceholders(list, live ?? {});
}

export function moreQuestionsForRole(role: UserRole, live?: { customerName?: string | null }): string[] {
  const list = EXAMPLE_MORE_QUESTIONS_BY_ROLE[role] ?? EXAMPLE_MORE_QUESTIONS_BY_ROLE.MANAGEMENT ?? [];
  return fillAskPlaceholders(list, live ?? {});
}

/** First-impression asks when Zenith cannot map a question. */
export function wowSuggestionsForRole(role: UserRole): string[] {
  const qs = ['Who should I call today?', 'Why is my pipeline stalling?'];
  if (SUPPORT_TICKET_ROLES.includes(role)) qs.push('Show open support tickets');
  else qs.push('Unpaid invoices');
  return qs.filter((q) => {
    if (q === 'Why is my pipeline stalling?') return metricAllowedForRole('pipeline_health', role);
    if (q === 'Who should I call today?') return metricAllowedForRole('who_to_call', role);
    if (q === 'Show open support tickets') return metricAllowedForRole('support_tickets_summary', role);
    if (q === 'Unpaid invoices') return metricAllowedForRole('unpaid_invoices', role);
    return true;
  });
}

function humanizeMetric(metric: string): string {
  return metric
    .split('_')
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Browseable catalog for clarify — one row per metric allowed for the role. */
export function catalogHintsForRole(
  role: UserRole,
  live?: { customerName?: string | null },
): ZenithNlCatalogHint[] {
  return METRIC_CATALOG.filter((m) => m.metric !== 'clarify' && m.roles.includes(role)).map(
    (m) => {
      const title = humanizeMetric(m.metric);
      const rawAsk = METRIC_EXAMPLE_ASK[m.metric] || m.description;
      const filled = fillAskPlaceholders([rawAsk], live ?? {});
      return {
        metric: m.metric,
        title,
        description: m.description,
        ask: filled[0] || m.description,
      };
    },
  );
}

export function catalogPromptBlock(role: UserRole): string {
  return METRIC_CATALOG.filter((m) => m.metric !== 'clarify' && m.roles.includes(role))
    .map((m) => `- ${m.metric}: ${m.description} (default viz: ${m.defaultViz})`)
    .join('\n');
}

/** Follow-up prompts after a successful answer (session polish). */
export function followUpsForMetric(metric: ZenithNlMetric, role: UserRole): string[] {
  if (metric === 'who_to_call') {
    const picks: string[] = [];
    if (metricAllowedForRole('pipeline_health', role)) picks.push('Why is my pipeline stalling?');
    if (metricAllowedForRole('outstanding_balance', role)) {
      picks.push('Show projects with outstanding balance');
    }
    if (metricAllowedForRole('support_tickets_summary', role)) {
      picks.push('Show open support tickets');
    }
    if (picks.length < 3 && metricAllowedForRole('pending_subsidy', role)) {
      picks.push('List pending subsidy projects');
    }
    if (picks.length < 3 && metricAllowedForRole('unpaid_invoices', role)) {
      picks.push('Unpaid invoices');
    }
    if (picks.length < 3 && metricAllowedForRole('payment_status_breakdown', role)) {
      picks.push('Payment status breakdown');
    }
    return picks.slice(0, 3);
  }
  const common: Partial<Record<ZenithNlMetric, string[]>> = {
    revenue_by_lead_source: [
      'Show that as a table',
      'Which salesperson drove the most revenue?',
      'Show my pipeline by stage',
    ],
    revenue_by_salesperson: [
      'Break down revenue by lead source',
      'Show top customers by profit',
      'Pipeline by stage',
    ],
    pipeline_by_stage: [
      "What's my weighted pipeline?",
      'Show my stalled pipeline',
      'Give me a pipeline analysis',
    ],
    pipeline_health: [
      'Who should I call today?',
      'Show my pipeline by stage',
      'Show my ageing pipeline',
    ],
    payment_status_breakdown: [
      'Show projects with outstanding balance',
      'Which projects are availing loan?',
      'Revenue by lead source',
    ],
    capacity_sold: [
      'Revenue by lead source',
      'Show installation status breakdown',
      'Top customers by profit',
    ],
    outstanding_balance: [
      'Payment status breakdown',
      'Show Partial payment projects',
      'Which projects are availing loan?',
    ],
    top_customers_by_profit: [
      'Revenue by salesperson',
      'Revenue by lead source',
      'Show capacity sold',
    ],
    lost_deals_summary: [
      'List lost deals with active PE proposals',
      'Pipeline by stage',
      'Which lead sources drove revenue?',
    ],
    proposal_engine_buckets: [
      'Show PE Draft projects',
      'List deals with PE Ready or Draft proposals',
      'Show PE Ready projects',
    ],
    projects_list_slice: [
      'Pipeline by stage',
      'Under installation projects not fully paid',
      'Show projects with outstanding balance',
    ],
    cohort_summary: [
      'Break that down by payment status',
      'Show the project list',
      'Which projects are availing loan?',
    ],
    panel_brand_mix: [
      'Which inverter brands sold most?',
      'How many projects used Adani panels?',
      'Which banks are financing loans?',
    ],
    inverter_brand_mix: [
      'Which panel brands sold most?',
      'Projects with Deye inverters',
      'Which banks are financing loans?',
    ],
    loan_bank_breakdown: [
      'How many customers have SBI loans?',
      'Payment status breakdown',
      'Which inverter brands sold most?',
    ],
    support_tickets_summary: [
      'Who has the oldest open ticket?',
      'Show overdue support tickets',
      'Create a Support Ticket',
    ],
    install_by_status: [
      'Projects pending subsidy credit',
      'Pipeline by stage',
      'What capacity have we sold?',
    ],
    pending_subsidy: [
      'Show installation status breakdown',
      'Payment status breakdown',
      'Show Completed projects',
    ],
    availing_loan: [
      'Payment status breakdown',
      'Projects with outstanding balance',
      'How many customers have SBI loans?',
    ],
    revenue_by_project_type: [
      'DCR vs Non-DCR mix',
      'Revenue by customer type',
      'Capacity sold by size band',
    ],
    revenue_by_customer_type: [
      'Subsidy vs non-subsidy revenue',
      'Which lead sources drove the most revenue?',
      'Service type mix',
    ],
    service_type_mix: [
      'Show installation status breakdown',
      'Roof type mix',
      'Pipeline by stage',
    ],
    panel_type_mix: [
      'Subsidy vs non-subsidy revenue',
      'Which panel brands sold most?',
      'Capacity sold by size band',
    ],
    roof_type_mix: [
      'System type mix',
      'Service type mix',
      'Show installation status breakdown',
    ],
    system_type_mix: [
      'Capacity sold by size band',
      'Roof type mix',
      'Which inverter brands sold most?',
    ],
    capacity_by_band: [
      'Subsidy vs non-subsidy revenue',
      'What capacity have we sold?',
      'DCR vs Non-DCR mix',
    ],
    revenue_by_city: [
      'Profit summary',
      'Loan vs cash revenue',
      'Subsidy vs non-subsidy revenue',
    ],
    ops_workload: [
      'SLA status indicators',
      'Compliance backlog',
      'Project stage mix',
    ],
    project_stage_mix: [
      'Ops workload',
      'SLA status indicators',
      'Show my pipeline by stage',
    ],
    sla_indicator_mix: [
      'Ops workload',
      'Compliance backlog',
      'Project stage mix',
    ],
    lost_competition_breakdown: [
      'Summarise lost deals by reason',
      'Revenue by salesperson',
      'Pipeline by stage',
    ],
    loan_vs_cash_revenue: [
      'Which banks are financing loans?',
      'Outstanding by salesperson',
      'Profit summary',
    ],
    outstanding_by_salesperson: [
      'Profit summary',
      'Unpaid invoices',
      'Payment mode mix',
    ],
    profit_summary: [
      'Outstanding by salesperson',
      'Loan vs cash revenue',
      'Revenue by city',
    ],
    period_compare: [
      'Profit summary this quarter',
      'Profit summary last quarter',
      'Year on year revenue growth',
    ],
    tickets_by_salesperson: [
      'Ticket resolution time',
      'Show me the total support tickets raised',
      'Show overdue support tickets',
    ],
    compliance_backlog: [
      'Subsidy funnel',
      'SLA status indicators',
      'Projects pending subsidy credit',
    ],
    subsidy_funnel: [
      'Compliance backlog',
      'Projects pending subsidy credit',
      'Show installation status breakdown',
    ],
    installation_model_status: [
      'Show installation status breakdown',
      'Ops workload',
      'AMCs expiring',
    ],
    payment_mode_mix: [
      'Unpaid invoices',
      'Payment status breakdown',
      'Outstanding by salesperson',
    ],
    unpaid_invoices: [
      'Payment mode mix',
      'Projects with outstanding balance',
      'Profit summary',
    ],
    amc_expiring: [
      'Ops workload',
      'Hub plant link status',
      'Show installation status breakdown',
    ],
    ticket_resolution_time: [
      'Support tickets by salesperson',
      'Show open support tickets',
      'Show overdue support tickets',
    ],
    project_detail_lookup: [
      'Projects with feasibility pending',
      'Payment timeline',
      'Who should I call today?',
    ],
    projects_ops_detail: [
      'Status of SL 1',
      'Incentive eligible projects',
      'Lost deal details',
    ],
    customer_detail_lookup: [
      'List customers in Kochi',
      'Status of SL 1',
      'Payment timeline',
    ],
    customers_list_slice: [
      'Who should I call today?',
      'Revenue by city',
      'List residential customers',
    ],
    hub_plant_link_summary: [
      'AMCs expiring',
      'Ops workload',
      'Compliance backlog',
    ],
  };
  const list = (common[metric] ?? suggestedQuestionsForRole(role)).filter((q) => {
    const lower = q.toLowerCase();
    if (
      role === UserRole.OPERATIONS &&
      (lower.includes('salesperson') || lower.includes('lost deal') || lower.includes('proposal engine'))
    ) {
      return false;
    }
    if (
      role === UserRole.FINANCE &&
      (lower.includes('pipeline by stage') || lower.includes('lost deal') || lower.includes('proposal engine'))
    ) {
      return false;
    }
    return true;
  });
  return list.slice(0, 3);
}
