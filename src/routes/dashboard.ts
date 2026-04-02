import express, { Request, Response } from 'express';
import {
  UserRole,
  ProjectStatus,
  LeadStatus,
  ProjectStage,
  LeadSource,
  PaymentStatus,
  Prisma,
  InstallationStatus,
} from '@prisma/client';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Quarter definition: Q1 Apr-Jun, Q2 Jul-Sep, Q3 Oct-Dec, Q4 Jan-Mar
const QUARTER_TO_MONTHS: Record<string, string[]> = {
  Q1: ['04', '05', '06'],
  Q2: ['07', '08', '09'],
  Q3: ['10', '11', '12'],
  Q4: ['01', '02', '03'],
};

/** e.g. "2024-25" -> "2023-24", "2024-2025" -> "2023-2024" */
function getPreviousFY(fy: string): string {
  const s = String(fy).trim();
  const twoDigit = s.match(/^(\d{4})-(\d{2})$/);
  if (twoDigit) {
    const start = parseInt(twoDigit[1], 10);
    const end = parseInt(twoDigit[2], 10);
    return `${start - 1}-${String(end - 1).padStart(2, '0')}`;
  }
  const fourDigit = s.match(/^(\d{4})-(\d{4})$/);
  if (fourDigit) {
    const start = parseInt(fourDigit[1], 10);
    const end = parseInt(fourDigit[2], 10);
    return `${start - 1}-${end - 1}`;
  }
  return '';
}

// Helper function to apply FY, Quarter and Month filters to project queries (dashboard tiles only)
function applyDateFilters(
  baseWhere: any,
  fyFilters: string[],
  monthFilters: string[],
  quarterFilters: string[] = []
): any {
  let where = { ...baseWhere };

  // Apply FY filter
  if (fyFilters.length > 0) {
    where.year = { in: fyFilters };
  }

  // Month/Quarter filter only applies if exactly one FY is selected
  if (fyFilters.length === 1) {
    let effectiveMonthFilters: string[] = [];

    if (quarterFilters.length > 0) {
      const quarterMonths = new Set<string>();
      quarterFilters.forEach((q) => {
        const months = QUARTER_TO_MONTHS[q];
        if (months) months.forEach((m) => quarterMonths.add(m));
      });
      if (monthFilters.length > 0) {
        // Both quarter and month selected: use intersection
        effectiveMonthFilters = monthFilters.filter((m) => quarterMonths.has(m));
      } else {
        effectiveMonthFilters = Array.from(quarterMonths);
      }
    } else {
      effectiveMonthFilters = monthFilters;
    }

    if (effectiveMonthFilters.length > 0) {
      const fy = fyFilters[0];
      const yearMatch = fy.match(/(\d{4})/);
      if (yearMatch) {
        const startYear = parseInt(yearMatch[1]);
        const dateFilters: any[] = [];

        // Use confirmationDate only – must match Projects API for tile counts to match Projects page
        effectiveMonthFilters.forEach((month) => {
          const monthNum = parseInt(month);
          let year = startYear;
          if (monthNum >= 1 && monthNum <= 3) {
            year = startYear + 1;
          }
          const startDate = new Date(year, monthNum - 1, 1);
          const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
          dateFilters.push({
            confirmationDate: { gte: startDate, lte: endDate },
          });
        });

        if (dateFilters.length > 0) {
          where.AND = [
            ...(where.AND || []),
            { OR: dateFilters },
          ];
        }
      }
    }
  }

  return where;
}

// Helper function to create revenue filter (excludes Leads, Site Survey, and Proposal stages)
function getRevenueWhere(baseWhere: any): any {
  // Extract AND conditions from baseWhere if they exist
  const baseAndConditions = baseWhere.AND || [];
  // Remove AND from baseWhere to avoid duplication
  const { AND, ...baseWhereWithoutAnd } = baseWhere;
  
  // Build revenue filter: Only include confirmed/completed projects
  // Exclude LEAD status (already excluded by projectStatus filter)
  // Exclude SURVEY and PROPOSAL stages
  // Note: We exclude null projectStage only for Lead status projects, but since we're already
  // filtering by status CONFIRMED/COMPLETED, null projectStage is allowed (confirmed orders may not have stage set)
  const revenueFilter: any = {
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

  // Exclude SURVEY and PROPOSAL stages
  // Allow null projectStage (confirmed orders may not have stage set)
  // Prisma notIn doesn't handle null well, so we use OR to explicitly include null
  const stageCondition = {
    OR: [
      { projectStage: null }, // Include null stages
      { projectStage: { notIn: [ProjectStage.SURVEY, ProjectStage.PROPOSAL] } }, // Exclude Survey and Proposal
    ],
  };

  // Combine all conditions
  if (baseAndConditions.length > 0) {
    revenueFilter.AND = [...baseAndConditions, stageCondition];
  } else {
    revenueFilter.AND = [stageCondition];
  }

  return revenueFilter;
}

// Pipeline = all projects except LOST with projectCost (same as tiles)
function getPipelineWhere(baseWhere: any): any {
  return {
    ...baseWhere,
    projectCost: { not: null },
    projectStatus: { not: ProjectStatus.LOST },
  };
}

/** Same slice as open pipeline tiles (used when appending previous FY pipeline). */
const DASHBOARD_PIPELINE_WHERE_BASE = {
  projectCost: { not: null },
  projectStatus: { not: ProjectStatus.LOST },
} as const;

type ProjectValueProfitFYRow = {
  fy: string;
  totalProjectValue: number;
  totalProfit: number;
  totalCapacity?: number;
  totalPipeline?: number;
};

/**
 * When exactly one FY is filtered, append the prior FY row so charts match across roles (YoY context).
 * `baseWhereForPreviousFY` scopes Sales to their projects via { salespersonId } when needed.
 */
async function appendPreviousFYToProjectValueProfitByFY(
  fyFilters: string[],
  rows: ProjectValueProfitFYRow[],
  baseWhereForPreviousFY: Record<string, unknown>,
  mode: 'full' | 'revenueProfitOnly'
): Promise<ProjectValueProfitFYRow[]> {
  if (fyFilters.length !== 1) return rows;
  const previousFY = getPreviousFY(fyFilters[0]!);
  if (!previousFY || rows.some((r) => r.fy === previousFY)) return rows;

  const wherePrev = applyDateFilters(baseWhereForPreviousFY as any, [previousFY], [], []);
  const revenueWherePrev = getRevenueWhere(wherePrev);
  const pipelineWherePrev = { ...wherePrev, ...DASHBOARD_PIPELINE_WHERE_BASE };

  if (mode === 'full') {
    const [prevRev, prevProfit, prevCap, prevPipe] = await Promise.all([
      prisma.project.aggregate({ where: revenueWherePrev, _sum: { projectCost: true } }),
      prisma.project.aggregate({
        where: { ...revenueWherePrev, grossProfit: { not: null } },
        _sum: { grossProfit: true },
      }),
      prisma.project.aggregate({
        where: { ...revenueWherePrev, systemCapacity: { not: null } },
        _sum: { systemCapacity: true },
      }),
      prisma.project.aggregate({ where: pipelineWherePrev, _sum: { projectCost: true } }),
    ]);
    return [
      ...rows,
      {
        fy: previousFY,
        totalProjectValue: prevRev._sum.projectCost || 0,
        totalProfit: prevProfit._sum.grossProfit || 0,
        totalCapacity: prevCap._sum.systemCapacity || 0,
        totalPipeline: prevPipe._sum.projectCost || 0,
      },
    ].sort((a, b) => String(a.fy).localeCompare(String(b.fy)));
  }

  const [prevRev, prevProfit] = await Promise.all([
    prisma.project.aggregate({ where: revenueWherePrev, _sum: { projectCost: true } }),
    prisma.project.aggregate({
      where: { ...revenueWherePrev, grossProfit: { not: null } },
      _sum: { grossProfit: true },
    }),
  ]);
  return [
    ...rows,
    {
      fy: previousFY,
      totalProjectValue: prevRev._sum.projectCost || 0,
      totalProfit: prevProfit._sum.grossProfit || 0,
    },
  ].sort((a, b) => String(a.fy).localeCompare(String(b.fy)));
}

// Execution order and labels for Projects by Stage chart (Lost excluded from chart in all views).
// SUBMITTED_FOR_SUBSIDY is omitted — stage is not used in CRM workflow; counts still exist in DB but are not shown here.
const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  ProjectStatus.LEAD,
  ProjectStatus.SITE_SURVEY,
  ProjectStatus.PROPOSAL,
  ProjectStatus.CONFIRMED,
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.COMPLETED,
  ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
];

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

function buildProjectsByStatus(countByStatus: { status: ProjectStatus; _count: number }[]): { status: string; statusLabel: string; count: number }[] {
  const map = new Map(countByStatus.map((r) => [r.status, r._count]));
  return PROJECT_STATUS_ORDER.map((status) => ({
    status,
    statusLabel: PROJECT_STATUS_LABELS[status] || status,
    count: map.get(status) || 0,
  }));
}

/** Lead source display label — must match pipelineByLeadSource / Zenith charts. */
function formatLeadSourceForExplorer(ls: LeadSource | null | undefined): string {
  if (ls == null) return 'Unknown';
  switch (ls) {
    case LeadSource.WEBSITE:
      return 'Website';
    case LeadSource.REFERRAL:
      return 'Referral';
    case LeadSource.GOOGLE:
      return 'Google';
    case LeadSource.CHANNEL_PARTNER:
      return 'Channel Partner';
    case LeadSource.DIGITAL_MARKETING:
      return 'Digital Marketing';
    case LeadSource.SALES:
      return 'Sales';
    case LeadSource.MANAGEMENT_CONNECT:
      return 'Management Connect';
    case LeadSource.OTHER:
      return 'Other';
    default:
      return String(ls);
  }
}

/** Segment label — must match projectValueByType / SegmentDonut. */
function formatProjectTypeForExplorer(type: string): string {
  switch (type) {
    case 'RESIDENTIAL_SUBSIDY':
      return 'Residential - Subsidy';
    case 'RESIDENTIAL_NON_SUBSIDY':
      return 'Residential - Non Subsidy';
    case 'COMMERCIAL_INDUSTRIAL':
      return 'Commercial Industrial';
    default:
      return type;
  }
}

/** Lightweight project rows for Zenith chart drill-down + revenue forecast (same FY/date scope as dashboard). */
async function loadZenithExplorerProjects(where: Prisma.ProjectWhereInput) {
  const rows = await prisma.project.findMany({
    where,
    select: {
      id: true,
      projectCost: true,
      projectStatus: true,
      projectStage: true,
      leadSource: true,
      type: true,
      year: true,
      updatedAt: true,
      grossProfit: true,
      availingLoan: true,
      financingBank: true,
      salesperson: { select: { name: true } },
      customer: { select: { firstName: true, customerName: true } },
    },
    take: 5000,
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map((p) => ({
    id: p.id,
    projectStatus: p.projectStatus,
    /** Raw enum for drill-down parity with `getRevenueWhere` / `getPipelineWhere`. */
    project_stage: p.projectStage ?? null,
    has_deal_value: p.projectCost != null,
    stageLabel: PROJECT_STATUS_LABELS[p.projectStatus] || String(p.projectStatus),
    deal_value: p.projectCost ?? 0,
    lead_source: formatLeadSourceForExplorer(p.leadSource),
    customer_segment: formatProjectTypeForExplorer(p.type),
    financial_year: p.year,
    assigned_to_name: p.salesperson?.name?.trim() || 'Unassigned',
    updated_at: p.updatedAt.toISOString(),
    customer_name: p.customer?.firstName?.trim() || p.customer?.customerName?.trim() || 'Unknown',
    gross_profit: p.grossProfit,
    /** Display label aligned with `availingLoanByBank[].bankLabel` (Zenith loans chart). */
    loan_bank_label:
      p.availingLoan && p.financingBank?.trim()
        ? BANK_LABELS[p.financingBank] || p.financingBank
        : '',
  }));
}

/** Mean days in current status (stageEnteredAt ?? createdAt → now) for Zenith funnel tooltips. */
async function computeAvgDaysByProjectStatus(where: Prisma.ProjectWhereInput): Promise<Record<string, number>> {
  const rows = await prisma.project.findMany({
    where,
    select: { projectStatus: true, stageEnteredAt: true, createdAt: true },
  });
  const acc: Record<string, { sum: number; n: number }> = {};
  const now = Date.now();
  for (const r of rows) {
    const start = r.stageEnteredAt ?? r.createdAt;
    if (!start) continue;
    const days = (now - start.getTime()) / 86400000;
    const k = r.projectStatus;
    if (!acc[k]) acc[k] = { sum: 0, n: 0 };
    acc[k].sum += days;
    acc[k].n += 1;
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(acc)) {
    if (v.n > 0) out[k] = Math.round((v.sum / v.n) * 10) / 10;
  }
  return out;
}

function mergeProjectsByStatusAvgDays(
  rows: { status: string; statusLabel: string; count: number }[],
  avgMap: Record<string, number>
): { status: string; statusLabel: string; count: number; avgDaysInStage: number | null }[] {
  return rows.map((r) => ({
    ...r,
    avgDaysInStage: avgMap[r.status] != null && Number.isFinite(avgMap[r.status]) ? avgMap[r.status]! : null,
  }));
}

type PaymentStatusBucketRow = {
  status: string;
  count: number;
  totalValue: number;
  outstanding: number;
};

/**
 * Payment Quick Access buckets — same logic as Sales dashboard (aggregate + groupBy, no findMany).
 * N/A = no/zero order value OR early/lost stages; else group by paymentStatus (null → PENDING).
 */
async function buildProjectsByPaymentStatus(where: Prisma.ProjectWhereInput): Promise<PaymentStatusBucketRow[]> {
  const earlyOrLostStatuses: ProjectStatus[] = [
    ProjectStatus.LEAD,
    ProjectStatus.SITE_SURVEY,
    ProjectStatus.PROPOSAL,
    ProjectStatus.LOST,
  ];
  const [naCount, naTotals, paidGroups] = await Promise.all([
    prisma.project.count({
      where: {
        ...where,
        OR: [
          { projectCost: null },
          { projectCost: 0 },
          { projectStatus: { in: earlyOrLostStatuses } },
        ],
      },
    }),
    prisma.project.aggregate({
      where: {
        ...where,
        OR: [
          { projectCost: null },
          { projectCost: 0 },
          { projectStatus: { in: earlyOrLostStatuses } },
        ],
      },
      _sum: { projectCost: true },
    }),
    prisma.project.groupBy({
      by: ['paymentStatus'],
      where: {
        ...where,
        projectCost: { gt: 0 },
        projectStatus: { notIn: earlyOrLostStatuses },
      },
      _count: { _all: true },
      _sum: { projectCost: true, balanceAmount: true },
    }),
  ]);

  return [
    {
      status: 'N/A',
      count: naCount,
      totalValue: naTotals._sum.projectCost ?? 0,
      outstanding: 0,
    },
    ...paidGroups.map((g) => {
      const paymentStatus = (g.paymentStatus ?? PaymentStatus.PENDING) as PaymentStatus;
      return {
        status: String(paymentStatus),
        count: g._count._all,
        totalValue: g._sum.projectCost ?? 0,
        outstanding:
          paymentStatus === PaymentStatus.PENDING || paymentStatus === PaymentStatus.PARTIAL ? (g._sum.balanceAmount ?? 0) : 0,
      };
    }),
  ];
}

// Bank key to display label (for Availing Loan by Bank chart; must match client form options)
const BANK_LABELS: Record<string, string> = {
  SBI: 'State Bank of India (SBI)',
  HDFC_BANK: 'HDFC Bank',
  ICICI_BANK: 'ICICI Bank',
  AXIS_BANK: 'Axis Bank',
  KOTAK_MAHINDRA_BANK: 'Kotak Mahindra Bank',
  INDUSIND_BANK: 'IndusInd Bank',
  YES_BANK: 'YES Bank',
  IDFC_FIRST_BANK: 'IDFC FIRST Bank',
  PUNJAB_NATIONAL_BANK: 'Punjab National Bank (PNB)',
  BANK_OF_BARODA: 'Bank of Baroda',
  CANARA_BANK: 'Canara Bank',
  UNION_BANK_OF_INDIA: 'Union Bank of India',
  FEDERAL_BANK: 'Federal Bank',
  SOUTH_INDIAN_BANK: 'South Indian Bank',
  CATHOLIC_SYRIAN_BANK: 'Catholic Syrian Bank',
  DHANLAXMI_BANK: 'Dhanlaxmi Bank',
  KERALA_GRAMIN_BANK: 'Kerala Gramin Bank',
  KERALA_BANK: 'Kerala Bank',
  KARNATAKA_BANK: 'Karnataka Bank',
  RBL_BANK: 'RBL Bank',
  TAMILNADU_MERCANTILE_BANK: 'Tamilnadu Mercantile Bank',
  CITY_UNION_BANK: 'City Union Bank',
  OTHER: 'Other',
};

function buildAvailingLoanByBank(
  groupByResult: { financingBank: string | null; _count: { id: number } }[]
): { bankKey: string; bankLabel: string; count: number }[] {
  return groupByResult
    .filter((r) => r.financingBank != null && r.financingBank.trim() !== '')
    .map((r) => ({
      bankKey: r.financingBank!,
      bankLabel: BANK_LABELS[r.financingBank!] || r.financingBank!,
      count: r._count?.id ?? 0,
    }))
    .sort((a, b) => {
      // Keep "Other" always at the right (end of array)
      if (a.bankKey === 'OTHER') return 1
      if (b.bankKey === 'OTHER') return -1
      return b.count - a.count
    })
}

type PeBucketKey = 'proposal-ready' | 'draft' | 'not-started' | 'rest';

function toPositiveNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function normalizeGstPercent(raw: unknown, fallback = 18): number {
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return n;
  return fallback;
}

/**
 * PE order value excluding GST from saved Costing Sheet payload.
 * Mirrors Proposal Engine costing logic (margin first, then GST per row).
 */
function computePeOrderValueExGstFromCosting(costing: {
  items: unknown;
  marginPct: number;
  grandTotal: number;
  showGst: boolean;
}): number {
  const grandTotal = toPositiveNumber(costing.grandTotal);
  if (grandTotal <= 0) return 0;
  if (!costing.showGst) return grandTotal;
  if (!Array.isArray(costing.items)) return Math.round(grandTotal / 1.18);

  const marginMultiplier = 1 + (Number.isFinite(costing.marginPct) ? costing.marginPct : 0) / 100;
  let gstTotal = 0;
  let baseTotal = 0;

  for (const row of costing.items as Array<Record<string, unknown>>) {
    const qty = toPositiveNumber(row?.quantity);
    const unitCost = toPositiveNumber(row?.unitCost);
    if (qty <= 0 || unitCost <= 0) continue;

    const category = String(row?.category ?? '').toLowerCase();
    const defaultGst = category === 'pv-modules' ? 5 : 18;
    const gstPct = normalizeGstPercent(row?.gstPercent, defaultGst);
    const rowBase = qty * unitCost * marginMultiplier;
    baseTotal += rowBase;
    gstTotal += rowBase * (gstPct / 100);
  }

  // If no usable rows, fallback to reverse GST from grand total.
  if (baseTotal <= 0) return Math.round(grandTotal / 1.18);
  const exGst = grandTotal - gstTotal;
  return exGst > 0 ? exGst : 0;
}

/**
 * Lightweight FY list for filter dropdowns only (same year scope as dashboard FY series: revenue-eligible projects).
 * Use instead of GET /management when the full management payload is not needed (e.g. Operations, Finance bootstrap).
 */
router.get('/financial-years', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!role || !userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const allowed: UserRole[] = [
      UserRole.SALES,
      UserRole.OPERATIONS,
      UserRole.FINANCE,
      UserRole.MANAGEMENT,
      UserRole.ADMIN,
    ];
    if (!allowed.includes(role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const baseWhere: Record<string, unknown> = {};
    if (role === UserRole.SALES) {
      baseWhere.salespersonId = userId;
    }
    const where = applyDateFilters(baseWhere, [], [], []);
    const revenueWhere = getRevenueWhere(where);
    // `year` is required on Project — do not use `year: { not: null }` (Prisma rejects `not: null` on String filters).
    const rows = await prisma.project.groupBy({
      by: ['year'],
      where: revenueWhere,
      _count: { _all: true },
    });
    const fys = rows
      .map((r) => r.year)
      .filter((y): y is string => typeof y === 'string' && y.trim() !== '')
      .sort((a, b) => String(a).localeCompare(String(b)));

    res.json({
      projectValueProfitByFY: fys.map((fy) => ({
        fy,
        totalProjectValue: 0,
        totalProfit: 0,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load financial years' });
  }
});

// Sales Dashboard
router.get('/sales', authenticate, async (req: Request, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const fyFilters = req.query.fy ? (Array.isArray(req.query.fy) ? req.query.fy : [req.query.fy]) as string[] : [];
    const monthFilters = req.query.month ? (Array.isArray(req.query.month) ? req.query.month : [req.query.month]) as string[] : [];
    const quarterFilters = req.query.quarter ? (Array.isArray(req.query.quarter) ? req.query.quarter : [req.query.quarter]) as string[] : [];

    const baseWhere: any = {};
    if (role === UserRole.SALES) {
      baseWhere.salespersonId = userId;
    }
    
    // Apply FY, quarter and month filters (dashboard tiles only)
    const where = applyDateFilters(baseWhere, fyFilters, monthFilters, quarterFilters);

    const revenueWhere = getRevenueWhere(where);
    if (process.env.NODE_ENV === 'development') {
      const revenueCount = await prisma.project.count({ where: revenueWhere });
      const sampleProjects = await prisma.project.findMany({
        where: revenueWhere,
        take: 3,
        select: { id: true, projectStatus: true, projectStage: true, projectCost: true },
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('[SALES DASHBOARD] Revenue filter:', JSON.stringify(revenueWhere, null, 2), 'count:', revenueCount, 'sample:', sampleProjects);
      }
    }

    const [
      totalLeads,
      confirmedProjects,
      totalCapacity,
      pipelineCapacity,
      totalRevenue,
      totalProfit,
      projectsByStatusRawFromPromise,
      revenueBySalesperson,
    ] = await Promise.all([
      // Total leads
      prisma.project.count({
        where: { ...where, projectStatus: ProjectStatus.LEAD },
      }),
      // Confirmed projects
      prisma.project.count({
        where: { ...where, projectStatus: { not: ProjectStatus.LEAD } },
      }),
      // Total capacity sold (only confirmed/completed projects, same filter as Total Revenue)
      (async () => {
        const capacityWhere = getRevenueWhere(where);
        capacityWhere.systemCapacity = { not: null };
        return await prisma.project.aggregate({
          where: capacityWhere,
          _sum: { systemCapacity: true },
        });
      })(),
      // Pipeline capacity (kW) = sum of systemCapacity for all non-lost projects (same scope as Total Pipeline, but capacity)
      prisma.project.aggregate({
        where: { ...where, projectStatus: { not: ProjectStatus.LOST }, systemCapacity: { not: null } },
        _sum: { systemCapacity: true },
      }),
      // Total revenue (only confirmed/completed projects, excluding leads/survey/proposal)
      (async () => {
        const revenueWhere = getRevenueWhere(where);
        const result = await prisma.project.aggregate({
          where: revenueWhere,
          _sum: { projectCost: true },
        });
        if (process.env.NODE_ENV === 'development') {
          console.log('[SALES DASHBOARD] Revenue filter:', JSON.stringify(revenueWhere, null, 2), 'result:', result);
        }
        return result;
      })(),
      // Total profit (grossProfit for same project set as revenue)
      prisma.project.aggregate({
        where: { ...getRevenueWhere(where), grossProfit: { not: null } },
        _sum: { grossProfit: true },
      }),
      // Projects by status
      prisma.project.groupBy({
        by: ['projectStatus'],
        where,
        _count: { id: true },
      }),
      // Revenue by salesperson (for all roles; Sales sees only their own, Management/Admin see all)
      prisma.project.groupBy({
        by: ['salespersonId'],
        where: getRevenueWhere({ ...where, salespersonId: { not: null } }),
        _sum: { projectCost: true },
        _count: { id: true },
      }),
    ]);

    // Get salesperson names for revenue breakdown
    let revenueBreakdown: Array<{
      salespersonId: string | null;
      salespersonName: string;
      revenue: number;
      projectCount: number;
    }> = [];
    if (revenueBySalesperson.length > 0) {
      const salespersonIds = revenueBySalesperson
        .map((r) => r.salespersonId)
        .filter((id): id is string => id !== null);
      const salespeople = await prisma.user.findMany({
        where: { id: { in: salespersonIds } },
        select: { id: true, name: true },
      });
      revenueBreakdown = revenueBySalesperson.map((r) => ({
        salespersonId: r.salespersonId,
        salespersonName: salespeople.find((s) => s.id === r.salespersonId)?.name || 'Unknown',
        revenue: r._sum.projectCost || 0,
        projectCount: r._count.id,
      }));
    }

    // Calculate project value by type for pie chart (only confirmed/completed projects)
    const projectValueByType = await prisma.project.groupBy({
      by: ['type'],
      where: getRevenueWhere(where),
      _sum: { projectCost: true },
      _count: { id: true },
    });

    const valueByType = projectValueByType.map((item) => {
      let label = '';
      switch (item.type) {
        case 'RESIDENTIAL_SUBSIDY':
          label = 'Residential - Subsidy';
          break;
        case 'RESIDENTIAL_NON_SUBSIDY':
          label = 'Residential - Non Subsidy';
          break;
        case 'COMMERCIAL_INDUSTRIAL':
          label = 'Commercial Industrial';
          break;
        default:
          label = item.type;
      }
      return {
        type: item.type,
        label,
        value: item._sum.projectCost || 0,
        count: item._count.id,
      };
    });

    const totalValue = valueByType.reduce((sum, item) => sum + item.value, 0);
    const valueByTypeWithPercentage = valueByType.map((item) => ({
      ...item,
      percentage: totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0',
    }));

    // Pipeline by lead source (for Pipeline by Lead Source chart)
    const pipelineByLeadSourceRaw = await prisma.project.groupBy({
      by: ['leadSource'],
      where: { ...getPipelineWhere(where), leadSource: { not: null } },
      _sum: { projectCost: true },
      _count: { id: true },
    });
    const pipelineByLeadSource = pipelineByLeadSourceRaw.map((item) => {
      let label = '';
      switch (item.leadSource) {
        case LeadSource.WEBSITE: label = 'Website'; break;
        case LeadSource.REFERRAL: label = 'Referral'; break;
        case LeadSource.GOOGLE: label = 'Google'; break;
        case LeadSource.CHANNEL_PARTNER: label = 'Channel Partner'; break;
        case LeadSource.DIGITAL_MARKETING: label = 'Digital Marketing'; break;
        case LeadSource.SALES: label = 'Sales'; break;
        case LeadSource.MANAGEMENT_CONNECT: label = 'Management Connect'; break;
        case LeadSource.OTHER: label = 'Other'; break;
        default: label = item.leadSource || 'Unknown';
      }
      return {
        leadSource: item.leadSource,
        leadSourceLabel: label,
        pipeline: item._sum.projectCost || 0,
        projectCount: item._count.id,
      };
    });
    pipelineByLeadSource.sort((a, b) => b.pipeline - a.pipeline);

    // Pipeline by customer segment (type) – for Pipeline by Customer Segment pie chart
    const pipelineByTypeRaw = await prisma.project.groupBy({
      by: ['type'],
      where: getPipelineWhere(where),
      _sum: { projectCost: true },
      _count: { id: true },
    });
    const pipelineByType = pipelineByTypeRaw.map((item) => {
      let label = '';
      switch (item.type) {
        case 'RESIDENTIAL_SUBSIDY': label = 'Residential - Subsidy'; break;
        case 'RESIDENTIAL_NON_SUBSIDY': label = 'Residential - Non Subsidy'; break;
        case 'COMMERCIAL_INDUSTRIAL': label = 'Commercial Industrial'; break;
        default: label = item.type;
      }
      return { type: item.type, label, value: item._sum.projectCost || 0, count: item._count.id };
    });
    const totalPipelineType = pipelineByType.reduce((sum, item) => sum + item.value, 0);
    const pipelineByTypeWithPercentage = pipelineByType.map((item) => ({
      ...item,
      percentage: totalPipelineType > 0 ? ((item.value / totalPipelineType) * 100).toFixed(1) : '0',
    }));

    // Calculate project value, profit, capacity and pipeline by financial year.
    // Use date-filtered where so: selected FY(s) only; quarter/month apply when one FY is selected.
    const whereFYSeries = getRevenueWhere(where);
    // Pipeline = sum of order value for all project stages EXCEPT Lost
    const pipelineWhereBase = {
      projectCost: { not: null },
      projectStatus: { not: ProjectStatus.LOST },
    };
    const pipelineWhereFY = { ...where, ...pipelineWhereBase };
    const pipelineWhereForTiles = { ...where, ...pipelineWhereBase };

    const projectValueByFY = await prisma.project.groupBy({
      by: ['year'],
      where: whereFYSeries,
      _sum: { projectCost: true },
    });

    const profitByFY = await prisma.project.groupBy({
      by: ['year'],
      where: { ...whereFYSeries, grossProfit: { not: null } },
      _sum: { grossProfit: true },
    });

    const capacityByFY = await prisma.project.groupBy({
      by: ['year'],
      where: { ...whereFYSeries, systemCapacity: { not: null } },
      _sum: { systemCapacity: true },
    });

    const pipelineByFY = await prisma.project.groupBy({
      by: ['year'],
      where: pipelineWhereFY,
      _sum: { projectCost: true },
    });

    // Combine the data by financial year
    const allFYs = new Set([
      ...projectValueByFY.map((item) => item.year),
      ...profitByFY.map((item) => item.year),
      ...capacityByFY.map((item) => item.year),
      ...pipelineByFY.map((item) => item.year),
    ]);

    let projectValueProfitByFY: ProjectValueProfitFYRow[] = Array.from(allFYs)
      .sort()
      .map((fy) => ({
        fy,
        totalProjectValue: projectValueByFY.find((item) => item.year === fy)?._sum.projectCost || 0,
        totalProfit: profitByFY.find((item) => item.year === fy)?._sum.grossProfit || 0,
        totalCapacity: capacityByFY.find((item) => item.year === fy)?._sum.systemCapacity || 0,
        totalPipeline: pipelineByFY.find((item) => item.year === fy)?._sum.projectCost || 0,
      }));

    const baseWherePrevSales: Record<string, unknown> = {};
    if (role === UserRole.SALES) baseWherePrevSales.salespersonId = userId!;
    projectValueProfitByFY = await appendPreviousFYToProjectValueProfitByFY(
      fyFilters,
      projectValueProfitByFY,
      baseWherePrevSales,
      'full'
    );

    // Total Leads = deals in Lead stage only (Sales and Management)
    const totalLeadsCount =
      projectsByStatusRawFromPromise
        ?.filter((p) => p.projectStatus === ProjectStatus.LEAD)
        .reduce((sum, p) => sum + (p._count?.id || 0), 0) || 0;

    // Build chart-ready projects by status (single place)
    let projectsByStatus = buildProjectsByStatus(
      (projectsByStatusRawFromPromise || []).map((r) => ({ status: r.projectStatus, _count: r._count.id }))
    );
    const avgDaysByStatusSales = await computeAvgDaysByProjectStatus(where);
    projectsByStatus = mergeProjectsByStatusAvgDays(projectsByStatus, avgDaysByStatusSales);

    // The detailed LeadStatus-based metrics (NEW / QUALIFIED / CONVERTED) and
    // expected values are not used on the frontend today, so we keep them as
    // zeroed placeholders for now to avoid confusing empty data.
    const newLeads = 0;
    const qualifiedLeads = 0;
    const convertedLeads = 0;
    const conversionRate = '0';

    const leadsBySourceArray: Array<{ source: string; count: number; expectedValue: number }> = [];

    // Pipeline by stage
    // NOTE:
    // The newer project lifecycle implementation does not currently maintain
    // the legacy projectStage / statusIndicator fields. To keep the Sales
    // dashboard tiles meaningful (especially for Sales users), we derive the
    // pipeline counts directly from the primary projectStatus field instead of
    // relying on projectStage / statusIndicator.
    //
    // This ensures the tiles always reflect the actual pipeline even if
    // stage/SLA tracking is not enabled.
    const pipelineSurvey = await prisma.project.count({
      where: { 
        ...where,
        projectStatus: ProjectStatus.SITE_SURVEY,
      },
    });
    const pipelineProposal = await prisma.project.count({
      where: { 
        ...where,
        projectStatus: ProjectStatus.PROPOSAL,
      },
    });
    const pipelineApproved = await prisma.project.count({
      where: { 
        ...where,
        projectStatus: ProjectStatus.CONFIRMED,
      },
    });
    // Open Pipeline = deals in Lead, Site Survey, Proposal only
    const pipelineAtRisk = await prisma.project.count({
      where: {
        ...where,
        projectStatus: {
          in: [
            ProjectStatus.LEAD,
            ProjectStatus.SITE_SURVEY,
            ProjectStatus.PROPOSAL,
          ],
        },
      },
    });

    // Total Pipeline = sum of order value for all project stages EXCEPT Lost
    const totalPipeline = await prisma.project.aggregate({
      where: { ...where, ...pipelineWhereBase },
      _sum: { projectCost: true },
    });

    // Get customer/project profitability data for word cloud
    const profitabilityData = await prisma.project.findMany({
      where: {
        ...where,
        profitability: { not: null },
        // customerId is a required field, so it can never be null - no need to filter
      },
      select: {
        id: true,
        profitability: true,
        customer: {
          select: {
            firstName: true, // Primary - used for word cloud
            customerName: true, // Fallback only if firstName is null/empty
          },
        },
      },
      orderBy: {
        profitability: 'desc',
      },
      take: 50, // Limit to top 50 for word cloud
    });

    // Map to word cloud data - use firstName (required), profitability from Sales & Commercial section
    const wordCloudData = profitabilityData.map((p) => {
      // Use firstName - only fallback to customerName if firstName is truly empty/null
      const firstName = p.customer?.firstName?.trim();
      const text = firstName || p.customer?.customerName?.trim() || 'Unknown';
      
      // Profitability from Sales & Commercial section
      const profitability = p.profitability || 0;
      
      return {
        text: text || 'Unknown',
        value: profitability,
      };
    });

    // Availing Loan count + by bank (same semantics as Management/Finance tiles: not Lost, availingLoan true)
    const [availingLoanByBankRaw, availingLoanCount] = await Promise.all([
      prisma.project.groupBy({
        by: ['financingBank'],
        where: { ...where, availingLoan: true, financingBank: { not: null } },
        _count: { id: true },
      }),
      prisma.project.count({
        where: { ...where, projectStatus: { not: ProjectStatus.LOST }, availingLoan: true },
      }),
    ]);
    const availingLoanByBank = buildAvailingLoanByBank(availingLoanByBankRaw);

    // When one FY and quarter/month selected: same period in previous year for YoY
    let previousYearSamePeriod: { totalCapacity: number; totalPipeline: number; totalRevenue: number; totalProfit: number } | null = null;
    if (fyFilters.length === 1 && (quarterFilters.length > 0 || monthFilters.length > 0)) {
      const previousFY = getPreviousFY(fyFilters[0]);
      if (previousFY) {
        const wherePrev = applyDateFilters(baseWhere, [previousFY], monthFilters, quarterFilters);
        const revenueWherePrev = getRevenueWhere(wherePrev);
        const pipelineWherePrev = {
          ...wherePrev,
          projectCost: { not: null },
          projectStatus: { not: ProjectStatus.LOST },
          OR: [
            { projectStage: null },
            { projectStage: ProjectStage.SURVEY },
            { projectStage: ProjectStage.PROPOSAL },
          ],
        };
        const [prevCapacity, prevRevenue, prevProfit, prevPipeline] = await Promise.all([
          prisma.project.aggregate({
            where: { ...revenueWherePrev, systemCapacity: { not: null } },
            _sum: { systemCapacity: true },
          }),
          prisma.project.aggregate({
            where: revenueWherePrev,
            _sum: { projectCost: true },
          }),
          prisma.project.aggregate({
            where: { ...revenueWherePrev, grossProfit: { not: null } },
            _sum: { grossProfit: true },
          }),
          prisma.project.aggregate({
            where: pipelineWherePrev,
            _sum: { projectCost: true },
          }),
        ]);
        previousYearSamePeriod = {
          totalCapacity: prevCapacity._sum.systemCapacity ?? 0,
          totalRevenue: prevRevenue._sum.projectCost ?? 0,
          totalProfit: prevProfit._sum.grossProfit ?? 0,
          totalPipeline: prevPipeline._sum.projectCost ?? 0,
        };
      }
    }

    const projectsByPaymentStatus = await buildProjectsByPaymentStatus(where as Prisma.ProjectWhereInput);

    const zenithExplorerProjects = await loadZenithExplorerProjects(where as Prisma.ProjectWhereInput);

    res.json({
      leads: {
        total: totalLeadsCount,
        new: newLeads,
        qualified: qualifiedLeads,
        converted: convertedLeads,
        conversionRate,
        bySource: leadsBySourceArray,
      },
      revenue: {
        totalCapacity: totalCapacity._sum.systemCapacity || 0,
        totalRevenue: totalRevenue._sum.projectCost || 0,
        expectedRevenue: totalRevenue._sum.projectCost || 0, // Using same for now
      },
      pipelineCapacityKW: pipelineCapacity._sum.systemCapacity || 0,
      pipeline: {
        survey: pipelineSurvey,
        proposal: pipelineProposal,
        approved: pipelineApproved,
        atRisk: pipelineAtRisk,
      },
      totalPipeline: totalPipeline._sum.projectCost || 0,
      totalProfit: totalProfit._sum.grossProfit ?? 0,
      previousYearSamePeriod,
      revenueBySalesperson: revenueBreakdown,
      projectValueByType: valueByTypeWithPercentage,
      projectValueProfitByFY,
      wordCloudData,
      pipelineByLeadSource,
      pipelineByType: pipelineByTypeWithPercentage,
      projectsByStatus,
      projectsByPaymentStatus,
      availingLoanByBank,
      availingLoanCount,
      zenithExplorerProjects,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Operations Dashboard
router.get('/operations', authenticate, async (req: Request, res) => {
  try {
    const fyFilters = req.query.fy ? (Array.isArray(req.query.fy) ? req.query.fy : [req.query.fy]) as string[] : [];
    const monthFilters = req.query.month ? (Array.isArray(req.query.month) ? req.query.month : [req.query.month]) as string[] : [];
    const quarterFilters = req.query.quarter ? (Array.isArray(req.query.quarter) ? req.query.quarter : [req.query.quarter]) as string[] : [];

    const baseWhere: any = {};
    const where = applyDateFilters(baseWhere, fyFilters, monthFilters, quarterFilters);
    
    const [
      pendingInstallation,
      submittedForSubsidy,
      subsidyCredited,
      completedInstallation,
      pendingSubsidy,
      ksebBottlenecks,
      mnreBottlenecks,
      confirmedOrderRevenueAgg,
    ] = await Promise.all([
      // Projects pending installation
      prisma.project.count({
        where: {
          ...where,
          projectStatus: { in: [ProjectStatus.CONFIRMED, ProjectStatus.UNDER_INSTALLATION] },
        },
      }),
      // Submitted for subsidy
      prisma.project.count({
        where: { ...where, projectStatus: ProjectStatus.SUBMITTED_FOR_SUBSIDY },
      }),
      // Subsidy credited
      prisma.project.count({
        where: { ...where, projectStatus: ProjectStatus.COMPLETED_SUBSIDY_CREDITED },
      }),
      // Completed installation (COMPLETED + COMPLETED_SUBSIDY_CREDITED)
      prisma.project.count({
        where: {
          ...where,
          projectStatus: { in: [ProjectStatus.COMPLETED, ProjectStatus.COMPLETED_SUBSIDY_CREDITED] },
        },
      }),
      // Pending subsidy (submitted but not credited)
      prisma.project.findMany({
        where: {
          ...where,
          projectStatus: ProjectStatus.SUBMITTED_FOR_SUBSIDY,
          subsidyRequestDate: { not: null },
        },
        select: {
          id: true,
          customer: {
            select: {
              customerName: true,
            },
          },
          subsidyRequestDate: true,
          projectStatus: true,
        },
      }),
      // KSEB bottlenecks (feasibility or registration pending)
      prisma.project.findMany({
        where: {
          ...where,
          OR: [
            { feasibilityDate: null, projectStatus: { not: ProjectStatus.LEAD } },
            { registrationDate: null, projectStatus: { not: ProjectStatus.LEAD } },
          ],
        },
        select: {
          id: true,
          customer: {
            select: {
              customerName: true,
            },
          },
          feasibilityDate: true,
          registrationDate: true,
          projectStatus: true,
        },
      }),
      // MNRE bottlenecks
      prisma.project.findMany({
        where: {
          ...where,
          OR: [
            { mnrePortalRegistrationDate: null, projectStatus: { not: ProjectStatus.LEAD } },
            { installationCompletionDate: null, projectStatus: { not: ProjectStatus.LEAD } },
          ],
        },
        select: {
          id: true,
          customer: {
            select: {
              customerName: true,
            },
          },
          mnrePortalRegistrationDate: true,
          installationCompletionDate: true,
          projectStatus: true,
        },
      }),
      prisma.project.aggregate({
        where: getRevenueWhere(where),
        _sum: { projectCost: true },
      }),
    ]);

    const confirmedOrderRevenue = confirmedOrderRevenueAgg._sum.projectCost ?? 0;

    // Calculate project value by type for pie chart (with optional FY filter) - only confirmed/completed projects
    const projectValueByType = await prisma.project.groupBy({
      by: ['type'],
      where: getRevenueWhere(where),
      _sum: { projectCost: true },
      _count: { id: true },
    });

    const valueByType = projectValueByType.map((item) => {
      let label = '';
      switch (item.type) {
        case 'RESIDENTIAL_SUBSIDY':
          label = 'Residential - Subsidy';
          break;
        case 'RESIDENTIAL_NON_SUBSIDY':
          label = 'Residential - Non Subsidy';
          break;
        case 'COMMERCIAL_INDUSTRIAL':
          label = 'Commercial Industrial';
          break;
        default:
          label = item.type;
      }
      return {
        type: item.type,
        label,
        value: item._sum.projectCost || 0,
        count: item._count.id,
      };
    });

    const totalValue = valueByType.reduce((sum, item) => sum + item.value, 0);
    const valueByTypeWithPercentage = valueByType.map((item) => ({
      ...item,
      percentage: totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0',
    }));

    // Calculate project value and profit by financial year (only confirmed/completed projects)
    const projectValueByFY = await prisma.project.groupBy({
      by: ['year'],
      where: getRevenueWhere(where),
      _sum: { projectCost: true },
    });

    const profitByFY = await prisma.project.groupBy({
      by: ['year'],
      where: { ...getRevenueWhere(where), grossProfit: { not: null } },
      _sum: { grossProfit: true },
    });

    // Combine the data by financial year
    const allFYs = new Set([
      ...projectValueByFY.map((item) => item.year),
      ...profitByFY.map((item) => item.year),
    ]);

    let projectValueProfitByFY = Array.from(allFYs)
      .sort()
      .map((fy) => ({
        fy,
        totalProjectValue: projectValueByFY.find((item) => item.year === fy)?._sum.projectCost || 0,
        totalProfit: profitByFY.find((item) => item.year === fy)?._sum.grossProfit || 0,
      }));

    projectValueProfitByFY = await appendPreviousFYToProjectValueProfitByFY(
      fyFilters,
      projectValueProfitByFY,
      {},
      'revenueProfitOnly'
    );

    // Projects by Stage / Execution Status (for Operations and shared chart)
    const projectsByStatusRaw = await prisma.project.groupBy({
      by: ['projectStatus'],
      where,
      _count: { id: true },
    });
    let projectsByStatus = buildProjectsByStatus(
      projectsByStatusRaw.map((r) => ({ status: r.projectStatus, _count: r._count.id }))
    );
    const avgDaysByStatusOps = await computeAvgDaysByProjectStatus(where);
    projectsByStatus = mergeProjectsByStatusAvgDays(projectsByStatus, avgDaysByStatusOps);

    // Projects by payment status (for Quick Access tile – Operations scope)
    // Avoid loading all projects into Node. Compute buckets via groupBy + aggregates.
    const earlyOrLostStatuses: ProjectStatus[] = [
      ProjectStatus.LEAD,
      ProjectStatus.SITE_SURVEY,
      ProjectStatus.PROPOSAL,
      ProjectStatus.LOST,
    ];

    const [naCount, naTotals, paidGroups, outstandingAgg] = await Promise.all([
      prisma.project.count({
        where: {
          ...where,
          OR: [
            { projectCost: null },
            { projectCost: 0 },
            { projectStatus: { in: earlyOrLostStatuses } },
          ],
        },
      }),
      prisma.project.aggregate({
        where: {
          ...where,
          OR: [
            { projectCost: null },
            { projectCost: 0 },
            { projectStatus: { in: earlyOrLostStatuses } },
          ],
        },
        _sum: { projectCost: true },
      }),
      prisma.project.groupBy({
        by: ['paymentStatus'],
        where: {
          ...where,
          projectCost: { gt: 0 },
          projectStatus: { notIn: earlyOrLostStatuses },
        },
        _count: { _all: true },
        _sum: { projectCost: true, balanceAmount: true },
      }),
      prisma.project.aggregate({
        where: {
          ...where,
          projectCost: { gt: 0 },
          projectStatus: { notIn: earlyOrLostStatuses },
          paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
        },
        _sum: { balanceAmount: true },
      }),
    ]);

    const projectsByPaymentStatus = [
      {
        status: 'N/A',
        count: naCount,
        totalValue: naTotals._sum.projectCost ?? 0,
        outstanding: 0,
      },
      ...paidGroups.map((g) => ({
        status: String(g.paymentStatus ?? 'PENDING'),
        count: g._count._all,
        totalValue: g._sum.projectCost ?? 0,
        // Only treat PENDING/PARTIAL as outstanding; others report 0 for this field.
        outstanding:
          g.paymentStatus === PaymentStatus.PENDING || g.paymentStatus === PaymentStatus.PARTIAL
            ? (g._sum.balanceAmount ?? 0)
            : 0,
      })),
    ];

    let previousYearOperationsKpis: {
      pendingInstallation: number
      completedInstallation: number
      subsidyCredited: number
      confirmedRevenue: number
    } | null = null;
    if (fyFilters.length === 1) {
      const previousFY = getPreviousFY(fyFilters[0]!);
      if (previousFY) {
        const wherePrev = applyDateFilters(baseWhere, [previousFY], monthFilters, quarterFilters);
        const [pendPrev, donePrev, credPrev, revPrevAgg] = await Promise.all([
          prisma.project.count({
            where: {
              ...wherePrev,
              projectStatus: { in: [ProjectStatus.CONFIRMED, ProjectStatus.UNDER_INSTALLATION] },
            },
          }),
          prisma.project.count({
            where: {
              ...wherePrev,
              projectStatus: { in: [ProjectStatus.COMPLETED, ProjectStatus.COMPLETED_SUBSIDY_CREDITED] },
            },
          }),
          prisma.project.count({
            where: { ...wherePrev, projectStatus: ProjectStatus.COMPLETED_SUBSIDY_CREDITED },
          }),
          prisma.project.aggregate({
            where: getRevenueWhere(wherePrev),
            _sum: { projectCost: true },
          }),
        ]);
        previousYearOperationsKpis = {
          pendingInstallation: pendPrev,
          completedInstallation: donePrev,
          subsidyCredited: credPrev,
          confirmedRevenue: revPrevAgg._sum.projectCost ?? 0,
        };
      }
    }

    res.json({
      pendingInstallation,
      submittedForSubsidy,
      subsidyCredited,
      completedInstallation,
      confirmedOrderRevenue,
      pendingSubsidy: pendingSubsidy.map((p) => ({
        ...p,
        customerName: p.customer?.customerName || 'Unknown',
        daysPending: p.subsidyRequestDate
          ? Math.floor(
              (Date.now() - new Date(p.subsidyRequestDate).getTime()) / (1000 * 60 * 60 * 24)
            )
          : null,
      })),
      ksebBottlenecks,
      mnreBottlenecks,
      projectValueByType: valueByTypeWithPercentage,
      projectValueProfitByFY,
      projectsByStatus,
      projectsByPaymentStatus,
      previousYearOperationsKpis,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Finance Dashboard
router.get('/finance', authenticate, async (req: Request, res) => {
  try {
    const fyFilters = req.query.fy ? (Array.isArray(req.query.fy) ? req.query.fy : [req.query.fy]) as string[] : [];
    const monthFilters = req.query.month ? (Array.isArray(req.query.month) ? req.query.month : [req.query.month]) as string[] : [];
    const quarterFilters = req.query.quarter ? (Array.isArray(req.query.quarter) ? req.query.quarter : [req.query.quarter]) as string[] : [];

    const baseWhere: any = {};
    const where = applyDateFilters(baseWhere, fyFilters, monthFilters, quarterFilters);

    const [
      totalProjectValue,
      totalAmountReceived,
      totalGrossProfit,
      profitByProject,
      profitBySalesperson,
    ] = await Promise.all([
      // Total project value (only confirmed/completed projects)
      prisma.project.aggregate({
        _sum: { projectCost: true },
        where: getRevenueWhere(where),
      }),
      // Total amount received
      prisma.project.aggregate({
        _sum: { totalAmountReceived: true },
        where,
      }),
      prisma.project.aggregate({
        _sum: { grossProfit: true },
        where: { ...getRevenueWhere(where), grossProfit: { not: null } },
      }),
      // Profit by project
      prisma.project.findMany({
        where: { ...where, finalProfit: { not: null } },
        select: {
          id: true,
          customer: {
            select: {
              customerName: true,
            },
          },
          projectCost: true,
          finalProfit: true,
          salesperson: {
            select: { id: true, name: true },
          },
        },
        orderBy: { finalProfit: 'desc' },
        take: 20,
      }),
      // Profit by salesperson
      prisma.project.groupBy({
        by: ['salespersonId'],
        where: { ...where, salespersonId: { not: null }, finalProfit: { not: null } },
        _sum: { finalProfit: true },
        _count: { id: true },
      }),
    ]);

    // Compute payment status buckets + totalOutstanding without loading all projects into Node.
    const earlyOrLostStatuses: ProjectStatus[] = [
      ProjectStatus.LEAD,
      ProjectStatus.SITE_SURVEY,
      ProjectStatus.PROPOSAL,
      ProjectStatus.LOST,
    ];

    const [naCount, naTotals, paidGroups, outstandingAgg] = await Promise.all([
      prisma.project.count({
        where: {
          ...where,
          OR: [
            { projectCost: null },
            { projectCost: 0 },
            { projectStatus: { in: earlyOrLostStatuses } },
          ],
        },
      }),
      prisma.project.aggregate({
        where: {
          ...where,
          OR: [
            { projectCost: null },
            { projectCost: 0 },
            { projectStatus: { in: earlyOrLostStatuses } },
          ],
        },
        _sum: { projectCost: true },
      }),
      prisma.project.groupBy({
        by: ['paymentStatus'],
        where: {
          ...where,
          projectCost: { gt: 0 },
          projectStatus: { notIn: earlyOrLostStatuses },
        },
        _count: { _all: true },
        _sum: { projectCost: true, balanceAmount: true },
      }),
      prisma.project.aggregate({
        where: {
          ...where,
          projectCost: { gt: 0 },
          projectStatus: { notIn: earlyOrLostStatuses },
          paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
        },
        _sum: { balanceAmount: true },
      }),
    ]);

    const totalOutstanding = outstandingAgg._sum.balanceAmount ?? 0;

    const projectsByPaymentStatus = [
      {
        status: 'N/A',
        count: naCount,
        totalValue: naTotals._sum.projectCost ?? 0,
        outstanding: 0,
      },
      ...paidGroups.map((g) => ({
        status: String(g.paymentStatus ?? 'PENDING'),
        count: g._count._all,
        totalValue: g._sum.projectCost ?? 0,
        outstanding:
          g.paymentStatus === PaymentStatus.PENDING || g.paymentStatus === PaymentStatus.PARTIAL
            ? (g._sum.balanceAmount ?? 0)
            : 0,
      })),
    ];

    // Availing Loan count: active pipeline (all stages except Lost) with availingLoan = true (for Quick Access tile)
    const [availingLoanCount, projectsByStatusRawFinance, pendingInstallation, subsidyCredited] = await Promise.all([
      prisma.project.count({
        where: { ...where, projectStatus: { not: ProjectStatus.LOST }, availingLoan: true },
      }),
      prisma.project.groupBy({
        by: ['projectStatus'],
        where,
        _count: { id: true },
      }),
      prisma.project.count({
        where: {
          ...where,
          projectStatus: { in: [ProjectStatus.CONFIRMED, ProjectStatus.UNDER_INSTALLATION] },
        },
      }),
      prisma.project.count({
        where: { ...where, projectStatus: ProjectStatus.COMPLETED_SUBSIDY_CREDITED },
      }),
    ]);
    let projectsByStatus = buildProjectsByStatus(
      projectsByStatusRawFinance.map((r) => ({ status: r.projectStatus, _count: r._count.id }))
    );
    const avgDaysByStatusFin = await computeAvgDaysByProjectStatus(where);
    projectsByStatus = mergeProjectsByStatusAvgDays(projectsByStatus, avgDaysByStatusFin);
    const operations = { pendingInstallation, subsidyCredited };

    // Batch: availingLoanByBank, profitability, projectValueByType, FY series (no cross-deps)
    const [
      availingLoanByBankRawFinance,
      profitabilityDataFinance,
      projectValueByTypeFinance,
      projectValueByFYFinance,
      profitByFYFinance,
    ] = await Promise.all([
      prisma.project.groupBy({
        by: ['financingBank'],
        where: { ...where, availingLoan: true, financingBank: { not: null } },
        _count: { id: true },
      }),
      prisma.project.findMany({
        where: { ...where, profitability: { not: null } },
        select: {
          id: true,
          profitability: true,
          customer: {
            select: { firstName: true, customerName: true },
          },
        },
        orderBy: { profitability: 'desc' },
        take: 50,
      }),
      prisma.project.groupBy({
        by: ['type'],
        where: getRevenueWhere(where),
        _sum: { projectCost: true },
        _count: { id: true },
      }),
      prisma.project.groupBy({
        by: ['year'],
        where: getRevenueWhere(where),
        _sum: { projectCost: true },
      }),
      prisma.project.groupBy({
        by: ['year'],
        where: { ...getRevenueWhere(where), grossProfit: { not: null } },
        _sum: { grossProfit: true },
      }),
    ]);
    const availingLoanByBank = buildAvailingLoanByBank(availingLoanByBankRawFinance);
    const wordCloudData = profitabilityDataFinance.map((p) => {
      const firstName = p.customer?.firstName?.trim();
      const text = firstName || p.customer?.customerName?.trim() || 'Unknown';
      return { text: text || 'Unknown', value: p.profitability || 0 };
    });

    // Get salesperson names for profit breakdown
    let profitBreakdown: Array<{
      salespersonId: string | null;
      salespersonName: string;
      totalProfit: number;
      projectCount: number;
    }> = [];
    if (profitBySalesperson.length > 0) {
      const salespersonIds = profitBySalesperson
        .map((p) => p.salespersonId)
        .filter((id): id is string => id !== null);
      const salespeople = await prisma.user.findMany({
        where: { id: { in: salespersonIds } },
        select: { id: true, name: true },
      });
      profitBreakdown = profitBySalesperson.map((p) => ({
        salespersonId: p.salespersonId,
        salespersonName: salespeople.find((s) => s.id === p.salespersonId)?.name || 'Unknown',
        totalProfit: p._sum.finalProfit || 0,
        projectCount: p._count.id,
      }));
    }

    // Project value by type and FY (projectValueByTypeFinance, projectValueByFYFinance, profitByFYFinance from batch above)
    const valueByType = projectValueByTypeFinance.map((item) => {
      let label = '';
      switch (item.type) {
        case 'RESIDENTIAL_SUBSIDY':
          label = 'Residential - Subsidy';
          break;
        case 'RESIDENTIAL_NON_SUBSIDY':
          label = 'Residential - Non Subsidy';
          break;
        case 'COMMERCIAL_INDUSTRIAL':
          label = 'Commercial Industrial';
          break;
        default:
          label = item.type;
      }
      return {
        type: item.type,
        label,
        value: item._sum.projectCost || 0,
        count: item._count.id,
      };
    });

    const totalValue = valueByType.reduce((sum, item) => sum + item.value, 0);
    const valueByTypeWithPercentage = valueByType.map((item) => ({
      ...item,
      percentage: totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0',
    }));

    const allFYsFinance = new Set([
      ...projectValueByFYFinance.map((item) => item.year),
      ...profitByFYFinance.map((item) => item.year),
    ]);

    let projectValueProfitByFY = Array.from(allFYsFinance)
      .sort()
      .map((fy) => ({
        fy,
        totalProjectValue: projectValueByFYFinance.find((item) => item.year === fy)?._sum.projectCost || 0,
        totalProfit: profitByFYFinance.find((item) => item.year === fy)?._sum.grossProfit || 0,
      }));

    projectValueProfitByFY = await appendPreviousFYToProjectValueProfitByFY(
      fyFilters,
      projectValueProfitByFY,
      {},
      'revenueProfitOnly'
    );

    let previousYearFinanceKpis: {
      totalProjectValue: number
      totalAmountReceived: number
      totalOutstanding: number
      totalProfit: number
      availingLoanCount: number
    } | null = null;
    if (fyFilters.length === 1) {
      const previousFY = getPreviousFY(fyFilters[0]!);
      if (previousFY) {
        const wherePrev = applyDateFilters(baseWhere, [previousFY], monthFilters, quarterFilters);
        const revenueWherePrev = getRevenueWhere(wherePrev);
        const [prevTV, prevRecv, prevOutstandingAgg, prevProfit, prevLoan] = await Promise.all([
          prisma.project.aggregate({
            where: revenueWherePrev,
            _sum: { projectCost: true },
          }),
          prisma.project.aggregate({
            where: wherePrev,
            _sum: { totalAmountReceived: true },
          }),
          prisma.project.aggregate({
            where: {
              ...wherePrev,
              projectCost: { gt: 0 },
              projectStatus: { notIn: earlyOrLostStatuses },
              paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
            },
            _sum: { balanceAmount: true },
          }),
          prisma.project.aggregate({
            where: { ...revenueWherePrev, grossProfit: { not: null } },
            _sum: { grossProfit: true },
          }),
          prisma.project.count({
            where: { ...wherePrev, projectStatus: { not: ProjectStatus.LOST }, availingLoan: true },
          }),
        ]);
        previousYearFinanceKpis = {
          totalProjectValue: prevTV._sum.projectCost ?? 0,
          totalAmountReceived: prevRecv._sum.totalAmountReceived ?? 0,
          totalOutstanding: prevOutstandingAgg._sum.balanceAmount ?? 0,
          totalProfit: prevProfit._sum.grossProfit ?? 0,
          availingLoanCount: prevLoan,
        };
      }
    }

    res.json({
      totalProjectValue: totalProjectValue._sum.projectCost || 0,
      totalAmountReceived: totalAmountReceived._sum.totalAmountReceived || 0,
      totalGrossProfit: totalGrossProfit._sum.grossProfit ?? 0,
      totalOutstanding: totalOutstanding, // Use the calculated totalOutstanding (only PENDING and PARTIAL)
      projectsByPaymentStatus, // Use the calculated effective payment status
      availingLoanCount,
      availingLoanByBank,
      projectsByStatus,
      operations,
      wordCloudData,
      profitByProject,
      profitBySalesperson: profitBreakdown,
      projectValueByType: valueByTypeWithPercentage,
      projectValueProfitByFY,
      previousYearFinanceKpis,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Management Dashboard (aggregated view)
router.get('/management', authenticate, async (req: Request, res) => {
  try {
    const fyFilters = req.query.fy ? (Array.isArray(req.query.fy) ? req.query.fy : [req.query.fy]) as string[] : [];
    const monthFilters = req.query.month ? (Array.isArray(req.query.month) ? req.query.month : [req.query.month]) as string[] : [];
    const quarterFilters = req.query.quarter ? (Array.isArray(req.query.quarter) ? req.query.quarter : [req.query.quarter]) as string[] : [];

    const baseWhere: any = {};
    const where = applyDateFilters(baseWhere, fyFilters, monthFilters, quarterFilters);

    const [sales, operations, finance] = await Promise.all([
      // Sales metrics
      (async () => {
        const [totalLeads, totalCapacity, totalRevenue] = await Promise.all([
          prisma.project.count({ where: { ...where, projectStatus: ProjectStatus.LEAD } }),
          (async () => {
            const capacityWhere = getRevenueWhere(where);
            capacityWhere.systemCapacity = { not: null };
            return await prisma.project.aggregate({
              _sum: { systemCapacity: true },
              where: capacityWhere, // Use same filter as Total Revenue (only confirmed/completed projects)
            });
          })(),
          prisma.project.aggregate({
            _sum: { projectCost: true },
            where: getRevenueWhere(where), // Use getRevenueWhere to exclude LOST and only include confirmed/completed projects
          }),
        ]);
        return {
          totalLeads,
          totalCapacity: totalCapacity._sum.systemCapacity || 0,
          totalRevenue: totalRevenue._sum.projectCost || 0,
        };
      })(),
      // Operations metrics
      (async () => {
        const [pendingInstallation, subsidyCredited, pendingSubsidy] = await Promise.all([
          prisma.project.count({
            where: {
              ...where,
              projectStatus: ProjectStatus.UNDER_INSTALLATION,
            },
          }),
          prisma.project.count({
            where: { ...where, projectStatus: ProjectStatus.COMPLETED_SUBSIDY_CREDITED },
          }),
          prisma.project.count({
            where: { ...where, projectStatus: ProjectStatus.SUBMITTED_FOR_SUBSIDY },
          }),
        ]);
        return {
          pendingInstallation,
          subsidyCredited,
          pendingSubsidy,
        };
      })(),
      // Finance metrics
      (async () => {
        const [totalValue, totalReceived, totalOutstanding, totalProfit] = await Promise.all([
          prisma.project.aggregate({
            _sum: { projectCost: true },
            where: getRevenueWhere(where),
          }),
          prisma.project.aggregate({
            _sum: { totalAmountReceived: true },
            where,
          }),
          prisma.project.aggregate({
            _sum: { balanceAmount: true },
            where,
          }),
          prisma.project.aggregate({
            _sum: { grossProfit: true },
            where: { ...where, grossProfit: { not: null } },
          }),
        ]);
        return {
          totalValue: totalValue._sum.projectCost || 0,
          totalReceived: totalReceived._sum.totalAmountReceived || 0,
          totalOutstanding: totalOutstanding._sum.balanceAmount || 0,
          totalProfit: totalProfit._sum.grossProfit || 0,
        };
      })(),
    ]);

    // Where clauses for FY series and pipeline (used by batch below)
    const whereFYSeriesMgmt = getRevenueWhere(where);
    const pipelineWhereBaseMgmt = {
      projectCost: { not: null },
      projectStatus: { not: ProjectStatus.LOST },
    };
    const pipelineWhereFYMgmt = { ...where, ...pipelineWhereBaseMgmt };
    const pipelineWhereForTilesMgmt = { ...where, ...pipelineWhereBaseMgmt };

    // Batch 2: all queries that depend only on where (no cross-dependencies)
    const [
      projectValueByType,
      revenueBySalespersonMgmt,
      pipelineByLeadSourceRaw,
      pipelineByTypeRaw,
      projectValueByFY,
      profitByFY,
      capacityByFY,
      pipelineByFY,
      totalPipelineResult,
      pipelineCapacityResult,
      projectsByStatusRawMgmt,
      availingLoanCount,
      profitabilityData,
      availingLoanByBankRawMgmt,
    ] = await Promise.all([
      prisma.project.groupBy({
        by: ['type'],
        where: getRevenueWhere(where),
        _sum: { projectCost: true },
        _count: { id: true },
      }),
      prisma.project.groupBy({
        by: ['salespersonId'],
        where: getRevenueWhere({ ...where, salespersonId: { not: null } }),
        _sum: { projectCost: true },
        _count: { id: true },
      }),
      prisma.project.groupBy({
        by: ['leadSource'],
        where: { ...getPipelineWhere(where), leadSource: { not: null } },
        _sum: { projectCost: true },
        _count: { id: true },
      }),
      prisma.project.groupBy({
        by: ['type'],
        where: getPipelineWhere(where),
        _sum: { projectCost: true },
        _count: { id: true },
      }),
      prisma.project.groupBy({
        by: ['year'],
        where: whereFYSeriesMgmt,
        _sum: { projectCost: true },
      }),
      prisma.project.groupBy({
        by: ['year'],
        where: { ...whereFYSeriesMgmt, grossProfit: { not: null } },
        _sum: { grossProfit: true },
      }),
      prisma.project.groupBy({
        by: ['year'],
        where: { ...whereFYSeriesMgmt, systemCapacity: { not: null } },
        _sum: { systemCapacity: true },
      }),
      prisma.project.groupBy({
        by: ['year'],
        where: pipelineWhereFYMgmt,
        _sum: { projectCost: true },
      }),
      prisma.project.aggregate({
        where: pipelineWhereForTilesMgmt,
        _sum: { projectCost: true },
      }),
      prisma.project.aggregate({
        where: { ...where, projectStatus: { not: ProjectStatus.LOST }, systemCapacity: { not: null } },
        _sum: { systemCapacity: true },
      }),
      prisma.project.groupBy({
        by: ['projectStatus'],
        where,
        _count: { id: true },
      }),
      prisma.project.count({
        where: { ...where, projectStatus: { not: ProjectStatus.LOST }, availingLoan: true },
      }),
      prisma.project.findMany({
        where: { ...where, profitability: { not: null } },
        include: {
          customer: {
            select: { firstName: true, customerName: true },
          },
        },
        orderBy: { profitability: 'desc' },
        take: 50,
      }),
      prisma.project.groupBy({
        by: ['financingBank'],
        where: { ...where, availingLoan: true, financingBank: { not: null } },
        _count: { id: true },
      }),
    ]);

    const totalPipeline = totalPipelineResult;

    // Format the data for the chart
    const valueByType = projectValueByType.map((item) => {
      let label = '';
      switch (item.type) {
        case 'RESIDENTIAL_SUBSIDY':
          label = 'Residential - Subsidy';
          break;
        case 'RESIDENTIAL_NON_SUBSIDY':
          label = 'Residential - Non Subsidy';
          break;
        case 'COMMERCIAL_INDUSTRIAL':
          label = 'Commercial Industrial';
          break;
        default:
          label = item.type;
      }
      return {
        type: item.type,
        label,
        value: item._sum.projectCost || 0,
        count: item._count.id,
      };
    });

    // Calculate total for percentage calculation
    const totalValue = valueByType.reduce((sum, item) => sum + item.value, 0);

    // Add percentage to each item
    const valueByTypeWithPercentage = valueByType.map((item) => ({
      ...item,
      percentage: totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0',
    }));

    // Revenue by salesperson (revenueBySalespersonMgmt from batch above)
    let revenueBySalesperson: Array<{ salespersonId: string | null; salespersonName: string; revenue: number; projectCount: number }> = [];
    if (revenueBySalespersonMgmt.length > 0) {
      const salespersonIds = revenueBySalespersonMgmt
        .map((r) => r.salespersonId)
        .filter((id): id is string => id !== null);
      const salespeopleMgmt = await prisma.user.findMany({
        where: { id: { in: salespersonIds } },
        select: { id: true, name: true },
      });
      revenueBySalesperson = revenueBySalespersonMgmt.map((r) => ({
        salespersonId: r.salespersonId,
        salespersonName: salespeopleMgmt.find((s) => s.id === r.salespersonId)?.name || 'Unknown',
        revenue: r._sum.projectCost || 0,
        projectCount: r._count.id,
      }));
    }

    // Pipeline by lead source (pipelineByLeadSourceRaw from batch above)
    const pipelineByLeadSource = pipelineByLeadSourceRaw.map((item) => {
      let label = '';
      switch (item.leadSource) {
        case LeadSource.WEBSITE: label = 'Website'; break;
        case LeadSource.REFERRAL: label = 'Referral'; break;
        case LeadSource.GOOGLE: label = 'Google'; break;
        case LeadSource.CHANNEL_PARTNER: label = 'Channel Partner'; break;
        case LeadSource.DIGITAL_MARKETING: label = 'Digital Marketing'; break;
        case LeadSource.SALES: label = 'Sales'; break;
        case LeadSource.MANAGEMENT_CONNECT: label = 'Management Connect'; break;
        case LeadSource.OTHER: label = 'Other'; break;
        default: label = item.leadSource || 'Unknown';
      }
      return {
        leadSource: item.leadSource,
        leadSourceLabel: label,
        pipeline: item._sum.projectCost || 0,
        projectCount: item._count.id,
      };
    });
    pipelineByLeadSource.sort((a, b) => b.pipeline - a.pipeline);

    // Pipeline by customer segment (pipelineByTypeRaw from batch above)
    const pipelineByType = pipelineByTypeRaw.map((item) => {
      let label = '';
      switch (item.type) {
        case 'RESIDENTIAL_SUBSIDY': label = 'Residential - Subsidy'; break;
        case 'RESIDENTIAL_NON_SUBSIDY': label = 'Residential - Non Subsidy'; break;
        case 'COMMERCIAL_INDUSTRIAL': label = 'Commercial Industrial'; break;
        default: label = item.type;
      }
      return { type: item.type, label, value: item._sum.projectCost || 0, count: item._count.id };
    });
    const totalPipelineType = pipelineByType.reduce((sum, item) => sum + item.value, 0);
    const pipelineByTypeWithPercentage = pipelineByType.map((item) => ({
      ...item,
      percentage: totalPipelineType > 0 ? ((item.value / totalPipelineType) * 100).toFixed(1) : '0',
    }));

    // Combine the data by financial year (projectValueByFY, profitByFY, capacityByFY, pipelineByFY from batch above)
    const allFYs = new Set([
      ...projectValueByFY.map((item) => item.year),
      ...profitByFY.map((item) => item.year),
      ...capacityByFY.map((item) => item.year),
      ...pipelineByFY.map((item) => item.year),
    ]);

    let projectValueProfitByFY: ProjectValueProfitFYRow[] = Array.from(allFYs)
      .sort()
      .map((fy) => ({
        fy,
        totalProjectValue: projectValueByFY.find((item) => item.year === fy)?._sum.projectCost || 0,
        totalProfit: profitByFY.find((item) => item.year === fy)?._sum.grossProfit || 0,
        totalCapacity: capacityByFY.find((item) => item.year === fy)?._sum.systemCapacity || 0,
        totalPipeline: pipelineByFY.find((item) => item.year === fy)?._sum.projectCost || 0,
      }));

    projectValueProfitByFY = await appendPreviousFYToProjectValueProfitByFY(
      fyFilters,
      projectValueProfitByFY,
      {},
      'full'
    );

    // Projects by Stage / Execution Status (totalPipeline, projectsByStatusRawMgmt from batch above)
    let projectsByStatus = buildProjectsByStatus(
      projectsByStatusRawMgmt.map((r) => ({ status: r.projectStatus, _count: r._count.id }))
    );
    const avgDaysByStatusMgmt = await computeAvgDaysByProjectStatus(where);
    projectsByStatus = mergeProjectsByStatusAvgDays(projectsByStatus, avgDaysByStatusMgmt);

    // Open Deals = Lead, Site Survey, Proposal (for Management/Admin tile)
    const openDealsStatuses: ProjectStatus[] = [
      ProjectStatus.LEAD,
      ProjectStatus.SITE_SURVEY,
      ProjectStatus.PROPOSAL,
    ];
    const openDealsCount =
      projectsByStatusRawMgmt
        ?.filter((p) => openDealsStatuses.includes(p.projectStatus as ProjectStatus))
        .reduce((sum, p) => sum + (p._count?.id || 0), 0) || 0;

    const projectsByPaymentStatus = await buildProjectsByPaymentStatus(where as Prisma.ProjectWhereInput);

    // Availing Loan count and profitabilityData from batch above

    // Map to word cloud data - use firstName (required), profitability from Sales & Commercial section
    const wordCloudData = profitabilityData.map((p) => {
      // First Name from Customer (fallback to customerName if firstName is empty)
      const firstName = p.customer?.firstName?.trim();
      const text = firstName || p.customer?.customerName?.trim() || 'Unknown';
      
      // Profitability from Sales & Commercial section
      const profitability = p.profitability || 0;
      
      return {
        text: text || 'Unknown',
        value: profitability,
      };
    });

    // Availing Loan by Bank (availingLoanByBankRawMgmt from batch above)
    const availingLoanByBank = buildAvailingLoanByBank(availingLoanByBankRawMgmt);

    // When one FY and quarter/month selected: same period in previous year for YoY
    let previousYearSamePeriod: { totalCapacity: number; totalPipeline: number; totalRevenue: number; totalProfit: number } | null = null;
    if (fyFilters.length === 1 && (quarterFilters.length > 0 || monthFilters.length > 0)) {
      const previousFY = getPreviousFY(fyFilters[0]);
      if (previousFY) {
        const baseWhereMgmt: any = {};
        const wherePrev = applyDateFilters(baseWhereMgmt, [previousFY], monthFilters, quarterFilters);
        const revenueWherePrev = getRevenueWhere(wherePrev);
        const pipelineWherePrev = {
          ...wherePrev,
          projectCost: { not: null },
          projectStatus: { not: ProjectStatus.LOST },
          OR: [
            { projectStage: null },
            { projectStage: ProjectStage.SURVEY },
            { projectStage: ProjectStage.PROPOSAL },
          ],
        };
        const [prevCapacity, prevRevenue, prevProfit, prevPipeline] = await Promise.all([
          prisma.project.aggregate({
            where: { ...revenueWherePrev, systemCapacity: { not: null } },
            _sum: { systemCapacity: true },
          }),
          prisma.project.aggregate({
            where: revenueWherePrev,
            _sum: { projectCost: true },
          }),
          prisma.project.aggregate({
            where: { ...revenueWherePrev, grossProfit: { not: null } },
            _sum: { grossProfit: true },
          }),
          prisma.project.aggregate({
            where: pipelineWherePrev,
            _sum: { projectCost: true },
          }),
        ]);
        previousYearSamePeriod = {
          totalCapacity: prevCapacity._sum.systemCapacity ?? 0,
          totalRevenue: prevRevenue._sum.projectCost ?? 0,
          totalProfit: prevProfit._sum.grossProfit ?? 0,
          totalPipeline: prevPipeline._sum.projectCost ?? 0,
        };
      }
    }

    const zenithExplorerProjects = await loadZenithExplorerProjects(where as Prisma.ProjectWhereInput);

    res.json({
      sales,
      operations,
      finance,
      totalPipeline: totalPipeline._sum.projectCost || 0,
      pipelineCapacityKW: pipelineCapacityResult._sum.systemCapacity || 0,
      previousYearSamePeriod,
      projectValueByType: valueByTypeWithPercentage,
      projectValueProfitByFY,
      wordCloudData,
      projectsByPaymentStatus,
      availingLoanCount,
      availingLoanByBank,
      revenueBySalesperson,
      pipeline: { atRisk: openDealsCount },
      pipelineByLeadSource,
      pipelineByType: pipelineByTypeWithPercentage,
      projectsByStatus,
      zenithExplorerProjects,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Proposal Engine status dashboard summary
// Accessible only to Sales (own projects), Management, and Admin.
router.get('/proposal-engine-status', authenticate, async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;
    const allowedRoles: UserRole[] = [UserRole.SALES, UserRole.MANAGEMENT, UserRole.ADMIN];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({
        error: 'Access denied. This dashboard is available only to Sales, Management, and Admin roles.',
      });
    }

    const fyFilters = req.query.fy ? (Array.isArray(req.query.fy) ? req.query.fy : [req.query.fy]) as string[] : [];
    const monthFilters = req.query.month ? (Array.isArray(req.query.month) ? req.query.month : [req.query.month]) as string[] : [];
    const quarterFilters = req.query.quarter ? (Array.isArray(req.query.quarter) ? req.query.quarter : [req.query.quarter]) as string[] : [];

    const baseWhere: any = {};
    if (role === UserRole.SALES) {
      baseWhere.salespersonId = userId;
    }
    const where = applyDateFilters(baseWhere, fyFilters, monthFilters, quarterFilters);

    const projects = await prisma.project.findMany({
      where,
      select: {
        id: true,
        projectCost: true,
        projectStatus: true,
      },
    });

    if (projects.length === 0) {
      return res.json({
        rows: [
          { key: 'proposal-ready', label: 'PE Ready', count: 0, crmOrderValue: 0, peOrderValueExGst: 0 },
          { key: 'draft', label: 'PE Draft', count: 0, crmOrderValue: 0, peOrderValueExGst: 0 },
          { key: 'not-started', label: 'PE Not Yet Created', count: 0, crmOrderValue: 0, peOrderValueExGst: 0 },
          { key: 'rest', label: 'Rest', count: 0, crmOrderValue: 0, peOrderValueExGst: 0 },
        ],
      });
    }

    const projectIds = projects.map((p) => p.id);
    const crmOrderValueByProjectId = new Map(
      projects.map((p) => [p.id, toPositiveNumber(p.projectCost)])
    );

    const [selections, costings, boms, rois, proposals, costingSheets] = await Promise.all([
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
      prisma.pECostingSheet.findMany({
        where: { projectId: { in: projectIds } },
        select: { projectId: true, items: true, marginPct: true, grandTotal: true, showGst: true, savedAt: true },
        orderBy: { savedAt: 'desc' },
      }),
    ]);

    const selectedSet = new Set(selections.map((s) => s.projectId));
    const hasCosting = new Set(costings.map((r) => r.projectId));
    const hasBom = new Set(boms.map((r) => r.projectId));
    const hasRoi = new Set(rois.map((r) => r.projectId));
    const hasProposal = new Set(proposals.map((r) => r.projectId));

    const latestCostingByProjectId = new Map<string, typeof costingSheets[number]>();
    for (const row of costingSheets) {
      if (!latestCostingByProjectId.has(row.projectId)) {
        latestCostingByProjectId.set(row.projectId, row);
      }
    }

    const metrics: Record<PeBucketKey, { count: number; crmOrderValue: number; peOrderValueExGst: number }> = {
      'proposal-ready': { count: 0, crmOrderValue: 0, peOrderValueExGst: 0 },
      draft: { count: 0, crmOrderValue: 0, peOrderValueExGst: 0 },
      'not-started': { count: 0, crmOrderValue: 0, peOrderValueExGst: 0 },
      rest: { count: 0, crmOrderValue: 0, peOrderValueExGst: 0 },
    };

    for (const project of projects) {
      const projectId = project.id;
      let bucket: PeBucketKey | null = null;

      if (selectedSet.has(projectId)) {
        const hasAny =
          hasCosting.has(projectId) ||
          hasBom.has(projectId) ||
          hasRoi.has(projectId) ||
          hasProposal.has(projectId);
        const allFour =
          hasCosting.has(projectId) &&
          hasBom.has(projectId) &&
          hasRoi.has(projectId) &&
          hasProposal.has(projectId);

        bucket = allFour ? 'proposal-ready' : hasAny ? 'draft' : 'not-started';
      } else {
        const isEligibleForProposalCreation =
          project.projectStatus === ProjectStatus.PROPOSAL ||
          project.projectStatus === ProjectStatus.CONFIRMED;
        // "Rest" should include only eligible candidates for proposal creation.
        bucket = isEligibleForProposalCreation ? 'rest' : null;
      }

      if (!bucket) continue;
      metrics[bucket].count += 1;
      metrics[bucket].crmOrderValue += crmOrderValueByProjectId.get(projectId) ?? 0;

      const latestCosting = latestCostingByProjectId.get(projectId);
      if (latestCosting && bucket !== 'rest') {
        metrics[bucket].peOrderValueExGst += computePeOrderValueExGstFromCosting({
          items: latestCosting.items,
          marginPct: latestCosting.marginPct,
          grandTotal: latestCosting.grandTotal,
          showGst: latestCosting.showGst,
        });
      }
    }

    return res.json({
      rows: [
        { key: 'proposal-ready', label: 'PE Ready', ...metrics['proposal-ready'] },
        { key: 'draft', label: 'PE Draft', ...metrics.draft },
        { key: 'not-started', label: 'PE Not Yet Created', ...metrics['not-started'] },
        { key: 'rest', label: 'Rest', ...metrics.rest },
      ],
    });
  } catch (error: any) {
    console.error('[PE dashboard] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch Proposal Engine dashboard data' });
  }
});

// Revenue by Lead Source Analytics Endpoint
// Accessible to ADMIN, MANAGEMENT, SALES, OPERATIONS, and FINANCE
router.get('/revenue-by-lead-source', authenticate, async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;

    const allowedRoles = [UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Access denied. This endpoint is only available to Admin, Management, Sales, Operations, and Finance roles.' });
    }

    // Parse query parameters for FY, Quarter and Month filters (dashboard tiles only)
    const fyFilters = req.query.fy ? (Array.isArray(req.query.fy) ? req.query.fy : [req.query.fy]) as string[] : [];
    const monthFilters = req.query.month ? (Array.isArray(req.query.month) ? req.query.month : [req.query.month]) as string[] : [];
    const quarterFilters = req.query.quarter ? (Array.isArray(req.query.quarter) ? req.query.quarter : [req.query.quarter]) as string[] : [];

    // Build base where clause
    const baseWhere: any = {};
    
    // For SALES users, filter by their salespersonId
    if (role === UserRole.SALES) {
      baseWhere.salespersonId = userId;
    }

    // Apply FY, quarter and month filters using existing helper function
    const where = applyDateFilters(baseWhere, fyFilters, monthFilters, quarterFilters);

    // Get revenue filter: Only confirmed/completed projects
    // Statuses: CONFIRMED, UNDER_INSTALLATION, COMPLETED, COMPLETED_SUBSIDY_CREDITED
    const revenueWhere = getRevenueWhere(where);

    // Group by leadSource and sum projectCost (revenue)
    // Using Prisma groupBy for safe aggregation
    const revenueByLeadSource = await prisma.project.groupBy({
      by: ['leadSource'],
      where: {
        ...revenueWhere,
        leadSource: { not: null }, // Exclude projects without lead source
      },
      _sum: {
        projectCost: true, // Sum of orderValue (revenue)
      },
      _count: {
        id: true, // Count of projects per lead source
      },
    });

    // Format response data with readable lead source labels
    const formattedData = revenueByLeadSource.map((item) => {
      let label = '';
      switch (item.leadSource) {
        case LeadSource.WEBSITE:
          label = 'Website';
          break;
        case LeadSource.REFERRAL:
          label = 'Referral';
          break;
        case LeadSource.GOOGLE:
          label = 'Google';
          break;
        case LeadSource.CHANNEL_PARTNER:
          label = 'Channel Partner';
          break;
        case LeadSource.DIGITAL_MARKETING:
          label = 'Digital Marketing';
          break;
        case LeadSource.SALES:
          label = 'Sales';
          break;
        case LeadSource.MANAGEMENT_CONNECT:
          label = 'Management Connect';
          break;
        case LeadSource.OTHER:
          label = 'Other';
          break;
        default:
          label = item.leadSource || 'Unknown';
      }

      return {
        leadSource: item.leadSource,
        leadSourceLabel: label,
        revenue: item._sum.projectCost || 0,
        projectCount: item._count.id,
      };
    });

    // Sort by revenue descending
    formattedData.sort((a, b) => b.revenue - a.revenue);

    res.json({
      revenueByLeadSource: formattedData,
      totalRevenue: formattedData.reduce((sum, item) => sum + item.revenue, 0),
      totalProjects: formattedData.reduce((sum, item) => sum + item.projectCount, 0),
    });
  } catch (error: any) {
    console.error('[Revenue by Lead Source API] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch revenue by lead source' });
  }
});

const ZENITH_PIPELINE_STATUSES: ProjectStatus[] = [
  ProjectStatus.LEAD,
  ProjectStatus.SITE_SURVEY,
  ProjectStatus.PROPOSAL,
  ProjectStatus.CONFIRMED,
];

const ZENITH_FINANCE_EARLY_OR_LOST: ProjectStatus[] = [
  ProjectStatus.LEAD,
  ProjectStatus.SITE_SURVEY,
  ProjectStatus.PROPOSAL,
  ProjectStatus.LOST,
];

/** Role-specific “Your Focus” data for Zenith (KPI strip → funnel). */
router.get('/zenith-focus', authenticate, async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;
    if (!role || !userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fyFilters = req.query.fy ? (Array.isArray(req.query.fy) ? req.query.fy : [req.query.fy]) as string[] : [];
    const monthFilters = req.query.month
      ? (Array.isArray(req.query.month) ? req.query.month : [req.query.month]) as string[]
      : [];
    const quarterFilters = req.query.quarter
      ? (Array.isArray(req.query.quarter) ? req.query.quarter : [req.query.quarter]) as string[]
      : [];

    const baseWhere: any = {};
    const where = applyDateFilters(baseWhere, fyFilters, monthFilters, quarterFilters);

    const buildSalesPipeline = async (scope: 'self' | 'all') => {
      const w: any = {
        ...where,
        projectStatus: { in: ZENITH_PIPELINE_STATUSES },
      };
      if (scope === 'self') w.salespersonId = userId;

      const projects = await prisma.project.findMany({
        where: w,
        select: {
          id: true,
          projectStatus: true,
          projectCost: true,
          createdAt: true,
          updatedAt: true,
          expectedCommissioningDate: true,
          salespersonId: true,
          customer: { select: { customerName: true } },
          projectRemarks: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
        },
        orderBy: { updatedAt: 'asc' },
        take: 80,
      });

      const now = Date.now();
      const rows = projects.map((p) => {
        const remarkAt = p.projectRemarks[0]?.createdAt?.getTime() ?? 0;
        const lastTs = Math.max(p.updatedAt.getTime(), remarkAt);
        const daysSinceActivity = Math.floor((now - lastTs) / 86400000);
        return {
          projectId: p.id,
          customerName: p.customer?.customerName?.trim() || '—',
          stage: PROJECT_STATUS_LABELS[p.projectStatus] || p.projectStatus,
          dealValue: p.projectCost ?? 0,
          daysSinceActivity,
          expectedCloseDate: p.expectedCommissioningDate?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
          salespersonId: p.salespersonId,
        };
      });
      const followUpNeeded = rows.filter((r) => r.daysSinceActivity > 7).length;
      return { rows, followUpNeeded };
    };

    const buildFinanceRadar = async () => {
      const receivingWhere: any = {
        ...where,
        projectCost: { gt: 0 },
        projectStatus: { notIn: ZENITH_FINANCE_EARLY_OR_LOST },
      };

      const [outstandingAgg, settled, subsidyPendingCount, overdueList, collectedAgg, subsidyValAgg] =
        await Promise.all([
          prisma.project.aggregate({
            where: {
              ...receivingWhere,
              paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
            },
            _sum: { balanceAmount: true },
          }),
          prisma.project.findMany({
            where: {
              ...where,
              balanceAmount: 0,
              totalAmountReceived: { gt: 0 },
              confirmationDate: { not: null },
              lastPaymentDate: { not: null },
            },
            select: { confirmationDate: true, lastPaymentDate: true },
            take: 500,
          }),
          prisma.project.count({
            where: { ...where, projectStatus: ProjectStatus.SUBMITTED_FOR_SUBSIDY },
          }),
          prisma.project.findMany({
            where: {
              ...receivingWhere,
              paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
              balanceAmount: { gt: 0 },
              confirmationDate: { not: null },
            },
            select: {
              id: true,
              balanceAmount: true,
              confirmationDate: true,
              totalAmountReceived: true,
              projectCost: true,
              projectStatus: true,
              customer: { select: { customerName: true, phone: true, email: true } },
            },
            orderBy: { balanceAmount: 'desc' },
            take: 800,
          }),
          prisma.project.aggregate({
            where: getRevenueWhere(where),
            _sum: { totalAmountReceived: true },
          }),
          prisma.project.aggregate({
            where: { ...where, projectStatus: ProjectStatus.SUBMITTED_FOR_SUBSIDY },
            _sum: { projectCost: true },
          }),
        ]);

      let sumDays = 0;
      let nCol = 0;
      for (const p of settled) {
        if (!p.confirmationDate || !p.lastPaymentDate) continue;
        const d = (p.lastPaymentDate.getTime() - p.confirmationDate.getTime()) / 86400000;
        if (d >= 0 && d < 4000) {
          sumDays += d;
          nCol++;
        }
      }
      const avgCollectionDays = nCol > 0 ? Math.round((sumDays / nCol) * 10) / 10 : null;
      const totalOutstanding = outstandingAgg._sum.balanceAmount ?? 0;
      const collectedTotal = collectedAgg._sum.totalAmountReceived ?? 0;
      const subsidyPendingValue = subsidyValAgg._sum.projectCost ?? 0;

      const overdueTop5 = overdueList.map((p) => {
        const conf = p.confirmationDate!;
        const daysOverdue = Math.max(0, Math.floor((Date.now() - conf.getTime()) / 86400000));
        return {
          projectId: p.id,
          customerName: p.customer?.customerName?.trim() || '—',
          amount: p.balanceAmount ?? 0,
          dueSince: conf.toISOString(),
          daysOverdue,
          customerPhone: p.customer?.phone?.trim() || null,
          customerEmail: p.customer?.email?.trim() || null,
          orderValue: p.projectCost ?? 0,
          amountPaid: p.totalAmountReceived ?? 0,
          projectStatus: p.projectStatus,
        };
      });

      const ageingBucketsMap = {
        '0-30': { id: '0-30' as const, label: '0–30d', count: 0, amount: 0 },
        '31-60': { id: '31-60' as const, label: '31–60d', count: 0, amount: 0 },
        '61-90': { id: '61-90' as const, label: '61–90d', count: 0, amount: 0 },
        '90+': { id: '90+' as const, label: '90d+', count: 0, amount: 0 },
      };
      const nowMs = Date.now();
      for (const p of overdueList) {
        const conf = p.confirmationDate;
        if (!conf) continue;
        const days = Math.max(0, Math.floor((nowMs - conf.getTime()) / 86400000));
        const amt = p.balanceAmount ?? 0;
        if (days <= 30) {
          ageingBucketsMap['0-30'].count += 1;
          ageingBucketsMap['0-30'].amount += amt;
        } else if (days <= 60) {
          ageingBucketsMap['31-60'].count += 1;
          ageingBucketsMap['31-60'].amount += amt;
        } else if (days <= 90) {
          ageingBucketsMap['61-90'].count += 1;
          ageingBucketsMap['61-90'].amount += amt;
        } else {
          ageingBucketsMap['90+'].count += 1;
          ageingBucketsMap['90+'].amount += amt;
        }
      }
      const ageingBuckets = Object.values(ageingBucketsMap);

      const monthlySlots: {
        label: string;
        year: number;
        month: number;
        collected: number;
        outstanding: number;
      }[] = [];
      const anchor = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
        monthlySlots.push({
          label: d.toLocaleString('en-IN', { month: 'short' }),
          year: d.getFullYear(),
          month: d.getMonth(),
          collected: 0,
          outstanding: 0,
        });
      }
      for (const p of overdueList) {
        const conf = p.confirmationDate;
        if (!conf) continue;
        const idx = monthlySlots.findIndex((m) => m.month === conf.getMonth() && m.year === conf.getFullYear());
        if (idx === -1) continue;
        monthlySlots[idx].collected += p.totalAmountReceived ?? 0;
        monthlySlots[idx].outstanding += p.balanceAmount ?? 0;
      }
      const monthlyCollections = monthlySlots.map((m) => ({
        label: m.label,
        collected: Math.round(m.collected),
        outstanding: Math.round(m.outstanding),
      }));

      return {
        totalOutstanding,
        avgCollectionDays,
        subsidyPendingCount,
        overdueTop5,
        ageingBuckets,
        monthlyCollections,
        donut: {
          collected: collectedTotal,
          outstanding: totalOutstanding,
          subsidyPending: subsidyPendingValue,
        },
      };
    };

    const buildInstallPulse = async () => {
      const projects = await prisma.project.findMany({
        where: { ...where, projectStatus: ProjectStatus.UNDER_INSTALLATION },
        select: {
          id: true,
          systemCapacity: true,
          expectedCommissioningDate: true,
          stageEnteredAt: true,
          confirmationDate: true,
          installationCompletionDate: true,
          projectStatus: true,
          remarks: true,
          internalNotes: true,
          customer: { select: { customerName: true } },
          salesperson: { select: { name: true } },
          installations: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
            select: {
              startDate: true,
              completionDate: true,
              status: true,
            },
          },
        },
        take: 100,
      });

      const now = Date.now();
      const rows = projects.map((p) => {
        const inst = p.installations[0];
        /** Prefer Installation row; else dates many teams only set on the project. */
        const inferredStart = inst?.startDate ?? p.stageEnteredAt ?? p.confirmationDate ?? null;
        const salespersonName = p.salesperson?.name?.trim() || '—';
        const startDate = inferredStart?.toISOString() ?? null;
        /**
         * Expected column: primary field is expectedCommissioningDate. Many projects only have
         * installationCompletionDate filled (Project Lifecycle — no separate commissioning input was exposed).
         */
        const expectedEnd = p.expectedCommissioningDate ?? p.installationCompletionDate ?? null;
        const expected = expectedEnd?.toISOString() ?? null;

        const installCompleted =
          !!inst?.completionDate ||
          inst?.status === InstallationStatus.COMPLETED ||
          !!p.installationCompletionDate;

        const remarksTrim = (p.remarks ?? '').trim();
        const internalTrim = (p.internalNotes ?? '').trim();
        const lastNote = remarksTrim || internalTrim || null;

        const overdue = !!expectedEnd && now > expectedEnd.getTime();

        return {
          projectId: p.id,
          customerName: p.customer?.customerName?.trim() || '—',
          kW: p.systemCapacity ?? null,
          salespersonName,
          startDate,
          expectedCompletion: expected,
          /** UI recomputes progress; kept for sort fallback only */
          percentComplete: installCompleted ? 100 : null,
          overdue,
          projectStatus: p.projectStatus,
          lastNote,
        };
      });

      let sumAge = 0;
      let nAge = 0;
      for (const p of projects) {
        const inst = p.installations[0];
        const inferredStart = inst?.startDate ?? p.stageEnteredAt ?? p.confirmationDate ?? null;
        if (inferredStart) {
          sumAge += (now - inferredStart.getTime()) / 86400000;
          nAge++;
        }
      }
      const avgInstallationDays = nAge > 0 ? Math.round((sumAge / nAge) * 10) / 10 : null;
      const delayedCount = rows.filter((r) => r.overdue).length;

      return { rows, avgInstallationDays, delayedCount };
    };

    if (role === UserRole.SALES) {
      const salesPipeline = await buildSalesPipeline('self');
      return res.json({ focusKind: 'SALES', salesPipeline });
    }

    if (role === UserRole.FINANCE) {
      const financeRadar = await buildFinanceRadar();
      return res.json({ focusKind: 'FINANCE', financeRadar });
    }

    if (role === UserRole.OPERATIONS) {
      const installPulse = await buildInstallPulse();
      return res.json({ focusKind: 'OPERATIONS', installPulse });
    }

    if (role === UserRole.MANAGEMENT || role === UserRole.ADMIN) {
      const [salesPipeline, financeRadar, installPulse] = await Promise.all([
        buildSalesPipeline('all'),
        buildFinanceRadar(),
        buildInstallPulse(),
      ]);
      return res.json({
        focusKind: 'MANAGEMENT',
        salesPipeline,
        financeRadar,
        installPulse,
      });
    }

    return res.json({ focusKind: 'NONE' });
  } catch (error: any) {
    console.error('[zenith-focus]', error);
    res.status(500).json({ error: error.message || 'Failed to load Zenith focus' });
  }
});

export default router;
