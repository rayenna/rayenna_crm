import Anthropic from '@anthropic-ai/sdk';
import {
  CustomerType,
  InstallationStatus,
  LeadSource,
  LostReason,
  PaymentStatus,
  Prisma,
  ProjectServiceType,
  ProjectStage,
  ProjectStatus,
  ProjectType,
  SupportTicketSource,
  SupportTicketStatus,
  SystemType,
  UserRole,
} from '@prisma/client';
import prisma from '../prisma';
import { dealExpectedValue } from '../utils/salesProbability';
import {
  catalogHintsForRole,
  catalogPromptBlock,
  followUpsForMetric,
  isZenithNlMetric,
  metricAllowedForRole,
  METRIC_CATALOG,
  suggestedQuestionsForRole,
  wowSuggestionsForRole,
  type ZenithNlEffectiveDateFilter,
  type ZenithNlIntent,
  type ZenithNlMetric,
  type ZenithNlPriorContext,
  type ZenithNlQueryResult,
  type ZenithNlViz,
} from './zenithNl/catalog';
import { matchAskActionIntent } from './zenithNl/askActions';
import { execWhoToCall } from './zenithNl/whoToCallAsk';
import { execTicketQueue, ticketQueueSlice } from './zenithNl/ticketQueueAsk';
import { loadLiveAskBook } from './zenithNl/askExampleLive';
import {
  matchEquipmentMixIntent,
  matchExactChipIntent,
  matchSupportTicketIntent,
} from './zenithNl/chipIntents';
import { parsePeriodCompare, periodCompareIntent } from './zenithNl/periodCompare';
import { enrichInsight } from './zenithNl/insights';
import {
  brandContainsToken,
  extractZenithEntityFilters,
  findFinancingBankFromRaw,
  resolveInverterBrand,
  resolvePanelBrand,
  type ExtractedZenithEntities,
} from './zenithNl/entityFilters';
import {
  attachAskDrillHrefs,
  projectsHrefForIntent,
  type ZenithNlDateFilter,
} from './zenithNl/projectsHref';
import { supportTicketCreatedAtWhere } from './zenithNl/ticketDateFilter';
import {
  applyZenithDimensionFilters,
  capacityBandForKw,
  CAPACITY_BANDS,
  customerTypeLabel,
  extractZenithDimensions,
  mergeDimensionsIntoIntent,
  parseCustomerType,
  parsePanelType,
  parseProjectType,
  parseRoofType,
  parseServiceType,
  parseSystemType,
  projectTypeLabel,
  salvageMetricFromDimensions,
  serviceTypeLabel,
  systemTypeLabel,
} from './zenithNl/dimensionFilters';
import {
  execAmcExpiring,
  execComplianceBacklog,
  execHubPlantLinkSummary,
  execInstallationModelStatus,
  execLoanVsCashRevenue,
  execLostCompetitionBreakdown,
  execOpsWorkload,
  execOutstandingBySalesperson,
  execPaymentModeMix,
  execPeriodCompare,
  execProfitSummary,
  execProjectStageMix,
  execRevenueByCity,
  execSlaIndicatorMix,
  execSubsidyFunnel,
  execTicketResolutionTime,
  execTicketsBySalesperson,
  execUnpaidInvoices,
} from './zenithNl/p1p2Metrics';
import {
  execProjectDetailLookup,
  execProjectsOpsDetail,
} from './zenithNl/projectDetailAsk';
import {
  execCustomerDetailLookup,
  execCustomersListSlice,
} from './zenithNl/customerDetailAsk';
import { execPipelineHealth } from './zenithNl/pipelineHealthAsk';
import { matchAskEditActionIntent } from './zenithNl/askEditActions';
import { isSupportTicketOverdue } from '../utils/supportTicketQueue';

function createAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim() || '';
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim() || '';
  return new Anthropic({
    apiKey,
    ...(workspaceId
      ? { defaultHeaders: { 'anthropic-workspace-id': workspaceId } }
      : {}),
  });
}

const TABLE_ROW_CAP = 25;

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.LEAD]: 'Lead',
  [ProjectStatus.SITE_SURVEY]: 'Site Survey',
  [ProjectStatus.PROPOSAL]: 'Proposal',
  [ProjectStatus.CONFIRMED]: 'Confirmed Order',
  [ProjectStatus.UNDER_INSTALLATION]: 'Under Installation',
  [ProjectStatus.SUBMITTED_FOR_SUBSIDY]: 'Submitted for Subsidy',
  [ProjectStatus.COMPLETED]: 'Completed',
  [ProjectStatus.COMPLETED_SUBSIDY_CREDITED]: 'Completed - Subsidy Credited',
  [ProjectStatus.LOST]: 'Lost',
};

const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  [LeadSource.WEBSITE]: 'Website',
  [LeadSource.REFERRAL]: 'Referral',
  [LeadSource.GOOGLE]: 'Google',
  [LeadSource.CHANNEL_PARTNER]: 'Channel Partner',
  [LeadSource.DIGITAL_MARKETING]: 'Digital Marketing',
  [LeadSource.SALES]: 'Sales',
  [LeadSource.MANAGEMENT_CONNECT]: 'Management Connect',
  [LeadSource.OTHER]: 'Other',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'Pending',
  [PaymentStatus.PARTIAL]: 'Partial',
  [PaymentStatus.FULLY_PAID]: 'Fully Paid',
};

const PIPELINE_STATUSES: ProjectStatus[] = [
  ProjectStatus.LEAD,
  ProjectStatus.SITE_SURVEY,
  ProjectStatus.PROPOSAL,
  ProjectStatus.CONFIRMED,
];

/** Matches Zenith Weighted open pipeline (Lead through Subsidy submitted). */
const OPEN_FORECAST_STATUSES: ProjectStatus[] = [
  ProjectStatus.LEAD,
  ProjectStatus.SITE_SURVEY,
  ProjectStatus.PROPOSAL,
  ProjectStatus.CONFIRMED,
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.SUBMITTED_FOR_SUBSIDY,
];

type PeBucketKey = 'proposal-ready' | 'draft' | 'not-started' | 'rest';

export type ZenithNlQueryInput = {
  question: string;
  role: UserRole;
  userId: string;
  where: Prisma.ProjectWhereInput;
  /** Prior period where for period_compare (YoY / QoQ). */
  compareWhere?: Prisma.ProjectWhereInput;
  compareMeta?: {
    mode?: 'yoy' | 'qoq';
    primaryFy: string;
    priorFy: string;
    primaryQuarter?: string;
    priorQuarter?: string;
    focus: 'revenue' | 'margin' | 'profit' | 'all';
  };
  dateFilter: ZenithNlDateFilter;
  /** Resolved date context for the response eyebrow (command bar or question phrase). */
  effectiveDateFilter?: ZenithNlEffectiveDateFilter;
  /** Prior successful Ask in this session (follow-ups). */
  prior?: ZenithNlPriorContext | null;
};

function formatInr(n: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }
}

function getRevenueWhere(baseWhere: Prisma.ProjectWhereInput): Prisma.ProjectWhereInput {
  const base = baseWhere as Record<string, unknown>;
  const baseAndConditions = Array.isArray(base.AND) ? [...base.AND] : [];
  const { AND: _a, ...baseWhereWithoutAnd } = base;
  const revenueFilter: Record<string, unknown> = {
    ...baseWhereWithoutAnd,
    projectCost: { not: null },
    projectStatus: {
      in: [
        ProjectStatus.CONFIRMED,
        ProjectStatus.UNDER_INSTALLATION,
        ProjectStatus.COMPLETED,
        ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
      ],
    },
  };
  const stageCondition = {
    OR: [
      { projectStage: null },
      { projectStage: { notIn: [ProjectStage.SURVEY, ProjectStage.PROPOSAL] } },
    ],
  };
  revenueFilter.AND = [...baseAndConditions, stageCondition];
  return revenueFilter as Prisma.ProjectWhereInput;
}

function toPositiveNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function isZenithNlAskEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function parseIntentJson(raw: string): ZenithNlIntent | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!isZenithNlMetric(parsed.metric)) return null;
    const viz = parsed.viz === 'chart' || parsed.viz === 'table' ? parsed.viz : undefined;
    const chartType =
      parsed.chartType === 'bar' || parsed.chartType === 'pie' ? parsed.chartType : undefined;
    const filtersRaw = parsed.filters && typeof parsed.filters === 'object' ? (parsed.filters as Record<string, unknown>) : {};
    const peBucket =
      filtersRaw.peBucket === 'proposal-ready' ||
      filtersRaw.peBucket === 'draft' ||
      filtersRaw.peBucket === 'not-started' ||
      filtersRaw.peBucket === 'rest'
        ? filtersRaw.peBucket
        : undefined;
    const panelBrand = resolvePanelBrand(
      typeof filtersRaw.panelBrand === 'string' ? filtersRaw.panelBrand : undefined,
    );
    const inverterBrand = resolveInverterBrand(
      typeof filtersRaw.inverterBrand === 'string' ? filtersRaw.inverterBrand : undefined,
    );
    const financingBank = findFinancingBankFromRaw(
      typeof filtersRaw.financingBank === 'string' ? filtersRaw.financingBank : undefined,
    );
    const availingLoan =
      filtersRaw.availingLoan === true ||
      filtersRaw.availingLoan === 'true' ||
      Boolean(financingBank);
    return {
      metric: parsed.metric,
      viz: viz ?? 'table',
      chartType,
      filters: {
        projectStatus:
          typeof filtersRaw.projectStatus === 'string' ? filtersRaw.projectStatus : undefined,
        paymentStatus:
          typeof filtersRaw.paymentStatus === 'string' ? filtersRaw.paymentStatus : undefined,
        installationStatus:
          typeof filtersRaw.installationStatus === 'string'
            ? filtersRaw.installationStatus
            : undefined,
        peBucket,
        leadSource: typeof filtersRaw.leadSource === 'string' ? filtersRaw.leadSource : undefined,
        // Customer name search only — never put brand/bank tokens here.
        search: typeof filtersRaw.search === 'string' ? filtersRaw.search : undefined,
        panelBrand,
        inverterBrand,
        financingBank,
        availingLoan: availingLoan || undefined,
        projectType: parseProjectType(
          typeof filtersRaw.projectType === 'string' ? filtersRaw.projectType : undefined,
        ),
        projectServiceType: parseServiceType(
          typeof filtersRaw.projectServiceType === 'string'
            ? filtersRaw.projectServiceType
            : undefined,
        ),
        customerType: parseCustomerType(
          typeof filtersRaw.customerType === 'string' ? filtersRaw.customerType : undefined,
        ),
        panelType: parsePanelType(
          typeof filtersRaw.panelType === 'string' ? filtersRaw.panelType : undefined,
        ),
        systemType: parseSystemType(
          typeof filtersRaw.systemType === 'string' ? filtersRaw.systemType : undefined,
        ),
        roofType: parseRoofType(
          typeof filtersRaw.roofType === 'string' ? filtersRaw.roofType : undefined,
        ),
        capacityMin:
          typeof filtersRaw.capacityMin === 'number'
            ? filtersRaw.capacityMin
            : typeof filtersRaw.capacityMin === 'string' && filtersRaw.capacityMin.trim()
              ? Number(filtersRaw.capacityMin)
              : undefined,
        capacityMax:
          typeof filtersRaw.capacityMax === 'number'
            ? filtersRaw.capacityMax
            : typeof filtersRaw.capacityMax === 'string' && filtersRaw.capacityMax.trim()
              ? Number(filtersRaw.capacityMax)
              : undefined,
        salespersonName:
          typeof filtersRaw.salespersonName === 'string'
            ? filtersRaw.salespersonName.trim() || undefined
            : undefined,
        salespersonUnassigned:
          filtersRaw.salespersonUnassigned === true ||
          filtersRaw.salespersonUnassigned === 'true' ||
          undefined,
        detailSlice:
          typeof filtersRaw.detailSlice === 'string' ? filtersRaw.detailSlice.trim() || undefined : undefined,
        panelCapacityWMin:
          typeof filtersRaw.panelCapacityWMin === 'number'
            ? filtersRaw.panelCapacityWMin
            : typeof filtersRaw.panelCapacityWMin === 'string' && filtersRaw.panelCapacityWMin.trim()
              ? Number(filtersRaw.panelCapacityWMin)
              : undefined,
        panelCapacityWMax:
          typeof filtersRaw.panelCapacityWMax === 'number'
            ? filtersRaw.panelCapacityWMax
            : typeof filtersRaw.panelCapacityWMax === 'string' && filtersRaw.panelCapacityWMax.trim()
              ? Number(filtersRaw.panelCapacityWMax)
              : undefined,
        inverterCapacityKwMin:
          typeof filtersRaw.inverterCapacityKwMin === 'number'
            ? filtersRaw.inverterCapacityKwMin
            : typeof filtersRaw.inverterCapacityKwMin === 'string' &&
                filtersRaw.inverterCapacityKwMin.trim()
              ? Number(filtersRaw.inverterCapacityKwMin)
              : undefined,
        inverterCapacityKwMax:
          typeof filtersRaw.inverterCapacityKwMax === 'number'
            ? filtersRaw.inverterCapacityKwMax
            : typeof filtersRaw.inverterCapacityKwMax === 'string' &&
                filtersRaw.inverterCapacityKwMax.trim()
              ? Number(filtersRaw.inverterCapacityKwMax)
              : undefined,
        incentiveEligible:
          filtersRaw.incentiveEligible === true ||
          filtersRaw.incentiveEligible === 'true' ||
          undefined,
      },
      insightHints: typeof parsed.insightHints === 'string' ? parsed.insightHints : undefined,
    };
  } catch {
    return null;
  }
}

async function resolveSalespersonIdByName(name: string): Promise<string | undefined> {
  const q = name.trim();
  if (!q) return undefined;
  const user = await prisma.user.findFirst({
    where: {
      name: { contains: q, mode: 'insensitive' },
      role: { in: [UserRole.SALES, UserRole.MANAGEMENT, UserRole.ADMIN] },
    },
    select: { id: true },
    orderBy: { name: 'asc' },
  });
  return user?.id;
}

async function resolveOpsIdByName(name: string): Promise<string | undefined> {
  const q = name.trim();
  if (!q) return undefined;
  const user = await prisma.user.findFirst({
    where: {
      name: { contains: q, mode: 'insensitive' },
      role: { in: [UserRole.OPERATIONS, UserRole.ADMIN, UserRole.MANAGEMENT] },
    },
    select: { id: true },
    orderBy: { name: 'asc' },
  });
  return user?.id;
}

function pushWhereAnd(where: Prisma.ProjectWhereInput, clause: Prisma.ProjectWhereInput): void {
  const existing = where.AND;
  if (Array.isArray(existing)) {
    where.AND = [...existing, clause];
  } else if (existing) {
    where.AND = [existing as Prisma.ProjectWhereInput, clause];
  } else {
    where.AND = [clause];
  }
}

/** Apply panel / inverter / bank / loan intent filters onto a Prisma where. */
export function applyZenithIntentEntityFilters(
  where: Prisma.ProjectWhereInput,
  intent: ZenithNlIntent,
): Prisma.ProjectWhereInput {
  const next: Prisma.ProjectWhereInput = { ...where };
  const panel = resolvePanelBrand(intent.filters?.panelBrand);
  if (panel) {
    pushWhereAnd(next, {
      panelBrand: { contains: brandContainsToken(panel), mode: 'insensitive' },
    });
  }
  const inverter = resolveInverterBrand(intent.filters?.inverterBrand);
  if (inverter) {
    pushWhereAnd(next, {
      inverterBrand: { contains: brandContainsToken(inverter), mode: 'insensitive' },
    });
  }
  const bank = findFinancingBankFromRaw(intent.filters?.financingBank);
  if (bank) {
    pushWhereAnd(next, { financingBank: bank, availingLoan: true });
  } else if (intent.filters?.availingLoan) {
    pushWhereAnd(next, { availingLoan: true });
  }
  return next;
}

function mergeEntitiesIntoIntent(
  intent: ZenithNlIntent,
  entities: ExtractedZenithEntities,
): ZenithNlIntent {
  const filters = { ...(intent.filters || {}) };
  if (entities.panelBrand) filters.panelBrand = entities.panelBrand;
  if (entities.inverterBrand) filters.inverterBrand = entities.inverterBrand;
  if (entities.financingBank) {
    filters.financingBank = entities.financingBank;
    filters.availingLoan = true;
  } else if (entities.availingLoan) {
    filters.availingLoan = true;
  }
  // If Claude stuffed a brand into customer search, drop it when we have entity filters.
  if (
    filters.search &&
    (filters.panelBrand || filters.inverterBrand || filters.financingBank)
  ) {
    const s = filters.search.toLowerCase();
    const brandBits = [
      filters.panelBrand,
      filters.inverterBrand,
      filters.financingBank,
      entities.panelBrand,
      entities.inverterBrand,
    ]
      .filter(Boolean)
      .map((x) => String(x).toLowerCase());
    if (brandBits.some((b) => s.includes(brandContainsToken(b).toLowerCase()) || s.includes(b))) {
      delete filters.search;
    }
  }
  return { ...intent, filters };
}

function salvageMetricFromEntities(
  intent: ZenithNlIntent,
  entities: ExtractedZenithEntities,
  role: UserRole,
): ZenithNlIntent {
  const hasEntity = Boolean(
    intent.filters?.panelBrand ||
      intent.filters?.inverterBrand ||
      intent.filters?.financingBank ||
      intent.filters?.availingLoan,
  );
  if (!hasEntity) return intent;

  if (intent.metric !== 'clarify') {
    // Upgrade generic clarify-adjacent picks: revenue-by-* without needing a group-by.
    if (
      (entities.wantsRevenue || entities.wantsCount) &&
      (intent.metric === 'revenue_by_lead_source' ||
        intent.metric === 'revenue_by_salesperson' ||
        intent.metric === 'projects_list_slice')
    ) {
      if (metricAllowedForRole('cohort_summary', role)) {
        return normalizeIntent({ ...intent, metric: 'cohort_summary', viz: 'table' }, role);
      }
    }
    if (
      (intent.filters?.financingBank || intent.filters?.availingLoan) &&
      entities.wantsCount &&
      intent.metric !== 'availing_loan' &&
      metricAllowedForRole('availing_loan', role)
    ) {
      return normalizeIntent({ ...intent, metric: 'availing_loan', viz: 'table' }, role);
    }
    return intent;
  }

  if (
    (intent.filters?.financingBank || intent.filters?.availingLoan) &&
    !intent.filters?.panelBrand &&
    !intent.filters?.inverterBrand &&
    metricAllowedForRole('availing_loan', role)
  ) {
    return normalizeIntent({ ...intent, metric: 'availing_loan', viz: 'table' }, role);
  }
  if (metricAllowedForRole('cohort_summary', role)) {
    return normalizeIntent({ ...intent, metric: 'cohort_summary', viz: 'table' }, role);
  }
  return intent;
}

/** Collapse accidental "foo foo bar" dictation/typing duplicates at the start. */
export function sanitizeAskQuestion(question: string): string {
  let q = question.trim().replace(/\s+/g, ' ');
  // Repeat of a leading 2–6 word phrase: "number of users number of users who…"
  const words = q.split(' ');
  for (let n = Math.min(6, Math.floor(words.length / 2)); n >= 2; n -= 1) {
    const head = words.slice(0, n).join(' ').toLowerCase();
    const next = words.slice(n, n * 2).join(' ').toLowerCase();
    if (head && head === next) {
      q = words.slice(n).join(' ');
      break;
    }
  }
  return q.trim();
}

function normalizeIntent(intent: ZenithNlIntent, role: UserRole): ZenithNlIntent {
  if (!metricAllowedForRole(intent.metric, role)) {
    return { metric: 'clarify', viz: 'table', insightHints: 'Metric not allowed for this role' };
  }
  const entry = METRIC_CATALOG.find((m) => m.metric === intent.metric);
  const viz = intent.viz === 'chart' || intent.viz === 'table' ? intent.viz : entry?.defaultViz ?? 'table';
  const chartType =
    viz === 'chart'
      ? intent.chartType === 'bar' || intent.chartType === 'pie'
        ? intent.chartType
        : entry?.defaultChartType ?? 'bar'
      : undefined;
  return { ...intent, viz, chartType };
}

function formatAnthropicError(err: unknown): string {
  const msg =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message?: unknown }).message)
      : String(err);
  if (/workspace/i.test(msg)) {
    return 'Claude rejected the API key: add ANTHROPIC_WORKSPACE_ID to .env (from Claude Console → Settings → Workspaces), or create an API key scoped to a single workspace.';
  }
  if (/invalid.?api.?key|authentication|unauthorized/i.test(msg)) {
    return 'Claude authentication failed. Check ANTHROPIC_API_KEY in .env.';
  }
  if (/credit|billing|quota|rate.?limit/i.test(msg)) {
    return 'Claude API billing or rate limit issue. Check credits in the Anthropic Console.';
  }
  return `Claude request failed: ${msg.slice(0, 240)}`;
}

async function parseIntentWithClaude(
  question: string,
  role: UserRole,
  prior?: ZenithNlPriorContext | null,
): Promise<ZenithNlIntent> {
  const model = process.env.ZENITH_NL_MODEL?.trim() || 'claude-haiku-4-5-20251001';
  const priorBlock =
    prior?.question && prior.metric
      ? `\nPrevious Ask in this session:\n- question: ${prior.question}\n- metric: ${prior.metric}\n- filters: ${JSON.stringify(prior.filters || {})}\nIf the user asks a follow-up (e.g. "show as table", "break that down", "by salesperson"), keep or refine the prior metric/filters when it still fits the catalog.`
      : '';

  const system = `You are the intent parser for Rayenna CRM Zenith analytics. Map the user question to ONE metric from the catalog. Output a single JSON object only — never invent numbers. No markdown.

Catalog for role ${role}:
${catalogPromptBlock(role)}
${priorBlock}

Rules:
- Prefer the closest metric. If unclear or outside catalog, use metric "clarify".
- viz must be "chart" or "table". For chart, chartType is "bar" or "pie".
- Optional filters (use whenever the user names them):
  - projectStatus = CRM Project Status / stage only (LEAD|SITE_SURVEY|PROPOSAL|CONFIRMED|UNDER_INSTALLATION|SUBMITTED_FOR_SUBSIDY|COMPLETED|COMPLETED_SUBSIDY_CREDITED|LOST). "Under installation" → UNDER_INSTALLATION. Never use this for payment or Installation Status.
  - paymentStatus = Payment Status only (PENDING|PARTIAL|FULLY_PAID|NOT_FULLY_PAID). "Payment pending" / "fully paid" / "not fully paid" → here. Never map payment language to projectStatus.
  - installationStatus = Installation Status on Installation records only (PENDING|IN_PROGRESS|COMPLETED). "Installation pending" / "installation in progress" / "installation completed" → here. Distinct from projectStatus UNDER_INSTALLATION.
  - peBucket (proposal-ready|draft|not-started|rest)
  - leadSource (label or enum)
  - search (customer name ONLY — never put panel/inverter/bank names here)
  - panelBrand (e.g. "Adani Solar", "Waaree", "Vikram Solar" — from "Adani panels", "Adani Solar modules")
  - inverterBrand (e.g. "Deye", "Growatt", "GoodWe", "Sunways")
  - financingBank (enum keys: SBI, HDFC_BANK, ICICI_BANK, AXIS_BANK, FEDERAL_BANK, …)
  - availingLoan (true when asking about loans / financing / EMI)
- For how-many / count / revenue questions about a panel brand, inverter brand, or bank loan → prefer metric "cohort_summary" with those filters (or "availing_loan" when only loan/bank).
- Mix charts: "which panel brands sold most" → panel_brand_mix; "which inverter brand sold the most" / "inverter brands sold most" → inverter_brand_mix; "which banks are financing loans" → loan_bank_breakdown. Never map inverter questions to panel_brand_mix.
- Examples:
  - "number of projects on Adani panels" → cohort_summary, filters.panelBrand="Adani Solar"
  - "revenue of projects who used Deye inverters" → cohort_summary, filters.inverterBrand="Deye"
  - "customers using loans from SBI" → availing_loan (or cohort_summary), filters.financingBank="SBI", availingLoan=true
  - "summarise my lost deals" (Sales) → lost_deals_summary; "installation status" (Sales) → install_by_status
  - "status of SL 123" / "what's the status of Ramesh" → project_detail_lookup with filters.search ("SL:123" or customer name)
  - "customer details for Ramesh" → customer_detail_lookup; "list customers in Kochi" → customers_list_slice
  - "show all apartments/residential/commercial in customer master" → customers_list_slice with filters.customerType (APARTMENT|RESIDENTIAL|COMMERCIAL); never put "customer master" in filters.city
  - "list/show … projects" with any Projects-list filter (project status, payment status, installation status, type, customer type, city, salesperson, ops, loan, pending subsidy, documents, PE bucket, panel/inverter brand, bank, DCR, system/roof, capacity, hub link, incentive, data sense) → projects_list_slice with those filters
  - "list projects with installation pending" → projects_list_slice filters.installationStatus=PENDING (not projectStatus)
  - "list under installation projects" → projects_list_slice filters.projectStatus=UNDER_INSTALLATION
  - "list fully paid projects" → projects_list_slice filters.paymentStatus=FULLY_PAID
  - "installation status breakdown" (Pending/In progress/Completed records) → installation_model_status; late-stage Project Status cohort → install_by_status
  - "payment timeline", "feasibility pending", "missing documents", "PE missing BOM", "hub station IDs", "550W panels", "lost deal details" → projects_ops_detail with filters.detailSlice
  - "stalled pipeline", "ageing/aging/aeging pipeline", "pipeline analysis", "pipeline health" → pipeline_health with filters.detailSlice stalled|ageing|analysis
  - "DCR vs Non-DCR profitability" → panel_type_mix + profit insightHints; bank/city/salesperson profitability similarly
  - Pair detail lists with "for salesperson X" / "for ops Y" via filters.salespersonName / opsName
- Date phrases like "last FY" / "this quarter" / "next quarter" / "this half year" (H1=Q1+Q2, H2=Q3+Q4) and YoY/QoQ compares are handled outside this JSON — do not invent date fields. For single-period revenue/profitability with a named quarter or half year, prefer metric "profit_summary".
- insightHints: short phrase describing what the user cares about (no numbers).
- Follow-ups like "as a table" / "show that as a pie" should keep the prior metric and only change viz/chartType when possible.

Respond JSON: {"metric":"...","viz":"chart"|"table","chartType":"bar"|"pie"|null,"filters":{},"insightHints":"..."}`;

  const anthropic = createAnthropicClient();
  let message: Anthropic.Message;
  try {
    message = await anthropic.messages.create({
      model,
      max_tokens: 512,
      temperature: 0,
      system,
      messages: [{ role: 'user', content: question }],
    });
  } catch (err) {
    const e = new Error(formatAnthropicError(err));
    e.name = 'ZenithNlClaudeError';
    throw e;
  }

  const raw = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
  const parsed = parseIntentJson(extractJsonObject(raw || '{}'));
  if (!parsed) {
    return { metric: 'clarify', viz: 'table', insightHints: 'Could not parse intent' };
  }
  return normalizeIntent(parsed, role);
}

function clarifyResult(
  question: string,
  role: UserRole,
  message?: string,
  extra?: { suggestedQuestions?: string[]; live?: { customerName?: string | null } },
): ZenithNlQueryResult {
  const wow = wowSuggestionsForRole(role);
  const suggested =
    extra?.suggestedQuestions && extra.suggestedQuestions.length > 0
      ? extra.suggestedQuestions
      : wow;
  return {
    ok: false,
    clarify: true,
    question,
    message:
      message ||
      'I can answer who to call, stalled deals, tickets, and other CRM questions — or run tasks like New Customer. Try one of these, or search the catalog.',
    suggestedQuestions: suggested,
    catalogHints: catalogHintsForRole(role, extra?.live),
  };
}

async function execRevenueByLeadSource(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const revenueWhere = getRevenueWhere(where);
  const rows = await prisma.project.groupBy({
    by: ['leadSource'],
    where: { ...revenueWhere, leadSource: { not: null } },
    _sum: { projectCost: true },
    _count: { id: true },
  });
  const series = rows
    .map((r) => ({
      label: r.leadSource ? LEAD_SOURCE_LABELS[r.leadSource] || String(r.leadSource) : 'Unknown',
      value: Number(r._sum.projectCost) || 0,
      count: r._count.id,
    }))
    .sort((a, b) => b.value - a.value);
  const total = series.reduce((s, x) => s + x.value, 0);
  const top = series[0];
  const insight = series.length
    ? `Lead-source revenue totals ${formatInr(total)} across ${series.reduce((s, x) => s + (x.count || 0), 0)} deals. Top source: ${top.label} at ${formatInr(top.value)}.`
    : 'No revenue-stage projects with lead source match your filters.';
  return {
    insight,
    viz: {
      kind: 'chart',
      title: 'Revenue by lead source',
      chartType: 'bar',
      series,
      valueLabel: 'Revenue',
    },
  };
}

function wantsProfitabilityTable(intent?: ZenithNlIntent): boolean {
  return /\b(profit|margin|profitability)\b/i.test(
    `${intent?.insightHints || ''} ${intent?.filters?.compareFocus || ''}`,
  );
}

async function execRevenueBySalesperson(
  where: Prisma.ProjectWhereInput,
  intent?: ZenithNlIntent,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const revenueWhere = getRevenueWhere(where);
  const projects = await prisma.project.findMany({
    where: { ...revenueWhere, salespersonId: { not: null } },
    select: {
      projectCost: true,
      grossProfit: true,
      profitability: true,
      systemCapacity: true,
      salespersonId: true,
      salesperson: { select: { name: true } },
    },
    take: 5000,
  });
  const map = new Map<
    string,
    { label: string; value: number; count: number; profit: number; marginSum: number; kw: number }
  >();
  for (const p of projects) {
    if (!p.salespersonId) continue;
    const label = p.salesperson?.name?.trim() || 'Unassigned';
    const cur = map.get(p.salespersonId) || {
      label,
      value: 0,
      count: 0,
      profit: 0,
      marginSum: 0,
      kw: 0,
    };
    cur.value += Number(p.projectCost) || 0;
    cur.profit += Number(p.grossProfit) || 0;
    cur.marginSum += Number(p.profitability) || 0;
    cur.kw += Number(p.systemCapacity) || 0;
    cur.count += 1;
    map.set(p.salespersonId, cur);
  }
  if (wantsProfitabilityTable(intent)) {
    const tableRows = Array.from(map.values())
      .map((r) => ({
        salesperson: r.label,
        deals: r.count,
        order: Math.round(r.value),
        profit: Math.round(r.profit),
        margin: r.count ? Math.round((r.marginSum / r.count) * 10) / 10 : 0,
        kw: Math.round(r.kw),
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, TABLE_ROW_CAP);
    const totalProfit = tableRows.reduce((s, x) => s + x.profit, 0);
    return {
      insight: tableRows.length
        ? `Salesperson profitability: ${formatInr(totalProfit)} gross profit across ${tableRows.length} people.`
        : 'No salesperson profitability data for your filters.',
      viz: {
        kind: 'table',
        title: 'Profitability by salesperson',
        columns: [
          { key: 'salesperson', label: 'Salesperson' },
          { key: 'deals', label: 'Deals' },
          { key: 'order', label: 'Order value (₹)' },
          { key: 'profit', label: 'Gross profit (₹)' },
          { key: 'margin', label: 'Avg margin %' },
          { key: 'kw', label: 'Capacity (kW)' },
        ],
        rows: tableRows,
      },
    };
  }
  const series = Array.from(map.values())
    .map((r) => ({ label: r.label, value: r.value, count: r.count }))
    .sort((a, b) => b.value - a.value);
  const total = series.reduce((s, x) => s + x.value, 0);
  const top = series[0];
  const insight = series.length
    ? `Salesperson revenue totals ${formatInr(total)}. Leader: ${top!.label} with ${formatInr(top!.value)} (${top!.count} deals).`
    : 'No revenue-stage projects with an assigned salesperson match your filters.';
  return {
    insight,
    viz: {
      kind: 'chart',
      title: 'Revenue by salesperson',
      chartType: 'bar',
      series: series.slice(0, TABLE_ROW_CAP),
      valueLabel: 'Revenue',
    },
  };
}

async function execPipelineByStage(
  where: Prisma.ProjectWhereInput,
  intent?: ZenithNlIntent,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const weighted = intent?.filters?.detailSlice === 'weighted';
  const statuses = weighted ? OPEN_FORECAST_STATUSES : PIPELINE_STATUSES;
  const projects = await prisma.project.findMany({
    where: {
      ...where,
      projectStatus: { in: statuses },
    },
    select: { projectStatus: true, projectCost: true, salesProbability: true },
    take: 2000,
  });
  const byStatus = new Map<ProjectStatus, { count: number; value: number; expected: number }>();
  for (const st of statuses) byStatus.set(st, { count: 0, value: 0, expected: 0 });
  for (const p of projects) {
    const cur = byStatus.get(p.projectStatus) || { count: 0, value: 0, expected: 0 };
    const cost = Number(p.projectCost) || 0;
    cur.count += 1;
    cur.value += cost;
    cur.expected += dealExpectedValue({
      projectCost: p.projectCost,
      salesProbability: p.salesProbability,
      projectStatus: p.projectStatus,
    });
    byStatus.set(p.projectStatus, cur);
  }
  const tableRows = statuses.map((st) => {
    const r = byStatus.get(st)!;
    return {
      status: st,
      stage: PROJECT_STATUS_LABELS[st],
      count: r.count,
      value: Math.round(r.value),
      expected: Math.round(r.expected),
    };
  });
  const totalCount = tableRows.reduce((s, r) => s + Number(r.count), 0);
  const totalValue = tableRows.reduce((s, r) => s + Number(r.value), 0);
  const totalExpected = tableRows.reduce((s, r) => s + Number(r.expected), 0);
  const rangeLabel = weighted ? 'Lead → Subsidy submitted' : 'Lead → Confirmed';
  const insight = totalCount
    ? `${weighted ? 'Weighted open pipeline' : 'Open pipeline'} (${rangeLabel}): ${totalCount} deals · order value ${formatInr(totalValue)} · expected ${formatInr(totalExpected)} (order value × Sales Probability). Click a stage to open those projects.`
    : 'No open pipeline deals match your filters.';
  return {
    insight,
    viz: {
      kind: 'table',
      title: weighted ? 'Weighted open pipeline' : 'Pipeline by stage',
      columns: [
        { key: 'stage', label: 'Stage' },
        { key: 'count', label: 'Deals' },
        { key: 'value', label: 'Order value (₹)' },
        { key: 'expected', label: 'Expected (₹)' },
      ],
      rows: tableRows,
    },
  };
}

async function execPaymentStatusBreakdown(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const rows = await prisma.project.groupBy({
    by: ['paymentStatus'],
    where: {
      ...where,
      projectStatus: { not: ProjectStatus.LOST },
    },
    _sum: { balanceAmount: true, totalAmountReceived: true, projectCost: true },
    _count: { id: true },
  });
  const series = rows
    .map((r) => {
      const status = r.paymentStatus ?? PaymentStatus.PENDING;
      return {
        label: PAYMENT_STATUS_LABELS[status] || String(status),
        value: Number(r._sum.balanceAmount) || 0,
        count: r._count.id,
      };
    })
    .sort((a, b) => b.value - a.value);
  const outstanding = series.reduce((s, x) => s + x.value, 0);
  const insight = series.length
    ? `Payment status across non-lost projects: outstanding balance totals ${formatInr(outstanding)}. Largest bucket by balance: ${series[0].label} (${series[0].count} deals).`
    : 'No payment data matches your filters.';
  return {
    insight,
    viz: {
      kind: 'chart',
      title: 'Outstanding by payment status',
      chartType: 'pie',
      series,
      valueLabel: 'Balance',
    },
  };
}

async function execCapacitySold(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const revenueWhere = getRevenueWhere(where);
  const agg = await prisma.project.aggregate({
    where: revenueWhere,
    _sum: { systemCapacity: true, projectCost: true },
    _count: { _all: true },
  });
  const kw = Number(agg._sum.systemCapacity) || 0;
  const revenue = Number(agg._sum.projectCost) || 0;
  const count = agg._count._all;
  const insight = count
    ? `Capacity sold (revenue-stage): ${kw.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kW across ${count} deals (${formatInr(revenue)} order value).`
    : 'No capacity sold in the revenue cohort for your filters.';
  return {
    insight,
    viz: {
      kind: 'table',
      title: 'Capacity sold',
      columns: [
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ],
      rows: [
        { metric: 'Deals', value: count },
        { metric: 'Capacity (kW)', value: Math.round(kw * 100) / 100 },
        { metric: 'Order value (₹)', value: Math.round(revenue) },
      ],
    },
  };
}

async function execOutstandingBalance(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const projects = await prisma.project.findMany({
    where: {
      ...where,
      projectStatus: { not: ProjectStatus.LOST },
      balanceAmount: { gt: 0 },
    },
    select: {
      slNo: true,
      balanceAmount: true,
      paymentStatus: true,
      projectCost: true,
      customer: { select: { customerName: true, firstName: true } },
    },
    orderBy: { balanceAmount: 'desc' },
    take: TABLE_ROW_CAP,
  });
  const total = projects.reduce((s, p) => s + (Number(p.balanceAmount) || 0), 0);
  const insight = projects.length
    ? `Top outstanding balances total ${formatInr(total)} across the ${projects.length} highest-balance projects (capped at ${TABLE_ROW_CAP}).`
    : 'No projects with outstanding balance match your filters.';
  return {
    insight,
    viz: {
      kind: 'table',
      title: 'Outstanding balance',
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'paymentStatus', label: 'Payment' },
        { key: 'balance', label: 'Balance (₹)' },
      ],
      rows: projects.map((p) => ({
        slNo: p.slNo,
        customer: p.customer?.firstName?.trim() || p.customer?.customerName?.trim() || 'Unknown',
        paymentStatus: p.paymentStatus
          ? PAYMENT_STATUS_LABELS[p.paymentStatus] || p.paymentStatus
          : 'Pending',
        balance: Math.round(Number(p.balanceAmount) || 0),
      })),
    },
  };
}

async function execTopCustomersByProfit(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const revenueWhere = getRevenueWhere(where);
  const projects = await prisma.project.findMany({
    where: { ...revenueWhere, grossProfit: { not: null } },
    select: {
      grossProfit: true,
      projectCost: true,
      customer: { select: { customerName: true, firstName: true } },
    },
    take: 5000,
  });
  const map = new Map<string, { customer: string; profit: number; revenue: number; count: number }>();
  for (const p of projects) {
    const name = p.customer?.customerName?.trim() || p.customer?.firstName?.trim() || 'Unknown';
    const cur = map.get(name) || { customer: name, profit: 0, revenue: 0, count: 0 };
    cur.profit += Number(p.grossProfit) || 0;
    cur.revenue += Number(p.projectCost) || 0;
    cur.count += 1;
    map.set(name, cur);
  }
  const rows = Array.from(map.values())
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);
  const top = rows[0];
  const insight = rows.length
    ? `Top customer by gross profit: ${top.customer} at ${formatInr(top.profit)} (${top.count} deals). Showing top ${rows.length}.`
    : 'No profitability data matches your filters.';
  return {
    insight,
    viz: {
      kind: 'table',
      title: 'Top customers by profit',
      columns: [
        { key: 'customer', label: 'Customer' },
        { key: 'deals', label: 'Deals' },
        { key: 'revenue', label: 'Revenue (₹)' },
        { key: 'profit', label: 'Gross profit (₹)' },
      ],
      rows: rows.map((r) => ({
        customer: r.customer,
        deals: r.count,
        revenue: Math.round(r.revenue),
        profit: Math.round(r.profit),
      })),
    },
  };
}

async function execLostDealsSummary(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const lostProjects = await prisma.project.findMany({
    where: { ...where, projectStatus: ProjectStatus.LOST },
    select: { projectCost: true, lostReason: true },
  });
  const reasonMap = new Map<string, { count: number; value: number }>();
  for (const p of lostProjects) {
    const key = p.lostReason ?? 'UNCATEGORIZED';
    const cur = reasonMap.get(key) || { count: 0, value: 0 };
    cur.count += 1;
    cur.value += Number(p.projectCost) || 0;
    reasonMap.set(key, cur);
  }
  const rows = Array.from(reasonMap.entries())
    .map(([reason, v]) => ({
      reasonKey: reason,
      reason:
        reason === LostReason.LOST_TO_COMPETITION
          ? 'Lost to competition'
          : reason === 'UNCATEGORIZED'
            ? 'Uncategorized'
            : reason.replace(/_/g, ' '),
      count: v.count,
      value: Math.round(v.value),
    }))
    .sort((a, b) => b.value - a.value);
  const totalValue = rows.reduce((s, r) => s + Number(r.value), 0);
  const insight = rows.length
    ? `${lostProjects.length} lost deals worth ${formatInr(totalValue)}. Top reason by value: ${rows[0].reason}. Click a reason to open Lost projects.`
    : 'No lost deals match your filters.';
  return {
    insight,
    viz: {
      kind: 'table',
      title: 'Lost deals by reason',
      columns: [
        { key: 'reason', label: 'Reason' },
        { key: 'count', label: 'Count' },
        { key: 'value', label: 'Value (₹)' },
      ],
      rows,
    },
  };
}

async function execProposalEngineBuckets(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const projects = await prisma.project.findMany({
    where,
    select: { id: true, projectCost: true, projectStatus: true },
  });
  if (projects.length === 0) {
    return {
      insight: 'No projects match your filters for Proposal Engine status.',
      viz: {
        kind: 'table',
        title: 'Proposal Engine status',
        columns: [
          { key: 'bucket', label: 'Bucket' },
          { key: 'count', label: 'Count' },
          { key: 'crmOrderValue', label: 'CRM order value (₹)' },
        ],
        rows: [],
      },
    };
  }
  const projectIds = projects.map((p) => p.id);
  const [selections, costings, boms, rois, proposals] = await Promise.all([
    prisma.pESelectedProject.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true },
    }),
    prisma.pECostingSheet.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true },
    }),
    prisma.pEBomSheet.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true },
    }),
    prisma.pERoiResult.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true },
    }),
    prisma.pEProposal.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true },
    }),
  ]);
  const selectedSet = new Set(selections.map((s) => s.projectId));
  const hasCosting = new Set(costings.map((r) => r.projectId));
  const hasBom = new Set(boms.map((r) => r.projectId));
  const hasRoi = new Set(rois.map((r) => r.projectId));
  const hasProposal = new Set(proposals.map((r) => r.projectId));
  const metrics: Record<PeBucketKey, { label: string; count: number; crmOrderValue: number }> = {
    'proposal-ready': { label: 'PE Ready', count: 0, crmOrderValue: 0 },
    draft: { label: 'PE Draft', count: 0, crmOrderValue: 0 },
    'not-started': { label: 'PE Not Yet Created', count: 0, crmOrderValue: 0 },
    rest: { label: 'Rest', count: 0, crmOrderValue: 0 },
  };
  for (const project of projects) {
    let bucket: PeBucketKey | null = null;
    if (selectedSet.has(project.id)) {
      const allFour =
        hasCosting.has(project.id) &&
        hasBom.has(project.id) &&
        hasRoi.has(project.id) &&
        hasProposal.has(project.id);
      const hasAny =
        hasCosting.has(project.id) ||
        hasBom.has(project.id) ||
        hasRoi.has(project.id) ||
        hasProposal.has(project.id);
      bucket = allFour ? 'proposal-ready' : hasAny ? 'draft' : 'not-started';
    } else if (
      project.projectStatus === ProjectStatus.PROPOSAL ||
      project.projectStatus === ProjectStatus.CONFIRMED
    ) {
      bucket = 'rest';
    }
    if (!bucket) continue;
    metrics[bucket].count += 1;
    metrics[bucket].crmOrderValue += toPositiveNumber(project.projectCost);
  }
  const rows = (Object.keys(metrics) as PeBucketKey[]).map((key) => ({
    bucket: metrics[key].label,
    count: metrics[key].count,
    crmOrderValue: Math.round(metrics[key].crmOrderValue),
  }));
  const ready = metrics['proposal-ready'];
  const insight = `Proposal Engine: ${ready.count} Ready, ${metrics.draft.count} Draft, ${metrics['not-started'].count} Not Yet Created, ${metrics.rest.count} Rest (eligible without PE selection).`;
  return {
    insight,
    viz: {
      kind: 'table',
      title: 'Proposal Engine status',
      columns: [
        { key: 'bucket', label: 'Bucket' },
        { key: 'count', label: 'Count' },
        { key: 'crmOrderValue', label: 'CRM order value (₹)' },
      ],
      rows,
    },
  };
}

function applyStatusPaymentLeadSearchFilters(
  where: Prisma.ProjectWhereInput,
  intent: ZenithNlIntent,
): Prisma.ProjectWhereInput {
  const w: Prisma.ProjectWhereInput = { ...where };
  const st = intent.filters?.projectStatus?.trim();
  if (st && (Object.values(ProjectStatus) as string[]).includes(st)) {
    w.projectStatus = st as ProjectStatus;
  }
  const ps = intent.filters?.paymentStatus?.trim();
  if (ps) {
    const upper = ps.toUpperCase().replace(/\s+/g, '_');
    if (
      upper === 'NOT_FULLY_PAID' ||
      upper === 'PENDING,PARTIAL' ||
      upper === 'PARTIAL,PENDING'
    ) {
      w.paymentStatus = { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] };
    } else if ((Object.values(PaymentStatus) as string[]).includes(ps)) {
      w.paymentStatus = ps as PaymentStatus;
    } else if ((Object.values(PaymentStatus) as string[]).includes(upper)) {
      w.paymentStatus = upper as PaymentStatus;
    }
  }
  const installRaw = intent.filters?.installationStatus?.trim();
  if (installRaw) {
    const upper = installRaw.toUpperCase().replace(/\s+/g, '_');
    const installMap: Record<string, InstallationStatus> = {
      PENDING: InstallationStatus.PENDING,
      IN_PROGRESS: InstallationStatus.IN_PROGRESS,
      COMPLETED: InstallationStatus.COMPLETED,
      COMPLETE: InstallationStatus.COMPLETED,
    };
    const installStatus = installMap[upper];
    if (installStatus) {
      pushWhereAnd(w, { installations: { some: { status: installStatus } } });
    }
  }
  const search = intent.filters?.search?.trim();
  if (search) {
    pushWhereAnd(w, {
      OR: [
        { customer: { customerName: { contains: search, mode: 'insensitive' } } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
      ],
    });
  }
  const lsRaw = intent.filters?.leadSource?.trim();
  if (lsRaw) {
    const upper = lsRaw.toUpperCase().replace(/\s+/g, '_');
    if ((Object.values(LeadSource) as string[]).includes(upper)) {
      w.leadSource = upper as LeadSource;
    } else {
      const entry = Object.entries(LEAD_SOURCE_LABELS).find(
        ([, label]) => label.toLowerCase() === lsRaw.toLowerCase(),
      );
      if (entry) w.leadSource = entry[0] as LeadSource;
    }
  }
  return w;
}

function describeEntitySlice(intent: ZenithNlIntent): string {
  const bits: string[] = [];
  if (intent.filters?.projectStatus) {
    const st = intent.filters.projectStatus.trim();
    bits.push(
      `project status ${PROJECT_STATUS_LABELS[st as ProjectStatus] || st.replace(/_/g, ' ').toLowerCase()}`,
    );
  }
  if (intent.filters?.paymentStatus) {
    const ps = intent.filters.paymentStatus.trim().toUpperCase().replace(/\s+/g, '_');
    if (ps === 'NOT_FULLY_PAID' || ps === 'PENDING,PARTIAL' || ps === 'PARTIAL,PENDING') {
      bits.push('payment not fully paid');
    } else {
      bits.push(
        `payment ${PAYMENT_STATUS_LABELS[ps as PaymentStatus] || ps.replace(/_/g, ' ').toLowerCase()}`,
      );
    }
  }
  if (intent.filters?.installationStatus) {
    const is = intent.filters.installationStatus.trim().toUpperCase().replace(/\s+/g, '_');
    const installLabel =
      is === 'IN_PROGRESS' ? 'in progress' : is.replace(/_/g, ' ').toLowerCase();
    bits.push(`installation status ${installLabel}`);
  }
  if (intent.filters?.panelBrand) bits.push(`${intent.filters.panelBrand} panels`);
  if (intent.filters?.inverterBrand) bits.push(`${intent.filters.inverterBrand} inverters`);
  if (intent.filters?.financingBank) bits.push(`${intent.filters.financingBank.replace(/_/g, ' ')} loans`);
  else if (intent.filters?.availingLoan) bits.push('availing loan');
  if (intent.filters?.projectType) {
    const t = parseProjectType(intent.filters.projectType);
    if (t) bits.push(projectTypeLabel(t));
  }
  if (intent.filters?.panelType) bits.push(intent.filters.panelType);
  if (intent.filters?.customerType) {
    const t = parseCustomerType(intent.filters.customerType);
    if (t) bits.push(customerTypeLabel(t));
  }
  if (intent.filters?.projectServiceType) {
    const t = parseServiceType(intent.filters.projectServiceType);
    if (t) bits.push(serviceTypeLabel(t));
  }
  if (intent.filters?.systemType) {
    const t = parseSystemType(intent.filters.systemType);
    if (t) bits.push(systemTypeLabel(t));
  }
  if (intent.filters?.roofType) bits.push(`${intent.filters.roofType} roof`);
  if (intent.filters?.capacityMin != null || intent.filters?.capacityMax != null) {
    const a = intent.filters.capacityMin;
    const b = intent.filters.capacityMax;
    if (a != null && b != null) bits.push(`${a}–${b} kW`);
    else if (a != null) bits.push(`≥${a} kW`);
    else if (b != null) bits.push(`≤${b} kW`);
  }
  if (intent.filters?.salespersonName) bits.push(`salesperson ${intent.filters.salespersonName}`);
  if (intent.filters?.opsName) bits.push(`ops ${intent.filters.opsName}`);
  if (intent.filters?.city) bits.push(`in ${intent.filters.city}`);
  if (intent.filters?.pendingSubsidy) bits.push('pending subsidy');
  if (intent.filters?.hasDocuments) bits.push('with documents');
  if (intent.filters?.missingDocuments) bits.push('missing documents');
  if (intent.filters?.peBucket) bits.push(`PE ${intent.filters.peBucket}`);
  if (intent.filters?.leadSource) bits.push(`lead ${intent.filters.leadSource}`);
  if (intent.filters?.incentiveEligible) bits.push('incentive eligible');
  if (intent.filters?.dataSenseNeedsReview) bits.push('needs review');
  if (intent.filters?.lifecycleSpecsIncomplete) bits.push('incomplete specs');
  if (intent.filters?.hubPlantLinked === true) bits.push('hub linked');
  if (intent.filters?.hubPlantLinked === false) bits.push('hub unlinked');
  if (intent.filters?.salespersonUnassigned) bits.push('unassigned salesperson');
  return bits.length ? bits.join(' · ') : 'your filters';
}

async function execProjectsListSlice(
  where: Prisma.ProjectWhereInput,
  intent: ZenithNlIntent,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  let w = applyStatusPaymentLeadSearchFilters(where, intent);

  if (intent.filters?.peBucket) {
    const pe = await loadPeBucketProjectIds(where);
    const projectIdsFilter = pe[intent.filters.peBucket] ?? [];
    if (projectIdsFilter.length === 0) {
      return {
        insight: 'No projects in that Proposal Engine bucket for your filters.',
        viz: {
          kind: 'table',
          title: 'Projects',
          columns: [
            { key: 'slNo', label: 'SL No' },
            { key: 'customer', label: 'Customer' },
            { key: 'stage', label: 'Stage' },
            { key: 'value', label: 'Order value (₹)' },
          ],
          rows: [],
        },
      };
    }
    w = { ...w, id: { in: projectIdsFilter } };
  }

  const showEquipment = Boolean(intent.filters?.panelBrand || intent.filters?.inverterBrand);
  const showBank = Boolean(intent.filters?.financingBank || intent.filters?.availingLoan);
  const showPayment = Boolean(intent.filters?.paymentStatus);

  const [projects, aggregate] = await Promise.all([
    prisma.project.findMany({
      where: w,
      select: {
        slNo: true,
        projectStatus: true,
        paymentStatus: true,
        projectCost: true,
        balanceAmount: true,
        siteAddress: true,
        panelBrand: true,
        inverterBrand: true,
        financingBank: true,
        customer: { select: { customerName: true, firstName: true, city: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: TABLE_ROW_CAP,
    }),
    prisma.project.aggregate({
      where: w,
      _count: { id: true },
      _sum: { projectCost: true, balanceAmount: true },
    }),
  ]);
  const totalCount = aggregate._count.id;
  const totalValue = Math.round(Number(aggregate._sum.projectCost) || 0);
  const totalBalance = Math.round(Number(aggregate._sum.balanceAmount) || 0);
  const sliceLabel = describeEntitySlice(intent);
  const insight = totalCount
    ? `${totalCount} project${totalCount === 1 ? '' : 's'} match ${sliceLabel} (${formatInr(totalValue)} order value${
        showPayment && totalBalance > 0 ? `; ${formatInr(totalBalance)} outstanding` : ''
      }; showing up to ${TABLE_ROW_CAP}).`
    : `No projects match ${sliceLabel} under your Zenith filters.`;

  const columns = [
    { key: 'slNo', label: 'SL No' },
    { key: 'customer', label: 'Customer' },
    { key: 'city', label: 'City' },
    { key: 'stage', label: 'Stage' },
    ...(showPayment
      ? [
          { key: 'payment', label: 'Payment' },
          { key: 'balance', label: 'Balance (₹)' },
        ]
      : []),
    ...(showEquipment
      ? [
          { key: 'panel', label: 'Panel' },
          { key: 'inverter', label: 'Inverter' },
        ]
      : []),
    ...(showBank ? [{ key: 'bank', label: 'Bank' }] : []),
    { key: 'value', label: 'Order value (₹)' },
    { key: 'address', label: 'Site address' },
  ];

  return {
    insight,
    viz: {
      kind: 'table',
      title: 'Projects',
      columns,
      rows: projects.map((p) => ({
        slNo: p.slNo,
        customer: p.customer?.firstName?.trim() || p.customer?.customerName?.trim() || 'Unknown',
        city: p.customer?.city?.trim() || '—',
        stage: PROJECT_STATUS_LABELS[p.projectStatus] || p.projectStatus,
        ...(showPayment
          ? {
              payment: p.paymentStatus
                ? PAYMENT_STATUS_LABELS[p.paymentStatus] || p.paymentStatus
                : 'Pending',
              balance: Math.round(Number(p.balanceAmount) || 0),
            }
          : {}),
        ...(showEquipment
          ? {
              panel: p.panelBrand?.trim() || '—',
              inverter: p.inverterBrand?.trim() || '—',
            }
          : {}),
        ...(showBank ? { bank: p.financingBank?.trim() || '—' } : {}),
        value: Math.round(Number(p.projectCost) || 0),
        address: (p.siteAddress || '—').slice(0, 60),
      })),
    },
  };
}

async function execCohortSummary(
  where: Prisma.ProjectWhereInput,
  intent: ZenithNlIntent,
  entities: ExtractedZenithEntities,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  let w = applyStatusPaymentLeadSearchFilters(where, intent);
  // Revenue / order-value asks use the confirmed+ revenue cohort; pure counts use full filter set.
  if (entities.wantsRevenue || /\brevenue|order value/i.test(intent.insightHints || '')) {
    w = getRevenueWhere(w);
  }

  const [aggregate, projects] = await Promise.all([
    prisma.project.aggregate({
      where: w,
      _count: { id: true },
      _sum: { projectCost: true, systemCapacity: true },
    }),
    prisma.project.findMany({
      where: w,
      select: {
        slNo: true,
        projectStatus: true,
        projectCost: true,
        panelBrand: true,
        inverterBrand: true,
        financingBank: true,
        customer: { select: { customerName: true, firstName: true } },
      },
      orderBy: { projectCost: 'desc' },
      take: TABLE_ROW_CAP,
    }),
  ]);

  const count = aggregate._count.id;
  const orderValue = Math.round(Number(aggregate._sum.projectCost) || 0);
  const capacity = Math.round(Number(aggregate._sum.systemCapacity) || 0);
  const sliceLabel = describeEntitySlice(intent);
  const insight = count
    ? `${count} project${count === 1 ? '' : 's'} with ${sliceLabel}: ${formatInr(orderValue)} order value` +
      (capacity > 0 ? `, ${capacity} kW capacity` : '') +
      `.`
    : `No projects match ${sliceLabel} under your Zenith filters (check FY filters and that panel/inverter/bank is filled on the project).`;

  return {
    insight,
    viz: {
      kind: 'table',
      title: `Cohort · ${sliceLabel}`,
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'stage', label: 'Stage' },
        { key: 'panel', label: 'Panel' },
        { key: 'inverter', label: 'Inverter' },
        { key: 'bank', label: 'Bank' },
        { key: 'value', label: 'Order value (₹)' },
      ],
      rows: projects.map((p) => ({
        slNo: p.slNo,
        customer: p.customer?.firstName?.trim() || p.customer?.customerName?.trim() || 'Unknown',
        stage: PROJECT_STATUS_LABELS[p.projectStatus] || p.projectStatus,
        panel: p.panelBrand?.trim() || '—',
        inverter: p.inverterBrand?.trim() || '—',
        bank: p.financingBank?.trim() || '—',
        value: Math.round(Number(p.projectCost) || 0),
      })),
    },
  };
}

async function loadPeBucketProjectIds(
  where: Prisma.ProjectWhereInput,
): Promise<Record<PeBucketKey, string[]>> {
  const projects = await prisma.project.findMany({
    where,
    select: { id: true, projectStatus: true },
  });
  const out: Record<PeBucketKey, string[]> = {
    'proposal-ready': [],
    draft: [],
    'not-started': [],
    rest: [],
  };
  if (projects.length === 0) return out;
  const projectIds = projects.map((p) => p.id);
  const [selections, costings, boms, rois, proposals] = await Promise.all([
    prisma.pESelectedProject.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true },
    }),
    prisma.pECostingSheet.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true },
    }),
    prisma.pEBomSheet.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true },
    }),
    prisma.pERoiResult.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true },
    }),
    prisma.pEProposal.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true },
    }),
  ]);
  const selectedSet = new Set(selections.map((s) => s.projectId));
  const hasCosting = new Set(costings.map((r) => r.projectId));
  const hasBom = new Set(boms.map((r) => r.projectId));
  const hasRoi = new Set(rois.map((r) => r.projectId));
  const hasProposal = new Set(proposals.map((r) => r.projectId));
  for (const project of projects) {
    let bucket: PeBucketKey | null = null;
    if (selectedSet.has(project.id)) {
      const allFour =
        hasCosting.has(project.id) &&
        hasBom.has(project.id) &&
        hasRoi.has(project.id) &&
        hasProposal.has(project.id);
      const hasAny =
        hasCosting.has(project.id) ||
        hasBom.has(project.id) ||
        hasRoi.has(project.id) ||
        hasProposal.has(project.id);
      bucket = allFour ? 'proposal-ready' : hasAny ? 'draft' : 'not-started';
    } else if (
      project.projectStatus === ProjectStatus.PROPOSAL ||
      project.projectStatus === ProjectStatus.CONFIRMED
    ) {
      bucket = 'rest';
    }
    if (bucket) out[bucket].push(project.id);
  }
  return out;
}

const INSTALL_STATUSES: ProjectStatus[] = [
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.SUBMITTED_FOR_SUBSIDY,
  ProjectStatus.COMPLETED,
  ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
];

async function execInstallByStatus(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const rows = await prisma.project.groupBy({
    by: ['projectStatus'],
    where: { ...where, projectStatus: { in: INSTALL_STATUSES } },
    _sum: { projectCost: true },
    _count: { id: true },
  });
  const byStatus = new Map(rows.map((r) => [r.projectStatus, r]));
  const tableRows = INSTALL_STATUSES.map((st) => {
    const r = byStatus.get(st);
    return {
      status: st,
      stage: PROJECT_STATUS_LABELS[st],
      count: r?._count.id ?? 0,
      value: Math.round(Number(r?._sum.projectCost) || 0),
    };
  });
  const total = tableRows.reduce((s, r) => s + Number(r.count), 0);
  return {
    insight: total
      ? `Installation / late-stage cohort: ${total} projects under your filters. Click a status to open those projects.`
      : 'No installation-stage projects match your filters.',
    viz: {
      kind: 'table',
      title: 'Installation by status',
      columns: [
        { key: 'stage', label: 'Status' },
        { key: 'count', label: 'Projects' },
        { key: 'value', label: 'Order value (₹)' },
      ],
      rows: tableRows,
    },
  };
}

async function execPendingSubsidy(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const projects = await prisma.project.findMany({
    where: {
      ...where,
      type: ProjectType.SUBSIDY,
      projectStatus: ProjectStatus.COMPLETED,
    },
    select: {
      slNo: true,
      projectCost: true,
      balanceAmount: true,
      customer: { select: { customerName: true, firstName: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: TABLE_ROW_CAP,
  });
  return {
    insight: projects.length
      ? `${projects.length} subsidy project${projects.length === 1 ? '' : 's'} completed and awaiting subsidy credit (capped at ${TABLE_ROW_CAP}).`
      : 'No pending-subsidy projects match your filters.',
    viz: {
      kind: 'table',
      title: 'Pending subsidy credit',
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'value', label: 'Order value (₹)' },
        { key: 'balance', label: 'Balance (₹)' },
      ],
      rows: projects.map((p) => ({
        slNo: p.slNo,
        customer: p.customer?.firstName?.trim() || p.customer?.customerName?.trim() || 'Unknown',
        value: Math.round(Number(p.projectCost) || 0),
        balance: Math.round(Number(p.balanceAmount) || 0),
      })),
    },
  };
}

async function execPanelBrandMix(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const rows = await prisma.project.groupBy({
    by: ['panelBrand'],
    where: {
      ...where,
      projectStatus: { not: ProjectStatus.LOST },
      panelBrand: { not: null },
      NOT: { panelBrand: '' },
    },
    _count: { id: true },
    _sum: { projectCost: true },
  });
  const series = rows
    .map((r) => ({
      label: (r.panelBrand || 'Unknown').trim() || 'Unknown',
      value: Math.round(Number(r._sum.projectCost) || 0),
      count: r._count.id,
    }))
    .sort((a, b) => b.value - a.value || b.count - a.count)
    .slice(0, 12);
  const totalValue = series.reduce((s, x) => s + x.value, 0);
  const totalCount = series.reduce((s, x) => s + (x.count || 0), 0);
  return {
    insight: series.length
      ? `Panel brand mix: ${totalCount} projects · ${formatInr(totalValue)} order value across ${series.length} brands (top by value).`
      : 'No projects with panel brand set match your filters.',
    viz: {
      kind: 'chart',
      title: 'Panel brand mix',
      chartType: 'bar',
      series,
      valueLabel: 'Order value (₹)',
    },
  };
}

async function execInverterBrandMix(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const rows = await prisma.project.groupBy({
    by: ['inverterBrand'],
    where: {
      ...where,
      projectStatus: { not: ProjectStatus.LOST },
      inverterBrand: { not: null },
      NOT: { inverterBrand: '' },
    },
    _count: { id: true },
    _sum: { projectCost: true },
  });
  const series = rows
    .map((r) => ({
      label: (r.inverterBrand || 'Unknown').trim() || 'Unknown',
      value: Math.round(Number(r._sum.projectCost) || 0),
      count: r._count.id,
    }))
    .sort((a, b) => b.value - a.value || b.count - a.count)
    .slice(0, 12);
  const totalValue = series.reduce((s, x) => s + x.value, 0);
  const totalCount = series.reduce((s, x) => s + (x.count || 0), 0);
  return {
    insight: series.length
      ? `Inverter brand mix: ${totalCount} projects · ${formatInr(totalValue)} order value across ${series.length} brands (top by value).`
      : 'No projects with inverter brand set match your filters.',
    viz: {
      kind: 'chart',
      title: 'Inverter brand mix',
      chartType: 'bar',
      series,
      valueLabel: 'Order value (₹)',
    },
  };
}

async function execRevenueByProjectType(
  where: Prisma.ProjectWhereInput,
  intent?: ZenithNlIntent,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const revenueWhere = getRevenueWhere(where);
  const wantsProfitability = /\b(profit|margin|profitability)\b/i.test(
    `${intent?.insightHints || ''} ${intent?.filters?.compareFocus || ''}`,
  );

  const rows = await prisma.project.groupBy({
    by: ['type'],
    where: revenueWhere,
    _count: { id: true },
    _sum: { projectCost: true, systemCapacity: true, grossProfit: true },
    _avg: { profitability: true },
  });

  if (wantsProfitability) {
    const tableRows = rows
      .map((r) => ({
        type: projectTypeLabel(r.type),
        deals: r._count.id,
        order: Math.round(Number(r._sum.projectCost) || 0),
        profit: Math.round(Number(r._sum.grossProfit) || 0),
        margin: Math.round((Number(r._avg.profitability) || 0) * 10) / 10,
        kw: Math.round(Number(r._sum.systemCapacity) || 0),
      }))
      .sort((a, b) => b.profit - a.profit);
    const totalProfit = tableRows.reduce((s, x) => s + x.profit, 0);
    const totalOrder = tableRows.reduce((s, x) => s + x.order, 0);
    const bits = tableRows.map(
      (r) =>
        `${r.type}: ${formatInr(r.profit)} profit · ${r.margin}% margin · ${r.deals} deals`,
    );
    return {
      insight: tableRows.length
        ? `Subsidy vs Non-Subsidy profitability: ${bits.join(' · ')} (${formatInr(totalOrder)} order · ${formatInr(totalProfit)} gross profit).`
        : 'No revenue-stage projects match your filters for project-type profitability.',
      viz: {
        kind: 'table',
        title: 'Profitability by project type',
        columns: [
          { key: 'type', label: 'Type' },
          { key: 'deals', label: 'Deals' },
          { key: 'order', label: 'Order value (₹)' },
          { key: 'profit', label: 'Gross profit (₹)' },
          { key: 'margin', label: 'Avg margin %' },
          { key: 'kw', label: 'Capacity (kW)' },
        ],
        rows: tableRows,
      },
    };
  }

  const series = rows
    .map((r) => ({
      label: projectTypeLabel(r.type),
      value: Math.round(Number(r._sum.projectCost) || 0),
      count: r._count.id,
    }))
    .sort((a, b) => b.value - a.value);
  const total = series.reduce((s, x) => s + x.value, 0);
  return {
    insight: series.length
      ? `Subsidy vs Non-Subsidy revenue: ${formatInr(total)} across ${series.reduce((s, x) => s + (x.count || 0), 0)} deals.`
      : 'No revenue-stage projects match your filters for project type.',
    viz: {
      kind: 'chart',
      title: 'Revenue by project type',
      chartType: 'pie',
      series,
      valueLabel: 'Order value (₹)',
    },
  };
}

async function execRevenueByCustomerType(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const revenueWhere = getRevenueWhere(where);
  const projects = await prisma.project.findMany({
    where: revenueWhere,
    select: {
      projectCost: true,
      customer: { select: { customerType: true } },
    },
    take: 8000,
  });
  const map = new Map<string, { label: string; value: number; count: number }>();
  for (const p of projects) {
    const ct = p.customer?.customerType || CustomerType.RESIDENTIAL;
    const label = customerTypeLabel(ct);
    const cur = map.get(ct) || { label, value: 0, count: 0 };
    cur.value += Number(p.projectCost) || 0;
    cur.count += 1;
    map.set(ct, cur);
  }
  const series = Array.from(map.values()).sort((a, b) => b.value - a.value);
  const total = series.reduce((s, x) => s + x.value, 0);
  return {
    insight: series.length
      ? `Customer-type revenue: ${formatInr(total)}. Top: ${series[0]!.label} at ${formatInr(series[0]!.value)}.`
      : 'No revenue-stage projects match your filters for customer type.',
    viz: {
      kind: 'chart',
      title: 'Revenue by customer type',
      chartType: 'pie',
      series,
      valueLabel: 'Order value (₹)',
    },
  };
}

async function execServiceTypeMix(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const rows = await prisma.project.groupBy({
    by: ['projectServiceType'],
    where: { ...where, projectStatus: { not: ProjectStatus.LOST } },
    _count: { id: true },
    _sum: { projectCost: true },
  });
  const series = rows
    .map((r) => ({
      label: serviceTypeLabel(r.projectServiceType),
      value: Math.round(Number(r._sum.projectCost) || 0),
      count: r._count.id,
    }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
  const totalCount = series.reduce((s, x) => s + (x.count || 0), 0);
  return {
    insight: series.length
      ? `Service type mix: ${totalCount} projects across ${series.length} service types.`
      : 'No projects match your filters for service type.',
    viz: {
      kind: 'chart',
      title: 'Service type mix',
      chartType: 'bar',
      series,
      valueLabel: 'Order value (₹)',
    },
  };
}

async function execPanelTypeMix(
  where: Prisma.ProjectWhereInput,
  intent?: ZenithNlIntent,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const revenueWhere = getRevenueWhere(where);
  const rows = await prisma.project.groupBy({
    by: ['panelType'],
    where: {
      ...revenueWhere,
      panelType: { not: null },
      NOT: { panelType: '' },
    },
    _count: { id: true },
    _sum: { projectCost: true, systemCapacity: true, grossProfit: true },
    _avg: { profitability: true },
  });
  if (wantsProfitabilityTable(intent)) {
    const tableRows = rows
      .map((r) => ({
        panelType: (r.panelType || 'Unknown').trim() || 'Unknown',
        deals: r._count.id,
        order: Math.round(Number(r._sum.projectCost) || 0),
        profit: Math.round(Number(r._sum.grossProfit) || 0),
        margin: Math.round((Number(r._avg.profitability) || 0) * 10) / 10,
        kw: Math.round(Number(r._sum.systemCapacity) || 0),
      }))
      .sort((a, b) => b.profit - a.profit);
    return {
      insight: tableRows.length
        ? `DCR vs Non-DCR profitability: ${tableRows
            .map((r) => `${r.panelType} ${formatInr(r.profit)} · ${r.margin}%`)
            .join(' · ')}.`
        : 'No panel-type profitability data for your filters.',
      viz: {
        kind: 'table',
        title: 'Profitability by panel type (DCR)',
        columns: [
          { key: 'panelType', label: 'Panel type' },
          { key: 'deals', label: 'Deals' },
          { key: 'order', label: 'Order value (₹)' },
          { key: 'profit', label: 'Gross profit (₹)' },
          { key: 'margin', label: 'Avg margin %' },
          { key: 'kw', label: 'Capacity (kW)' },
        ],
        rows: tableRows,
      },
    };
  }
  const series = rows
    .map((r) => ({
      label: (r.panelType || 'Unknown').trim() || 'Unknown',
      value: Math.round(Number(r._sum.projectCost) || 0),
      count: r._count.id,
    }))
    .sort((a, b) => b.value - a.value);
  return {
    insight: series.length
      ? `DCR / Non-DCR mix: ${series.map((s) => `${s.label} ${s.count}`).join(' · ')}.`
      : 'No revenue-stage projects with panel type (DCR / Non-DCR) set.',
    viz: {
      kind: 'chart',
      title: 'Panel type mix (DCR)',
      chartType: 'pie',
      series,
      valueLabel: 'Order value (₹)',
    },
  };
}

async function execRoofTypeMix(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const rows = await prisma.project.groupBy({
    by: ['roofType'],
    where: {
      ...where,
      projectStatus: { not: ProjectStatus.LOST },
      roofType: { not: null },
      NOT: { roofType: '' },
    },
    _count: { id: true },
    _sum: { projectCost: true },
  });
  const series = rows
    .map((r) => ({
      label: (r.roofType || 'Unknown').trim() || 'Unknown',
      value: Math.round(Number(r._sum.projectCost) || 0),
      count: r._count.id,
    }))
    .sort((a, b) => b.count - a.count || b.value - a.value)
    .slice(0, 12);
  const totalCount = series.reduce((s, x) => s + (x.count || 0), 0);
  return {
    insight: series.length
      ? `Roof type mix: ${totalCount} projects · top ${series[0]!.label} (${series[0]!.count}).`
      : 'No projects with roof type set match your filters.',
    viz: {
      kind: 'chart',
      title: 'Roof type mix',
      chartType: 'bar',
      series,
      valueLabel: 'Order value (₹)',
    },
  };
}

async function execSystemTypeMix(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const revenueWhere = getRevenueWhere(where);
  const rows = await prisma.project.groupBy({
    by: ['systemType'],
    where: { ...revenueWhere, systemType: { not: null } },
    _count: { id: true },
    _sum: { projectCost: true, systemCapacity: true },
  });
  const series = rows
    .map((r) => ({
      label: r.systemType ? systemTypeLabel(r.systemType) : 'Unknown',
      value: Math.round(Number(r._sum.projectCost) || 0),
      count: r._count.id,
    }))
    .sort((a, b) => b.value - a.value);
  return {
    insight: series.length
      ? `System type mix: ${series.map((s) => `${s.label} ${formatInr(s.value)}`).join(' · ')}.`
      : 'No revenue-stage projects with system type set.',
    viz: {
      kind: 'chart',
      title: 'System type mix',
      chartType: 'pie',
      series,
      valueLabel: 'Order value (₹)',
    },
  };
}

async function execCapacityByBand(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const revenueWhere = getRevenueWhere(where);
  const projects = await prisma.project.findMany({
    where: revenueWhere,
    select: { systemCapacity: true, projectCost: true },
    take: 8000,
  });
  const map = new Map<string, { label: string; value: number; count: number; kw: number }>();
  for (const b of CAPACITY_BANDS) {
    map.set(b.label, { label: b.label, value: 0, count: 0, kw: 0 });
  }
  map.set('Unknown', { label: 'Unknown', value: 0, count: 0, kw: 0 });
  for (const p of projects) {
    const band = capacityBandForKw(p.systemCapacity);
    const cur = map.get(band) || { label: band, value: 0, count: 0, kw: 0 };
    cur.value += Number(p.projectCost) || 0;
    cur.count += 1;
    cur.kw += Number(p.systemCapacity) || 0;
    map.set(band, cur);
  }
  const series = [...CAPACITY_BANDS.map((b) => map.get(b.label)!), map.get('Unknown')!]
    .filter((s) => s && s.count > 0)
    .map((s) => ({ label: s.label, value: Math.round(s.value), count: s.count }));
  const totalKw = projects.reduce((s, p) => s + (Number(p.systemCapacity) || 0), 0);
  return {
    insight: series.length
      ? `Capacity by band: ${totalKw.toLocaleString('en-IN')} kW sold across ${projects.length} deals.`
      : 'No revenue-stage capacity data matches your filters.',
    viz: {
      kind: 'chart',
      title: 'Capacity by size band',
      chartType: 'bar',
      series,
      valueLabel: 'Order value (₹)',
    },
  };
}

async function execLoanBankBreakdown(
  where: Prisma.ProjectWhereInput,
  intent?: ZenithNlIntent,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const rows = await prisma.project.groupBy({
    by: ['financingBank'],
    where: {
      ...where,
      availingLoan: true,
      projectStatus: { not: ProjectStatus.LOST },
      financingBank: { not: null },
      NOT: { financingBank: '' },
    },
    _count: { id: true },
    _sum: { projectCost: true, grossProfit: true, systemCapacity: true },
    _avg: { profitability: true },
  });
  if (wantsProfitabilityTable(intent)) {
    const tableRows = rows
      .map((r) => ({
        bank: (r.financingBank || 'Unknown').replace(/_/g, ' '),
        deals: r._count.id,
        order: Math.round(Number(r._sum.projectCost) || 0),
        profit: Math.round(Number(r._sum.grossProfit) || 0),
        margin: Math.round((Number(r._avg.profitability) || 0) * 10) / 10,
        kw: Math.round(Number(r._sum.systemCapacity) || 0),
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 12);
    return {
      insight: tableRows.length
        ? `Bank profitability: ${tableRows
            .slice(0, 3)
            .map((r) => `${r.bank} ${formatInr(r.profit)}`)
            .join(' · ')}.`
        : 'No bank profitability data for your filters.',
      viz: {
        kind: 'table',
        title: 'Profitability by financing bank',
        columns: [
          { key: 'bank', label: 'Bank' },
          { key: 'deals', label: 'Deals' },
          { key: 'order', label: 'Order value (₹)' },
          { key: 'profit', label: 'Gross profit (₹)' },
          { key: 'margin', label: 'Avg margin %' },
          { key: 'kw', label: 'Capacity (kW)' },
        ],
        rows: tableRows,
      },
    };
  }
  const series = rows
    .map((r) => ({
      label: (r.financingBank || 'Unknown').replace(/_/g, ' '),
      value: Math.round(Number(r._sum.projectCost) || 0),
      count: r._count.id,
    }))
    .sort((a, b) => b.count - a.count || b.value - a.value)
    .slice(0, 12);
  const totalCount = series.reduce((s, x) => s + (x.count || 0), 0);
  return {
    insight: series.length
      ? `Loan bank mix: ${totalCount} availing-loan projects across ${series.length} banks (top by count).`
      : 'No availing-loan projects with a financing bank match your filters.',
    viz: {
      kind: 'chart',
      title: 'Loan bank breakdown',
      chartType: 'bar',
      series,
      valueLabel: 'Order value (₹)',
    },
  };
}

const TICKET_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  [SupportTicketStatus.OPEN]: 'Open',
  [SupportTicketStatus.IN_PROGRESS]: 'In progress',
  [SupportTicketStatus.CLOSED]: 'Closed',
};

async function execSupportTicketsSummary(
  intent: ZenithNlIntent,
  ctx: { userId: string; role: UserRole; dateFilter: ZenithNlDateFilter },
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const createdAtWhere = supportTicketCreatedAtWhere(ctx.dateFilter);
  const statusFilter = intent.filters?.ticketStatus?.trim().toUpperCase() || '';
  const sourceFilter = intent.filters?.ticketSource?.trim().toUpperCase() || '';
  const overdueOnly = statusFilter === 'OVERDUE';

  const ticketWhere: Prisma.SupportTicketWhereInput = {
    ...createdAtWhere,
  };
  if (ctx.role === UserRole.SALES) {
    ticketWhere.project = { salespersonId: ctx.userId };
  }
  if (
    statusFilter === SupportTicketStatus.OPEN ||
    statusFilter === SupportTicketStatus.IN_PROGRESS ||
    statusFilter === SupportTicketStatus.CLOSED
  ) {
    ticketWhere.status = statusFilter;
  }
  if (
    sourceFilter === SupportTicketSource.CRM ||
    sourceFilter === SupportTicketSource.CONSUMER_APP
  ) {
    ticketWhere.source = sourceFilter;
  }

  const tickets = await prisma.supportTicket.findMany({
    where: ticketWhere,
    select: {
      id: true,
      status: true,
      source: true,
      createdAt: true,
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true, followUpDate: true },
      },
    },
  });

  let open = 0;
  let inProgress = 0;
  let closed = 0;
  let overdue = 0;
  let hub = 0;
  for (const t of tickets) {
    if (t.status === SupportTicketStatus.OPEN) open += 1;
    else if (t.status === SupportTicketStatus.IN_PROGRESS) inProgress += 1;
    else if (t.status === SupportTicketStatus.CLOSED) closed += 1;
    if (t.source === SupportTicketSource.CONSUMER_APP) hub += 1;
    if (isSupportTicketOverdue(t)) overdue += 1;
  }

  const scoped = overdueOnly
    ? tickets.filter((t) => isSupportTicketOverdue(t))
    : tickets;
  const total = scoped.length;

  const series = overdueOnly
    ? [
        { label: 'Overdue open queue', value: overdue, count: overdue },
      ].filter((s) => s.value > 0)
    : (
        [
          SupportTicketStatus.OPEN,
          SupportTicketStatus.IN_PROGRESS,
          SupportTicketStatus.CLOSED,
        ] as SupportTicketStatus[]
      )
        .map((st) => {
          const count =
            st === SupportTicketStatus.OPEN
              ? open
              : st === SupportTicketStatus.IN_PROGRESS
                ? inProgress
                : closed;
          return { label: TICKET_STATUS_LABELS[st], value: count, count };
        })
        .filter((s) => s.value > 0);

  const openQueue = open + inProgress;
  const hubOnScoped = overdueOnly
    ? scoped.filter((t) => t.source === SupportTicketSource.CONSUMER_APP).length
    : hub;
  const hubShare = total > 0 ? Math.round((hubOnScoped / total) * 100) : 0;

  let insight: string;
  if (total === 0) {
    insight = overdueOnly
      ? 'No overdue support tickets match your filters.'
      : 'No support tickets match your filters.';
  } else if (overdueOnly) {
    insight = `${overdue} overdue support ticket${overdue === 1 ? '' : 's'} in the open queue${
      hubOnScoped ? ` · ${hubOnScoped} from Solar Hub` : ''
    }.`;
  } else if (
    statusFilter === SupportTicketStatus.OPEN ||
    statusFilter === SupportTicketStatus.IN_PROGRESS ||
    statusFilter === SupportTicketStatus.CLOSED
  ) {
    const label = TICKET_STATUS_LABELS[statusFilter as SupportTicketStatus];
    insight = `${total} ${label.toLowerCase()} support ticket${total === 1 ? '' : 's'} raised${
      hubOnScoped ? ` · ${hubOnScoped} from Solar Hub` : ''
    }.`;
  } else {
    insight = `${total} support ticket${total === 1 ? '' : 's'} raised · ${openQueue} open queue (${open} open / ${inProgress} in progress) · ${overdue} overdue · ${hub} Solar Hub (${hubShare}% of raised).`;
  }

  return {
    insight,
    viz: {
      kind: 'chart',
      title: overdueOnly ? 'Overdue support tickets' : 'Support tickets by status',
      chartType: 'pie',
      series:
        series.length > 0
          ? series
          : [{ label: 'None', value: 0, count: 0 }],
      valueLabel: 'Tickets',
    },
  };
}

async function execAvailingLoan(
  where: Prisma.ProjectWhereInput,
  intent: ZenithNlIntent,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const bank = findFinancingBankFromRaw(intent.filters?.financingBank);
  const loanWhere: Prisma.ProjectWhereInput = {
    ...where,
    availingLoan: true,
    projectStatus: { not: ProjectStatus.LOST },
    ...(bank ? { financingBank: bank } : {}),
  };

  const [projects, aggregate] = await Promise.all([
    prisma.project.findMany({
      where: loanWhere,
      select: {
        slNo: true,
        projectCost: true,
        financingBank: true,
        paymentStatus: true,
        customer: { select: { customerName: true, firstName: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: TABLE_ROW_CAP,
    }),
    prisma.project.aggregate({
      where: loanWhere,
      _count: { id: true },
      _sum: { projectCost: true },
    }),
  ]);
  const total = aggregate._count.id;
  const bankLabel = bank ? bank.replace(/_/g, ' ') : 'any bank';
  return {
    insight: total
      ? `${total} project${total === 1 ? '' : 's'} availing loan (${bankLabel}) — ${formatInr(Math.round(Number(aggregate._sum.projectCost) || 0))} order value (showing up to ${TABLE_ROW_CAP}).`
      : `No availing-loan projects match ${bank ? bankLabel : 'your filters'}.`,
    viz: {
      kind: 'table',
      title: bank ? `Availing loan · ${bankLabel}` : 'Availing loan',
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'bank', label: 'Bank' },
        { key: 'value', label: 'Order value (₹)' },
      ],
      rows: projects.map((p) => ({
        slNo: p.slNo,
        customer: p.customer?.firstName?.trim() || p.customer?.customerName?.trim() || 'Unknown',
        bank: p.financingBank?.trim() || '—',
        value: Math.round(Number(p.projectCost) || 0),
      })),
    },
  };
}

async function executeMetric(
  metric: ZenithNlMetric,
  where: Prisma.ProjectWhereInput,
  intent: ZenithNlIntent,
  entities: ExtractedZenithEntities,
  ctx: {
    userId: string;
    role: UserRole;
    dateFilter: ZenithNlDateFilter;
    compareWhere?: Prisma.ProjectWhereInput;
    compareMeta?: ZenithNlQueryInput['compareMeta'];
  },
): Promise<{
  viz: ZenithNlViz;
  insight: string;
  projectsHref?: string;
  lookupMiss?: { query: string; suggestions: string[] };
}> {
  switch (metric) {
    case 'revenue_by_lead_source':
      return execRevenueByLeadSource(where);
    case 'revenue_by_salesperson':
      return execRevenueBySalesperson(where, intent);
    case 'pipeline_by_stage':
      return execPipelineByStage(where, intent);
    case 'pipeline_health':
      return execPipelineHealth(intent, where);
    case 'who_to_call':
      return execWhoToCall(where);
    case 'payment_status_breakdown':
      return execPaymentStatusBreakdown(where);
    case 'capacity_sold':
      return execCapacitySold(where);
    case 'outstanding_balance':
      return execOutstandingBalance(where);
    case 'top_customers_by_profit':
      return execTopCustomersByProfit(where);
    case 'lost_deals_summary':
      return execLostDealsSummary(where);
    case 'proposal_engine_buckets':
      return execProposalEngineBuckets(where);
    case 'projects_list_slice':
      return execProjectsListSlice(where, intent);
    case 'cohort_summary':
      return execCohortSummary(where, intent, entities);
    case 'panel_brand_mix':
      return execPanelBrandMix(where);
    case 'inverter_brand_mix':
      return execInverterBrandMix(where);
    case 'loan_bank_breakdown':
      return execLoanBankBreakdown(where, intent);
    case 'support_tickets_summary':
      if (ticketQueueSlice(intent)) {
        return execTicketQueue(intent, {
          userId: ctx.userId,
          role: ctx.role,
          dateFilter: ctx.dateFilter,
        });
      }
      return execSupportTicketsSummary(intent, ctx);
    case 'revenue_by_project_type':
      return execRevenueByProjectType(where, intent);
    case 'revenue_by_customer_type':
      return execRevenueByCustomerType(where);
    case 'service_type_mix':
      return execServiceTypeMix(where);
    case 'panel_type_mix':
      return execPanelTypeMix(where, intent);
    case 'roof_type_mix':
      return execRoofTypeMix(where);
    case 'system_type_mix':
      return execSystemTypeMix(where);
    case 'capacity_by_band':
      return execCapacityByBand(where);
    case 'revenue_by_city':
      return execRevenueByCity(where, intent);
    case 'ops_workload':
      return execOpsWorkload(where);
    case 'project_stage_mix':
      return execProjectStageMix(where);
    case 'sla_indicator_mix':
      return execSlaIndicatorMix(where);
    case 'lost_competition_breakdown':
      return execLostCompetitionBreakdown(where);
    case 'loan_vs_cash_revenue':
      return execLoanVsCashRevenue(where);
    case 'outstanding_by_salesperson':
      return execOutstandingBySalesperson(where);
    case 'profit_summary':
      return execProfitSummary(where);
    case 'period_compare': {
      if (!ctx.compareWhere || !ctx.compareMeta) {
        return {
          insight:
            'I can compare this FY vs last FY, or this quarter vs last quarter, for revenue, profit, or margin. Try “year on year revenue growth” or “quarter on quarter profit growth”.',
          viz: {
            kind: 'table',
            title: 'Period compare',
            columns: [
              { key: 'metric', label: 'Metric' },
              { key: 'value', label: 'Value' },
            ],
            rows: [],
          },
        };
      }
      return execPeriodCompare(where, ctx.compareWhere, {
        focus: intent.filters?.compareFocus ?? ctx.compareMeta.focus,
        mode: ctx.compareMeta.mode ?? 'yoy',
        primaryFy: ctx.compareMeta.primaryFy,
        priorFy: ctx.compareMeta.priorFy,
        primaryQuarter: ctx.compareMeta.primaryQuarter,
        priorQuarter: ctx.compareMeta.priorQuarter,
      });
    }
    case 'tickets_by_salesperson':
      return execTicketsBySalesperson(where, ctx);
    case 'compliance_backlog':
      return execComplianceBacklog(where);
    case 'subsidy_funnel':
      return execSubsidyFunnel(where);
    case 'installation_model_status':
      return execInstallationModelStatus(where);
    case 'payment_mode_mix':
      return execPaymentModeMix(where);
    case 'unpaid_invoices':
      return execUnpaidInvoices(where);
    case 'amc_expiring':
      return execAmcExpiring(where);
    case 'ticket_resolution_time':
      return execTicketResolutionTime(where, ctx);
    case 'hub_plant_link_summary':
      return execHubPlantLinkSummary(where);
    case 'project_detail_lookup':
      return execProjectDetailLookup(where, intent, ctx.role);
    case 'projects_ops_detail':
      return execProjectsOpsDetail(where, intent);
    case 'customer_detail_lookup':
      return execCustomerDetailLookup(intent, {
        salespersonId: ctx.role === UserRole.SALES ? ctx.userId : undefined,
      });
    case 'customers_list_slice': {
      let salespersonId: string | undefined;
      if (ctx.role === UserRole.SALES) salespersonId = ctx.userId;
      else if (intent.filters?.salespersonName?.trim()) {
        salespersonId = await resolveSalespersonIdByName(intent.filters.salespersonName);
      }
      return execCustomersListSlice(intent, { salespersonId });
    }
    case 'install_by_status':
      return execInstallByStatus(where);
    case 'pending_subsidy':
      return execPendingSubsidy(where);
    case 'availing_loan':
      return execAvailingLoan(where, intent);
    default:
      throw new Error('clarify');
  }
}

function maybeForceTable(viz: ZenithNlViz, intent: ZenithNlIntent): ZenithNlViz {
  if (intent.viz !== 'table' || viz.kind === 'table') return viz;
  // Convert chart series to a table when the model asked for a table.
  // Preserve series drill-down hrefs when present.
  return {
    kind: 'table',
    title: viz.title,
    columns: [
      { key: 'label', label: 'Label' },
      { key: 'value', label: viz.valueLabel || 'Value' },
      { key: 'count', label: 'Count' },
    ],
    rows: viz.series.map((s) => ({
      label: s.label,
      value: Math.round(s.value),
      count: s.count ?? null,
      ...(s.href ? { href: s.href } : {}),
    })),
  };
}

function maybeForceChart(viz: ZenithNlViz, intent: ZenithNlIntent): ZenithNlViz {
  if (intent.viz !== 'chart' || viz.kind === 'chart') return viz;
  // Only convert simple 2-column numeric tables.
  const valueCol = viz.columns.find((c) => /value|revenue|balance|profit|₹/i.test(c.label) || c.key === 'value');
  const labelCol = viz.columns[0];
  if (!valueCol || !labelCol) return viz;
  const series = viz.rows
    .map((r) => ({
      label: String(r[labelCol.key] ?? ''),
      value: Number(r[valueCol.key]) || 0,
      count: typeof r.count === 'number' ? r.count : undefined,
    }))
    .filter((s) => s.label);
  if (series.length === 0) return viz;
  return {
    kind: 'chart',
    title: viz.title,
    chartType: intent.chartType === 'pie' ? 'pie' : 'bar',
    series,
    valueLabel: valueCol.label,
  };
}

function withDateMeta(
  result: ZenithNlQueryResult,
  effectiveDateFilter?: ZenithNlEffectiveDateFilter,
): ZenithNlQueryResult {
  if (!effectiveDateFilter) return result;
  return { ...result, effectiveDateFilter };
}

/**
 * Run Zenith NL Ask: action navigate → chip/Claude metric → deterministic execute → insight + viz.
 */
export async function runZenithNlQuery(input: ZenithNlQueryInput): Promise<ZenithNlQueryResult> {
  const question = sanitizeAskQuestion(input.question);
  const dateMeta = input.effectiveDateFilter;
  if (!question) {
    return withDateMeta(
      clarifyResult(
        '',
        input.role,
        'Ask an analytics question, or a task like New Customer / New Project.',
      ),
      dateMeta,
    );
  }
  if (question.length > 500) {
    return withDateMeta(
      clarifyResult(question.slice(0, 500), input.role, 'Please keep questions under 500 characters.'),
      dateMeta,
    );
  }

  const started = Date.now();
  const live = await loadLiveAskBook(input.userId, input.role);

  // Navigation / create / edit actions — before analytics so "create support ticket" is not a ticket count.
  const actionMatch =
    matchAskActionIntent(question, input.role) ||
    (await matchAskEditActionIntent(question, input.role));
  if (actionMatch) {
    console.info('[zenith-nl-query]', {
      role: input.role,
      action: actionMatch.action,
      href: actionMatch.href,
      ms: Date.now() - started,
      event: 'ask_action',
    });
    return withDateMeta(
      {
        ok: true,
        kind: 'action',
        question,
        action: actionMatch.action,
        label: actionMatch.label,
        message: actionMatch.message,
        href: actionMatch.href,
        autoNavigate: actionMatch.autoNavigate,
        suggestedQuestions: suggestedQuestionsForRole(input.role, live),
        chipMatch: true,
      },
      dateMeta,
    );
  }

  const entities = extractZenithEntityFilters(question);
  let chipMatch = false;
  let intent: ZenithNlIntent | null = null;
  const periodCmp = parsePeriodCompare(question);
  if (periodCmp && metricAllowedForRole('period_compare', input.role)) {
    intent = normalizeIntent(periodCompareIntent(periodCmp), input.role);
    chipMatch = true;
  } else {
    intent =
      matchExactChipIntent(question, input.role) ||
      matchSupportTicketIntent(question, input.role) ||
      matchEquipmentMixIntent(question, input.role);
    if (intent) {
      chipMatch = true;
      intent = normalizeIntent(intent, input.role);
    } else if (isZenithNlAskEnabled()) {
      intent = await parseIntentWithClaude(question, input.role, input.prior);
    } else {
      // No Claude — still answer when entity salvage can pick a metric.
      intent = { metric: 'clarify', viz: 'table', insightHints: 'Claude unavailable' };
    }
  }

  intent = mergeEntitiesIntoIntent(intent, entities);
  const dimensions = extractZenithDimensions(question);
  intent = mergeDimensionsIntoIntent(intent, dimensions);
  // Chip intents already carry brands; salvage still helps free-text without Claude.
  if (!chipMatch) {
    intent = salvageMetricFromEntities(intent, entities, input.role);
    intent = salvageMetricFromDimensions(
      intent,
      dimensions,
      (m) => metricAllowedForRole(m as ZenithNlMetric, input.role),
      question,
    );
    intent = normalizeIntent(intent, input.role);
  }

  // Correct Claude mis-routing inverter ↔ panel mix / support tickets.
  const qLower = question.toLowerCase();
  if (
    intent.metric === 'panel_brand_mix' &&
    /\binverters?\b/.test(qLower) &&
    !/\bpanels?\b|\bmodules?\b/.test(qLower) &&
    metricAllowedForRole('inverter_brand_mix', input.role)
  ) {
    intent = normalizeIntent(
      { ...intent, metric: 'inverter_brand_mix', viz: 'chart', chartType: 'bar' },
      input.role,
    );
  } else if (
    intent.metric === 'inverter_brand_mix' &&
    /\bpanels?\b|\bmodules?\b/.test(qLower) &&
    !/\binverters?\b/.test(qLower) &&
    metricAllowedForRole('panel_brand_mix', input.role)
  ) {
    intent = normalizeIntent(
      { ...intent, metric: 'panel_brand_mix', viz: 'chart', chartType: 'bar' },
      input.role,
    );
  }
  if (
    intent.metric !== 'support_tickets_summary' &&
    /\bsupport\s+tickets?\b|\btickets?\s+raised\b/.test(qLower)
  ) {
    const ticketIntent = matchSupportTicketIntent(question, input.role);
    if (ticketIntent) {
      intent = normalizeIntent(ticketIntent, input.role);
    }
  }

  // List/show projects with any Projects-list filter — prefer the filtered project table.
  {
    const listProjects =
      /\b(list|show|all|which|find)\b/.test(qLower) &&
      /\bprojects?\b/.test(qLower) &&
      !/\b(vs|versus|mix|breakdown|share|funnel|how\s+many|revenue|profit|margin|workload|analys[ei]s)\b/.test(
        qLower,
      );
    const hasListFilter = Boolean(
      intent.filters?.projectType ||
        intent.filters?.customerType ||
        intent.filters?.projectServiceType ||
        intent.filters?.panelType ||
        intent.filters?.systemType ||
        intent.filters?.roofType ||
        intent.filters?.city ||
        intent.filters?.salespersonName ||
        intent.filters?.opsName ||
        intent.filters?.projectStatus ||
        intent.filters?.paymentStatus ||
        intent.filters?.installationStatus ||
        intent.filters?.availingLoan ||
        intent.filters?.pendingSubsidy ||
        intent.filters?.hasDocuments ||
        intent.filters?.missingDocuments ||
        intent.filters?.peBucket ||
        intent.filters?.panelBrand ||
        intent.filters?.inverterBrand ||
        intent.filters?.financingBank ||
        intent.filters?.leadSource ||
        intent.filters?.capacityMin != null ||
        intent.filters?.capacityMax != null ||
        intent.filters?.salespersonUnassigned ||
        intent.filters?.leadSourceIsNull ||
        intent.filters?.incentiveEligible ||
        intent.filters?.lifecycleSpecsIncomplete ||
        intent.filters?.dataSenseNeedsReview ||
        intent.filters?.hubPlantLinked != null ||
        intent.filters?.statusIndicator ||
        intent.filters?.projectStage,
    );
    if (
      listProjects &&
      hasListFilter &&
      intent.metric !== 'pending_subsidy' &&
      intent.metric !== 'availing_loan' &&
      metricAllowedForRole('projects_list_slice', input.role)
    ) {
      const filters = { ...(intent.filters || {}) };
      if (
        filters.projectStatus &&
        !/\b(confirmed|proposal|under\s+installation|lead|completed|lost|site\s+survey)\b/.test(
          qLower,
        )
      ) {
        delete filters.projectStatus;
      }
      intent = normalizeIntent(
        {
          ...intent,
          metric: 'projects_list_slice',
          viz: 'table',
          filters,
          insightHints: intent.insightHints || 'filtered projects',
        },
        input.role,
      );
    }
  }

  // Cohort revenue hint when chip says revenue of Deye…
  const execEntities: ExtractedZenithEntities = {
    ...entities,
    wantsRevenue:
      entities.wantsRevenue ||
      (chipMatch && intent.metric === 'cohort_summary' && /revenue/i.test(question)),
  };

  if (intent.metric === 'clarify') {
    if (!isZenithNlAskEnabled() && !chipMatch) {
      throw new Error('ANTHROPIC_API_KEY_MISSING');
    }
    console.info('[zenith-nl-query]', {
      role: input.role,
      metric: 'clarify',
      chipMatch: false,
      ms: Date.now() - started,
      event: 'ask_clarify',
    });
    return withDateMeta(
      clarifyResult(
        question,
        input.role,
        'I can answer who to call, stalled deals, tickets, and other CRM questions — or run tasks like New Customer. Try one of these, or search the catalog.',
        { live },
      ),
      dateMeta,
    );
  }

  try {
    let salespersonId: string | undefined;
    let opsId: string | undefined;
    if (intent.filters?.salespersonName?.trim() && input.role !== UserRole.SALES) {
      salespersonId = await resolveSalespersonIdByName(intent.filters.salespersonName);
    }
    if (intent.filters?.opsName?.trim()) {
      opsId = await resolveOpsIdByName(intent.filters.opsName);
    }
    const scopedWhere = applyZenithDimensionFilters(
      applyZenithIntentEntityFilters(input.where, intent),
      intent,
      { salespersonId, opsId },
    );
    const compareScoped = input.compareWhere
      ? applyZenithDimensionFilters(
          applyZenithIntentEntityFilters(input.compareWhere, intent),
          intent,
          { salespersonId, opsId },
        )
      : undefined;
    const executed = await executeMetric(intent.metric, scopedWhere, intent, execEntities, {
      userId: input.userId,
      role: input.role,
      dateFilter: input.dateFilter,
      compareWhere: compareScoped,
      compareMeta: input.compareMeta,
    });
    if (executed.lookupMiss) {
      const miss = executed.lookupMiss;
      const hint = miss.suggestions[0]
        ? ` Did you mean ${miss.suggestions[0]
            .replace(/^Customer details for /i, '')
            .replace(/^What's the status of /i, '')}?`
        : '';
      return withDateMeta(
        clarifyResult(
          question,
          input.role,
          `No match for “${miss.query}”.${hint} Try one of these, or search the catalog.`,
          {
            live,
            suggestedQuestions: [...miss.suggestions, ...wowSuggestionsForRole(input.role)].slice(
              0,
              5,
            ),
          },
        ),
        dateMeta,
      );
    }
    let viz = executed.viz;
    viz = maybeForceTable(viz, intent);
    viz = maybeForceChart(viz, intent);
    viz = attachAskDrillHrefs(intent.metric, viz, intent, input.dateFilter);
    const insight = enrichInsight(intent.metric, viz, executed.insight);
    const projectsHref =
      executed.projectsHref ||
      projectsHrefForIntent(intent.metric, intent, input.dateFilter);
    const followUps = followUpsForMetric(intent.metric, input.role);

    console.info('[zenith-nl-query]', {
      role: input.role,
      metric: intent.metric,
      viz: viz.kind,
      chipMatch,
      panelBrand: intent.filters?.panelBrand || null,
      inverterBrand: intent.filters?.inverterBrand || null,
      financingBank: intent.filters?.financingBank || null,
      followUp: Boolean(input.prior?.metric),
      ms: Date.now() - started,
      event: 'ask_success',
    });

    return withDateMeta(
      {
        ok: true,
        kind: 'metric',
        question,
        insight,
        viz,
        projectsHref,
        intent,
        suggestedQuestions: suggestedQuestionsForRole(input.role, live),
        followUps,
        chipMatch,
      },
      dateMeta,
    );
  } catch (err) {
    console.error('[zenith-nl-query] execute failed', err);
    return withDateMeta(
      clarifyResult(
        question,
        input.role,
        'I could not compute that answer. Try a different question from the examples.',
        { live },
      ),
      dateMeta,
    );
  }
}
