/**
 * Ask Zenith — stalled / ageing pipeline and pipeline analysis (Deal Health–aware).
 */
import { ProjectStatus, type Prisma, UserRole } from '@prisma/client';
import prisma from '../../prisma';
import { computeDealHealthScoreForProjectList } from '../../utils/dealHealthScore';
import { dealExpectedValue } from '../../utils/salesProbability';
import type { ZenithNlIntent, ZenithNlTableRow, ZenithNlViz } from './catalog';
import { metricAllowedForRole } from './catalog';
import { primaryPhoneFromCustomer } from '../../utils/consumerCustomerProfile';

const TABLE_CAP = 20;
const SCAN_CAP = 400;

/** Open commercial + install pipeline (excludes completed / lost / subsidy-credited). */
const OPEN_PIPELINE: ProjectStatus[] = [
  ProjectStatus.LEAD,
  ProjectStatus.SITE_SURVEY,
  ProjectStatus.PROPOSAL,
  ProjectStatus.CONFIRMED,
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.SUBMITTED_FOR_SUBSIDY,
];

const EXPECTED_DAYS: Partial<Record<ProjectStatus, number>> = {
  [ProjectStatus.LEAD]: 7,
  [ProjectStatus.SITE_SURVEY]: 14,
  [ProjectStatus.PROPOSAL]: 21,
  [ProjectStatus.CONFIRMED]: 30,
  [ProjectStatus.UNDER_INSTALLATION]: 60,
  [ProjectStatus.SUBMITTED_FOR_SUBSIDY]: 21,
};

const STATUS_LABEL: Record<string, string> = {
  LEAD: 'Lead',
  SITE_SURVEY: 'Site Survey',
  PROPOSAL: 'Proposal',
  CONFIRMED: 'Confirmed',
  UNDER_INSTALLATION: 'Under Installation',
  SUBMITTED_FOR_SUBSIDY: 'Submitted for Subsidy',
};

export type PipelineHealthMode = 'stalled' | 'ageing' | 'analysis';

function norm(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

function money(n: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Math.round(n));
  } catch {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }
}

function daysSince(d: Date | null | undefined, today: Date): number {
  if (!d) return 999;
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - dd.getTime()) / 86400000));
}

function latestDate(dates: Array<Date | null | undefined>): Date | null {
  let best: Date | null = null;
  for (const d of dates) {
    if (!d || Number.isNaN(d.getTime())) continue;
    if (!best || d.getTime() > best.getTime()) best = d;
  }
  return best;
}

function healthBand(score: number): { band: string; grade: string } {
  if (score >= 75) return { band: 'Healthy', grade: 'A' };
  if (score >= 55) return { band: 'Good', grade: 'B' };
  if (score >= 35) return { band: 'At risk', grade: 'C' };
  if (score >= 15) return { band: 'Weak / stalled', grade: 'D' };
  return { band: 'Critical', grade: 'F' };
}

function ageingBucket(daysInStage: number): string {
  if (daysInStage <= 14) return '0–14 days in stage';
  if (daysInStage <= 30) return '15–30 days in stage';
  if (daysInStage <= 60) return '31–60 days in stage';
  return '60+ days in stage';
}

/** Detect stalled / ageing / pipeline analysis phrasing. */
export function matchPipelineHealthIntent(
  question: string,
  role: UserRole,
): ZenithNlIntent | null {
  if (!metricAllowedForRole('pipeline_health', role)) return null;
  const q = norm(question);
  if (!q || q.length < 6) return null;

  // Typo: aeging → ageing
  const hasPipeline = /\bpipeline\b/.test(q);
  const hasAnalysis =
    /\bpipeline\s+analys[ei]s\b/.test(q) ||
    /\banalys[ei]s\s+(of\s+)?(my\s+|the\s+)?pipeline\b/.test(q) ||
    /\b(give|show|run)\s+(me\s+)?(a\s+)?pipeline\s+analys/.test(q);
  const hasStalled =
    /\bstalled\b/.test(q) ||
    /\bpipeline\s+(that\s+is\s+)?stuck\b/.test(q) ||
    /\bstuck\s+pipeline\b/.test(q);
  const hasAgeing =
    /\bage?ing\b/.test(q) ||
    /\baeging\b/.test(q) ||
    /\bold\s+pipeline\b/.test(q) ||
    /\bpipeline\s+age\b/.test(q);

  if (hasAnalysis) {
    return {
      metric: 'pipeline_health',
      viz: 'table',
      filters: { detailSlice: 'analysis' },
      insightHints: 'pipeline analysis',
    };
  }
  if (hasStalled && (hasPipeline || /\bdeals?\b/.test(q))) {
    return {
      metric: 'pipeline_health',
      viz: 'table',
      filters: { detailSlice: 'stalled' },
      insightHints: 'stalled pipeline',
    };
  }
  if (hasAgeing && (hasPipeline || /\bdeals?\b/.test(q))) {
    return {
      metric: 'pipeline_health',
      viz: 'table',
      filters: { detailSlice: 'ageing' },
      insightHints: 'ageing pipeline',
    };
  }
  // “pipeline health” / “at-risk pipeline”
  if (
    hasPipeline &&
    (/\bhealth\b/.test(q) || /\bat[- ]?risk\b/.test(q) || /\bneglected\b/.test(q))
  ) {
    return {
      metric: 'pipeline_health',
      viz: 'table',
      filters: { detailSlice: 'analysis' },
      insightHints: 'pipeline health',
    };
  }
  return null;
}

type ScoredDeal = {
  id: string;
  slNo: number;
  customer: string;
  phone?: string;
  status: ProjectStatus;
  stage: string;
  value: number;
  expected: number;
  score: number;
  band: string;
  grade: string;
  daysInStage: number;
  daysSinceActivity: number;
  expectedDays: number;
  overdueVsSla: number;
  ageingBucket: string;
  href: string;
};

async function loadScoredPipeline(
  where: Prisma.ProjectWhereInput,
): Promise<ScoredDeal[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const projects = await prisma.project.findMany({
    where: {
      ...where,
      projectStatus: { in: OPEN_PIPELINE },
    },
    select: {
      id: true,
      slNo: true,
      projectStatus: true,
      projectCost: true,
      updatedAt: true,
      stageEnteredAt: true,
      confirmationDate: true,
      advanceReceived: true,
      advanceReceivedDate: true,
      lastPaymentDate: true,
      expectedCommissioningDate: true,
      salesProbability: true,
      paymentStatus: true,
      balanceAmount: true,
      leadSource: true,
      customer: {
        select: {
          customerName: true,
          firstName: true,
          lastName: true,
          prefix: true,
          phone: true,
          contactNumbers: true,
          contacts: true,
        },
      },
      projectRemarks: {
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: SCAN_CAP,
  });

  const out: ScoredDeal[] = [];
  for (const p of projects) {
    const lastRemarkAt = p.projectRemarks[0]?.createdAt ?? null;
    const score = computeDealHealthScoreForProjectList({
      projectStatus: p.projectStatus,
      updatedAt: p.updatedAt,
      stageEnteredAt: p.stageEnteredAt,
      projectCost: p.projectCost,
      confirmationDate: p.confirmationDate,
      advanceReceived: p.advanceReceived,
      leadSource: p.leadSource,
      expectedCommissioningDate: p.expectedCommissioningDate,
      paymentStatus: p.paymentStatus,
      balanceAmount: p.balanceAmount,
      lastRemarkAt,
      lastPaymentDate: p.lastPaymentDate,
      advanceReceivedDate: p.advanceReceivedDate,
      lastTaskActivityAt: null,
    });
    if (score == null) continue;

    const stageAnchor = p.stageEnteredAt ?? p.updatedAt;
    const daysInStage = daysSince(stageAnchor, today);
    const activityAnchor = latestDate([
      lastRemarkAt,
      p.lastPaymentDate,
      p.advanceReceivedDate,
      p.updatedAt,
    ]);
    const daysSinceActivity = daysSince(activityAnchor, today);
    const expectedDays = EXPECTED_DAYS[p.projectStatus] ?? 14;
    const { band, grade } = healthBand(score);
    const cust = p.customer;
    const customer =
      [cust?.prefix, cust?.firstName, cust?.lastName].filter(Boolean).join(' ').trim() ||
      cust?.customerName?.trim() ||
      '—';

    out.push({
      id: p.id,
      slNo: p.slNo,
      customer,
      phone:
        primaryPhoneFromCustomer(p.customer as Parameters<typeof primaryPhoneFromCustomer>[0]) ||
        undefined,
      status: p.projectStatus,
      stage: STATUS_LABEL[p.projectStatus] || p.projectStatus.replace(/_/g, ' '),
      value: Number(p.projectCost) || 0,
      expected: dealExpectedValue({
        projectCost: p.projectCost,
        salesProbability: p.salesProbability,
        projectStatus: p.projectStatus,
      }),
      score,
      band,
      grade,
      daysInStage,
      daysSinceActivity,
      expectedDays,
      overdueVsSla: Math.max(0, daysInStage - expectedDays),
      ageingBucket: ageingBucket(daysInStage),
      href: `/projects/${p.id}`,
    });
  }
  return out;
}

function isStalled(d: ScoredDeal): boolean {
  if (d.score < 35) return true;
  if (d.overdueVsSla > 0 && d.daysSinceActivity >= 14) return true;
  if (d.status === ProjectStatus.UNDER_INSTALLATION && d.daysSinceActivity >= 30) return true;
  if (d.daysSinceActivity >= 21 && d.score < 55) return true;
  return false;
}

function dealRows(deals: ScoredDeal[]): ZenithNlTableRow[] {
  return deals.slice(0, TABLE_CAP).map((d) => ({
    sl: d.slNo,
    customer: d.customer,
    stage: d.stage,
    health: `${d.grade} · ${d.band}`,
    score: d.score,
    daysInStage: d.daysInStage,
    quietDays: d.daysSinceActivity,
    value: Math.round(d.value),
    href: d.href,
    projectId: d.id,
    slNo: d.slNo,
    phone: d.phone,
    customerName: d.customer,
    stageStatus: d.status,
  }));
}

const DEAL_COLUMNS = [
  { key: 'sl', label: 'SL' },
  { key: 'customer', label: 'Customer' },
  { key: 'stage', label: 'Stage' },
  { key: 'health', label: 'Deal health' },
  { key: 'score', label: 'Score' },
  { key: 'daysInStage', label: 'Days in stage' },
  { key: 'quietDays', label: 'Days quiet' },
  { key: 'value', label: 'Order value (₹)' },
];

export async function execPipelineHealth(
  intent: ZenithNlIntent,
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string; projectsHref?: string }> {
  const mode = (intent.filters?.detailSlice || 'analysis') as PipelineHealthMode;
  const deals = await loadScoredPipeline(where);
  const projectsHref = '/projects?status=LEAD,SITE_SURVEY,PROPOSAL,CONFIRMED,UNDER_INSTALLATION';

  if (deals.length === 0) {
    return {
      insight: 'No open pipeline deals match your filters.',
      viz: {
        kind: 'table',
        title: 'Pipeline',
        columns: DEAL_COLUMNS,
        rows: [],
      },
      projectsHref,
    };
  }

  const totalValue = deals.reduce((s, d) => s + d.value, 0);
  const totalExpected = deals.reduce((s, d) => s + d.expected, 0);
  const stalled = deals.filter(isStalled).sort((a, b) => a.score - b.score || b.daysInStage - a.daysInStage);
  const stalledValue = stalled.reduce((s, d) => s + d.value, 0);

  if (mode === 'stalled') {
    const insight = stalled.length
      ? `${stalled.length} stalled / weak deals (${money(stalledValue)}) of ${deals.length} open (${money(totalValue)}). Sorted by worst Deal Health — quiet days and over-SLA stage time drive the list. Click a row to open the project.`
      : `No stalled deals in ${deals.length} open pipeline deals (${money(totalValue)}). Deal Health looks healthy under your filters.`;
    return {
      insight,
      viz: {
        kind: 'table',
        title: 'Stalled pipeline',
        columns: DEAL_COLUMNS,
        rows: dealRows(stalled),
      },
      projectsHref,
    };
  }

  if (mode === 'ageing') {
    const bucketOrder = [
      '60+ days in stage',
      '31–60 days in stage',
      '15–30 days in stage',
      '0–14 days in stage',
    ];
    const byBucket = new Map<string, { count: number; value: number }>();
    for (const b of bucketOrder) byBucket.set(b, { count: 0, value: 0 });
    for (const d of deals) {
      const cur = byBucket.get(d.ageingBucket) || { count: 0, value: 0 };
      cur.count += 1;
      cur.value += d.value;
      byBucket.set(d.ageingBucket, cur);
    }
    const bucketBits = bucketOrder
      .map((b) => {
        const r = byBucket.get(b)!;
        return r.count ? `${r.count} in ${b} (${money(r.value)})` : null;
      })
      .filter(Boolean)
      .join(' · ');
    const aged = [...deals].sort((a, b) => b.daysInStage - a.daysInStage || a.score - b.score);
    const overSla = deals.filter((d) => d.overdueVsSla > 0);
    const insight = [
      `${overSla.length} of ${deals.length} open deals are past stage SLA (${money(overSla.reduce((s, d) => s + d.value, 0))}).`,
      bucketBits,
      'Table: oldest deals by days in current stage.',
    ]
      .filter(Boolean)
      .join(' ');

    return {
      insight,
      viz: {
        kind: 'table',
        title: 'Ageing pipeline',
        columns: DEAL_COLUMNS,
        rows: dealRows(aged),
      },
      projectsHref,
    };
  }

  // analysis
  const byStage = new Map<string, { count: number; value: number; stalled: number }>();
  for (const st of OPEN_PIPELINE) {
    byStage.set(STATUS_LABEL[st] || st, { count: 0, value: 0, stalled: 0 });
  }
  const byBand = new Map<string, number>();
  for (const d of deals) {
    const sk = d.stage;
    const cur = byStage.get(sk) || { count: 0, value: 0, stalled: 0 };
    cur.count += 1;
    cur.value += d.value;
    if (isStalled(d)) cur.stalled += 1;
    byStage.set(sk, cur);
    byBand.set(d.band, (byBand.get(d.band) || 0) + 1);
  }

  const stageBits = OPEN_PIPELINE.map((st) => {
    const label = STATUS_LABEL[st] || st;
    const r = byStage.get(label)!;
    if (!r.count) return null;
    return r.stalled
      ? `${label}: ${r.count} (${r.stalled} stalled, ${money(r.value)})`
      : `${label}: ${r.count} (${money(r.value)})`;
  })
    .filter(Boolean)
    .join(' · ');

  const bandBits = ['Critical', 'Weak / stalled', 'At risk', 'Good', 'Healthy']
    .filter((b) => byBand.has(b))
    .map((b) => `${byBand.get(b)} ${b.toLowerCase()}`)
    .join(', ');

  const worst = [...deals].sort((a, b) => a.score - b.score || b.daysInStage - a.daysInStage);

  const insight = [
    `Pipeline analysis: ${deals.length} open deals · order value ${money(totalValue)} · expected ${money(totalExpected)} (order value × Sales Probability).`,
    stalled.length
      ? `${stalled.length} need attention (${money(stalledValue)}) — Deal Health D/F, over-SLA, or quiet too long.`
      : 'No deals currently look stalled under Deal Health rules.',
    stageBits ? `By stage: ${stageBits}.` : '',
    bandBits ? `Health mix: ${bandBits}.` : '',
    'Table: weakest deals to work today.',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    insight,
    viz: {
      kind: 'table',
      title: 'Pipeline analysis',
      columns: DEAL_COLUMNS,
      rows: dealRows(worst),
    },
    projectsHref,
  };
}
