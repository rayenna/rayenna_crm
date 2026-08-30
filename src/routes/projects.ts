import express, { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { ProjectStatus, ProjectType, ProjectServiceType, ProjectStage, UserRole, LeadSource, SupportTicketStatus, SystemType, LostReason, PaymentStatus } from '@prisma/client';
import { defaultPanelTypeForProjectSegment } from '../utils/projectSegment';
import {
  buildProjectsWhere,
  parseProjectsListFilters,
  projectsListQueryValidators,
} from '../utils/projectsListWhere';
import { mapProjectToExportRow, PROJECTS_EXPORT_INCLUDE } from '../utils/projectsListExport';
import {
  leadSourceRequiresDetails,
  normalizeLeadSourceDetailsForStorage,
  validateLeadSourceDetailsPair,
} from '../utils/leadSourceValidation';
import { assertPaymentCollectionDatesNotFuture } from '../utils/paymentCollectionDate';
import { updateTouchesPaymentTracking } from '../utils/paymentAudit';
import { computeDealHealthScoreForProjectList } from '../utils/dealHealthScore';
import {
  dataSenseImpossibleConflict,
  dataSenseImpossibleHttpBody,
} from '../utils/dataSense';
import { sendErrorResponse } from '../utils/publicApiError';

// Valid values for lostToCompetitionReason (required when lostReason is LOST_TO_COMPETITION)
const LOST_TO_COMPETITION_REASON_VALUES = [
  'LOST_DUE_TO_PRICE',
  'LOST_DUE_TO_FEATURES',
  'LOST_DUE_TO_TIMELINE',
  'LOST_DUE_TO_BRAND_OR_WARRANTY',
  'LOST_DUE_TO_RELATIONSHIP_OTHER',
] as const;
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';
import { logSecurityAudit } from '../utils/auditLogger';
import { calculatePayments, calculateExpectedProfit, calculateGrossProfit, calculateProfitability, calculateFY } from '../utils/calculations';
import { predictProjectDelay } from '../utils/ai';
import { suggestOptimalPricing } from '../utils/ai';
import { scheduleConsumerHubSync } from '../services/consumerHubProvision';
import * as XLSX from 'xlsx';

const router = express.Router();

/** Project system capacity (kW): non-negative integer; null if empty/invalid. Rounds numeric input. */
function parseSystemCapacityKw(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

/**
 * Shared ORDER BY for GET /projects and admin exports.
 * `dealHealthSort` means caller must load all matching rows, score in memory, then paginate (list) or return all (export).
 */
function buildProjectsTableOrderBy(
  sortBy: string | undefined,
  sortOrder: string | undefined,
): { orderBy: any[]; dealHealthSort: boolean } {
  const sb = sortBy && String(sortBy).trim() !== '' ? String(sortBy) : '';
  if (!sb) {
    return {
      dealHealthSort: false,
      orderBy: [{ confirmationDate: 'desc' }, { createdAt: 'desc' }],
    };
  }
  if (sb === 'dealHealthScore') {
    return { dealHealthSort: true, orderBy: [] };
  }
  const order = sortOrder === 'asc' ? 'asc' : 'desc';
  const nullsAsc = { sort: 'asc' as const, nulls: 'first' as const };
  const nullsDesc = { sort: 'desc' as const, nulls: 'last' as const };
  let orderBy: any[] = [];
  switch (sb) {
    case 'systemCapacity':
      orderBy = [
        { systemCapacity: order === 'asc' ? nullsAsc : nullsDesc },
        { createdAt: 'desc' },
      ];
      break;
    case 'projectCost':
      orderBy = [
        { projectCost: order === 'asc' ? nullsAsc : nullsDesc },
        { createdAt: 'desc' },
      ];
      break;
    case 'confirmationDate':
      orderBy = [{ confirmationDate: order }, { createdAt: 'desc' }];
      break;
    case 'creationDate':
      orderBy = [{ createdAt: order }];
      break;
    case 'profitability':
      orderBy = [
        { profitability: order === 'asc' ? nullsAsc : nullsDesc },
        { createdAt: 'desc' },
      ];
      break;
    case 'customerName':
      // Use DB-generated lower(trim(...)) — raw customerName sort is case-sensitive and breaks DESC (e.g. "joy" before "Vishnu").
      orderBy = [{ customer: { customerNameSortKey: order } }, { createdAt: 'desc' }];
      break;
    case 'slNo':
      orderBy = [{ slNo: order }, { createdAt: 'desc' }];
      break;
    case 'projectType':
      orderBy = [{ type: order }, { createdAt: 'desc' }];
      break;
    case 'projectStatus':
      orderBy = [{ projectStatus: order }, { createdAt: 'desc' }];
      break;
    case 'leadSource':
      orderBy = [
        { leadSource: order === 'asc' ? nullsAsc : nullsDesc },
        { createdAt: 'desc' },
      ];
      break;
    case 'paymentStatus':
      orderBy = [{ paymentStatus: order }, { createdAt: 'desc' }];
      break;
    default:
      orderBy = [{ confirmationDate: 'desc' }, { createdAt: 'desc' }];
  }
  return { orderBy, dealHealthSort: false };
}

// Get all projects with filters
router.get(
  '/',
  authenticate,
  [
    ...projectsListQueryValidators,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy')
      .optional()
      .isIn([
        'systemCapacity',
        'projectCost',
        'confirmationDate',
        'creationDate',
        'profitability',
        'customerName',
        'dealHealthScore',
        'slNo',
        'projectType',
        'projectStatus',
        'leadSource',
        'paymentStatus',
      ]),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  async (req: Request, res: Response) => {
    let where: any = {};
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { page = '1', limit = '25', sortBy, sortOrder = 'desc' } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const listFilters = parseProjectsListFilters(req.query);

      const whereForFyMeta = buildProjectsWhere(listFilters, req.user, {
        skipDateFilters: true,
        skipPeBucket: true,
      });
      if (!whereForFyMeta.ok) {
        return res.status(whereForFyMeta.status).json({ error: whereForFyMeta.error });
      }

      const built = buildProjectsWhere(listFilters, req.user);
      if (!built.ok) {
        return res.status(built.status).json({ error: built.error });
      }
      where = built.where;

      const availableFYRows = await prisma.project.findMany({
        where: whereForFyMeta.where,
        distinct: ['year'],
        select: { year: true },
      });
      const availableFYs = Array.from(
        new Set(
          availableFYRows
            .map((r) => r.year)
            .filter((y): y is string => typeof y === 'string' && y.trim().length > 0),
        ),
      ).sort((a, b) => String(a).localeCompare(String(b)));

      const { orderBy, dealHealthSort: wantsHealthSort } = buildProjectsTableOrderBy(
        sortBy as string | undefined,
        sortOrder as string | undefined,
      );

      // Balance subtotal: ONLY sum balanceAmount for projects with paymentStatus PARTIAL or PENDING.
      // Exclude "N/A" projects: no order value OR early/lost stages (UI shows N/A; DB may still have PENDING).
      const whereBalanceOnly = {
        AND: [
          where,
          { paymentStatus: { in: [PaymentStatus.PARTIAL, PaymentStatus.PENDING] } },
          { projectCost: { gt: 0 } },
          { projectStatus: { notIn: [ProjectStatus.LEAD, ProjectStatus.SITE_SURVEY, ProjectStatus.PROPOSAL, ProjectStatus.LOST] } },
        ],
      };

      const baseSelect: any = {
        id: true,
        slNo: true,
        customerId: true,
        type: true,
        projectServiceType: true,
        salespersonId: true,
        year: true,
        systemCapacity: true,
        panelBrand: true,
        panelType: true,
        panelCapacityW: true,
        inverterBrand: true,
        inverterCapacityKw: true,
        projectCost: true,
        projectStatus: true,
        confirmationDate: true,
        createdAt: true,
        updatedAt: true,
        stageEnteredAt: true,
        expectedCommissioningDate: true,
        lostDate: true,
        lostReason: true,
        paymentStatus: true,
        balanceAmount: true,
        leadSource: true,
        leadSourceDetails: true,
        advanceReceived: true,
        availingLoan: true,
        financingBank: true,
        financingBankOther: true,
        customer: {
          select: {
            id: true,
            customerId: true,
            customerName: true,
            customerType: true,
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        salesperson: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { documents: true },
        },
        supportTickets: {
          where: { status: { in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS] as SupportTicketStatus[] } },
          select: { id: true },
        },
        /** Latest remark for Deal Health Activity (meaningful touch). */
        projectRemarks: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
        lastPaymentDate: true,
        advanceReceivedDate: true,
      };

      const [allOrPage, total, totals, balanceTotals] = await Promise.all([
        wantsHealthSort
          ? prisma.project.findMany({
              where,
              select: baseSelect,
            })
          : prisma.project.findMany({
              where,
              select: baseSelect,
              orderBy,
              skip,
              take,
            }),
        prisma.project.count({ where }),
        prisma.project.aggregate({
          where,
          _sum: { systemCapacity: true, projectCost: true },
        }),
        prisma.project.aggregate({
          where: whereBalanceOnly,
          _sum: { balanceAmount: true },
        }),
      ]);

      const projects = wantsHealthSort
        ? (() => {
            const order = sortOrder === 'asc' ? 'asc' : 'desc';
            const scored = (allOrPage as any[]).map((p) => ({
              p,
              s: computeDealHealthScoreForProjectList({
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
                lastRemarkAt: p.projectRemarks?.[0]?.createdAt ?? null,
                lastPaymentDate: p.lastPaymentDate,
                advanceReceivedDate: p.advanceReceivedDate,
              }),
            }));

            scored.sort((a, b) => {
              const sa = a.s ?? -1;
              const sb = b.s ?? -1;
              if (sa !== sb) return order === 'asc' ? sa - sb : sb - sa;
              // stable-ish fallback
              const ac = a.p.createdAt?.getTime?.() ?? 0;
              const bc = b.p.createdAt?.getTime?.() ?? 0;
              return bc - ac;
            });

            return scored.slice(skip, skip + take).map((x) => x.p);
          })()
        : (allOrPage as any[]);

      res.json({
        projects,
        availableFYs,
        totals: {
          capacitySum: totals._sum.systemCapacity ?? 0,
          costSum: totals._sum.projectCost ?? 0,
          balanceSum: balanceTotals._sum.balanceAmount ?? 0,
        },
        pagination: {
          page: parseInt(page as string),
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
      });
    } catch (error: any) {
      console.error('Error fetching projects:', error?.message ?? error);
      if (process.env.NODE_ENV === 'development') {
        console.error('Error details:', { message: error.message, code: error.code, meta: error.meta });
        console.error('User role:', req.user?.role);
        console.error('Where clause:', JSON.stringify(where, null, 2));
      }
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Get single project
router.get('/:id', authenticate, async (req: Request, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        salesperson: {
          select: { id: true, name: true, email: true },
        },
        opsPerson: {
          select: { id: true, name: true, email: true },
        },
        documents: {
          include: {
            uploadedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Role-based access
    if (
      req.user?.role === UserRole.SALES &&
      project.salespersonId !== req.user.id
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Operations users can only access projects with specific statuses
    // Operations can only see: CONFIRMED, UNDER_INSTALLATION, COMPLETED, COMPLETED_SUBSIDY_CREDITED
    if (req.user?.role === UserRole.OPERATIONS) {
      const allowedStatuses: ProjectStatus[] = [
        ProjectStatus.CONFIRMED,
        ProjectStatus.UNDER_INSTALLATION,
        ProjectStatus.COMPLETED,
        ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
      ];
      if (!allowedStatuses.includes(project.projectStatus)) {
        return res.status(403).json({ 
          error: 'Access denied. Operations users can only access projects with status: Confirmed, Installation, Completed, or Completed - Subsidy Credited.' 
        });
      }
    }

    // Always verify and recalculate grossProfit and profitability if we have the required values.
    // Lost deals keep order value on projectCost for analysis, but must never carry win-book profit metrics.
    let needsUpdate = false;
    const updateData: any = {};

    if (project.projectStatus === ProjectStatus.LOST) {
      if (project.grossProfit !== null) {
        updateData.grossProfit = null;
        project.grossProfit = null;
        needsUpdate = true;
      }
      if (project.profitability !== null) {
        updateData.profitability = null;
        project.profitability = null;
        needsUpdate = true;
      }
      if (project.expectedProfit !== null) {
        updateData.expectedProfit = null;
        project.expectedProfit = null;
        needsUpdate = true;
      }
    } else if (project.projectCost !== null && project.totalProjectCost !== null) {
      const expectedGrossProfit = calculateGrossProfit(project.projectCost, project.totalProjectCost);
      
      // If grossProfit is null or doesn't match expected value, recalculate
      if (expectedGrossProfit !== null && (
        project.grossProfit === null || 
        Math.abs((project.grossProfit || 0) - expectedGrossProfit) > 0.01
      )) {
        updateData.grossProfit = expectedGrossProfit;
        project.grossProfit = expectedGrossProfit;
        needsUpdate = true;
      }

      // Recalculate profitability if we have grossProfit and projectCost
      if (project.grossProfit !== null && project.projectCost !== null && project.projectCost !== 0) {
        const expectedProfitability = calculateProfitability(project.grossProfit, project.projectCost);
        
        // If profitability is null or doesn't match expected value, recalculate
        if (expectedProfitability !== null && (
          project.profitability === null || 
          Math.abs((project.profitability || 0) - expectedProfitability) > 0.01
        )) {
          updateData.profitability = expectedProfitability;
          project.profitability = expectedProfitability;
          needsUpdate = true;
        }
      } else if (project.profitability !== null) {
        // If we can't calculate profitability but it has a value, set it to null
        updateData.profitability = null;
        project.profitability = null;
        needsUpdate = true;
      }
    } else {
      // If we can't calculate grossProfit but it has a value, set it to null
      if (project.grossProfit !== null) {
        updateData.grossProfit = null;
        project.grossProfit = null;
        needsUpdate = true;
      }
      // Also set profitability to null if grossProfit is null
      if (project.profitability !== null) {
        updateData.profitability = null;
        project.profitability = null;
        needsUpdate = true;
      }
    }

    // Recalculate payment fields (totalAmountReceived, balanceAmount, paymentStatus) from payment inputs
    if (project.projectCost != null && project.projectCost > 0) {
      const paymentCalculations = calculatePayments({
        advanceReceived: project.advanceReceived,
        payment1: project.payment1,
        payment2: project.payment2,
        payment3: project.payment3,
        lastPayment: project.lastPayment,
        projectCost: project.projectCost,
      });
      const expectedTotal = paymentCalculations.totalAmountReceived;
      const expectedBalance = paymentCalculations.balanceAmount;
      const expectedStatus = paymentCalculations.paymentStatus;
      const currentTotal = project.totalAmountReceived ?? 0;
      const currentBalance = project.balanceAmount ?? 0;

      if (
        Math.abs(currentTotal - expectedTotal) > 0.01 ||
        Math.abs(currentBalance - expectedBalance) > 0.01 ||
        project.paymentStatus !== expectedStatus
      ) {
        updateData.totalAmountReceived = expectedTotal;
        updateData.balanceAmount = expectedBalance;
        updateData.paymentStatus = expectedStatus;
        project.totalAmountReceived = expectedTotal;
        project.balanceAmount = expectedBalance;
        project.paymentStatus = expectedStatus;
        needsUpdate = true;
      }
    }

    // Update the database if recalculations were needed
    if (needsUpdate) {
      await prisma.project.update({
        where: { id: project.id },
        data: updateData,
      });
    }

    const [latestRemark, latestTask] = await Promise.all([
      prisma.projectRemark.findFirst({
        where: { projectId: project.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.userTask.findFirst({
        where: { projectId: project.id },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
    ]);

    res.json({
      ...project,
      lastRemarkAt: latestRemark?.createdAt?.toISOString() ?? null,
      lastTaskActivityAt: latestTask?.updatedAt?.toISOString() ?? null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create project
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SALES),
  [
    body('customerId').notEmpty().trim(),
    body('type').isIn(Object.values(ProjectType)),
    body('projectServiceType').isIn(Object.values(ProjectServiceType)),
    body('confirmationDate').notEmpty().isISO8601().toDate(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        customerId,
        type,
        projectServiceType,
        salespersonId,
        year,
        systemCapacity,
        projectCost,
        confirmationDate,
        loanDetails,
        incentiveEligible,
        leadSource,
        leadSourceDetails,
        // Additional fields that may be sent from form
        roofType,
        systemType,
        projectStatus,
        lostDate,
        lostReason,
        lostToCompetitionReason,
        lostOtherReason,
        leadId,
        assignedOpsId,
        panelBrand,
        panelType,
        panelCapacityW,
        inverterBrand,
        inverterCapacityKw,
        siteAddress,
        expectedCommissioningDate,
        internalNotes,
        // Payment fields (optional for new projects)
        advanceReceived,
        advanceReceivedDate,
        payment1,
        payment1Date,
        payment2,
        payment2Date,
        payment3,
        payment3Date,
        lastPayment,
        lastPaymentDate,
        // Execution fields (optional for new projects)
        mnrePortalRegistrationDate,
        feasibilityDate,
        registrationDate,
        installationCompletionDate,
        completionReportSubmissionDate,
        subsidyRequestDate,
        subsidyCreditedDate,
        mnreInstallationDetails,
        // Financing / loan fields
        availingLoan,
        financingBank,
        financingBankOther,
      } = req.body;

      // Verify customer exists and get salespersonId
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          salespersonId: true,
          createdById: true,
        },
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // For Sales users: Only allow creating projects for customers currently assigned to them.
      // Customer ownership is determined by salespersonId (current assignment), not createdById.
      // If the customer has been reassigned to another salesperson, this user can no longer create projects for it.
      if (req.user?.role === UserRole.SALES) {
        if (customer.salespersonId !== req.user.id) {
          return res.status(403).json({ error: 'You can only create projects for customers currently assigned to you' });
        }
      }

      // Convert confirmationDate to Date object
      const confirmationDateObj = confirmationDate ? new Date(confirmationDate) : null;
      if (!confirmationDateObj || isNaN(confirmationDateObj.getTime())) {
        return res.status(400).json({ error: 'Confirmation Date is required and must be a valid date' });
      }

      const leadDetailsCheck = validateLeadSourceDetailsPair(leadSource, leadSourceDetails);
      if (!leadDetailsCheck.ok) {
        return res.status(400).json({ error: leadDetailsCheck.error });
      }
      const leadSourceDetailsValue = normalizeLeadSourceDetailsForStorage(leadSource, leadSourceDetails);

      // For LOST status: confirmation date must be current or past (order lost date)
      if (projectStatus === ProjectStatus.LOST) {
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        if (confirmationDateObj > todayEnd) {
          return res.status(400).json({ error: 'Confirmation Date (order lost date) cannot be a future date for Lost projects' });
        }
      }

      // Auto-calculate FY from confirmationDate (override year if provided)
      const calculatedYear = calculateFY(confirmationDateObj);
      if (!calculatedYear) {
        return res.status(400).json({ error: 'Unable to calculate Financial Year from Confirmation Date' });
      }

      // Convert string numbers to floats (form data comes as strings)
      const systemCapacityNum = parseSystemCapacityKw(systemCapacity);
      let projectCostNum = projectCost ? (isNaN(parseFloat(projectCost)) ? null : parseFloat(projectCost)) : null;

      // For LOST status: order value + loss taxonomy required (order value stays on projectCost; excluded from pipeline/revenue by status)
      if (projectStatus === ProjectStatus.LOST) {
        if (projectCostNum == null || projectCostNum <= 0) {
          return res.status(400).json({ error: 'Order Value is required and must be greater than 0 for Lost projects (kept for analysis; excluded from pipeline/revenue by status)' });
        }
        if (!lostDate) {
          return res.status(400).json({ error: 'Lost date is required when project status is Lost' });
        }
        const createLostDate = new Date(lostDate as string);
        if (isNaN(createLostDate.getTime())) {
          return res.status(400).json({ error: 'Lost date must be a valid date' });
        }
        const createTodayEnd = new Date();
        createTodayEnd.setHours(23, 59, 59, 999);
        if (createLostDate > createTodayEnd) {
          return res.status(400).json({ error: 'Lost date cannot be a future date' });
        }
        if (!lostReason || !Object.values(LostReason).includes(lostReason as LostReason)) {
          return res.status(400).json({ error: 'Reason for loss is required when project status is Lost' });
        }
        if (lostReason === LostReason.OTHER && (!lostOtherReason || !String(lostOtherReason).trim())) {
          return res.status(400).json({ error: 'Please describe the reason for loss when Reason is Other' });
        }
        if (lostReason === LostReason.LOST_TO_COMPETITION) {
          if (!lostToCompetitionReason || !LOST_TO_COMPETITION_REASON_VALUES.includes(lostToCompetitionReason as typeof LOST_TO_COMPETITION_REASON_VALUES[number])) {
            return res.status(400).json({ error: 'Please select why the deal was lost to competition (Lost due to Price, Features, or Relationship/Other factors)' });
          }
        }
      }

      // Prepare financing / loan fields (Sales & Admin only)
      let availingLoanValue: boolean | null = null;
      let financingBankValue: string | null = null;
      let financingBankOtherValue: string | null = null;

      if (req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.SALES) {
        const rawAvailing = availingLoan;
        const truthyValues = ['true', 'YES', 'yes', '1', 'on', true, 1];
        const falsyValues = ['false', 'NO', 'no', '0', false, 0];

        if (truthyValues.includes(rawAvailing)) {
          availingLoanValue = true;
        } else if (falsyValues.includes(rawAvailing) || rawAvailing === undefined) {
          availingLoanValue = false;
        }

        if (availingLoanValue) {
          const bank = (financingBank ?? '').toString().trim();
          if (!bank) {
            return res.status(400).json({ error: 'Financing Bank is required when Availing Loan/Financing is Yes' });
          }
          financingBankValue = bank;

          if (bank === 'OTHER') {
            const other = (financingBankOther ?? '').toString().trim();
            if (!other) {
              return res.status(400).json({ error: 'Other Bank Name is required when Financing Bank is Other' });
            }
            if (!/^[a-zA-Z0-9\s\-&()./]+$/.test(other)) {
              return res.status(400).json({ error: 'Other Bank Name should be alphanumeric (you can use spaces and basic punctuation)' });
            }
            financingBankOtherValue = other;
          } else {
            financingBankOtherValue = null;
          }
        } else if (availingLoanValue === false) {
          financingBankValue = null;
          financingBankOtherValue = null;
        }
      }

      // Auto-select Panel Type based on Segment if not provided
      let finalPanelType = panelType;
      if (!finalPanelType) {
        finalPanelType = defaultPanelTypeForProjectSegment(type);
      }

      // Auto-calculate expected profit (null for LOST — not in win book)
      const expectedProfit = projectStatus === ProjectStatus.LOST ? null : calculateExpectedProfit(projectCostNum, systemCapacityNum);
      
      // Auto-calculate gross profit (Order Value - Total Project Cost). Null for LOST.
      const grossProfit = projectStatus === ProjectStatus.LOST ? null : calculateGrossProfit(projectCostNum, null);
      
      // Auto-calculate profitability. For LOST, null.
      const profitability = projectStatus === ProjectStatus.LOST ? null : calculateProfitability(grossProfit, projectCostNum);

      // Convert payment amounts from strings to numbers
      const advanceReceivedNum = advanceReceived ? (isNaN(parseFloat(advanceReceived)) ? 0 : parseFloat(advanceReceived)) : 0;
      const payment1Num = payment1 ? (isNaN(parseFloat(payment1)) ? 0 : parseFloat(payment1)) : 0;
      const payment2Num = payment2 ? (isNaN(parseFloat(payment2)) ? 0 : parseFloat(payment2)) : 0;
      const payment3Num = payment3 ? (isNaN(parseFloat(payment3)) ? 0 : parseFloat(payment3)) : 0;
      const lastPaymentNum = lastPayment ? (isNaN(parseFloat(lastPayment)) ? 0 : parseFloat(lastPayment)) : 0;

      // Calculate payments against real order value (Lost UI still treats payment status as N/A)
      const paymentCalculations = calculatePayments({
        advanceReceived: advanceReceivedNum,
        payment1: payment1Num,
        payment2: payment2Num,
        payment3: payment3Num,
        lastPayment: lastPaymentNum,
        projectCost: projectCostNum,
      });

      const futurePaymentDateOnCreate = assertPaymentCollectionDatesNotFuture({
        advanceReceivedDate,
        payment1Date,
        payment2Date,
        payment3Date,
        lastPaymentDate,
      });
      if (futurePaymentDateOnCreate) {
        return res.status(400).json({
          error: `${futurePaymentDateOnCreate.label} cannot be a future date.`,
        });
      }

      const createSenseFindings = dataSenseImpossibleConflict(req.body, null);
      if (createSenseFindings.length > 0) {
        return res.status(409).json(dataSenseImpossibleHttpBody(createSenseFindings));
      }

      // Convert date strings to Date objects
      const convertDate = (dateStr: any): Date | null => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
      };

      // Manually calculate and set slNo to prevent unique constraint violations
      // This is necessary when data is migrated and sequences are out of sync
      // Wrap in transaction to prevent race condition: MAX query + create must be atomic
      const project = await prisma.$transaction(async (tx) => {
        let nextSlNo: number;
        try {
          // Get the current max slNo value (within transaction for consistency)
          const maxSlNoResult = await tx.$queryRaw<Array<{ max: bigint | null }>>`
            SELECT MAX("slNo") as max FROM "projects"
          `;
          const currentMax = maxSlNoResult[0]?.max ? Number(maxSlNoResult[0].max) : 0;
          nextSlNo = currentMax + 1;
          if (process.env.NODE_ENV === 'development') console.log(`📝 Calculated next slNo: ${nextSlNo} (max was: ${currentMax})`);
        } catch (slNoError: any) {
          if (process.env.NODE_ENV === 'development') console.warn('⚠️  Could not get max slNo, starting from 1:', slNoError.message);
          nextSlNo = 1;
        }

        // Create project within the same transaction (atomic with MAX query)
        return await tx.project.create({
        data: {
          slNo: nextSlNo, // Explicitly set slNo to prevent sequence conflicts
          customerId,
          type,
          projectServiceType: projectServiceType || ProjectServiceType.EPC_PROJECT,
          // Use customer's salespersonId (salespersonId from customer, not from request)
          // Only Admin can override this when creating projects
          salespersonId: req.user?.role === UserRole.ADMIN && salespersonId ? salespersonId : (customer.salespersonId || (req.user?.role === UserRole.SALES ? req.user.id : null)),
          year: calculatedYear, // Use auto-calculated year
          systemCapacity: systemCapacityNum,
          projectCost: projectCostNum,
          // Mirror snapshot for Lost analysis / legacy readers (SSOT remains projectCost)
          ...(projectStatus === ProjectStatus.LOST && projectCostNum != null ? { lostRevenue: projectCostNum } : {}),
          confirmationDate: confirmationDate ? new Date(confirmationDate) : null,
          loanDetails: loanDetails ? (typeof loanDetails === 'object' ? JSON.stringify(loanDetails) : loanDetails) : null,
          availingLoan: availingLoanValue,
          financingBank: financingBankValue,
          financingBankOther: financingBankOtherValue,
          incentiveEligible: incentiveEligible || false,
          leadSource: leadSource || null,
          leadSourceDetails: leadSourceDetailsValue,
          expectedProfit,
          grossProfit,
          profitability,
          // Additional fields
          roofType: roofType || null,
          systemType: systemType || null,
          projectStatus: projectStatus || ProjectStatus.LEAD,
          lostDate: convertDate(lostDate),
          lostReason: lostReason || null,
          // lostToCompetitionReason added in schema; Prisma client types may lag
          ...(lostReason === LostReason.LOST_TO_COMPETITION && lostToCompetitionReason
            ? { lostToCompetitionReason }
            : {}),
          lostOtherReason: lostOtherReason || null,
          leadId: leadId || null,
          assignedOpsId: assignedOpsId || null,
          panelBrand: panelBrand || null,
          panelType: finalPanelType || null,
          panelCapacityW: panelCapacityW != null && Number.isInteger(Number(panelCapacityW)) && Number(panelCapacityW) >= 0 ? Number(panelCapacityW) : null,
          inverterBrand: inverterBrand || null,
          inverterCapacityKw:
            inverterCapacityKw != null &&
            inverterCapacityKw !== '' &&
            Number.isInteger(Number(inverterCapacityKw)) &&
            Number(inverterCapacityKw) >= 0
              ? Number(inverterCapacityKw)
              : null,
          siteAddress: siteAddress || null,
          expectedCommissioningDate: convertDate(expectedCommissioningDate),
          internalNotes: internalNotes || null,
          // Execution fields
          mnrePortalRegistrationDate: convertDate(mnrePortalRegistrationDate),
          feasibilityDate: convertDate(feasibilityDate),
          registrationDate: convertDate(registrationDate),
          installationCompletionDate: convertDate(installationCompletionDate),
          completionReportSubmissionDate: convertDate(completionReportSubmissionDate),
          subsidyRequestDate: convertDate(subsidyRequestDate),
          subsidyCreditedDate: convertDate(subsidyCreditedDate),
          mnreInstallationDetails: mnreInstallationDetails || null,
          // Payment fields
          advanceReceived: advanceReceivedNum,
          advanceReceivedDate: convertDate(advanceReceivedDate),
          payment1: payment1Num,
          payment1Date: convertDate(payment1Date),
          payment2: payment2Num,
          payment2Date: convertDate(payment2Date),
          payment3: payment3Num,
          payment3Date: convertDate(payment3Date),
          lastPayment: lastPaymentNum,
          lastPaymentDate: convertDate(lastPaymentDate),
          ...paymentCalculations,
          createdById: req.user!.id,
        },
        include: {
          customer: true,
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          salesperson: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      }); // End transaction - MAX query + create are now atomic

      // Update the sequence to match the manually set slNo (for future auto-increment)
      // This keeps the sequence in sync for any future uses
      try {
        const seqResult = await prisma.$queryRaw<Array<{ sequence_name: string }>>`
          SELECT sequence_name 
          FROM information_schema.sequences 
          WHERE sequence_schema = 'public' 
          AND (sequence_name LIKE '%slNo%' OR sequence_name LIKE '%sl_no%' OR sequence_name LIKE '%slno%')
        `;
        
        if (seqResult.length > 0) {
          const seqName = seqResult[0].sequence_name;
          await prisma.$executeRawUnsafe(
            `SELECT setval('${seqName}', ${project.slNo}, true)`
          );
          if (process.env.NODE_ENV === 'development') console.log(`✅ Updated sequence ${seqName} to ${project.slNo}`);
        }
      } catch (seqError: any) {
        if (process.env.NODE_ENV === 'development') console.warn('⚠️  Could not update sequence after project creation:', seqError.message);
      }

      // Create audit log
      await createAuditLog({
        projectId: project.id,
        userId: req.user!.id,
        action: 'created',
        remarks: 'Project created',
      });
      logSecurityAudit({ userId: req.user!.id, role: req.user!.role, actionType: 'project_created', entityType: 'Project', entityId: project.id, summary: `Project #${project.slNo} created`, req });

      scheduleConsumerHubSync(project.id, project.projectStatus);

      res.status(201).json(project);
    } catch (error: any) {
      console.error('❌ Error creating project:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
      });
      sendErrorResponse(res, 500, error, 'Failed to create project');
    }
  }
);

// Update project
router.put(
  '/:id',
  authenticate,
  [
    body('type').optional().isIn(Object.values(ProjectType)),
    body('projectServiceType').optional().isIn(Object.values(ProjectServiceType)),
    body('projectStatus').optional().isIn(Object.values(ProjectStatus)),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Prevent editing projects in Lost status (only Admin can delete)
      if (project.projectStatus === ProjectStatus.LOST && req.user?.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: 'Projects in Lost status cannot be edited. Only Admin can delete them.' });
      }

      const updateSenseFindings = dataSenseImpossibleConflict(req.body, {
        projectStatus: project.projectStatus,
        expectedCommissioningDate: project.expectedCommissioningDate,
        confirmationDate: project.confirmationDate,
        projectCost: project.projectCost,
        advanceReceived: project.advanceReceived,
      });
      if (updateSenseFindings.length > 0) {
        return res.status(409).json(dataSenseImpossibleHttpBody(updateSenseFindings));
      }

      // For LOST status: require confirmation date (current or past), order value, and loss taxonomy
      const effectiveStatus = (req.body.projectStatus as ProjectStatus) ?? project.projectStatus;
      if (effectiveStatus === ProjectStatus.LOST) {
        const confDate = req.body.confirmationDate ?? project.confirmationDate;
        if (!confDate) {
          return res.status(400).json({ error: 'Confirmation Date (order lost date) is required for Lost projects' });
        }
        const confDateObj = new Date(confDate);
        if (isNaN(confDateObj.getTime())) {
          return res.status(400).json({ error: 'Confirmation Date must be a valid date for Lost projects' });
        }
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        if (confDateObj > todayEnd) {
          return res.status(400).json({ error: 'Confirmation Date (order lost date) cannot be a future date for Lost projects' });
        }
        const orderValue = req.body.projectCost != null
          ? parseFloat(String(req.body.projectCost))
          : (project.projectCost != null && Number(project.projectCost) > 0
              ? Number(project.projectCost)
              : ((project as { lostRevenue?: number | null }).lostRevenue ?? project.projectCost));
        if (orderValue == null || orderValue <= 0) {
          return res.status(400).json({ error: 'Order Value is required and must be greater than 0 for Lost projects (kept for analysis; excluded from pipeline/revenue by status)' });
        }
        const lostDateVal = req.body.lostDate ?? project.lostDate;
        if (!lostDateVal) {
          return res.status(400).json({ error: 'Lost date is required when project status is Lost' });
        }
        const lostDateObj = new Date(lostDateVal as string | Date);
        if (isNaN(lostDateObj.getTime())) {
          return res.status(400).json({ error: 'Lost date must be a valid date' });
        }
        if (lostDateObj > todayEnd) {
          return res.status(400).json({ error: 'Lost date cannot be a future date' });
        }
        const lostReasonVal = req.body.lostReason ?? project.lostReason;
        if (!lostReasonVal || !Object.values(LostReason).includes(lostReasonVal as LostReason)) {
          return res.status(400).json({ error: 'Reason for loss is required when project status is Lost' });
        }
        if (lostReasonVal === LostReason.OTHER) {
          const otherText = req.body.lostOtherReason ?? (project as { lostOtherReason?: string | null }).lostOtherReason;
          if (!otherText || !String(otherText).trim()) {
            return res.status(400).json({ error: 'Please describe the reason for loss when Reason is Other' });
          }
        }
        if (lostReasonVal === LostReason.LOST_TO_COMPETITION) {
          const compReason = req.body.lostToCompetitionReason ?? (project as { lostToCompetitionReason?: string | null }).lostToCompetitionReason;
          if (!compReason || !LOST_TO_COMPETITION_REASON_VALUES.includes(compReason as typeof LOST_TO_COMPETITION_REASON_VALUES[number])) {
            return res.status(400).json({ error: 'Please select why the deal was lost to competition (Lost due to Price, Features, or Relationship/Other factors)' });
          }
        }
      }

      // Operations users can only edit projects with specific statuses
      // Operations can only edit: CONFIRMED, UNDER_INSTALLATION, COMPLETED, COMPLETED_SUBSIDY_CREDITED
      if (req.user?.role === UserRole.OPERATIONS) {
        const allowedStatuses: ProjectStatus[] = [
          ProjectStatus.CONFIRMED,
          ProjectStatus.UNDER_INSTALLATION,
          ProjectStatus.COMPLETED,
          ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
        ];
        if (!allowedStatuses.includes(project.projectStatus)) {
          return res.status(403).json({ 
            error: 'Access denied. Operations users can only edit projects with status: Confirmed, Installation, Completed, or Completed - Subsidy Credited.' 
          });
        }
      }

      // Role-based access control
      let updateData: any = {};

      if (req.user?.role === UserRole.FINANCE) {
        // Finance can only update payment fields
        const allowedFields = [
          'advanceReceived',
          'advanceReceivedDate',
          'payment1',
          'payment1Date',
          'payment2',
          'payment2Date',
          'payment3',
          'payment3Date',
          'lastPayment',
          'lastPaymentDate',
        ];
        
        // Payment field pairs - amount and date must both be provided or both be empty
        const paymentFieldPairs = [
          { amount: 'advanceReceived', date: 'advanceReceivedDate', label: 'Advance Received' },
          { amount: 'payment1', date: 'payment1Date', label: 'Payment 1' },
          { amount: 'payment2', date: 'payment2Date', label: 'Payment 2' },
          { amount: 'payment3', date: 'payment3Date', label: 'Payment 3' },
          { amount: 'lastPayment', date: 'lastPaymentDate', label: 'Last Payment' },
        ];
        
        // Validate that amount and date are both provided or both empty
        for (const { amount, date, label } of paymentFieldPairs) {
          const amountValue = req.body[amount];
          const dateValue = req.body[date];
          
          // Check if amount is provided (non-zero)
          const hasAmount = amountValue !== undefined && amountValue !== null && amountValue !== '' && parseFloat(String(amountValue)) > 0;
          // Check if date is provided
          const hasDate = dateValue !== undefined && dateValue !== null && dateValue !== '' && dateValue !== 'null' && dateValue !== '0';
          
          // If amount is provided but date is not, or vice versa, return error
          if (hasAmount && !hasDate) {
            return res.status(400).json({ 
              error: `${label}: Amount is entered but date is missing. Please enter both amount and date.` 
            });
          } else if (hasDate && !hasAmount) {
            return res.status(400).json({ 
              error: `${label}: Date is entered but amount is missing. Please enter both amount and date.` 
            });
          }
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[FINANCE UPDATE] Request body:', JSON.stringify(req.body, null, 2));
          console.log('[FINANCE UPDATE] Project current values:', {
            advanceReceived: project.advanceReceived,
            payment1: project.payment1,
            payment2: project.payment2,
            payment3: project.payment3,
            lastPayment: project.lastPayment,
            projectCost: project.projectCost,
          });
        }
        // Process all payment fields - Finance role should always receive ALL payment fields
        // Process every field in allowedFields, using req.body values or defaulting
        for (const field of allowedFields) {
            if (field.includes('Date')) {
              // Handle date fields
              if (req.body.hasOwnProperty(field)) {
                const dateValue = req.body[field];
                if (dateValue === null || dateValue === undefined || dateValue === '' || dateValue === 'null' || dateValue === '0') {
                  updateData[field] = null;
                } else {
                  try {
                    const date = new Date(dateValue as string);
                    
                    // Validate date is valid and within reasonable range
                    if (isNaN(date.getTime())) {
                      console.error(`[FINANCE UPDATE] Invalid date for ${field}:`, dateValue);
                      return res.status(400).json({ 
                        error: `Invalid date format for ${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}. Please enter a valid date.` 
                      });
                    }
                    
                    // Check year range (1900-2100)
                    const year = date.getFullYear();
                    if (year < 1900 || year > 2100) {
                      console.error(`[FINANCE UPDATE] Date out of range for ${field}:`, dateValue, 'Year:', year);
                      return res.status(400).json({ 
                        error: `Invalid date for ${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}. Year must be between 1900 and 2100.` 
                      });
                    }
                    
                    updateData[field] = date;
                  } catch (error) {
                    console.error(`[FINANCE UPDATE] Date parsing error for ${field}:`, dateValue, error);
                    return res.status(400).json({ 
                      error: `Invalid date format for ${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}. Please enter a valid date (YYYY-MM-DD).` 
                    });
                  }
                }
              }
              // If field not provided, don't include in update (preserve existing value)
            } else {
            // Handle payment amount fields
            if (req.body.hasOwnProperty(field)) {
              const value = req.body[field];
              if (process.env.NODE_ENV === 'development') console.log(`[FINANCE UPDATE] Processing amount field ${field}:`, value, typeof value);
              // Convert to number, default to 0 if empty/invalid
              if (value === null || value === undefined || value === '' || value === '0') {
                updateData[field] = 0;
              } else {
                const numValue = parseFloat(String(value));
                updateData[field] = isNaN(numValue) ? 0 : numValue;
              }
              if (process.env.NODE_ENV === 'development') console.log(`[FINANCE UPDATE] Set ${field} to:`, updateData[field]);
            } else {
              if (process.env.NODE_ENV === 'development') console.log(`[FINANCE UPDATE] Field ${field} NOT in req.body, preserving existing value`);
            }
            // If field not provided, don't include in update (preserve existing value)
          }
        }
        if (process.env.NODE_ENV === 'development') console.log('[FINANCE UPDATE] updateData after processing fields:', JSON.stringify(updateData, null, 2));
        // Recalculate payments using updated values where provided, otherwise existing values
        const finalAdvanceReceived = updateData.advanceReceived !== undefined ? (updateData.advanceReceived ?? 0) : (project.advanceReceived ?? 0);
        const finalPayment1 = updateData.payment1 !== undefined ? (updateData.payment1 ?? 0) : (project.payment1 ?? 0);
        const finalPayment2 = updateData.payment2 !== undefined ? (updateData.payment2 ?? 0) : (project.payment2 ?? 0);
        const finalPayment3 = updateData.payment3 !== undefined ? (updateData.payment3 ?? 0) : (project.payment3 ?? 0);
        const finalLastPayment = updateData.lastPayment !== undefined ? (updateData.lastPayment ?? 0) : (project.lastPayment ?? 0);
        
        if (process.env.NODE_ENV === 'development') console.log('[FINANCE UPDATE] Final payment values for calculation:', {
          advanceReceived: finalAdvanceReceived,
          payment1: finalPayment1,
          payment2: finalPayment2,
          payment3: finalPayment3,
          lastPayment: finalLastPayment,
          projectCost: project.projectCost,
        });
        const paymentCalculations = calculatePayments({
          advanceReceived: finalAdvanceReceived,
          payment1: finalPayment1,
          payment2: finalPayment2,
          payment3: finalPayment3,
          lastPayment: finalLastPayment,
          projectCost: (project.projectCost ?? 0),
        });
        if (process.env.NODE_ENV === 'development') console.log('[FINANCE UPDATE] Payment calculations result:', paymentCalculations);
        Object.assign(updateData, paymentCalculations);
        if (process.env.NODE_ENV === 'development') console.log('[FINANCE UPDATE] Final updateData before save:', JSON.stringify(updateData, null, 2));
      } else if (req.user?.role === UserRole.OPERATIONS) {
        // Operations can update execution fields and Sales & Commercial (but not payment tracking)
        const allowedFields = [
          // Execution / lifecycle fields
          'mnrePortalRegistrationDate',
          'feasibilityDate',
          'registrationDate',
          'expectedCommissioningDate',
          'installationCompletionDate',
          'completionReportSubmissionDate',
          'mnreInstallationDetails',
          'subsidyRequestDate',
          'subsidyCreditedDate',
          'projectStatus',
          'totalProjectCost',
          // Panel / equipment
          'panelBrand', // Operations can update panel brand
          'inverterBrand', // Operations can update inverter brand
          'panelType', // Operations can update panel type
          'panelCapacityW', // Operations can update panel capacity (W)
          'inverterCapacityKw', // Operations can update inverter capacity (kW)
          // Sales & Commercial block (non-payment financials)
          'leadSource',
          'leadSourceDetails',
          'systemCapacity',
          'projectCost',
          'confirmationDate',
          'year',
          'roofType',
          'systemType',
          'incentiveEligible',
          'loanDetails',
          'availingLoan',
          'financingBank',
          'financingBankOther',
          // Lost taxonomy (when Ops marks Confirmed+ as Lost)
          'lostDate',
          'lostReason',
          'lostToCompetitionReason',
          'lostOtherReason',
        ];
        for (const field of allowedFields) {
          if (req.body[field] !== undefined) {
            if (field.includes('Date')) {
              // Handle date fields
              const dateValue = req.body[field];
              if (dateValue && dateValue !== '' && dateValue !== '0') {
                try {
                  const date = new Date(dateValue as string);
                  
                  // Validate date
                  if (isNaN(date.getTime())) {
                    const fieldLabel = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    return res.status(400).json({ 
                      error: `Invalid date format for ${fieldLabel}. Please enter a valid date.` 
                    });
                  }
                  
                  // Check year range (1900-2100)
                  const year = date.getFullYear();
                  if (year < 1900 || year > 2100) {
                    const fieldLabel = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    return res.status(400).json({ 
                      error: `Invalid date for ${fieldLabel}. Year must be between 1900 and 2100.` 
                    });
                  }
                  
                  updateData[field] = date;
                } catch (error) {
                  const fieldLabel = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                  return res.status(400).json({ 
                    error: `Invalid date format for ${fieldLabel}. Please enter a valid date (YYYY-MM-DD).` 
                  });
                }
              } else {
                updateData[field] = null;
              }
            } else if (field === 'mnreInstallationDetails') {
              // Handle string field - convert to string or null
              const value = req.body[field];
              updateData[field] = value !== null && value !== undefined && value !== '' && value !== 0
                ? String(value)
                : null;
            } else if (field === 'panelCapacityW' || field === 'inverterCapacityKw') {
              // Integer fields — panel watts, inverter kW
              const value = req.body[field];
              if (value !== null && value !== undefined && value !== '') {
                const intVal = parseInt(String(value), 10);
                updateData[field] = Number.isInteger(intVal) && intVal >= 0 ? intVal : null;
              } else {
                updateData[field] = null;
              }
            } else if (field === 'panelBrand' || field === 'inverterBrand' || field === 'panelType') {
              // Handle string fields - convert to string or null
              const value = req.body[field];
              updateData[field] = value !== null && value !== undefined && value !== '' && value !== 'null'
                ? String(value)
                : null;
            } else if (field === 'projectStatus') {
              // Handle enum field - must be a valid ProjectStatus value
              const value = req.body[field];
              if (value && value !== '' && value !== 0 && Object.values(ProjectStatus).includes(value as ProjectStatus)) {
                updateData[field] = value as ProjectStatus;
              } else {
                // Skip invalid status values
                continue;
              }
            } else if (field === 'totalProjectCost') {
              // Handle numeric field - convert to float or null
              const value = req.body[field];
              const numValue = value !== null && value !== undefined && value !== ''
                ? (isNaN(parseFloat(String(value))) ? null : parseFloat(String(value)))
                : null;
              updateData[field] = numValue;
            } else if (field === 'systemCapacity') {
              // Int column — raw strings/floats from JSON caused Postgres 22P03 (wrong bind format)
              updateData[field] = parseSystemCapacityKw(req.body[field]);
            } else if (field === 'projectCost') {
              const value = req.body[field];
              updateData[field] =
                value !== null && value !== undefined && value !== ''
                  ? (isNaN(parseFloat(String(value))) ? null : parseFloat(String(value)))
                  : null;
            } else if (field === 'loanDetails') {
              const v = req.body[field];
              if (v && typeof v === 'object') {
                updateData[field] = JSON.stringify(v);
              } else if (v === null || v === undefined || v === '' || v === 'null') {
                updateData[field] = null;
              } else {
                updateData[field] = String(v);
              }
            } else if (field === 'year') {
              const v = req.body[field];
              updateData[field] =
                v !== null && v !== undefined && v !== '' && v !== 'null' ? String(v) : null;
            } else if (field === 'leadSource') {
              const value = req.body[field];
              if (value && value !== '' && Object.values(LeadSource).includes(value as LeadSource)) {
                updateData[field] = value as LeadSource;
              } else if (value === null || value === '' || value === 'null') {
                updateData[field] = null;
              } else {
                continue;
              }
            } else if (field === 'systemType') {
              const value = req.body[field];
              if (value && value !== '' && Object.values(SystemType).includes(value as SystemType)) {
                updateData[field] = value as SystemType;
              } else if (value === null || value === '' || value === 'null') {
                updateData[field] = null;
              } else {
                continue;
              }
            } else if (field === 'availingLoan') {
              const raw = req.body[field];
              const truthyValues = ['true', 'YES', 'yes', '1', 'on', true, 1];
              const falsyValues = ['false', 'NO', 'no', '0', false, 0];
              if (truthyValues.includes(raw as any)) updateData[field] = true;
              else if (falsyValues.includes(raw as any) || raw === undefined) updateData[field] = false;
            } else if (field === 'incentiveEligible') {
              const raw = req.body[field];
              updateData[field] = raw === true || raw === 'true' || raw === 1 || raw === '1';
            } else if (
              field === 'financingBank' ||
              field === 'financingBankOther' ||
              field === 'roofType' ||
              field === 'leadSourceDetails' ||
              field === 'lostOtherReason'
            ) {
              const value = req.body[field];
              updateData[field] =
                value !== null && value !== undefined && value !== '' && value !== 'null'
                  ? String(value)
                  : null;
            } else if (field === 'lostReason') {
              const value = req.body[field];
              if (value && value !== '' && Object.values(LostReason).includes(value as LostReason)) {
                updateData[field] = value as LostReason;
              } else if (value === null || value === '' || value === 'null') {
                updateData[field] = null;
              } else {
                continue;
              }
            } else if (field === 'lostToCompetitionReason') {
              const value = req.body[field];
              if (
                value &&
                value !== '' &&
                LOST_TO_COMPETITION_REASON_VALUES.includes(
                  value as (typeof LOST_TO_COMPETITION_REASON_VALUES)[number],
                )
              ) {
                updateData[field] = value;
              } else if (value === null || value === '' || value === 'null') {
                updateData[field] = null;
              } else {
                continue;
              }
            } else {
              continue;
            }
          }
        }

        if (updateData.confirmationDate !== undefined) {
          const conf = updateData.confirmationDate;
          if (conf instanceof Date && !isNaN(conf.getTime())) {
            const calculatedYear = calculateFY(conf);
            if (calculatedYear) updateData.year = calculatedYear;
          }
        }

        if (updateData.projectCost !== undefined || updateData.systemCapacity !== undefined) {
          updateData.expectedProfit = calculateExpectedProfit(
            updateData.projectCost ?? project.projectCost,
            updateData.systemCapacity ?? project.systemCapacity
          );
        }
        
        // Recalculate gross profit if Order Value (projectCost) or Total Project Cost (totalProjectCost) changed
        if (updateData.projectCost !== undefined || updateData.totalProjectCost !== undefined) {
          const newGrossProfit = calculateGrossProfit(
            updateData.projectCost ?? project.projectCost,
            updateData.totalProjectCost ?? project.totalProjectCost
          );
          updateData.grossProfit = newGrossProfit;
          
          // Recalculate profitability using the newly calculated grossProfit
          updateData.profitability = calculateProfitability(
            newGrossProfit,
            updateData.projectCost ?? project.projectCost
          );
        } else if (updateData.grossProfit !== undefined) {
          // If grossProfit was directly updated, recalculate profitability
          updateData.profitability = calculateProfitability(
            updateData.grossProfit,
            project.projectCost
          );
        }
      } else if (req.user?.role === UserRole.SALES) {
        // Sales can update sales fields and view-only payment status
        if (project.salespersonId !== req.user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
        // Sales can update commercial details, but not payment amounts
        // Define allowed fields for Sales role
        // Note: 'year' is auto-calculated from confirmationDate, so it's not in allowedFields
        const allowedFields = [
          'type',
          'projectServiceType',
          'systemCapacity',
          'projectCost',
          'confirmationDate',
          'loanDetails',
          'availingLoan',
          'financingBank',
          'financingBankOther',
          'incentiveEligible',
          'remarks',
          'internalNotes',
          'projectStatus', // Sales can update status
          'leadSource', // Sales can update lead source
          'leadSourceDetails', // Sales can update lead source details
          'roofType', // Sales can update roof type
          'systemType', // Sales can update system type
          // Lost taxonomy — required when marking Lost (was previously dropped by allowlist)
          'lostDate',
          'lostReason',
          'lostToCompetitionReason',
          'lostOtherReason',
        ];
        
        // Only process allowed fields
        for (const key of allowedFields) {
          if (req.body[key] !== undefined) {
            if (key.includes('Date')) {
              // Handle date fields - convert empty strings and invalid dates to null
              const dateValue = req.body[key];
              if (dateValue && dateValue !== '' && dateValue !== '0' && dateValue !== 'null') {
                try {
                  const date = new Date(dateValue as string);
                  if (!isNaN(date.getTime())) {
                    updateData[key] = date;
                    // Auto-calculate year if confirmationDate is updated
                    if (key === 'confirmationDate') {
                      const calculatedYear = calculateFY(date);
                      if (calculatedYear) {
                        updateData.year = calculatedYear;
                      }
                    }
                  } else {
                    updateData[key] = null;
                  }
                } catch {
                  updateData[key] = null;
                }
              } else {
                updateData[key] = null;
              }
            } else if (key === 'loanDetails' && typeof req.body[key] === 'object' && req.body[key] !== null) {
              updateData[key] = JSON.stringify(req.body[key]);
            } else if (key === 'systemCapacity') {
              updateData[key] = parseSystemCapacityKw(req.body[key]);
            } else if (key === 'projectCost') {
              // Convert numeric fields from string to number
              const value = req.body[key];
              const numValue = value !== null && value !== undefined && value !== ''
                ? (isNaN(parseFloat(String(value))) ? null : parseFloat(String(value)))
                : null;
              updateData[key] = numValue;
            } else if (key === 'incentiveEligible') {
              updateData[key] = Boolean(req.body[key]);
            } else if (key === 'leadSource') {
              // Handle enum field - must be a valid LeadSource value
              const value = req.body[key];
              if (value && value !== '' && Object.values(LeadSource).includes(value as LeadSource)) {
                updateData[key] = value as LeadSource;
              } else if (value === null || value === '' || value === 'null') {
                updateData[key] = null;
              }
              // Skip invalid leadSource values (don't update)
            } else if (key === 'leadSourceDetails' || key === 'roofType' || key === 'lostOtherReason') {
              const value = req.body[key];
              updateData[key] = value !== null && value !== undefined && value !== '' && value !== 'null'
                ? String(value)
                : null;
            } else if (key === 'systemType') {
              // Handle enum field - must be a valid SystemType value
              const value = req.body[key];
              if (value && value !== '' && Object.values(SystemType).includes(value as SystemType)) {
                updateData[key] = value as SystemType;
              } else if (value === null || value === '' || value === 'null') {
                updateData[key] = null;
              }
              // Skip invalid systemType values (don't update)
            } else if (key === 'lostReason') {
              const value = req.body[key];
              if (value && value !== '' && Object.values(LostReason).includes(value as LostReason)) {
                updateData[key] = value as LostReason;
              } else if (value === null || value === '' || value === 'null') {
                updateData[key] = null;
              }
            } else if (key === 'lostToCompetitionReason') {
              const value = req.body[key];
              if (
                value &&
                value !== '' &&
                LOST_TO_COMPETITION_REASON_VALUES.includes(
                  value as (typeof LOST_TO_COMPETITION_REASON_VALUES)[number],
                )
              ) {
                updateData[key] = value;
              } else if (value === null || value === '' || value === 'null') {
                updateData[key] = null;
              }
            } else {
              updateData[key] = req.body[key];
            }
          }
        }
        // Recalculate expected profit if project cost or capacity changed
        if (updateData.projectCost !== undefined || updateData.systemCapacity !== undefined) {
          updateData.expectedProfit = calculateExpectedProfit(
            updateData.projectCost ?? project.projectCost,
            updateData.systemCapacity ?? project.systemCapacity
          );
        }
        
        // Recalculate gross profit if Order Value (projectCost) or Total Project Cost (totalProjectCost) changed
        if (updateData.projectCost !== undefined || updateData.totalProjectCost !== undefined) {
          const newGrossProfit = calculateGrossProfit(
            updateData.projectCost ?? project.projectCost,
            updateData.totalProjectCost ?? project.totalProjectCost
          );
          updateData.grossProfit = newGrossProfit;
          
          // Recalculate profitability using the newly calculated grossProfit and updated projectCost
          const updatedProjectCost = updateData.projectCost ?? project.projectCost;
          updateData.profitability = calculateProfitability(
            newGrossProfit,
            updatedProjectCost
          );
        } else if (updateData.projectCost !== undefined) {
          // If only projectCost changed (but not totalProjectCost), recalculate profitability with existing grossProfit
          if (project.grossProfit !== null && project.grossProfit !== undefined) {
            updateData.profitability = calculateProfitability(
              project.grossProfit,
              updateData.projectCost
            );
          }
        } else if (updateData.grossProfit !== undefined) {
          // If grossProfit was directly updated, recalculate profitability
          updateData.profitability = calculateProfitability(
            updateData.grossProfit,
            project.projectCost
          );
        }
      } else if (req.user?.role === UserRole.ADMIN) {
        // Admin can update everything except immutable fields
        updateData = { ...req.body };
        // Remove immutable/system fields that shouldn't be updated
        delete updateData.id;
        delete updateData.slNo;
        delete updateData.count;
        delete updateData.createdById;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        delete updateData.totalAmountReceived;
        delete updateData.balanceAmount;
        delete updateData.paymentStatus;
        delete updateData.expectedProfit;
        delete updateData.customer; // Remove relation objects
        delete updateData.createdBy; // Remove relation objects
        delete updateData.salesperson; // Remove relation objects
        delete updateData.opsPerson; // Remove relation objects
        delete updateData.documents; // Remove relation objects
        delete updateData.auditLogs; // Remove relation objects
        
        // Handle date fields
        const dateFields = [
          'confirmationDate',
          'lostDate',
          'advanceReceivedDate',
          'payment1Date',
          'payment2Date',
          'payment3Date',
          'lastPaymentDate',
          'expectedCommissioningDate',
          'mnrePortalRegistrationDate',
          'feasibilityDate',
          'registrationDate',
          'installationCompletionDate',
          'completionReportSubmissionDate',
          'subsidyRequestDate',
          'subsidyCreditedDate',
        ];
        for (const field of dateFields) {
          if (updateData[field] !== undefined) {
            const dateValue = updateData[field];
            if (dateValue && dateValue !== '' && dateValue !== 'null' && dateValue !== '0') {
              try {
                const date = new Date(dateValue);
                if (!isNaN(date.getTime())) {
                  // Check year range (1900-2100)
                  const year = date.getFullYear();
                  if (year < 1900 || year > 2100) {
                    return res.status(400).json({ 
                      error: `Invalid date for ${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}. Year must be between 1900 and 2100.` 
                    });
                  }
                  updateData[field] = date;
                  // Auto-calculate year if confirmationDate is updated
                  if (field === 'confirmationDate') {
                    const calculatedYear = calculateFY(date);
                    if (calculatedYear) {
                      updateData.year = calculatedYear;
                    }
                  }
                } else {
                  updateData[field] = null;
                }
              } catch (error) {
                updateData[field] = null;
              }
            } else {
              updateData[field] = null;
            }
          }
        }
        
        // Handle numeric fields - convert strings to numbers
        const numericFields = [
          'projectCost',
          'lostRevenue',
          'totalProjectCost',
          'advanceReceived',
          'payment1',
          'payment2',
          'payment3',
          'lastPayment',
          'expectedProfit',
          'finalProfit',
        ];
        for (const field of numericFields) {
          if (updateData[field] !== undefined) {
            const value = updateData[field];
            if (value === null || value === undefined || value === '' || value === 'null') {
              updateData[field] = null;
            } else {
              const numValue = parseFloat(String(value));
              updateData[field] = isNaN(numValue) ? null : numValue;
            }
          }
        }

        if (updateData.systemCapacity !== undefined) {
          const value = updateData.systemCapacity;
          if (value === null || value === undefined || value === '' || value === 'null') {
            updateData.systemCapacity = null;
          } else {
            updateData.systemCapacity = parseSystemCapacityKw(value);
          }
        }

        // Non-negative integer fields (Admin updates from form JSON)
        for (const field of ['panelCapacityW', 'inverterCapacityKw'] as const) {
          if (updateData[field] !== undefined) {
            const value = updateData[field];
            if (value === null || value === undefined || value === '' || value === 'null') {
              updateData[field] = null;
            } else {
              const intVal = parseInt(String(value), 10);
              updateData[field] = Number.isInteger(intVal) && intVal >= 0 ? intVal : null;
            }
          }
        }
        
        // Handle JSON fields
        if (updateData.loanDetails !== undefined) {
          if (updateData.loanDetails && typeof updateData.loanDetails === 'object') {
            updateData.loanDetails = JSON.stringify(updateData.loanDetails);
          } else if (updateData.loanDetails === null || updateData.loanDetails === '' || updateData.loanDetails === 'null') {
            updateData.loanDetails = null;
          }
        }
        
        // Handle boolean fields
        if (updateData.incentiveEligible !== undefined) {
          updateData.incentiveEligible = Boolean(updateData.incentiveEligible);
        }
        
        // Handle enum fields
        if (updateData.type !== undefined && !Object.values(ProjectType).includes(updateData.type as ProjectType)) {
          delete updateData.type;
        }
        if (updateData.projectServiceType !== undefined && !Object.values(ProjectServiceType).includes(updateData.projectServiceType as ProjectServiceType)) {
          delete updateData.projectServiceType;
        }
        if (updateData.projectStatus !== undefined && !Object.values(ProjectStatus).includes(updateData.projectStatus as ProjectStatus)) {
          delete updateData.projectStatus;
        }
        if (updateData.leadSource !== undefined && !Object.values(LeadSource).includes(updateData.leadSource as LeadSource)) {
          delete updateData.leadSource;
        }
        if (updateData.lostReason !== undefined && !Object.values(LostReason).includes(updateData.lostReason as LostReason)) {
          delete updateData.lostReason;
        }
        if (updateData.lostReason !== undefined && updateData.lostReason !== LostReason.LOST_TO_COMPETITION) {
          updateData.lostToCompetitionReason = null;
        }
        if (updateData.lostToCompetitionReason !== undefined && !LOST_TO_COMPETITION_REASON_VALUES.includes(updateData.lostToCompetitionReason as typeof LOST_TO_COMPETITION_REASON_VALUES[number])) {
          updateData.lostToCompetitionReason = null as any;
        }
        
        // Handle string fields - ensure they're strings or null
        const stringFields = ['year', 'mnreInstallationDetails', 'remarks', 'internalNotes', 'leadSourceDetails'];
        for (const field of stringFields) {
          if (updateData[field] !== undefined) {
            if (updateData[field] === null || updateData[field] === '' || updateData[field] === 'null') {
              updateData[field] = null;
            } else {
              updateData[field] = String(updateData[field]);
            }
          }
        }
        
        // Handle salespersonId - Admin can update it
        if (updateData.salespersonId !== undefined) {
          if (updateData.salespersonId === null || updateData.salespersonId === '' || updateData.salespersonId === 'null') {
            updateData.salespersonId = null;
          } else {
            // Convert to string to ensure proper format
            const salespersonIdStr = String(updateData.salespersonId).trim();
            if (!salespersonIdStr) {
              updateData.salespersonId = null;
            } else {
              try {
                // Validate that the salesperson exists (if provided)
                const salesperson = await prisma.user.findUnique({
                  where: { id: salespersonIdStr },
                  select: { id: true, role: true },
                });
                if (!salesperson) {
                  return res.status(400).json({ error: 'Invalid salesperson ID: User not found' });
                }
                // Set the validated ID
                updateData.salespersonId = salespersonIdStr;
              } catch (error: any) {
                // If Prisma query fails (e.g., invalid ID format), return error
                console.error('Error validating salespersonId:', error);
                return res.status(400).json({ error: `Invalid salesperson ID format: ${error.message}` });
              }
            }
          }
        }
        
        // Handle assignedOpsId - Admin can update it
        if (updateData.assignedOpsId !== undefined) {
          if (updateData.assignedOpsId === null || updateData.assignedOpsId === '' || updateData.assignedOpsId === 'null') {
            updateData.assignedOpsId = null;
          } else {
            // Convert to string to ensure proper format
            const opsIdStr = String(updateData.assignedOpsId).trim();
            if (!opsIdStr) {
              updateData.assignedOpsId = null;
            } else {
              try {
                // Validate that the ops user exists (if provided)
                const opsUser = await prisma.user.findUnique({
                  where: { id: opsIdStr },
                  select: { id: true, role: true },
                });
                if (!opsUser) {
                  return res.status(400).json({ error: 'Invalid assigned operations ID: User not found' });
                }
                // Set the validated ID
                updateData.assignedOpsId = opsIdStr;
              } catch (error: any) {
                // If Prisma query fails (e.g., invalid ID format), return error
                console.error('Error validating assignedOpsId:', error);
                return res.status(400).json({ error: `Invalid assigned operations ID format: ${error.message}` });
              }
            }
          }
        }
        
        // Remove customerId from updates (should not be changed after creation)
        delete updateData.customerId;
        // Recalculate payments if payment fields or project cost changed
        if (
          updateData.advanceReceived !== undefined ||
          updateData.payment1 !== undefined ||
          updateData.payment2 !== undefined ||
          updateData.payment3 !== undefined ||
          updateData.lastPayment !== undefined ||
          updateData.projectCost !== undefined
        ) {
          const paymentCalculations = calculatePayments({
            advanceReceived: updateData.advanceReceived ?? project.advanceReceived,
            payment1: updateData.payment1 ?? project.payment1,
            payment2: updateData.payment2 ?? project.payment2,
            payment3: updateData.payment3 ?? project.payment3,
            lastPayment: updateData.lastPayment ?? project.lastPayment,
            projectCost: updateData.projectCost ?? project.projectCost,
          });
          Object.assign(updateData, paymentCalculations);
        }
        // Recalculate expected profit if project cost or capacity changed
        if (updateData.projectCost !== undefined || updateData.systemCapacity !== undefined) {
          updateData.expectedProfit = calculateExpectedProfit(
            updateData.projectCost ?? project.projectCost,
            updateData.systemCapacity ?? project.systemCapacity
          );
        }
        
        // Recalculate gross profit if Order Value (projectCost) or Total Project Cost (totalProjectCost) changed
        if (updateData.projectCost !== undefined || updateData.totalProjectCost !== undefined) {
          const newGrossProfit = calculateGrossProfit(
            updateData.projectCost ?? project.projectCost,
            updateData.totalProjectCost ?? project.totalProjectCost
          );
          updateData.grossProfit = newGrossProfit;
          
          // Recalculate profitability using the newly calculated grossProfit and updated projectCost
          const updatedProjectCost = updateData.projectCost ?? project.projectCost;
          updateData.profitability = calculateProfitability(
            newGrossProfit,
            updatedProjectCost
          );
        } else if (updateData.projectCost !== undefined) {
          // If only projectCost changed (but not totalProjectCost), recalculate profitability with existing grossProfit
          if (project.grossProfit !== null && project.grossProfit !== undefined) {
            updateData.profitability = calculateProfitability(
              project.grossProfit,
              updateData.projectCost
            );
          }
        } else if (updateData.grossProfit !== undefined) {
          // If grossProfit was directly updated, recalculate profitability
          updateData.profitability = calculateProfitability(
            updateData.grossProfit,
            project.projectCost
          );
        }
      } else {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Normalize LOST: keep order value on projectCost (excluded from pipeline/revenue by status filters).
      // Mirror to lostRevenue for legacy/analysis readers. Do not zero projectCost or rewrite payments.
      const finalStatus = updateData.projectStatus ?? project.projectStatus;
      if (finalStatus === ProjectStatus.LOST) {
        const projLostRevenue = (project as { lostRevenue?: number | null }).lostRevenue;
        const fromBody =
          updateData.projectCost != null
            ? Number(updateData.projectCost)
            : req.body.projectCost != null
              ? parseFloat(String(req.body.projectCost))
              : NaN;
        const fromProject =
          project.projectCost != null && Number(project.projectCost) > 0
            ? Number(project.projectCost)
            : projLostRevenue != null && Number(projLostRevenue) > 0
              ? Number(projLostRevenue)
              : 0;
        const orderValue = Number.isFinite(fromBody) && fromBody > 0 ? fromBody : fromProject;
        if (orderValue > 0) {
          updateData.projectCost = orderValue;
          updateData.lostRevenue = orderValue;
        }
        updateData.grossProfit = null;
        updateData.profitability = null;
        updateData.expectedProfit = null;
        const effectiveLostReason =
          updateData.lostReason !== undefined ? updateData.lostReason : project.lostReason;
        if (effectiveLostReason !== LostReason.LOST_TO_COMPETITION) {
          updateData.lostToCompetitionReason = null;
        }
      }

      // Final safety check: Remove immutable/system fields that shouldn't be manually updated
      // BUT preserve auto-calculated fields (totalAmountReceived, balanceAmount, paymentStatus)
      // that were just calculated by Finance role
      // For LOST, keep profit nulling applied above (do not strip expectedProfit/grossProfit/profitability).
      const alwaysRestricted = ['id', 'slNo', 'count', 'createdById', 'createdAt', 'updatedAt', 'finalProfit'];
      if (finalStatus !== ProjectStatus.LOST) {
        alwaysRestricted.push('expectedProfit', 'grossProfit', 'profitability');
      }
      
      // Only delete these fields if they weren't just calculated by Finance role
      // Finance role explicitly sets these, so we should keep them
      const isFinanceUpdate = req.user?.role === UserRole.FINANCE;
      if (!isFinanceUpdate) {
        // For non-Finance updates, remove auto-calculated fields as they shouldn't be manually set
        alwaysRestricted.push('totalAmountReceived', 'balanceAmount', 'paymentStatus');
      }
      
      alwaysRestricted.forEach((field) => {
        delete updateData[field];
      });

      // Remove any undefined or null values that might cause issues
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Ensure we have at least one field to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      if (updateData.leadSource !== undefined || updateData.leadSourceDetails !== undefined) {
        const effectiveLeadSource =
          updateData.leadSource !== undefined ? updateData.leadSource : project.leadSource;
        const effectiveLeadSourceDetails =
          updateData.leadSourceDetails !== undefined
            ? updateData.leadSourceDetails
            : project.leadSourceDetails;
        const leadDetailsCheck = validateLeadSourceDetailsPair(
          effectiveLeadSource,
          effectiveLeadSourceDetails,
        );
        if (!leadDetailsCheck.ok) {
          return res.status(400).json({ error: leadDetailsCheck.error });
        }
        if (updateData.leadSource !== undefined && !leadSourceRequiresDetails(updateData.leadSource)) {
          updateData.leadSourceDetails = null;
        } else if (updateData.leadSourceDetails !== undefined) {
          updateData.leadSourceDetails = normalizeLeadSourceDetailsForStorage(
            effectiveLeadSource,
            effectiveLeadSourceDetails,
          );
        }
      }

      // Ensure we have at least one field to update (after lead-source normalization)
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      // Final cleanup: Remove any remaining relation objects that might have been missed
      const relationFields = ['customer', 'createdBy', 'salesperson', 'opsPerson', 'documents', 'auditLogs'];
      relationFields.forEach(field => {
        if (updateData[field] !== undefined) {
          delete updateData[field];
        }
      });

      const futurePaymentDate = assertPaymentCollectionDatesNotFuture(updateData);
      if (futurePaymentDate) {
        return res.status(400).json({
          error: `${futurePaymentDate.label} cannot be a future date.`,
        });
      }

      const updatedProject = await prisma.project.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          customer: true,
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          salesperson: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (updateData.projectStatus !== undefined && req.user) {
        logSecurityAudit({ userId: req.user.id, role: req.user.role, actionType: 'project_status_changed', entityType: 'Project', entityId: req.params.id, summary: `Status ${project.projectStatus} -> ${updateData.projectStatus}`, req });
        scheduleConsumerHubSync(updatedProject.id, updatedProject.projectStatus);
      }
      if (req.user && updateTouchesPaymentTracking(updateData)) {
        const slNo = updatedProject.slNo ?? project.slNo;
        logSecurityAudit({
          userId: req.user.id,
          role: req.user.role,
          actionType: 'payment_updated',
          entityType: 'Project',
          entityId: req.params.id,
          summary: `Payment tracking updated for project #${slNo}`,
          req,
        });
      }
      // Create audit log for significant changes
      const changedFields = Object.keys(updateData);
      for (const field of changedFields) {
        if (field !== 'updatedAt') {
          await createAuditLog({
            projectId: project.id,
            userId: req.user!.id,
            action: 'updated',
            field,
            oldValue: String(project[field as keyof typeof project] ?? ''),
            newValue: String(updateData[field] ?? ''),
          });
        }
      }

      res.json(updatedProject);
    } catch (error: any) {
      console.error('Project update error:', error);
      // Provide more detailed error information
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Unique constraint violation. A project with this information already exists.' });
      }
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Project not found' });
      }
      if (error.code === 'P2003') {
        return res.status(400).json({ error: 'Invalid foreign key reference. One of the referenced records does not exist.' });
      }
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Delete project (Admin only)
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
        include: {
          customer: {
            select: {
              customerName: true,
              customerId: true,
            },
          },
          supportTickets: {
            select: {
              id: true,
              ticketNumber: true,
            },
          },
        },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Count support tickets before deletion
      const supportTicketCount = project.supportTickets.length;
      const supportTicketNumbers = project.supportTickets.map(t => t.ticketNumber);

      // Delete project (this will cascade delete all related records including support tickets)
      await prisma.project.delete({
        where: { id: req.params.id },
      });

      res.json({ 
        message: 'Project deleted successfully',
        deleted: {
          project: {
            id: project.id,
            slNo: project.slNo,
            customerName: project.customer?.customerName || 'N/A',
            customerId: project.customer?.customerId || 'N/A',
          },
          supportTickets: {
            count: supportTicketCount,
            ticketNumbers: supportTicketNumbers,
          },
        },
      });
    } catch (error: any) {
      console.error('Error deleting project:', error);
      // Handle foreign key constraint errors
      if (error.code === 'P2003') {
        return res.status(400).json({ 
          error: 'Cannot delete project. It may have dependencies that prevent deletion.' 
        });
      }
      res.status(500).json({ error: error.message || 'Failed to delete project' });
    }
  }
);

// AI: Get delay prediction for a project
router.get(
  '/:id/delay-prediction',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const prediction = await predictProjectDelay(req.params.id);
      res.json(prediction);
    } catch (error: any) {
      console.error('Error predicting delay:', error);
      res.status(500).json({ error: error.message || 'Failed to predict delay' });
    }
  }
);

// AI: Suggest optimal pricing
router.post(
  '/suggest-pricing',
  authenticate,
  [
    body('systemCapacity').isInt({ min: 0 }),
    body('systemType').optional().isString(),
    body('city').optional().isString(),
    body('customerType').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { systemCapacity, systemType, city, customerType } = req.body;

      const suggestion = await suggestOptimalPricing(
        systemCapacity,
        systemType || 'ON_GRID',
        city,
        customerType
      );

      res.json(suggestion);
    } catch (error: any) {
      console.error('Error suggesting pricing:', error);
      res.status(500).json({ error: error.message || 'Failed to suggest pricing' });
    }
  }
);

const projectsExportSortValidators = [
  query('sortBy')
    .optional()
    .isIn([
      'systemCapacity',
      'projectCost',
      'confirmationDate',
      'creationDate',
      'profitability',
      'customerName',
      'dealHealthScore',
      'slNo',
      'projectType',
      'projectStatus',
      'leadSource',
      'paymentStatus',
    ]),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

async function fetchProjectsForExport(
  where: Record<string, unknown>,
  sortBy: string | undefined,
  sortOrder: string | undefined,
) {
  const { orderBy, dealHealthSort } = buildProjectsTableOrderBy(sortBy, sortOrder);
  if (dealHealthSort) {
    const all = await prisma.project.findMany({
      where,
      include: PROJECTS_EXPORT_INCLUDE,
    });
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    const scored = all.map((p) => ({
      p,
      s: computeDealHealthScoreForProjectList({
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
        lastRemarkAt: (p as { projectRemarks?: { createdAt: Date }[] }).projectRemarks?.[0]?.createdAt ?? null,
        lastPaymentDate: p.lastPaymentDate,
        advanceReceivedDate: p.advanceReceivedDate,
      }),
    }));
    scored.sort((a, b) => {
      const sa = a.s ?? -1;
      const sb = b.s ?? -1;
      if (sa !== sb) return order === 'asc' ? sa - sb : sb - sa;
      const ac = a.p.createdAt?.getTime?.() ?? 0;
      const bc = b.p.createdAt?.getTime?.() ?? 0;
      return bc - ac;
    });
    return scored.map((x) => x.p);
  }
  return prisma.project.findMany({
    where,
    include: PROJECTS_EXPORT_INCLUDE,
    orderBy,
  });
}

// Export projects to Excel (Admin only) — same filters as GET /projects
router.get(
  '/export/excel',
  authenticate,
  authorize(UserRole.ADMIN),
  [...projectsListQueryValidators, ...projectsExportSortValidators],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const listFilters = parseProjectsListFilters(req.query);
      const built = buildProjectsWhere(listFilters, req.user);
      if (!built.ok) {
        return res.status(built.status).json({ error: built.error });
      }
      const { sortBy, sortOrder = 'desc' } = req.query;
      const projects = await fetchProjectsForExport(
        built.where,
        sortBy as string | undefined,
        sortOrder as string | undefined,
      );
      const exportData = projects.map((project) => mapProjectToExportRow(project));
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=projects-export-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error: any) {
      console.error('Error exporting projects to Excel:', error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Export projects to CSV (Admin only) — same filters as GET /projects
router.get(
  '/export/csv',
  authenticate,
  authorize(UserRole.ADMIN),
  [...projectsListQueryValidators, ...projectsExportSortValidators],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const listFilters = parseProjectsListFilters(req.query);
      const built = buildProjectsWhere(listFilters, req.user);
      if (!built.ok) {
        return res.status(built.status).json({ error: built.error });
      }
      const { sortBy, sortOrder = 'desc' } = req.query;
      const projects = await fetchProjectsForExport(
        built.where,
        sortBy as string | undefined,
        sortOrder as string | undefined,
      );
      const exportData = projects.map((project) => mapProjectToExportRow(project));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=projects-export-${Date.now()}.csv`);
      res.send(csv);
    } catch (error: any) {
      console.error('Error exporting projects to CSV:', error);
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
