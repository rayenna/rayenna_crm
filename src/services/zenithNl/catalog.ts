import { UserRole } from '@prisma/client';

/** Closed metric catalog for Zenith NL Ask. */
export const ZENITH_NL_METRICS = [
  'revenue_by_lead_source',
  'revenue_by_salesperson',
  'pipeline_by_stage',
  'payment_status_breakdown',
  'capacity_sold',
  'outstanding_balance',
  'top_customers_by_profit',
  'lost_deals_summary',
  'proposal_engine_buckets',
  'projects_list_slice',
  'cohort_summary',
  'panel_brand_mix',
  'loan_bank_breakdown',
  'install_by_status',
  'pending_subsidy',
  'availing_loan',
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
    projectStatus?: string;
    paymentStatus?: string;
    peBucket?: 'proposal-ready' | 'draft' | 'not-started' | 'rest';
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
  };
  insightHints?: string;
};

export type ZenithNlPriorContext = {
  question: string;
  metric: string;
  filters?: ZenithNlIntent['filters'];
};

export type ZenithNlTableColumn = { key: string; label: string };
export type ZenithNlTableRow = Record<string, string | number | null>;

export type ZenithNlChartSeriesPoint = {
  label: string;
  value: number;
  count?: number;
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

export type ZenithNlQuerySuccess = {
  ok: true;
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

export type ZenithNlQueryClarify = {
  ok: false;
  clarify: true;
  question: string;
  message: string;
  suggestedQuestions: string[];
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
    description: 'Open pipeline deal counts and value by project status / stage',
    defaultViz: 'table',
    roles: [...EXEC, UserRole.OPERATIONS],
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
    description: 'Proposal Engine buckets: Ready, Draft, Not Yet Created, Rest',
    defaultViz: 'table',
    roles: EXEC,
  },
  {
    metric: 'projects_list_slice',
    description:
      'Show a filtered list of projects matching status, payment, PE bucket, customer search, panel brand, inverter brand, or financing bank',
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
      'Project count and order value grouped by panel brand (mix / share chart)',
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
    metric: 'install_by_status',
    description:
      'Installation / late-stage project counts by status (Ops + Management/Admin; Sales own book)',
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
 * Keep in sync with `client/src/constants/zenithAskExamples.ts`.
 * Dates come from the Zenith command bar — avoid “this FY” in chip copy.
 */
export const EXAMPLE_QUESTIONS_BY_ROLE: Record<string, string[]> = {
  SALES: [
    'Which lead sources drove the most revenue?',
    'Show my pipeline by stage',
    'Summarise my lost deals by reason',
    'Show installation status breakdown',
    'How many of my projects used Adani panels?',
  ],
  MANAGEMENT: [
    'Which lead sources drove the most revenue?',
    'How many projects used Adani panels?',
    'Which panel brands sold most?',
    'Which banks are financing loans?',
    'Summarise lost deals by reason',
  ],
  ADMIN: [
    'Which lead sources drove the most revenue?',
    'How many projects used Adani panels?',
    'Which panel brands sold most?',
    'Which banks are financing loans?',
    'Payment status breakdown',
  ],
  OPERATIONS: [
    'Show installation status breakdown',
    'How many projects used Adani panels?',
    'Projects with Deye inverters',
    'Projects pending subsidy credit',
  ],
  FINANCE: [
    'Payment status breakdown',
    'Which banks are financing loans?',
    'How many customers have SBI loans?',
    'Which panel brands sold most?',
    'Projects with outstanding balance',
  ],
};

export function suggestedQuestionsForRole(role: UserRole): string[] {
  return EXAMPLE_QUESTIONS_BY_ROLE[role] ?? EXAMPLE_QUESTIONS_BY_ROLE.MANAGEMENT;
}

export function catalogPromptBlock(role: UserRole): string {
  return METRIC_CATALOG.filter((m) => m.metric !== 'clarify' && m.roles.includes(role))
    .map((m) => `- ${m.metric}: ${m.description} (default viz: ${m.defaultViz})`)
    .join('\n');
}

/** Follow-up prompts after a successful answer (session polish). */
export function followUpsForMetric(metric: ZenithNlMetric, role: UserRole): string[] {
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
      'Show projects in Proposal',
      'Payment status breakdown',
      'What is Proposal Engine status?',
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
      'Revenue by salesperson',
      'Pipeline by stage',
      'Which lead sources drove revenue?',
    ],
    proposal_engine_buckets: [
      'Show PE Draft projects',
      'Pipeline by stage',
      'Show PE Ready projects',
    ],
    projects_list_slice: [
      'Pipeline by stage',
      'Payment status breakdown',
      'Show projects with outstanding balance',
    ],
    cohort_summary: [
      'Break that down by payment status',
      'Show the project list',
      'Which projects are availing loan?',
    ],
    panel_brand_mix: [
      'How many projects used Adani panels?',
      'Revenue of projects with Deye inverters',
      'Which banks are financing loans?',
    ],
    loan_bank_breakdown: [
      'How many customers have SBI loans?',
      'Payment status breakdown',
      'Which panel brands sold most?',
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
