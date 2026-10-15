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

export type ZenithNlQuerySuccess = {
  ok: true;
  question: string;
  insight: string;
  viz: ZenithNlViz;
  projectsHref: string | null;
  intent: ZenithNlIntent;
  suggestedQuestions?: string[];
  followUps?: string[];
};

export type ZenithNlQueryClarify = {
  ok: false;
  clarify: true;
  question: string;
  message: string;
  suggestedQuestions: string[];
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
const MGMT_ADMIN: UserRole[] = [UserRole.MANAGEMENT, UserRole.ADMIN];
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
    description: 'Lost deals summary by reason (Admin / Management only)',
    defaultViz: 'table',
    roles: MGMT_ADMIN,
  },
  {
    metric: 'proposal_engine_buckets',
    description: 'Proposal Engine buckets: Ready, Draft, Not Yet Created, Rest',
    defaultViz: 'table',
    roles: EXEC,
  },
  {
    metric: 'projects_list_slice',
    description: 'Show a filtered list of projects matching a status, payment, PE bucket, or search',
    defaultViz: 'table',
    roles: ALL_ASK,
  },
  {
    metric: 'install_by_status',
    description: 'Installation / late-stage project counts by status (Ops pack)',
    defaultViz: 'table',
    roles: OPS_PLUS,
  },
  {
    metric: 'pending_subsidy',
    description: 'Subsidy projects completed but awaiting subsidy credit',
    defaultViz: 'table',
    roles: [...OPS_PLUS, UserRole.FINANCE],
  },
  {
    metric: 'availing_loan',
    description: 'Projects availing loan / financing (not Lost)',
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

export const EXAMPLE_QUESTIONS_BY_ROLE: Record<string, string[]> = {
  SALES: [
    'Which lead sources drove the most revenue?',
    'Show my pipeline by stage',
    'Which customers have the highest profit?',
    'What is my Proposal Engine status?',
    'Show projects with outstanding balance',
  ],
  MANAGEMENT: [
    'Which lead sources drove the most revenue this FY?',
    'Revenue by salesperson',
    'Pipeline by stage',
    'Summarise lost deals by reason',
    'Top customers by profit',
  ],
  ADMIN: [
    'Which lead sources drove the most revenue this FY?',
    'Revenue by salesperson',
    'Payment status breakdown',
    'Summarise lost deals by reason',
    'Proposal Engine bucket counts',
  ],
  OPERATIONS: [
    'Show installation status breakdown',
    'Projects pending subsidy credit',
    'Pipeline by stage',
    'What capacity have we sold?',
  ],
  FINANCE: [
    'Payment status breakdown',
    'Projects with outstanding balance',
    'Which projects are availing loan?',
    'Revenue by lead source',
    'Pending subsidy projects',
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
      'Revenue by lead source',
    ],
  };
  const list = (common[metric] ?? suggestedQuestionsForRole(role)).filter((q) => {
    const lower = q.toLowerCase();
    if (role === UserRole.SALES && (lower.includes('lost deal') || lower.includes('installation status'))) {
      return false;
    }
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
