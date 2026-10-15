import Anthropic from '@anthropic-ai/sdk';
import {
  LeadSource,
  LostReason,
  PaymentStatus,
  Prisma,
  ProjectStage,
  ProjectStatus,
  ProjectType,
  UserRole,
} from '@prisma/client';
import prisma from '../prisma';
import {
  catalogPromptBlock,
  followUpsForMetric,
  isZenithNlMetric,
  metricAllowedForRole,
  METRIC_CATALOG,
  suggestedQuestionsForRole,
  type ZenithNlIntent,
  type ZenithNlMetric,
  type ZenithNlPriorContext,
  type ZenithNlQueryResult,
  type ZenithNlViz,
} from './zenithNl/catalog';
import { enrichInsight } from './zenithNl/insights';
import {
  projectsHrefForIntent,
  type ZenithNlDateFilter,
} from './zenithNl/projectsHref';

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

type PeBucketKey = 'proposal-ready' | 'draft' | 'not-started' | 'rest';

export type ZenithNlQueryInput = {
  question: string;
  role: UserRole;
  userId: string;
  where: Prisma.ProjectWhereInput;
  dateFilter: ZenithNlDateFilter;
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
    return {
      metric: parsed.metric,
      viz: viz ?? 'table',
      chartType,
      filters: {
        projectStatus:
          typeof filtersRaw.projectStatus === 'string' ? filtersRaw.projectStatus : undefined,
        paymentStatus:
          typeof filtersRaw.paymentStatus === 'string' ? filtersRaw.paymentStatus : undefined,
        peBucket,
        leadSource: typeof filtersRaw.leadSource === 'string' ? filtersRaw.leadSource : undefined,
        search: typeof filtersRaw.search === 'string' ? filtersRaw.search : undefined,
      },
      insightHints: typeof parsed.insightHints === 'string' ? parsed.insightHints : undefined,
    };
  } catch {
    return null;
  }
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
- Optional filters: projectStatus (Prisma enum e.g. CONFIRMED), paymentStatus (PENDING|PARTIAL|FULLY_PAID), peBucket (proposal-ready|draft|not-started|rest), leadSource (label or enum), search (customer name).
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

function clarifyResult(question: string, role: UserRole, message?: string): ZenithNlQueryResult {
  return {
    ok: false,
    clarify: true,
    question,
    message:
      message ||
      'I can answer analytics questions from the Zenith catalog (revenue, pipeline, payments, PE buckets, and similar). Try one of the examples below.',
    suggestedQuestions: suggestedQuestionsForRole(role),
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

async function execRevenueBySalesperson(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const revenueWhere = getRevenueWhere(where);
  const projects = await prisma.project.findMany({
    where: { ...revenueWhere, salespersonId: { not: null } },
    select: {
      projectCost: true,
      salespersonId: true,
      salesperson: { select: { name: true } },
    },
    take: 5000,
  });
  const map = new Map<string, { label: string; value: number; count: number }>();
  for (const p of projects) {
    if (!p.salespersonId) continue;
    const label = p.salesperson?.name?.trim() || 'Unassigned';
    const cur = map.get(p.salespersonId) || { label, value: 0, count: 0 };
    cur.value += Number(p.projectCost) || 0;
    cur.count += 1;
    map.set(p.salespersonId, cur);
  }
  const series = Array.from(map.values()).sort((a, b) => b.value - a.value);
  const total = series.reduce((s, x) => s + x.value, 0);
  const top = series[0];
  const insight = series.length
    ? `Salesperson revenue totals ${formatInr(total)}. Leader: ${top.label} with ${formatInr(top.value)} (${top.count} deals).`
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
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const pipelineWhere: Prisma.ProjectWhereInput = {
    ...where,
    projectStatus: { in: PIPELINE_STATUSES },
  };
  const rows = await prisma.project.groupBy({
    by: ['projectStatus'],
    where: pipelineWhere,
    _sum: { projectCost: true },
    _count: { id: true },
  });
  const byStatus = new Map(rows.map((r) => [r.projectStatus, r]));
  const tableRows = PIPELINE_STATUSES.map((st) => {
    const r = byStatus.get(st);
    return {
      stage: PROJECT_STATUS_LABELS[st],
      count: r?._count.id ?? 0,
      value: Number(r?._sum.projectCost) || 0,
    };
  });
  const totalCount = tableRows.reduce((s, r) => s + Number(r.count), 0);
  const totalValue = tableRows.reduce((s, r) => s + Number(r.value), 0);
  const insight = totalCount
    ? `Open pipeline (Lead → Confirmed): ${totalCount} deals worth ${formatInr(totalValue)} under your filters.`
    : 'No open pipeline deals match your filters.';
  return {
    insight,
    viz: {
      kind: 'table',
      title: 'Pipeline by stage',
      columns: [
        { key: 'stage', label: 'Stage' },
        { key: 'count', label: 'Deals' },
        { key: 'value', label: 'Order value (₹)' },
      ],
      rows: tableRows.map((r) => ({
        stage: r.stage,
        count: r.count,
        value: Math.round(r.value),
      })),
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
      reason: reason === LostReason.LOST_TO_COMPETITION ? 'Lost to competition' : reason.replace(/_/g, ' '),
      count: v.count,
      value: Math.round(v.value),
    }))
    .sort((a, b) => b.value - a.value);
  const totalValue = rows.reduce((s, r) => s + Number(r.value), 0);
  const insight = rows.length
    ? `${lostProjects.length} lost deals worth ${formatInr(totalValue)}. Top reason by value: ${rows[0].reason}.`
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

async function execProjectsListSlice(
  where: Prisma.ProjectWhereInput,
  intent: ZenithNlIntent,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const w: Prisma.ProjectWhereInput = { ...where };
  const st = intent.filters?.projectStatus?.trim();
  if (st && (Object.values(ProjectStatus) as string[]).includes(st)) {
    w.projectStatus = st as ProjectStatus;
  }
  const ps = intent.filters?.paymentStatus?.trim();
  if (ps && (Object.values(PaymentStatus) as string[]).includes(ps)) {
    w.paymentStatus = ps as PaymentStatus;
  }
  const search = intent.filters?.search?.trim();
  if (search) {
    w.OR = [
      { customer: { customerName: { contains: search, mode: 'insensitive' } } },
      { customer: { firstName: { contains: search, mode: 'insensitive' } } },
    ];
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
    w.id = { in: projectIdsFilter };
  }

  const projects = await prisma.project.findMany({
    where: w,
    select: {
      slNo: true,
      projectStatus: true,
      projectCost: true,
      customer: { select: { customerName: true, firstName: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: TABLE_ROW_CAP,
  });
  const insight = projects.length
    ? `Showing ${projects.length} project${projects.length === 1 ? '' : 's'} matching your ask (capped at ${TABLE_ROW_CAP}).`
    : 'No projects match that slice under your filters.';
  return {
    insight,
    viz: {
      kind: 'table',
      title: 'Projects',
      columns: [
        { key: 'slNo', label: 'SL No' },
        { key: 'customer', label: 'Customer' },
        { key: 'stage', label: 'Stage' },
        { key: 'value', label: 'Order value (₹)' },
      ],
      rows: projects.map((p) => ({
        slNo: p.slNo,
        customer: p.customer?.firstName?.trim() || p.customer?.customerName?.trim() || 'Unknown',
        stage: PROJECT_STATUS_LABELS[p.projectStatus] || p.projectStatus,
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
      stage: PROJECT_STATUS_LABELS[st],
      count: r?._count.id ?? 0,
      value: Math.round(Number(r?._sum.projectCost) || 0),
    };
  });
  const total = tableRows.reduce((s, r) => s + Number(r.count), 0);
  return {
    insight: total
      ? `Installation / late-stage cohort: ${total} projects under your filters.`
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

async function execAvailingLoan(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const projects = await prisma.project.findMany({
    where: {
      ...where,
      availingLoan: true,
      projectStatus: { not: ProjectStatus.LOST },
    },
    select: {
      slNo: true,
      projectCost: true,
      financingBank: true,
      paymentStatus: true,
      customer: { select: { customerName: true, firstName: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: TABLE_ROW_CAP,
  });
  return {
    insight: projects.length
      ? `${projects.length} project${projects.length === 1 ? '' : 's'} availing loan under your filters (capped at ${TABLE_ROW_CAP}).`
      : 'No availing-loan projects match your filters.',
    viz: {
      kind: 'table',
      title: 'Availing loan',
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
): Promise<{ viz: ZenithNlViz; insight: string }> {
  switch (metric) {
    case 'revenue_by_lead_source':
      return execRevenueByLeadSource(where);
    case 'revenue_by_salesperson':
      return execRevenueBySalesperson(where);
    case 'pipeline_by_stage':
      return execPipelineByStage(where);
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
    case 'install_by_status':
      return execInstallByStatus(where);
    case 'pending_subsidy':
      return execPendingSubsidy(where);
    case 'availing_loan':
      return execAvailingLoan(where);
    default:
      throw new Error('clarify');
  }
}

function maybeForceTable(viz: ZenithNlViz, intent: ZenithNlIntent): ZenithNlViz {
  if (intent.viz !== 'table' || viz.kind === 'table') return viz;
  // Convert chart series to a table when the model asked for a table.
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

/**
 * Run Zenith NL Ask: Claude intent → deterministic execute → insight + one viz.
 */
export async function runZenithNlQuery(input: ZenithNlQueryInput): Promise<ZenithNlQueryResult> {
  const question = input.question.trim();
  if (!question) {
    return clarifyResult('', input.role, 'Ask a question about your Zenith analytics.');
  }
  if (question.length > 500) {
    return clarifyResult(question.slice(0, 500), input.role, 'Please keep questions under 500 characters.');
  }
  if (!isZenithNlAskEnabled()) {
    throw new Error('ANTHROPIC_API_KEY_MISSING');
  }

  const started = Date.now();
  const intent = await parseIntentWithClaude(question, input.role, input.prior);

  if (intent.metric === 'clarify') {
    console.info('[zenith-nl-query]', {
      role: input.role,
      metric: 'clarify',
      ms: Date.now() - started,
    });
    return clarifyResult(question, input.role);
  }

  try {
    const executed = await executeMetric(intent.metric, input.where, intent);
    let viz = executed.viz;
    viz = maybeForceTable(viz, intent);
    viz = maybeForceChart(viz, intent);
    const insight = enrichInsight(intent.metric, viz, executed.insight);
    const projectsHref = projectsHrefForIntent(intent.metric, intent, input.dateFilter);
    const followUps = followUpsForMetric(intent.metric, input.role);

    console.info('[zenith-nl-query]', {
      role: input.role,
      metric: intent.metric,
      viz: viz.kind,
      followUp: Boolean(input.prior?.metric),
      ms: Date.now() - started,
    });

    return {
      ok: true,
      question,
      insight,
      viz,
      projectsHref,
      intent,
      suggestedQuestions: suggestedQuestionsForRole(input.role),
      followUps,
    };
  } catch (err) {
    console.error('[zenith-nl-query] execute failed', err);
    return clarifyResult(question, input.role, 'I could not compute that answer. Try a different question from the examples.');
  }
}
