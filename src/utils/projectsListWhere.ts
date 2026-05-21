import type { ParsedQs } from 'qs';
import { query } from 'express-validator';
import {
  ProjectStatus,
  ProjectType,
  ProjectServiceType,
  ProjectStage,
  UserRole,
  LeadSource,
  SupportTicketStatus,
} from '@prisma/client';
import { buildProjectsListCustomerTypeWhere } from './customerTypeCharts';

export type ProjectsListFilterInput = {
  statusArray: string[];
  typeArray: string[];
  customerTypeArray: string[];
  projectServiceTypeArray: string[];
  salespersonIdArray: string[];
  leadSourceArray: string[];
  supportTicketStatusArray: string[];
  paymentStatusArray: string[];
  fyArray: string[];
  quarterArray: string[];
  monthArray: string[];
  fyFilters: string[];
  financingBankArray: string[];
  search: string | null;
  hasDocumentsActive: boolean;
  availingLoanActive: boolean;
  peBucket: string | null;
  zenithClosedFrom: string | null;
  zenithClosedTo: string | null;
  salespersonUnassigned: boolean;
  leadSourceIsNull: boolean;
  zenithSlice: string | null;
  zenithFyProfit: boolean;
  panelBrand: string;
  inverterBrand: string;
  lifecycleSpecsCompleteActive: boolean;
};

export type ProjectsListUser = { id: string; role: UserRole } | undefined;

export type BuildProjectsWhereResult =
  | { ok: true; where: Record<string, unknown> }
  | { ok: false; status: 403; error: string };

const QUARTER_TO_MONTHS: Record<string, string[]> = {
  Q1: ['04', '05', '06'],
  Q2: ['07', '08', '09'],
  Q3: ['10', '11', '12'],
  Q4: ['01', '02', '03'],
};

const VALID_CUSTOMER_TYPES = ['RESIDENTIAL', 'APARTMENT', 'COMMERCIAL'];

function toStringArray(value: unknown): string[] {
  if (value == null || value === '') return [];
  return (Array.isArray(value) ? value : [value]).map((v) => String(v));
}

function pushOntoWhereAnd(where: Record<string, unknown>, clause: object): void {
  const w = where as { AND?: object[]; [key: string]: unknown };
  if (w.AND && Array.isArray(w.AND)) {
    w.AND.push(clause);
    return;
  }
  const topKeys = Object.keys(w).filter((k) => k !== 'AND' && k !== 'OR');
  if (topKeys.length > 0) {
    const existing: object[] = [];
    topKeys.forEach((key) => {
      existing.push({ [key]: w[key] });
      delete w[key];
    });
    w.AND = [...existing, clause];
  } else {
    w.AND = [clause];
  }
}

function pushZenithExplorerSliceOntoWhere(
  where: Record<string, unknown>,
  slice: 'revenue' | 'pipeline',
  fyProfitOnly: boolean,
): void {
  const revenueStatuses: ProjectStatus[] = [
    ProjectStatus.CONFIRMED,
    ProjectStatus.UNDER_INSTALLATION,
    ProjectStatus.COMPLETED,
    ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
  ];
  const stageOr = {
    OR: [
      { projectStage: null },
      { projectStage: { notIn: [ProjectStage.SURVEY, ProjectStage.PROPOSAL] } },
    ],
  };

  const parts: object[] =
    slice === 'revenue'
      ? [
          { projectCost: { not: null } },
          { projectStatus: { in: revenueStatuses } },
          stageOr,
          ...(fyProfitOnly ? [{ grossProfit: { not: null } }] : []),
        ]
      : [{ projectCost: { not: null } }, { projectStatus: { not: ProjectStatus.LOST } }];

  pushOntoWhereAnd(where, { AND: parts });
}

/** Parse GET /api/projects (and export) query into normalized filter input. */
export function parseProjectsListFilters(query: ParsedQs): ProjectsListFilterInput {
  const {
    status,
    type,
    customerType,
    projectServiceType,
    salespersonId,
    leadSource,
    supportTicketStatus,
    paymentStatus,
    fy,
    quarter,
    month,
    year,
    search,
    hasDocuments,
    availingLoan,
    peBucket,
    financingBank,
    zenithClosedFrom,
    zenithClosedTo,
    salespersonUnassigned,
    leadSourceIsNull,
    zenithSlice,
    zenithFyProfit,
    panelBrand,
    inverterBrand,
    lifecycleSpecsComplete,
  } = query;

  const fyArray = toStringArray(fy);
  const yearLegacy = typeof year === 'string' ? year : Array.isArray(year) ? String(year[0]) : '';
  const fyFilters = fyArray.length > 0 ? fyArray : yearLegacy ? [yearLegacy] : [];

  const panelBrandRaw = typeof panelBrand === 'string' ? panelBrand.trim() : '';
  const inverterBrandRaw = typeof inverterBrand === 'string' ? inverterBrand.trim() : '';

  return {
    statusArray: toStringArray(status),
    typeArray: toStringArray(type),
    customerTypeArray: toStringArray(customerType),
    projectServiceTypeArray: toStringArray(projectServiceType),
    salespersonIdArray: toStringArray(salespersonId),
    leadSourceArray: toStringArray(leadSource),
    supportTicketStatusArray: toStringArray(supportTicketStatus),
    paymentStatusArray: toStringArray(paymentStatus),
    fyArray,
    quarterArray: toStringArray(quarter),
    monthArray: toStringArray(month),
    fyFilters,
    financingBankArray: toStringArray(financingBank),
    search: typeof search === 'string' && search.trim() !== '' ? search.trim() : null,
    hasDocumentsActive:
      hasDocuments === 'true' || (Array.isArray(hasDocuments) && hasDocuments.includes('true')),
    availingLoanActive: availingLoan === 'true',
    peBucket:
      typeof peBucket === 'string' && ['proposal-ready', 'draft', 'not-started', 'rest'].includes(peBucket)
        ? peBucket
        : null,
    zenithClosedFrom: typeof zenithClosedFrom === 'string' ? zenithClosedFrom : null,
    zenithClosedTo: typeof zenithClosedTo === 'string' ? zenithClosedTo : null,
    salespersonUnassigned: String(salespersonUnassigned) === 'true',
    leadSourceIsNull: String(leadSourceIsNull) === 'true',
    zenithSlice: typeof zenithSlice === 'string' ? zenithSlice : null,
    zenithFyProfit: String(zenithFyProfit) === 'true',
    panelBrand: panelBrandRaw,
    inverterBrand: inverterBrandRaw,
    lifecycleSpecsCompleteActive:
      String(lifecycleSpecsComplete) === 'true' || panelBrandRaw !== '' || inverterBrandRaw !== '',
  };
}

/**
 * Build Prisma `where` for project list and export.
 * @param skipDateFilters — omit FY/quarter/month (e.g. available-FY dropdown scope)
 * @param skipPeBucket — omit PE bucket clause (paired with skipDateFilters for FY meta)
 */
export function buildProjectsWhere(
  filters: ProjectsListFilterInput,
  user: ProjectsListUser,
  options?: { skipDateFilters?: boolean; skipPeBucket?: boolean },
): BuildProjectsWhereResult {
  const skipDateFilters = options?.skipDateFilters === true;
  const skipPeBucket = options?.skipPeBucket === true;
  const where: Record<string, unknown> = {};

  const operationsAllowedStatuses: ProjectStatus[] = [
    ProjectStatus.CONFIRMED,
    ProjectStatus.UNDER_INSTALLATION,
    ProjectStatus.COMPLETED,
    ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
  ];

  if (user?.role === UserRole.SALES) {
    where.salespersonId = user.id;
  }

  if (user?.role === UserRole.OPERATIONS) {
    if (filters.statusArray.length > 0) {
      const filteredStatusArray = filters.statusArray.filter((status): status is ProjectStatus =>
        operationsAllowedStatuses.includes(status as ProjectStatus),
      );
      where.projectStatus =
        filteredStatusArray.length > 0
          ? { in: filteredStatusArray }
          : { in: operationsAllowedStatuses };
    } else {
      where.projectStatus = { in: operationsAllowedStatuses };
    }
  } else if (filters.statusArray.length > 0) {
    where.projectStatus = { in: filters.statusArray };
  }

  if (filters.typeArray.length > 0) where.type = { in: filters.typeArray };
  if (filters.projectServiceTypeArray.length > 0) {
    where.projectServiceType = { in: filters.projectServiceTypeArray };
  }

  const customerTypeFiltered = filters.customerTypeArray.filter((v) => VALID_CUSTOMER_TYPES.includes(v));
  const customerTypeWhere = buildProjectsListCustomerTypeWhere(customerTypeFiltered);
  if (customerTypeWhere) {
    pushOntoWhereAnd(where, customerTypeWhere);
  }

  if (filters.leadSourceArray.length > 0) where.leadSource = { in: filters.leadSourceArray };
  if (filters.leadSourceIsNull && filters.leadSourceArray.length === 0) {
    where.leadSource = null;
  }

  if (filters.salespersonIdArray.length > 0 && user?.role !== UserRole.SALES) {
    where.salespersonId = { in: filters.salespersonIdArray };
  }
  if (filters.salespersonUnassigned && filters.salespersonIdArray.length === 0 && user?.role !== UserRole.SALES) {
    const unassignedCond = { salespersonId: null };
    if ((where as { AND?: object[] }).AND) {
      pushOntoWhereAnd(where, unassignedCond);
    } else if (!where.salespersonId) {
      where.salespersonId = null;
    }
  }

  if (filters.financingBankArray.length > 0) {
    pushOntoWhereAnd(where, { financingBank: { in: filters.financingBankArray } });
  }

  const zcFrom = filters.zenithClosedFrom ? new Date(filters.zenithClosedFrom) : null;
  const zcTo = filters.zenithClosedTo ? new Date(filters.zenithClosedTo) : null;
  if (zcFrom && zcTo && !Number.isNaN(zcFrom.getTime()) && !Number.isNaN(zcTo.getTime())) {
    const winningForZenith: ProjectStatus[] = [
      ProjectStatus.CONFIRMED,
      ProjectStatus.UNDER_INSTALLATION,
      ProjectStatus.COMPLETED,
      ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
    ];
    pushOntoWhereAnd(where, {
      AND: [
        { projectStatus: { in: winningForZenith } },
        {
          OR: [
            {
              AND: [
                { stageEnteredAt: { not: null } },
                { stageEnteredAt: { gte: zcFrom, lte: zcTo } },
              ],
            },
            {
              AND: [
                { stageEnteredAt: null },
                { confirmationDate: { not: null } },
                { confirmationDate: { gte: zcFrom, lte: zcTo } },
              ],
            },
            {
              AND: [
                { stageEnteredAt: null },
                { confirmationDate: null },
                { updatedAt: { gte: zcFrom, lte: zcTo } },
              ],
            },
          ],
        },
      ],
    });
  }

  if (filters.supportTicketStatusArray.length > 0) {
    const ticketFilterConditions: object[] = [];
    filters.supportTicketStatusArray.forEach((filterValue) => {
      switch (filterValue) {
        case 'HAS_TICKETS':
          ticketFilterConditions.push({ supportTickets: { some: {} } });
          break;
        case 'OPEN':
          ticketFilterConditions.push({
            supportTickets: { some: { status: SupportTicketStatus.OPEN } },
          });
          break;
        case 'IN_PROGRESS':
          ticketFilterConditions.push({
            supportTickets: { some: { status: SupportTicketStatus.IN_PROGRESS } },
          });
          break;
        case 'CLOSED':
          ticketFilterConditions.push({
            supportTickets: { some: { status: SupportTicketStatus.CLOSED } },
          });
          break;
        case 'NO_TICKETS':
          ticketFilterConditions.push({ supportTickets: { none: {} } });
          break;
        default:
          break;
      }
    });
    if (ticketFilterConditions.length > 0) {
      pushOntoWhereAnd(
        where,
        ticketFilterConditions.length === 1 ? ticketFilterConditions[0]! : { OR: ticketFilterConditions },
      );
    }
  }

  if (filters.paymentStatusArray.length > 0) {
    const paymentStatusConditions: object[] = [];
    filters.paymentStatusArray.forEach((s) => {
      if (s === 'NA') {
        paymentStatusConditions.push({
          OR: [
            { projectCost: null },
            { projectCost: 0 },
            {
              projectStatus: {
                in: [ProjectStatus.LEAD, ProjectStatus.SITE_SURVEY, ProjectStatus.PROPOSAL, ProjectStatus.LOST],
              },
            },
          ],
        });
      } else {
        paymentStatusConditions.push({
          AND: [
            { paymentStatus: s },
            { projectCost: { not: null } },
            { projectCost: { not: 0 } },
            {
              projectStatus: {
                notIn: [ProjectStatus.LEAD, ProjectStatus.SITE_SURVEY, ProjectStatus.PROPOSAL, ProjectStatus.LOST],
              },
            },
          ],
        });
      }
    });
    if (paymentStatusConditions.length > 0) {
      pushOntoWhereAnd(
        where,
        paymentStatusConditions.length === 1 ? paymentStatusConditions[0]! : { OR: paymentStatusConditions },
      );
    }
  }

  if (filters.zenithSlice === 'revenue' || filters.zenithSlice === 'pipeline') {
    pushZenithExplorerSliceOntoWhere(
      where,
      filters.zenithSlice,
      filters.zenithSlice === 'revenue' && filters.zenithFyProfit,
    );
  }

  if (filters.lifecycleSpecsCompleteActive) {
    const lifecycleParts: object[] = [
      { panelBrand: { not: null } },
      { NOT: { panelBrand: '' } },
      { inverterBrand: { not: null } },
      { NOT: { inverterBrand: '' } },
    ];
    if (filters.panelBrand !== '') lifecycleParts.push({ panelBrand: filters.panelBrand });
    if (filters.inverterBrand !== '') lifecycleParts.push({ inverterBrand: filters.inverterBrand });
    pushOntoWhereAnd(where, { AND: lifecycleParts });
  }

  if (filters.search) {
    pushOntoWhereAnd(where, {
      OR: [
        { customer: { customerName: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { customerId: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { consumerNumber: { contains: filters.search, mode: 'insensitive' } } },
      ],
    });
  }

  if (filters.hasDocumentsActive) {
    pushOntoWhereAnd(where, { documents: { some: {} } });
  }

  if (filters.availingLoanActive) {
    pushOntoWhereAnd(where, { availingLoan: true });
  }

  if (!skipDateFilters && filters.fyFilters.length > 0) {
    where.year = { in: filters.fyFilters };
  }

  if (!skipDateFilters && filters.fyFilters.length === 1) {
    const quarterFilters = filters.quarterArray;
    const monthFilters = filters.monthArray;
    if (quarterFilters.length > 0 || monthFilters.length > 0) {
      let effectiveMonths: string[] = [];
      if (quarterFilters.length > 0) {
        const quarterMonths = new Set<string>();
        quarterFilters.forEach((q) => (QUARTER_TO_MONTHS[q] ?? []).forEach((m) => quarterMonths.add(m)));
        effectiveMonths =
          monthFilters.length > 0 ? monthFilters.filter((m) => quarterMonths.has(m)) : Array.from(quarterMonths);
      } else {
        effectiveMonths = monthFilters;
      }

      if (effectiveMonths.length > 0) {
        const fyStr = String(filters.fyFilters[0]);
        const yearMatch = fyStr.match(/(\d{4})/);
        if (yearMatch) {
          const startYear = parseInt(yearMatch[1], 10);
          const dateRanges: object[] = [];
          effectiveMonths.forEach((m) => {
            const monthNum = parseInt(m, 10);
            if (!monthNum || monthNum < 1 || monthNum > 12) return;
            const yearForMonth = monthNum >= 1 && monthNum <= 3 ? startYear + 1 : startYear;
            const start = new Date(yearForMonth, monthNum - 1, 1);
            const end = new Date(yearForMonth, monthNum, 1);
            dateRanges.push({ confirmationDate: { gte: start, lt: end } });
          });
          if (dateRanges.length > 0) {
            pushOntoWhereAnd(where, { OR: dateRanges });
          }
        }
      }
    }
  }

  if (!skipPeBucket && filters.peBucket) {
    const allowedPeRoles: UserRole[] = [UserRole.SALES, UserRole.MANAGEMENT, UserRole.ADMIN];
    if (!user?.role || !allowedPeRoles.includes(user.role)) {
      return {
        ok: false,
        status: 403,
        error: 'The peBucket filter is only available to Sales, Management, and Admin roles.',
      };
    }

    const peBucketClause =
      filters.peBucket === 'proposal-ready'
        ? {
            peSelection: { isNot: null },
            peCostingSheets: { some: {} },
            peBomSheets: { some: {} },
            peRoiResults: { some: {} },
            peProposals: { some: {} },
          }
        : filters.peBucket === 'not-started'
          ? {
              peSelection: { isNot: null },
              peCostingSheets: { none: {} },
              peBomSheets: { none: {} },
              peRoiResults: { none: {} },
              peProposals: { none: {} },
            }
          : filters.peBucket === 'draft'
            ? {
                peSelection: { isNot: null },
                AND: [
                  {
                    NOT: {
                      AND: [
                        { peCostingSheets: { none: {} } },
                        { peBomSheets: { none: {} } },
                        { peRoiResults: { none: {} } },
                        { peProposals: { none: {} } },
                      ],
                    },
                  },
                  {
                    NOT: {
                      AND: [
                        { peCostingSheets: { some: {} } },
                        { peBomSheets: { some: {} } },
                        { peRoiResults: { some: {} } },
                        { peProposals: { some: {} } },
                      ],
                    },
                  },
                ],
              }
            : {
                peSelection: { is: null },
                projectStatus: { in: [ProjectStatus.PROPOSAL, ProjectStatus.CONFIRMED] },
              };

    pushOntoWhereAnd(where, peBucketClause);
  }

  return { ok: true, where };
}

/** Shared express-validator rules for GET /projects and export routes. */
export const projectsListQueryValidators = [
  query('status').optional().custom((value) => {
    if (!value) return true;
    const values = Array.isArray(value) ? value : [value];
    return values.every((v) => Object.values(ProjectStatus).includes(v as ProjectStatus));
  }).withMessage('Invalid status value'),
  query('type').optional().custom((value) => {
    if (!value) return true;
    const values = Array.isArray(value) ? value : [value];
    return values.every((v) => Object.values(ProjectType).includes(v as ProjectType));
  }).withMessage('Invalid type value'),
  query('customerType').optional().custom((value) => {
    if (!value) return true;
    const values = Array.isArray(value) ? value : [value];
    return values.every((v) => VALID_CUSTOMER_TYPES.includes(String(v)));
  }).withMessage('Invalid customerType value'),
  query('projectServiceType').optional().custom((value) => {
    if (!value) return true;
    const values = Array.isArray(value) ? value : [value];
    return values.every((v) => Object.values(ProjectServiceType).includes(v as ProjectServiceType));
  }).withMessage('Invalid projectServiceType value'),
  query('salespersonId').optional().custom((value) => {
    if (!value) return true;
    const values = Array.isArray(value) ? value : [value];
    return values.every((v) => typeof v === 'string');
  }).withMessage('Invalid salespersonId value'),
  query('supportTicketStatus').optional().custom((value) => {
    if (!value) return true;
    const values = Array.isArray(value) ? value : [value];
    const validValues = ['HAS_TICKETS', 'OPEN', 'IN_PROGRESS', 'CLOSED', 'NO_TICKETS'];
    return values.every((v) => validValues.includes(v as string));
  }).withMessage('Invalid supportTicketStatus value'),
  query('paymentStatus').optional().custom((value) => {
    if (!value) return true;
    const values = Array.isArray(value) ? value : [value];
    const valid = ['NA', 'FULLY_PAID', 'PARTIAL', 'PENDING'];
    return values.every((v) => valid.includes(String(v)));
  }).withMessage('Invalid paymentStatus value'),
  query('fy').optional().custom((value) => {
    if (!value) return true;
    const values = Array.isArray(value) ? value : [value];
    return values.every((v) => typeof v === 'string' && String(v).trim().length > 0);
  }).withMessage('Invalid fy value'),
  query('quarter').optional().custom((value) => {
    if (!value) return true;
    const values = Array.isArray(value) ? value : [value];
    const valid = ['Q1', 'Q2', 'Q3', 'Q4'];
    return values.every((v) => valid.includes(String(v)));
  }).withMessage('Invalid quarter value'),
  query('month').optional().custom((value) => {
    if (!value) return true;
    const values = Array.isArray(value) ? value : [value];
    const valid = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    return values.every((v) => valid.includes(String(v).padStart(2, '0')));
  }).withMessage('Invalid month value'),
  query('leadSource').optional().custom((value) => {
    if (!value) return true;
    const values = Array.isArray(value) ? value : [value];
    return values.every((v) => Object.values(LeadSource).includes(v as LeadSource));
  }).withMessage('Invalid leadSource value'),
  query('year').optional().isString(),
  query('search').optional().isString(),
  query('hasDocuments').optional().isIn(['true', 'false']),
  query('availingLoan').optional().isIn(['true']),
  query('financingBank').optional().custom((value) => {
    if (!value) return true;
    const values = Array.isArray(value) ? value : [value];
    return values.every((v) => typeof v === 'string' && String(v).trim().length > 0);
  }).withMessage('Invalid financingBank value'),
  query('zenithClosedFrom').optional().isISO8601(),
  query('zenithClosedTo').optional().isISO8601(),
  query('salespersonUnassigned').optional().isIn(['true']),
  query('leadSourceIsNull').optional().isIn(['true']),
  query('zenithSlice').optional().isIn(['revenue', 'pipeline']),
  query('zenithFyProfit').optional().isIn(['true']),
  query('panelBrand').optional().isString(),
  query('inverterBrand').optional().isString(),
  query('lifecycleSpecsComplete').optional().isIn(['true']),
  query('peBucket').optional().isIn(['proposal-ready', 'draft', 'not-started', 'rest']),
];
