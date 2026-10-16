/**
 * P1/P2 Zenith Ask metrics — geo, ops, SLA, finance depth, compliance, invoices, AMC, etc.
 */
import {
  InstallationStatus,
  InvoiceStatus,
  LostReason,
  LostToCompetitionReason,
  PaymentMode,
  Prisma,
  ProjectStage,
  ProjectStatus,
  ProjectType,
  SupportTicketStatus,
  UserRole,
} from '@prisma/client';
import prisma from '../../prisma';
import {
  COMPLIANCE_GAP_IDS,
  COMPLIANCE_GAP_LABELS,
  type ComplianceGapId,
} from '../../utils/complianceGaps';
import type { ZenithNlViz } from './catalog';
import { formatDelta, formatGrowthPct, growthPct } from './periodCompare';

const TABLE_CAP = 25;

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

const STAGE_LABELS: Record<ProjectStage, string> = {
  [ProjectStage.SURVEY]: 'Survey',
  [ProjectStage.PROPOSAL]: 'Proposal',
  [ProjectStage.APPROVED]: 'Approved',
  [ProjectStage.INSTALLATION]: 'Installation',
  [ProjectStage.BILLING]: 'Billing',
  [ProjectStage.LIVE]: 'Live',
  [ProjectStage.AMC]: 'AMC',
  [ProjectStage.LOST]: 'Lost',
};

const COMPETITION_LABELS: Record<LostToCompetitionReason, string> = {
  [LostToCompetitionReason.LOST_DUE_TO_PRICE]: 'Price',
  [LostToCompetitionReason.LOST_DUE_TO_FEATURES]: 'Features',
  [LostToCompetitionReason.LOST_DUE_TO_TIMELINE]: 'Timeline',
  [LostToCompetitionReason.LOST_DUE_TO_BRAND_OR_WARRANTY]: 'Brand / warranty',
  [LostToCompetitionReason.LOST_DUE_TO_RELATIONSHIP_OTHER]: 'Relationship / other',
};

const INSTALL_LABELS: Record<InstallationStatus, string> = {
  [InstallationStatus.PENDING]: 'Pending',
  [InstallationStatus.IN_PROGRESS]: 'In progress',
  [InstallationStatus.COMPLETED]: 'Completed',
};

const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  [PaymentMode.UPI]: 'UPI',
  [PaymentMode.BANK]: 'Bank',
  [PaymentMode.CHEQUE]: 'Cheque',
};

export async function execRevenueByCity(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const projects = await prisma.project.findMany({
    where: {
      ...where,
      projectStatus: {
        in: [
          ProjectStatus.CONFIRMED,
          ProjectStatus.UNDER_INSTALLATION,
          ProjectStatus.COMPLETED,
          ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
        ],
      },
      projectCost: { not: null },
    },
    select: {
      projectCost: true,
      customer: { select: { city: true } },
    },
    take: 8000,
  });
  const map = new Map<string, { label: string; value: number; count: number }>();
  for (const p of projects) {
    const label = p.customer?.city?.trim() || 'Unknown';
    const cur = map.get(label) || { label, value: 0, count: 0 };
    cur.value += Number(p.projectCost) || 0;
    cur.count += 1;
    map.set(label, cur);
  }
  const series = Array.from(map.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
  const total = series.reduce((s, x) => s + x.value, 0);
  return {
    insight: series.length
      ? `Top cities by revenue: ${formatInr(total)} across ${series.length} cities shown (top by order value).`
      : 'No city data on revenue-stage projects for your filters.',
    viz: {
      kind: 'chart',
      title: 'Revenue by city',
      chartType: 'bar',
      series,
      valueLabel: 'Order value (₹)',
    },
  };
}

export async function execOpsWorkload(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const projects = await prisma.project.findMany({
    where: {
      ...where,
      projectStatus: {
        in: [
          ProjectStatus.CONFIRMED,
          ProjectStatus.UNDER_INSTALLATION,
          ProjectStatus.SUBMITTED_FOR_SUBSIDY,
        ],
      },
      assignedOpsId: { not: null },
    },
    select: {
      projectCost: true,
      assignedOpsId: true,
      opsPerson: { select: { name: true } },
    },
    take: 5000,
  });
  const map = new Map<string, { label: string; value: number; count: number }>();
  for (const p of projects) {
    if (!p.assignedOpsId) continue;
    const label = p.opsPerson?.name?.trim() || 'Unassigned';
    const cur = map.get(p.assignedOpsId) || { label, value: 0, count: 0 };
    cur.value += Number(p.projectCost) || 0;
    cur.count += 1;
    map.set(p.assignedOpsId, cur);
  }
  const series = Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, TABLE_CAP)
    .map((s) => ({ label: s.label, value: s.count, count: s.count }));
  const total = series.reduce((s, x) => s + x.value, 0);
  return {
    insight: series.length
      ? `Ops workload: ${total} active install-stage projects across ${series.length} ops people.`
      : 'No projects with an assigned ops person match your filters.',
    viz: {
      kind: 'chart',
      title: 'Ops workload (active installs)',
      chartType: 'bar',
      series,
      valueLabel: 'Projects',
    },
  };
}

export async function execProjectStageMix(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const rows = await prisma.project.groupBy({
    by: ['projectStage'],
    where: { ...where, projectStatus: { not: ProjectStatus.LOST }, projectStage: { not: null } },
    _count: { id: true },
    _sum: { projectCost: true },
  });
  const series = rows
    .map((r) => ({
      label: r.projectStage ? STAGE_LABELS[r.projectStage] : 'Unknown',
      value: Math.round(Number(r._sum.projectCost) || 0),
      count: r._count.id,
    }))
    .sort((a, b) => b.count - a.count);
  return {
    insight: series.length
      ? `Lifecycle stage mix: ${series.reduce((s, x) => s + (x.count || 0), 0)} projects with a stage set.`
      : 'No projects with lifecycle stage set match your filters.',
    viz: {
      kind: 'chart',
      title: 'Project stage mix',
      chartType: 'bar',
      series,
      valueLabel: 'Order value (₹)',
    },
  };
}

export async function execSlaIndicatorMix(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const rows = await prisma.project.groupBy({
    by: ['statusIndicator'],
    where: {
      ...where,
      projectStatus: { not: ProjectStatus.LOST },
      statusIndicator: { not: null },
      NOT: { statusIndicator: '' },
    },
    _count: { id: true },
  });
  const order = ['RED', 'AMBER', 'GREEN'];
  const series = rows
    .map((r) => ({
      label: (r.statusIndicator || 'Unknown').toUpperCase(),
      value: r._count.id,
      count: r._count.id,
    }))
    .sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  const red = series.find((s) => s.label === 'RED')?.count || 0;
  return {
    insight: series.length
      ? `SLA indicators: ${series.map((s) => `${s.label} ${s.count}`).join(' · ')}${red ? ` — ${red} red need attention.` : '.'}`
      : 'No projects with SLA status indicators match your filters.',
    viz: {
      kind: 'chart',
      title: 'SLA status indicators',
      chartType: 'pie',
      series,
      valueLabel: 'Projects',
    },
  };
}

export async function execLostCompetitionBreakdown(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const rows = await prisma.project.groupBy({
    by: ['lostToCompetitionReason'],
    where: {
      ...where,
      projectStatus: ProjectStatus.LOST,
      lostReason: LostReason.LOST_TO_COMPETITION,
      lostToCompetitionReason: { not: null },
    },
    _count: { id: true },
    _sum: { projectCost: true },
  });
  const series = rows
    .map((r) => ({
      label: r.lostToCompetitionReason
        ? COMPETITION_LABELS[r.lostToCompetitionReason]
        : 'Unknown',
      value: Math.round(Number(r._sum.projectCost) || 0),
      count: r._count.id,
    }))
    .sort((a, b) => b.count - a.count);
  return {
    insight: series.length
      ? `Lost to competition: ${series.reduce((s, x) => s + (x.count || 0), 0)} deals. Top reason: ${series[0]!.label}.`
      : 'No lost-to-competition deals with a subtype match your filters.',
    viz: {
      kind: 'chart',
      title: 'Lost to competition — reasons',
      chartType: 'bar',
      series,
      valueLabel: 'Order value (₹)',
    },
  };
}

export async function execLoanVsCashRevenue(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const base = {
    ...where,
    projectStatus: {
      in: [
        ProjectStatus.CONFIRMED,
        ProjectStatus.UNDER_INSTALLATION,
        ProjectStatus.COMPLETED,
        ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
      ],
    },
    projectCost: { not: null },
  };
  const [loan, cash] = await Promise.all([
    prisma.project.aggregate({
      where: { ...base, availingLoan: true },
      _count: { id: true },
      _sum: { projectCost: true },
    }),
    prisma.project.aggregate({
      where: { ...base, OR: [{ availingLoan: false }, { availingLoan: null }] },
      _count: { id: true },
      _sum: { projectCost: true },
    }),
  ]);
  const series = [
    {
      label: 'Availing loan',
      value: Math.round(Number(loan._sum.projectCost) || 0),
      count: loan._count.id,
    },
    {
      label: 'Not on loan',
      value: Math.round(Number(cash._sum.projectCost) || 0),
      count: cash._count.id,
    },
  ].filter((s) => s.count > 0 || s.value > 0);
  const total = series.reduce((s, x) => s + x.value, 0);
  const loanShare = total ? Math.round(((series[0]?.value || 0) / total) * 100) : 0;
  return {
    insight: series.length
      ? `Loan vs cash revenue: ${formatInr(total)} · loan share ~${loanShare}%.`
      : 'No revenue-stage projects match your filters.',
    viz: {
      kind: 'chart',
      title: 'Loan vs cash revenue',
      chartType: 'pie',
      series,
      valueLabel: 'Order value (₹)',
    },
  };
}

export async function execOutstandingBySalesperson(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const projects = await prisma.project.findMany({
    where: {
      ...where,
      balanceAmount: { gt: 0 },
      projectStatus: { not: ProjectStatus.LOST },
    },
    select: {
      balanceAmount: true,
      salespersonId: true,
      salesperson: { select: { name: true } },
    },
    take: 8000,
  });
  const map = new Map<string, { label: string; value: number; count: number }>();
  for (const p of projects) {
    const key = p.salespersonId || 'none';
    const label = p.salesperson?.name?.trim() || 'Unassigned';
    const cur = map.get(key) || { label, value: 0, count: 0 };
    cur.value += Number(p.balanceAmount) || 0;
    cur.count += 1;
    map.set(key, cur);
  }
  const series = Array.from(map.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, TABLE_CAP);
  const total = series.reduce((s, x) => s + x.value, 0);
  return {
    insight: series.length
      ? `Outstanding by salesperson: ${formatInr(total)} across ${series.reduce((s, x) => s + x.count, 0)} projects.`
      : 'No outstanding balances match your filters.',
    viz: {
      kind: 'chart',
      title: 'Outstanding balance by salesperson',
      chartType: 'bar',
      series,
      valueLabel: 'Balance (₹)',
    },
  };
}

export type ProfitSummaryTotals = {
  deals: number;
  order: number;
  profit: number;
  avgMargin: number;
  collected: number;
  balance: number;
  kw: number;
};

async function aggregateProfitSummaryTotals(
  where: Prisma.ProjectWhereInput,
): Promise<ProfitSummaryTotals> {
  const agg = await prisma.project.aggregate({
    where: {
      ...where,
      projectStatus: {
        in: [
          ProjectStatus.CONFIRMED,
          ProjectStatus.UNDER_INSTALLATION,
          ProjectStatus.COMPLETED,
          ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
        ],
      },
    },
    _count: { id: true },
    _sum: {
      projectCost: true,
      grossProfit: true,
      totalAmountReceived: true,
      balanceAmount: true,
      systemCapacity: true,
    },
    _avg: { profitability: true },
  });
  return {
    deals: agg._count.id,
    order: Math.round(Number(agg._sum.projectCost) || 0),
    profit: Math.round(Number(agg._sum.grossProfit) || 0),
    avgMargin: Math.round((Number(agg._avg.profitability) || 0) * 10) / 10,
    collected: Math.round(Number(agg._sum.totalAmountReceived) || 0),
    balance: Math.round(Number(agg._sum.balanceAmount) || 0),
    kw: Math.round(Number(agg._sum.systemCapacity) || 0),
  };
}

export async function execProfitSummary(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const { deals, order, profit, avgMargin, collected, balance, kw } =
    await aggregateProfitSummaryTotals(where);
  return {
    insight: deals
      ? `Profit summary: ${deals} deals · ${formatInr(order)} order · ${formatInr(profit)} gross profit · avg margin ${avgMargin}% · collected ${formatInr(collected)} · balance ${formatInr(balance)} · ${kw} kW.`
      : 'No revenue-stage projects match your filters for profit summary.',
    viz: {
      kind: 'table',
      title: 'Profit & collections summary',
      columns: [
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ],
      rows: [
        { metric: 'Deals', value: deals },
        { metric: 'Order value (₹)', value: order },
        { metric: 'Gross profit (₹)', value: profit },
        { metric: 'Avg margin %', value: avgMargin },
        { metric: 'Collected (₹)', value: collected },
        { metric: 'Outstanding (₹)', value: balance },
        { metric: 'Capacity (kW)', value: kw },
      ],
    },
  };
}

/**
 * This FY vs last FY comparison (revenue / profit / margin) for Ask YoY questions.
 */
export async function execPeriodCompare(
  wherePrimary: Prisma.ProjectWhereInput,
  wherePrior: Prisma.ProjectWhereInput,
  opts: {
    focus?: 'revenue' | 'margin' | 'profit' | 'all';
    primaryFy: string;
    priorFy: string;
  },
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const [cur, prior] = await Promise.all([
    aggregateProfitSummaryTotals(wherePrimary),
    aggregateProfitSummaryTotals(wherePrior),
  ]);
  const focus = opts.focus ?? 'all';
  const thisLabel = `This FY (${opts.primaryFy})`;
  const lastLabel = `Last FY (${opts.priorFy})`;

  type Row = {
    metric: string;
    thisFy: string | number;
    lastFy: string | number;
    change: string;
    growth: string;
    _sort: number;
  };

  const mkMoney = (label: string, a: number, b: number, sort: number): Row => ({
    metric: label,
    thisFy: a,
    lastFy: b,
    change: formatDelta(a, b, 'inr'),
    growth: formatGrowthPct(growthPct(a, b)),
    _sort: sort,
  });
  const mkMargin = (a: number, b: number): Row => ({
    metric: 'Avg margin %',
    thisFy: a,
    lastFy: b,
    change: formatDelta(a, b, 'pp'),
    growth: formatGrowthPct(growthPct(a, b)),
    _sort: 2,
  });
  const mkDeals = (a: number, b: number): Row => ({
    metric: 'Deals',
    thisFy: a,
    lastFy: b,
    change: formatDelta(a, b, 'count'),
    growth: formatGrowthPct(growthPct(a, b)),
    _sort: 0,
  });

  let rows: Row[] = [
    mkDeals(cur.deals, prior.deals),
    mkMoney('Order value (₹)', cur.order, prior.order, 1),
    mkMoney('Gross profit (₹)', cur.profit, prior.profit, 3),
    mkMargin(cur.avgMargin, prior.avgMargin),
  ];

  if (focus === 'revenue') {
    rows = [mkMoney('Order value (₹)', cur.order, prior.order, 1), mkDeals(cur.deals, prior.deals)];
  } else if (focus === 'profit') {
    rows = [
      mkMoney('Gross profit (₹)', cur.profit, prior.profit, 1),
      mkMoney('Order value (₹)', cur.order, prior.order, 2),
      mkMargin(cur.avgMargin, prior.avgMargin),
    ];
  } else if (focus === 'margin') {
    rows = [
      mkMargin(cur.avgMargin, prior.avgMargin),
      mkMoney('Order value (₹)', cur.order, prior.order, 2),
      mkMoney('Gross profit (₹)', cur.profit, prior.profit, 3),
    ];
  }

  let insight: string;
  if (focus === 'margin') {
    const d = Math.round((cur.avgMargin - prior.avgMargin) * 10) / 10;
    const sign = d > 0 ? '+' : '';
    insight =
      prior.deals === 0 && cur.deals === 0
        ? 'No revenue-stage deals in either FY for margin comparison.'
        : prior.deals === 0
          ? `Avg margin ${cur.avgMargin}% this FY (${opts.primaryFy}); no prior-FY baseline (${opts.priorFy}).`
          : `Avg margin: ${cur.avgMargin}% this FY vs ${prior.avgMargin}% last FY (${sign}${d} pp).`;
  } else if (focus === 'profit') {
    const g = growthPct(cur.profit, prior.profit);
    insight =
      prior.profit === 0 && cur.profit === 0
        ? 'No gross profit in either FY to compare.'
        : prior.profit === 0
          ? `Gross profit ${formatInr(cur.profit)} this FY; no prior-FY baseline.`
          : `Gross profit YoY: ${formatInr(cur.profit)} this FY vs ${formatInr(prior.profit)} last FY (${formatGrowthPct(g)}).`;
  } else {
    const g = growthPct(cur.order, prior.order);
    insight =
      prior.order === 0 && cur.order === 0
        ? 'No revenue (order value) in either FY to compare.'
        : prior.order === 0
          ? `Revenue ${formatInr(cur.order)} this FY; no prior-FY baseline.`
          : `Revenue YoY: ${formatInr(cur.order)} this FY vs ${formatInr(prior.order)} last FY (${formatGrowthPct(g)}).`;
  }

  return {
    insight,
    viz: {
      kind: 'table',
      title: `YoY compare · ${opts.primaryFy} vs ${opts.priorFy}`,
      columns: [
        { key: 'metric', label: 'Metric' },
        { key: 'thisFy', label: thisLabel },
        { key: 'lastFy', label: lastLabel },
        { key: 'change', label: 'Change' },
        { key: 'growth', label: 'Growth %' },
      ],
      rows: rows.map(({ _sort: _s, ...rest }) => rest),
    },
  };
}

export async function execTicketsBySalesperson(
  where: Prisma.ProjectWhereInput,
  ctx: { userId: string; role: UserRole },
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const ticketWhere: Prisma.SupportTicketWhereInput = {};
  if (ctx.role === UserRole.SALES) {
    ticketWhere.project = { salespersonId: ctx.userId };
  } else {
    // Restrict tickets to projects matching Ask project where when possible
    ticketWhere.project = where as Prisma.ProjectWhereInput;
  }
  const tickets = await prisma.supportTicket.findMany({
    where: ticketWhere,
    select: {
      project: {
        select: {
          salespersonId: true,
          salesperson: { select: { name: true } },
        },
      },
    },
    take: 8000,
  });
  const map = new Map<string, { label: string; value: number; count: number }>();
  for (const t of tickets) {
    const key = t.project.salespersonId || 'none';
    const label = t.project.salesperson?.name?.trim() || 'Unassigned';
    const cur = map.get(key) || { label, value: 0, count: 0 };
    cur.value += 1;
    cur.count += 1;
    map.set(key, cur);
  }
  const series = Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, TABLE_CAP);
  return {
    insight: series.length
      ? `Support tickets by salesperson: ${tickets.length} tickets · top ${series[0]!.label} (${series[0]!.count}).`
      : 'No support tickets match your filters.',
    viz: {
      kind: 'chart',
      title: 'Support tickets by salesperson',
      chartType: 'bar',
      series,
      valueLabel: 'Tickets',
    },
  };
}

export async function execComplianceBacklog(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const base = { ...where, projectStatus: { not: ProjectStatus.LOST }, type: ProjectType.SUBSIDY };
  const [
    noFeasibility,
    feasNoReg,
    regNoInstall,
    installNoMnre,
    subsidyReqNoCredit,
  ] = await Promise.all([
    prisma.project.count({ where: { ...base, feasibilityDate: null } }),
    prisma.project.count({
      where: { ...base, feasibilityDate: { not: null }, registrationDate: null },
    }),
    prisma.project.count({
      where: {
        ...base,
        registrationDate: { not: null },
        installationCompletionDate: null,
      },
    }),
    prisma.project.count({
      where: {
        ...base,
        installationCompletionDate: { not: null },
        mnrePortalRegistrationDate: null,
      },
    }),
    prisma.project.count({
      where: {
        ...base,
        subsidyRequestDate: { not: null },
        subsidyCreditedDate: null,
        projectStatus: { not: ProjectStatus.COMPLETED_SUBSIDY_CREDITED },
      },
    }),
  ]);
  const counts: Record<ComplianceGapId, number> = {
    no_feasibility: noFeasibility,
    feas_no_reg: feasNoReg,
    reg_no_install: regNoInstall,
    install_no_mnre: installNoMnre,
    subsidy_req_no_credit: subsidyReqNoCredit,
  };
  const rows = COMPLIANCE_GAP_IDS.map((gap) => ({
    gap,
    step: COMPLIANCE_GAP_LABELS[gap],
    count: counts[gap],
  }));
  const total = rows.reduce((s, r) => s + r.count, 0);
  return {
    insight: total
      ? `Compliance backlog (subsidy projects): ${total} gaps across KSEB / MNRE / subsidy credit steps. Click a row to open those projects.`
      : 'No subsidy compliance gaps match your filters.',
    viz: {
      kind: 'table',
      title: 'Subsidy compliance backlog',
      columns: [
        { key: 'step', label: 'Gap' },
        { key: 'count', label: 'Projects' },
      ],
      rows,
    },
  };
}

export async function execSubsidyFunnel(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const statuses = [
    ProjectStatus.CONFIRMED,
    ProjectStatus.UNDER_INSTALLATION,
    ProjectStatus.SUBMITTED_FOR_SUBSIDY,
    ProjectStatus.COMPLETED,
    ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
  ];
  const rows = await prisma.project.groupBy({
    by: ['projectStatus'],
    where: { ...where, type: ProjectType.SUBSIDY, projectStatus: { in: statuses } },
    _count: { id: true },
    _sum: { projectCost: true },
  });
  const labels: Record<string, string> = {
    CONFIRMED: 'Confirmed',
    UNDER_INSTALLATION: 'Under installation',
    SUBMITTED_FOR_SUBSIDY: 'Submitted for subsidy',
    COMPLETED: 'Completed (awaiting credit)',
    COMPLETED_SUBSIDY_CREDITED: 'Subsidy credited',
  };
  const by = new Map(rows.map((r) => [r.projectStatus, r]));
  const tableRows = statuses.map((st) => {
    const r = by.get(st);
    return {
      status: st,
      stage: labels[st] || st,
      count: r?._count.id ?? 0,
      value: Math.round(Number(r?._sum.projectCost) || 0),
    };
  });
  const total = tableRows.reduce((s, r) => s + Number(r.count), 0);
  return {
    insight: total
      ? `Subsidy funnel: ${total} subsidy projects across late stages.`
      : 'No subsidy projects in the funnel match your filters.',
    viz: {
      kind: 'table',
      title: 'Subsidy funnel',
      columns: [
        { key: 'stage', label: 'Stage' },
        { key: 'count', label: 'Count' },
        { key: 'value', label: 'Order value (₹)' },
      ],
      rows: tableRows,
    },
  };
}

export async function execInstallationModelStatus(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const installs = await prisma.installation.groupBy({
    by: ['status'],
    where: { project: where },
    _count: { id: true },
  });
  const series = installs
    .map((r) => ({
      label: INSTALL_LABELS[r.status] || r.status,
      value: r._count.id,
      count: r._count.id,
    }))
    .sort((a, b) => b.value - a.value);
  return {
    insight: series.length
      ? `Installation records: ${series.map((s) => `${s.label} ${s.count}`).join(' · ')}.`
      : 'No Installation records match your filters.',
    viz: {
      kind: 'chart',
      title: 'Installation records by status',
      chartType: 'pie',
      series,
      valueLabel: 'Installations',
    },
  };
}

export async function execPaymentModeMix(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const payments = await prisma.payment.groupBy({
    by: ['mode'],
    where: { invoice: { project: where } },
    _count: { id: true },
    _sum: { amount: true },
  });
  const series = payments
    .map((r) => ({
      label: PAYMENT_MODE_LABELS[r.mode] || r.mode,
      value: Math.round(Number(r._sum.amount) || 0),
      count: r._count.id,
    }))
    .sort((a, b) => b.value - a.value);
  const total = series.reduce((s, x) => s + x.value, 0);
  return {
    insight: series.length
      ? `Payment mode mix: ${formatInr(total)} collected · ${series.map((s) => s.label).join(' / ')}.`
      : 'No invoice payments match your filters.',
    viz: {
      kind: 'chart',
      title: 'Payment mode mix',
      chartType: 'pie',
      series,
      valueLabel: 'Amount (₹)',
    },
  };
}

export async function execUnpaidInvoices(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const invoices = await prisma.invoice.findMany({
    where: {
      project: where,
      status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PART_PAID] },
    },
    select: {
      invoiceNumber: true,
      total: true,
      status: true,
      dueDate: true,
      project: {
        select: {
          slNo: true,
          customer: { select: { customerName: true, firstName: true } },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: TABLE_CAP,
  });
  const agg = await prisma.invoice.aggregate({
    where: {
      project: where,
      status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PART_PAID] },
    },
    _count: { id: true },
    _sum: { total: true },
  });
  const total = Math.round(Number(agg._sum.total) || 0);
  return {
    insight: agg._count.id
      ? `${agg._count.id} unpaid / part-paid invoices · ${formatInr(total)} (showing up to ${TABLE_CAP}).`
      : 'No unpaid invoices match your filters.',
    viz: {
      kind: 'table',
      title: 'Unpaid invoices',
      columns: [
        { key: 'invoice', label: 'Invoice' },
        { key: 'project', label: 'Project' },
        { key: 'status', label: 'Status' },
        { key: 'total', label: 'Total (₹)' },
      ],
      rows: invoices.map((i) => ({
        slNo: i.project.slNo,
        invoice: i.invoiceNumber,
        project: `#${i.project.slNo} ${i.project.customer?.firstName || i.project.customer?.customerName || ''}`.trim(),
        status: i.status,
        total: Math.round(Number(i.total) || 0),
      })),
    },
  };
}

export async function execAmcExpiring(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const now = new Date();
  const in90 = new Date(now.getTime() + 90 * 86400000);
  const contracts = await prisma.aMCContract.findMany({
    where: {
      project: where,
      endDate: { gte: now, lte: in90 },
    },
    select: {
      endDate: true,
      annualFee: true,
      project: {
        select: {
          slNo: true,
          customer: { select: { customerName: true, firstName: true } },
        },
      },
    },
    orderBy: { endDate: 'asc' },
    take: TABLE_CAP,
  });
  return {
    insight: contracts.length
      ? `${contracts.length} AMC contract${contracts.length === 1 ? '' : 's'} expiring in the next 90 days.`
      : 'No AMCs expiring in the next 90 days for your filters.',
    viz: {
      kind: 'table',
      title: 'AMCs expiring (90 days)',
      columns: [
        { key: 'project', label: 'Project' },
        { key: 'endDate', label: 'Ends' },
        { key: 'fee', label: 'Annual fee (₹)' },
      ],
      rows: contracts.map((c) => ({
        slNo: c.project.slNo,
        project: `#${c.project.slNo} ${c.project.customer?.firstName || c.project.customer?.customerName || ''}`.trim(),
        endDate: c.endDate.toISOString().slice(0, 10),
        fee: Math.round(Number(c.annualFee) || 0),
      })),
    },
  };
}

export async function execTicketResolutionTime(
  where: Prisma.ProjectWhereInput,
  ctx: { userId: string; role: UserRole },
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const ticketWhere: Prisma.SupportTicketWhereInput = {
    status: SupportTicketStatus.CLOSED,
    closedAt: { not: null },
  };
  if (ctx.role === UserRole.SALES) {
    ticketWhere.project = { salespersonId: ctx.userId };
  } else {
    ticketWhere.project = where as Prisma.ProjectWhereInput;
  }
  const closed = await prisma.supportTicket.findMany({
    where: ticketWhere,
    select: { createdAt: true, closedAt: true },
    take: 2000,
  });
  if (closed.length === 0) {
    return {
      insight: 'No closed support tickets with a close date match your filters.',
      viz: {
        kind: 'table',
        title: 'Ticket resolution time',
        columns: [
          { key: 'metric', label: 'Metric' },
          { key: 'value', label: 'Value' },
        ],
        rows: [],
      },
    };
  }
  const days = closed.map((t) => {
    const end = t.closedAt!.getTime();
    const start = t.createdAt.getTime();
    return (end - start) / 86400000;
  });
  days.sort((a, b) => a - b);
  const avg = days.reduce((s, d) => s + d, 0) / days.length;
  const median = days[Math.floor(days.length / 2)]!;
  return {
    insight: `Closed tickets (${days.length}): avg ${avg.toFixed(1)} days to close · median ${median.toFixed(1)} days.`,
    viz: {
      kind: 'table',
      title: 'Ticket resolution time',
      columns: [
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ],
      rows: [
        { metric: 'Closed tickets', value: days.length },
        { metric: 'Avg days to close', value: Math.round(avg * 10) / 10 },
        { metric: 'Median days to close', value: Math.round(median * 10) / 10 },
        { metric: 'Fastest (days)', value: Math.round(days[0]! * 10) / 10 },
        { metric: 'Slowest (days)', value: Math.round(days[days.length - 1]! * 10) / 10 },
      ],
    },
  };
}

export async function execHubPlantLinkSummary(
  where: Prisma.ProjectWhereInput,
): Promise<{ viz: ZenithNlViz; insight: string }> {
  const [linked, unlinked] = await Promise.all([
    prisma.project.count({
      where: {
        ...where,
        projectStatus: { not: ProjectStatus.LOST },
        OR: [
          { solisStationId: { not: null } },
          { deyeStationId: { not: null } },
          { sunwaysStationId: { not: null } },
        ],
      },
    }),
    prisma.project.count({
      where: {
        ...where,
        projectStatus: { not: ProjectStatus.LOST },
        solisStationId: null,
        deyeStationId: null,
        sunwaysStationId: null,
      },
    }),
  ]);
  const series = [
    { label: 'Hub plant linked', value: linked, count: linked },
    { label: 'Not linked', value: unlinked, count: unlinked },
  ].filter((s) => s.value > 0);
  return {
    insight: `Hub plant links: ${linked} linked · ${unlinked} without Solis/Deye/Sunways station id.`,
    viz: {
      kind: 'chart',
      title: 'Hub plant link status',
      chartType: 'pie',
      series,
      valueLabel: 'Projects',
    },
  };
}
