import express, { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient, ProjectStatus, ProjectType, ProjectServiceType, ProjectStage, UserRole, LeadSource } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';
import { calculatePayments, calculateExpectedProfit, calculateGrossProfit, calculateProfitability, calculateFY } from '../utils/calculations';
import { predictProjectDelay } from '../utils/ai';
import { suggestOptimalPricing } from '../utils/ai';
import { generateProposalContent, calculateFinancials } from '../utils/proposalGenerator';
import { generateProposalPDF } from '../utils/pdfGenerator';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';

const router = express.Router();
const prisma = new PrismaClient();

// Get all projects with filters
router.get(
  '/',
  authenticate,
  [
    // Allow multiple status values (array) - express automatically parses multiple params with same name into array
    query('status').optional().custom((value) => {
      if (!value) return true;
      const values = Array.isArray(value) ? value : [value];
      return values.every(v => Object.values(ProjectStatus).includes(v as ProjectStatus));
    }).withMessage('Invalid status value'),
    // Allow multiple type values (array)
    query('type').optional().custom((value) => {
      if (!value) return true;
      const values = Array.isArray(value) ? value : [value];
      return values.every(v => Object.values(ProjectType).includes(v as ProjectType));
    }).withMessage('Invalid type value'),
    // Allow multiple projectServiceType values (array)
    query('projectServiceType').optional().custom((value) => {
      if (!value) return true;
      const values = Array.isArray(value) ? value : [value];
      return values.every(v => Object.values(ProjectServiceType).includes(v as ProjectServiceType));
    }).withMessage('Invalid projectServiceType value'),
    // Allow multiple salespersonId values (array)
    query('salespersonId').optional().custom((value) => {
      if (!value) return true;
      const values = Array.isArray(value) ? value : [value];
      return values.every(v => typeof v === 'string');
    }).withMessage('Invalid salespersonId value'),
    query('year').optional().isString(),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isIn(['systemCapacity', 'projectCost', 'confirmationDate', 'profitability', 'customerName']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  async (req: Request, res: Response) => {
    let where: any = {};
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        status,
        type,
        projectServiceType,
        salespersonId,
        year,
        search,
        page = '1',
        limit = '25',
        sortBy,
        sortOrder = 'desc',
      } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      where = {};

      // Handle array filters (multi-select) - express sends arrays when multiple values have same param name
      const statusArray = Array.isArray(status) ? status : status ? [status] : [];
      const typeArray = Array.isArray(type) ? type : type ? [type] : [];
      const projectServiceTypeArray = Array.isArray(projectServiceType) ? projectServiceType : projectServiceType ? [projectServiceType] : [];
      const salespersonIdArray = Array.isArray(salespersonId) ? salespersonId : salespersonId ? [salespersonId] : [];

      // Role-based filtering - Sales users only see their own projects
      // This should be applied before other filters
      if (req.user?.role === UserRole.SALES) {
        where.salespersonId = req.user.id;
      }

      // Operations users can only see projects with specific statuses
      // Operations can only see: CONFIRMED, UNDER_INSTALLATION, COMPLETED, COMPLETED_SUBSIDY_CREDITED
      const operationsAllowedStatuses: ProjectStatus[] = [
        ProjectStatus.CONFIRMED,
        ProjectStatus.UNDER_INSTALLATION,
        ProjectStatus.COMPLETED,
        ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
      ];

      if (req.user?.role === UserRole.OPERATIONS) {
        // If Operations user provides status filter, validate it's within allowed statuses
        if (statusArray.length > 0) {
          // Filter statusArray to only include allowed statuses
          const filteredStatusArray = statusArray.filter((status): status is ProjectStatus =>
            operationsAllowedStatuses.includes(status as ProjectStatus)
          );
          if (filteredStatusArray.length > 0) {
            where.projectStatus = { in: filteredStatusArray };
          } else {
            // If all provided statuses are invalid, set to allowed statuses (or empty result)
            where.projectStatus = { in: operationsAllowedStatuses };
          }
        } else {
          // No status filter provided, show all allowed statuses
          where.projectStatus = { in: operationsAllowedStatuses };
        }
      } else if (statusArray.length > 0) {
        // Non-Operations users can filter by any status
        where.projectStatus = { in: statusArray as string[] };
      }
      if (typeArray.length > 0) where.type = { in: typeArray as string[] };
      if (projectServiceTypeArray.length > 0) where.projectServiceType = { in: projectServiceTypeArray as string[] };
      // Only apply salespersonId filter for non-Sales users (Sales users already filtered above)
      if (salespersonIdArray.length > 0 && req.user?.role !== UserRole.SALES) {
        where.salespersonId = { in: salespersonIdArray as string[] };
      }
      if (year) where.year = year;
      
      // Handle search - combine with existing conditions using AND
      if (search) {
        const searchConditions = {
          OR: [
            { customer: { customerName: { contains: search as string, mode: 'insensitive' } } },
            { customer: { customerId: { contains: search as string, mode: 'insensitive' } } },
            { customer: { consumerNumber: { contains: search as string, mode: 'insensitive' } } },
          ],
        };
        
        // If we already have top-level conditions (like salespersonId), we need to wrap in AND
        const topLevelKeys = Object.keys(where).filter(key => key !== 'AND' && key !== 'OR');
        if (topLevelKeys.length > 0) {
          // Move all existing top-level conditions into AND array
          const existingConditions: any[] = [];
          topLevelKeys.forEach(key => {
            existingConditions.push({ [key]: where[key] });
          });
          where.AND = [...existingConditions, searchConditions];
          // Remove moved conditions from top level
          topLevelKeys.forEach(key => {
            delete where[key];
          });
        } else {
          // No top-level conditions, can add OR directly
          where.OR = searchConditions.OR;
        }
      }

      // Build orderBy based on sortBy parameter
      let orderBy: any[] = [];
      if (sortBy) {
        const order = sortOrder === 'asc' ? 'asc' : 'desc';
        switch (sortBy) {
          case 'systemCapacity':
            orderBy = [{ systemCapacity: order }, { createdAt: 'desc' }];
            break;
          case 'projectCost':
            orderBy = [{ projectCost: order }, { createdAt: 'desc' }];
            break;
          case 'confirmationDate':
            orderBy = [{ confirmationDate: order }, { createdAt: 'desc' }];
            break;
          case 'profitability':
            orderBy = [{ profitability: order }, { createdAt: 'desc' }];
            break;
          case 'customerName':
            orderBy = [{ customer: { customerName: order } }, { createdAt: 'desc' }];
            break;
          default:
            orderBy = [{ confirmationDate: 'desc' }, { createdAt: 'desc' }];
        }
      } else {
        // Default sorting
        orderBy = [
          { confirmationDate: 'desc' },
          { createdAt: 'desc' }, // Fallback for projects without confirmation date
        ];
      }

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          select: {
            id: true,
            slNo: true,
            customerId: true,
            type: true,
            projectServiceType: true,
            salespersonId: true,
            year: true,
            systemCapacity: true,
            projectCost: true,
            projectStatus: true,
            confirmationDate: true,
            createdAt: true,
            paymentStatus: true,
            customer: {
              select: {
                id: true,
                customerId: true,
                customerName: true,
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
          },
          orderBy,
          skip,
          take,
        }),
        prisma.project.count({ where }),
      ]);

      res.json({
        projects,
        pagination: {
          page: parseInt(page as string),
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
      });
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
      });
      console.error('User role:', req.user?.role);
      console.error('Where clause:', JSON.stringify(where, null, 2));
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

    // Always verify and recalculate grossProfit and profitability if we have the required values
    let needsUpdate = false;
    const updateData: any = {};

    // Recalculate grossProfit if we have projectCost and totalProjectCost
    if (project.projectCost !== null && project.totalProjectCost !== null) {
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

    // Update the database if recalculations were needed
    if (needsUpdate) {
      await prisma.project.update({
        where: { id: project.id },
        data: updateData,
      });
    }

    res.json(project);
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
        lostOtherReason,
        leadId,
        assignedOpsId,
        panelBrand,
        inverterBrand,
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

      // For Sales users: Only allow creating projects for customers they created or are tagged to
      if (req.user?.role === UserRole.SALES) {
        const isCustomerCreator = customer.createdById === req.user.id;
        const isTaggedSalesperson = customer.salespersonId === req.user.id;
        
        if (!isCustomerCreator && !isTaggedSalesperson) {
          return res.status(403).json({ error: 'You can only create projects for customers you created or are tagged to' });
        }
      }

      // Convert confirmationDate to Date object
      const confirmationDateObj = confirmationDate ? new Date(confirmationDate) : null;
      if (!confirmationDateObj || isNaN(confirmationDateObj.getTime())) {
        return res.status(400).json({ error: 'Confirmation Date is required and must be a valid date' });
      }

      // Auto-calculate FY from confirmationDate (override year if provided)
      const calculatedYear = calculateFY(confirmationDateObj);
      if (!calculatedYear) {
        return res.status(400).json({ error: 'Unable to calculate Financial Year from Confirmation Date' });
      }

      // Convert string numbers to floats (form data comes as strings)
      const systemCapacityNum = systemCapacity ? (isNaN(parseFloat(systemCapacity)) ? null : parseFloat(systemCapacity)) : null;
      const projectCostNum = projectCost ? (isNaN(parseFloat(projectCost)) ? null : parseFloat(projectCost)) : null;

      // Auto-calculate expected profit
      const expectedProfit = calculateExpectedProfit(projectCostNum, systemCapacityNum);
      
      // Auto-calculate gross profit (Order Value - Total Project Cost)
      // Initially totalProjectCost is null, so grossProfit will be null
      const grossProfit = calculateGrossProfit(projectCostNum, null);
      
      // Auto-calculate profitability (Gross Profit / Order Value × 100)
      // Initially grossProfit is null, so profitability will be null
      const profitability = calculateProfitability(grossProfit, projectCostNum);

      // Convert payment amounts from strings to numbers
      const advanceReceivedNum = advanceReceived ? (isNaN(parseFloat(advanceReceived)) ? 0 : parseFloat(advanceReceived)) : 0;
      const payment1Num = payment1 ? (isNaN(parseFloat(payment1)) ? 0 : parseFloat(payment1)) : 0;
      const payment2Num = payment2 ? (isNaN(parseFloat(payment2)) ? 0 : parseFloat(payment2)) : 0;
      const payment3Num = payment3 ? (isNaN(parseFloat(payment3)) ? 0 : parseFloat(payment3)) : 0;
      const lastPaymentNum = lastPayment ? (isNaN(parseFloat(lastPayment)) ? 0 : parseFloat(lastPayment)) : 0;

      // Calculate payments
      const paymentCalculations = calculatePayments({
        advanceReceived: advanceReceivedNum,
        payment1: payment1Num,
        payment2: payment2Num,
        payment3: payment3Num,
        lastPayment: lastPaymentNum,
        projectCost: projectCostNum,
      });

      // Convert date strings to Date objects
      const convertDate = (dateStr: any): Date | null => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
      };

      // Manually calculate and set slNo to prevent unique constraint violations
      // This is necessary when data is migrated and sequences are out of sync
      let nextSlNo: number;
      try {
        // Get the current max slNo value
        const maxSlNoResult = await prisma.$queryRaw<Array<{ max: bigint | null }>>`
          SELECT MAX("slNo") as max FROM "projects"
        `;
        const currentMax = maxSlNoResult[0]?.max ? Number(maxSlNoResult[0].max) : 0;
        nextSlNo = currentMax + 1;
        console.log(`📝 Calculated next slNo: ${nextSlNo} (max was: ${currentMax})`);
      } catch (slNoError: any) {
        // If we can't get max, start from 1
        console.warn('⚠️  Could not get max slNo, starting from 1:', slNoError.message);
        nextSlNo = 1;
      }

      const project = await prisma.project.create({
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
          confirmationDate: confirmationDate ? new Date(confirmationDate) : null,
          loanDetails: loanDetails ? (typeof loanDetails === 'object' ? JSON.stringify(loanDetails) : loanDetails) : null,
          incentiveEligible: incentiveEligible || false,
          leadSource: leadSource || null,
          leadSourceDetails: leadSourceDetails || null,
          expectedProfit,
          grossProfit,
          profitability,
          // Additional fields
          roofType: roofType || null,
          systemType: systemType || null,
          projectStatus: projectStatus || ProjectStatus.LEAD,
          lostDate: convertDate(lostDate),
          lostReason: lostReason || null,
          lostOtherReason: lostOtherReason || null,
          leadId: leadId || null,
          assignedOpsId: assignedOpsId || null,
          panelBrand: panelBrand || null,
          inverterBrand: inverterBrand || null,
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
            `SELECT setval('${seqName}', ${nextSlNo}, true)`
          );
          console.log(`✅ Updated sequence ${seqName} to ${nextSlNo}`);
        }
      } catch (seqError: any) {
        // Non-critical - sequence update failed, but project was created successfully
        console.warn('⚠️  Could not update sequence after project creation:', seqError.message);
      }

      // Create audit log
      await createAuditLog({
        projectId: project.id,
        userId: req.user!.id,
        action: 'created',
        remarks: 'Project created',
      });

      res.status(201).json(project);
    } catch (error: any) {
      console.error('❌ Error creating project:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack,
        body: req.body,
      });
      res.status(500).json({ 
        error: error.message || 'Failed to create project',
        details: process.env.NODE_ENV === 'development' ? {
          code: error.code,
          meta: error.meta,
        } : undefined,
      });
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
        
        // Debug: Log what's in req.body
        console.log('[FINANCE UPDATE] Request body:', JSON.stringify(req.body, null, 2));
        console.log('[FINANCE UPDATE] Project current values:', {
          advanceReceived: project.advanceReceived,
          payment1: project.payment1,
          payment2: project.payment2,
          payment3: project.payment3,
          lastPayment: project.lastPayment,
          projectCost: project.projectCost,
        });
        
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
              console.log(`[FINANCE UPDATE] Processing amount field ${field}:`, value, typeof value);
              // Convert to number, default to 0 if empty/invalid
              if (value === null || value === undefined || value === '' || value === '0') {
                updateData[field] = 0;
              } else {
                const numValue = parseFloat(String(value));
                updateData[field] = isNaN(numValue) ? 0 : numValue;
              }
              console.log(`[FINANCE UPDATE] Set ${field} to:`, updateData[field]);
            } else {
              console.log(`[FINANCE UPDATE] Field ${field} NOT in req.body, preserving existing value`);
            }
            // If field not provided, don't include in update (preserve existing value)
          }
        }
        
        console.log('[FINANCE UPDATE] updateData after processing fields:', JSON.stringify(updateData, null, 2));
        
        // Recalculate payments using updated values where provided, otherwise existing values
        const finalAdvanceReceived = updateData.advanceReceived !== undefined ? (updateData.advanceReceived ?? 0) : (project.advanceReceived ?? 0);
        const finalPayment1 = updateData.payment1 !== undefined ? (updateData.payment1 ?? 0) : (project.payment1 ?? 0);
        const finalPayment2 = updateData.payment2 !== undefined ? (updateData.payment2 ?? 0) : (project.payment2 ?? 0);
        const finalPayment3 = updateData.payment3 !== undefined ? (updateData.payment3 ?? 0) : (project.payment3 ?? 0);
        const finalLastPayment = updateData.lastPayment !== undefined ? (updateData.lastPayment ?? 0) : (project.lastPayment ?? 0);
        
        console.log('[FINANCE UPDATE] Final payment values for calculation:', {
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
        
        console.log('[FINANCE UPDATE] Payment calculations result:', paymentCalculations);
        
        Object.assign(updateData, paymentCalculations);
        
        console.log('[FINANCE UPDATE] Final updateData before save:', JSON.stringify(updateData, null, 2));
      } else if (req.user?.role === UserRole.OPERATIONS) {
        // Operations can only update execution fields
        const allowedFields = [
          'mnrePortalRegistrationDate',
          'feasibilityDate',
          'registrationDate',
          'installationCompletionDate',
          'completionReportSubmissionDate',
          'mnreInstallationDetails',
          'subsidyRequestDate',
          'subsidyCreditedDate',
          'projectStatus',
          'totalProjectCost',
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
            } else {
              updateData[field] = req.body[field];
            }
          }
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
          'incentiveEligible',
          'remarks',
          'internalNotes',
          'projectStatus', // Sales can update status
          'leadSource', // Sales can update lead source
          'leadSourceDetails', // Sales can update lead source details
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
            } else if (key === 'systemCapacity' || key === 'projectCost') {
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
            } else if (key === 'leadSourceDetails') {
              // Handle string field - convert to string or null
              const value = req.body[key];
              updateData[key] = value !== null && value !== undefined && value !== '' && value !== 'null'
                ? String(value)
                : null;
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
          'advanceReceivedDate',
          'payment1Date',
          'payment2Date',
          'payment3Date',
          'lastPaymentDate',
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
          'systemCapacity',
          'projectCost',
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

      // Final safety check: Remove immutable/system fields that shouldn't be manually updated
      // BUT preserve auto-calculated fields (totalAmountReceived, balanceAmount, paymentStatus)
      // that were just calculated by Finance role
      const alwaysRestricted = ['id', 'slNo', 'count', 'createdById', 'createdAt', 'updatedAt', 'expectedProfit', 'grossProfit', 'profitability', 'finalProfit'];
      
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

      // Final cleanup: Remove any remaining relation objects that might have been missed
      const relationFields = ['customer', 'createdBy', 'salesperson', 'opsPerson', 'documents', 'auditLogs'];
      relationFields.forEach(field => {
        if (updateData[field] !== undefined) {
          delete updateData[field];
        }
      });

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
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      await prisma.project.delete({
        where: { id: req.params.id },
      });

      res.json({ message: 'Project deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
    body('systemCapacity').isFloat({ min: 0 }),
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

// Generate AI Proposal
router.post('/:id/generate-proposal', authenticate, async (req: Request, res) => {
  try {
    const projectId = req.params.id;

    // Get project with related data
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        customer: true,
        salesperson: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check access permissions
    if (
      req.user?.role !== UserRole.ADMIN &&
      req.user?.role !== UserRole.MANAGEMENT &&
      req.user?.role !== UserRole.SALES &&
      project.salespersonId !== req.user?.id
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!project.customer) {
      return res.status(400).json({ error: 'Customer information not found' });
    }

    // Prepare proposal data
    const proposalData = {
      customer: {
        name: project.customer.customerName,
        address: project.customer.address || undefined,
        addressLine1: project.customer.addressLine1 || undefined,
        addressLine2: project.customer.addressLine2 || undefined,
        city: project.customer.city || undefined,
        state: project.customer.state || undefined,
        pinCode: project.customer.pinCode || undefined,
        phone: project.customer.phone || undefined,
        email: project.customer.email || undefined,
        customerType: project.customer.customerType || undefined,
      },
      project: {
        systemCapacity: project.systemCapacity || undefined,
        projectCost: project.projectCost || undefined,
        systemType: project.systemType || undefined,
        roofType: project.roofType || undefined,
        panelBrand: project.panelBrand || undefined,
        inverterBrand: project.inverterBrand || undefined,
        incentiveEligible: project.incentiveEligible,
        loanDetails: project.loanDetails || undefined,
      },
      salesperson: {
        name: project.salesperson?.name || 'Rayenna Energy Team',
      },
    };

    // Calculate financials
    const financials = calculateFinancials(proposalData);

    // Generate AI content
    const content = await generateProposalContent(proposalData, financials);

    // Return HTML preview (for now, PDF generation on demand)
    const htmlPreview = generateHTMLPreview(proposalData, financials, content);

    res.json({
      success: true,
      content,
      financials,
      htmlPreview,
      proposalData,
    });
  } catch (error: any) {
    console.error('Error generating proposal:', error);
    res.status(500).json({ error: error.message || 'Failed to generate proposal' });
  }
});

// Download proposal as PDF
router.get('/:id/proposal-pdf', authenticate, async (req: Request, res) => {
  try {
    const projectId = req.params.id;

    // Get project with related data
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        customer: true,
        salesperson: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!project || !project.customer) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check access permissions
    if (
      req.user?.role !== UserRole.ADMIN &&
      req.user?.role !== UserRole.MANAGEMENT &&
      req.user?.role !== UserRole.SALES &&
      project.salespersonId !== req.user?.id
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Prepare proposal data
    const proposalData = {
      customer: {
        name: project.customer.customerName,
        address: project.customer.address || undefined,
        addressLine1: project.customer.addressLine1 || undefined,
        addressLine2: project.customer.addressLine2 || undefined,
        city: project.customer.city || undefined,
        state: project.customer.state || undefined,
        pinCode: project.customer.pinCode || undefined,
        phone: project.customer.phone || undefined,
        email: project.customer.email || undefined,
        customerType: project.customer.customerType || undefined,
      },
      project: {
        systemCapacity: project.systemCapacity || undefined,
        projectCost: project.projectCost || undefined,
        systemType: project.systemType || undefined,
        roofType: project.roofType || undefined,
        panelBrand: project.panelBrand || undefined,
        inverterBrand: project.inverterBrand || undefined,
        incentiveEligible: project.incentiveEligible,
        loanDetails: project.loanDetails || undefined,
      },
      salesperson: {
        name: project.salesperson?.name || 'Rayenna Energy Team',
      },
    };

    // Calculate financials
    const financials = calculateFinancials(proposalData);

    // Generate AI content
    const content = await generateProposalContent(proposalData, financials);

    // Generate PDF
    const pdfBuffer = await generateProposalPDF(proposalData, financials, content);

    // Save PDF to file system and create document record
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `proposal-${projectId}-${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);

    // Store relative path from uploads directory
    const relativePath = path.relative(uploadsDir, filePath).replace(/\\/g, '/');

    // Create document record - AI Generated Proposal PDFs are stored with special description
    const document = await prisma.document.create({
      data: {
        projectId,
        fileName: `Proposal_${project.customer.customerName}_${project.slNo}.pdf`,
        filePath: relativePath,
        fileType: 'application/pdf',
        fileSize: pdfBuffer.length,
        category: 'documents',
        description: 'AI Generated Proposal PDF', // Special marker to identify proposal PDFs
        uploadedById: req.user!.id,
      },
    });

    // Create audit log
    await createAuditLog({
      projectId,
      userId: req.user!.id,
      action: 'proposal_pdf_generated',
      field: 'documents',
      newValue: document.fileName,
      remarks: 'AI Generated Proposal PDF saved to Key Artifacts',
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Proposal_${project.customer.customerName}_${project.slNo}.pdf"`
    );

    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to generate PDF' });
  }
});

// Helper function to generate HTML preview
function generateHTMLPreview(
  data: any,
  financials: any,
  content: any
): string {
  const addressParts = [
    data.customer.addressLine1,
    data.customer.addressLine2,
    data.customer.city,
    data.customer.state,
    data.customer.pinCode,
  ].filter(Boolean);
  const fullAddress = addressParts.length > 0
    ? addressParts.join(', ')
    : (data.customer.address || 'N/A');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Solar Proposal - ${data.customer.name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #374151;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f9fafb;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding: 30px;
      background: linear-gradient(135deg, #1e40af 0%, #059669 100%);
      color: white;
      border-radius: 8px;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: bold;
    }
    .header p {
      margin: 10px 0 0 0;
      opacity: 0.9;
    }
    .section {
      background: white;
      padding: 30px;
      margin-bottom: 30px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .section h2 {
      color: #1e40af;
      font-size: 20px;
      margin-top: 0;
      margin-bottom: 15px;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 10px;
    }
    .financial-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .financial-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .financial-table td:first-child {
      font-weight: 600;
      color: #374151;
    }
    .financial-table tr.highlight td {
      background: #f3f4f6;
      font-weight: 600;
      color: #059669;
    }
    .bullets {
      list-style: none;
      padding: 0;
    }
    .bullets li {
      padding: 8px 0;
      padding-left: 25px;
      position: relative;
    }
    .bullets li:before {
      content: "•";
      position: absolute;
      left: 0;
      color: #1e40af;
      font-weight: bold;
      font-size: 20px;
    }
    .steps {
      list-style: none;
      padding: 0;
      counter-reset: step-counter;
    }
    .steps li {
      padding: 12px 0;
      padding-left: 40px;
      position: relative;
      counter-increment: step-counter;
    }
    .steps li:before {
      content: counter(step-counter);
      position: absolute;
      left: 0;
      background: #1e40af;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>RAYENNA ENERGY</h1>
    <p>Renewable Energy Solutions</p>
    <h2 style="margin-top: 30px; font-size: 24px;">Solar Power System Proposal</h2>
    <p style="margin-top: 20px; font-size: 18px;">For: ${data.customer.name}</p>
    <p>System Capacity: ${data.project.systemCapacity || 'N/A'} kW</p>
    <p>Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  </div>

  <div class="section">
    <h2>Executive Summary</h2>
    <p>${content.executiveSummary}</p>
  </div>

  <div class="section">
    <h2>About Rayenna Energy</h2>
    <p>${content.aboutRayenna}</p>
  </div>

  <div class="section">
    <h2>Proposed Solar System</h2>
    <p>${content.systemDescription}</p>
    <table class="financial-table">
      <tr><td>System Capacity</td><td>${data.project.systemCapacity || 'N/A'} kW</td></tr>
      <tr><td>System Type</td><td>${(data.project.systemType || 'On-Grid').replace('_', '-')}</td></tr>
      <tr><td>Installation Type</td><td>${data.project.roofType ? data.project.roofType + ' Roof' : 'Roof-mounted'}</td></tr>
      <tr><td>Panel Brand</td><td>${data.project.panelBrand || 'Premium Quality'}</td></tr>
      <tr><td>Inverter Brand</td><td>${data.project.inverterBrand || 'Premium Quality'}</td></tr>
      <tr><td>Estimated Annual Generation</td><td>${financials.estimatedAnnualGeneration.toFixed(0)} kWh</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Financial Summary</h2>
    <table class="financial-table">
      <tr><td>Gross Project Cost</td><td>₹${financials.grossProjectCost.toLocaleString('en-IN')}</td></tr>
      <tr><td>Subsidy Amount</td><td>₹${financials.subsidyAmount.toLocaleString('en-IN')}</td></tr>
      <tr class="highlight"><td>Net Customer Investment</td><td>₹${financials.netCustomerInvestment.toLocaleString('en-IN')}</td></tr>
      <tr><td>Estimated Annual Generation</td><td>${financials.estimatedAnnualGeneration.toFixed(0)} kWh</td></tr>
      <tr class="highlight"><td>Estimated Yearly Savings</td><td>₹${financials.estimatedYearlySavings.toLocaleString('en-IN')}</td></tr>
      <tr><td>Estimated Payback Period</td><td>${financials.estimatedPaybackPeriod.toFixed(1)} years</td></tr>
      <tr class="highlight"><td>25-Year Lifetime Savings</td><td>₹${financials.lifetimeSavings.toLocaleString('en-IN')}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Why Rayenna Energy</h2>
    <ul class="bullets">
      ${content.whyRayenna.split('\n').filter((line: string) => line.trim()).map((point: string) => 
        `<li>${point.replace(/^[•\-\d.]+\s*/, '').trim()}</li>`
      ).join('')}
    </ul>
  </div>

  <div class="section">
    <h2>Next Steps</h2>
    <ol class="steps">
      ${content.nextSteps.split('\n').filter((line: string) => line.trim()).map((step: string) => 
        `<li>${step.replace(/^[•\-\d.]+\s*/, '').trim()}</li>`
      ).join('')}
    </ol>
  </div>

  <div style="text-align: center; margin-top: 40px; color: #6b7280; font-size: 12px;">
    <p>For queries, contact: sales@rayenna.energy | www.rayenna.energy</p>
  </div>
</body>
</html>
  `;
}

// Helper function to get customer display name for export
const getCustomerDisplayNameForExport = (customer: any): string => {
  if (!customer) return '';
  const parts = [customer.prefix, customer.firstName, customer.middleName, customer.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : customer.customerName || '';
};

// Export projects to Excel (Admin only)
router.get('/export/excel', authenticate, authorize(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const {
      status,
      type,
      projectServiceType,
      salespersonId,
      year,
      search,
      sortBy,
      sortOrder = 'desc',
    } = req.query;

    let where: any = {};

    // Handle array filters (multi-select) - express sends arrays when multiple values have same param name
    const statusArray = Array.isArray(status) ? status : status ? [status] : [];
    const typeArray = Array.isArray(type) ? type : type ? [type] : [];
    const projectServiceTypeArray = Array.isArray(projectServiceType) ? projectServiceType : projectServiceType ? [projectServiceType] : [];
    const salespersonIdArray = Array.isArray(salespersonId) ? salespersonId : salespersonId ? [salespersonId] : [];

    // Role-based filtering - Sales users only see their own projects
    if (req.user?.role === UserRole.SALES) {
      where.salespersonId = req.user.id;
    }

    // Handle array filters
    if (statusArray.length > 0) where.projectStatus = { in: statusArray as string[] };
    if (typeArray.length > 0) where.type = { in: typeArray as string[] };
    if (projectServiceTypeArray.length > 0) where.projectServiceType = { in: projectServiceTypeArray as string[] };
    if (salespersonIdArray.length > 0 && req.user?.role !== UserRole.SALES) {
      where.salespersonId = { in: salespersonIdArray as string[] };
    }
    if (year) where.year = year;

    // Handle search - combine with existing conditions using AND
    if (search) {
      const searchConditions = {
        OR: [
          { customer: { customerName: { contains: search as string, mode: 'insensitive' } } },
          { customer: { customerId: { contains: search as string, mode: 'insensitive' } } },
          { customer: { consumerNumber: { contains: search as string, mode: 'insensitive' } } },
        ],
      };

      const topLevelKeys = Object.keys(where).filter(key => key !== 'AND' && key !== 'OR');
      if (topLevelKeys.length > 0) {
        const existingConditions: any[] = [];
        topLevelKeys.forEach(key => {
          existingConditions.push({ [key]: where[key] });
        });
        where.AND = [...existingConditions, searchConditions];
        topLevelKeys.forEach(key => {
          delete where[key];
        });
      } else {
        where.OR = searchConditions.OR;
      }
    }

    // Build orderBy based on sortBy parameter
    let orderBy: any[] = [];
    if (sortBy) {
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      switch (sortBy) {
        case 'systemCapacity':
          orderBy = [{ systemCapacity: order }, { createdAt: 'desc' }];
          break;
        case 'projectCost':
          orderBy = [{ projectCost: order }, { createdAt: 'desc' }];
          break;
        case 'confirmationDate':
          orderBy = [{ confirmationDate: order }, { createdAt: 'desc' }];
          break;
        case 'profitability':
          orderBy = [{ profitability: order }, { createdAt: 'desc' }];
          break;
        case 'customerName':
          orderBy = [{ customer: { customerName: order } }, { createdAt: 'desc' }];
          break;
        default:
          orderBy = [{ confirmationDate: 'desc' }, { createdAt: 'desc' }];
      }
    } else {
      orderBy = [
        { confirmationDate: 'desc' },
        { createdAt: 'desc' },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        customer: {
          select: {
            customerId: true,
            customerName: true,
            firstName: true,
            middleName: true,
            lastName: true,
            prefix: true,
            consumerNumber: true,
          },
        },
        salesperson: {
          select: { name: true, email: true },
        },
      },
      orderBy,
    });

    // Format data for Excel
    const exportData = projects.map((project) => {
      return {
        'SL No': project.slNo || '',
        'Customer ID': project.customer?.customerId || '',
        'Customer Name': getCustomerDisplayNameForExport(project.customer) || project.customer?.customerName || '',
        'Consumer Number': project.customer?.consumerNumber || '',
        'Project Type': project.type.replace(/_/g, ' ') || '',
        'Project Service Type': project.projectServiceType?.replace(/_/g, ' ') || '',
        'System Capacity (kW)': project.systemCapacity || 0,
        'Project Cost': project.projectCost || 0,
        'Project Status': project.projectStatus.replace(/_/g, ' ') || '',
        'Payment Status': project.paymentStatus?.replace(/_/g, ' ') || '',
        'Salesperson': project.salesperson?.name || '',
        'Salesperson Email': project.salesperson?.email || '',
        'Year': project.year || '',
        'Confirmation Date': project.confirmationDate ? new Date(project.confirmationDate).toLocaleDateString('en-IN') : '',
        'Created At': project.createdAt ? new Date(project.createdAt).toLocaleDateString('en-IN') : '',
      };
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=projects-export-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error: any) {
    console.error('Error exporting projects to Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export projects to CSV (Admin only)
router.get('/export/csv', authenticate, authorize(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const {
      status,
      type,
      projectServiceType,
      salespersonId,
      year,
      search,
      sortBy,
      sortOrder = 'desc',
    } = req.query;

    let where: any = {};

    // Handle array filters (multi-select) - express sends arrays when multiple values have same param name
    const statusArray = Array.isArray(status) ? status : status ? [status] : [];
    const typeArray = Array.isArray(type) ? type : type ? [type] : [];
    const projectServiceTypeArray = Array.isArray(projectServiceType) ? projectServiceType : projectServiceType ? [projectServiceType] : [];
    const salespersonIdArray = Array.isArray(salespersonId) ? salespersonId : salespersonId ? [salespersonId] : [];

    // Role-based filtering - Sales users only see their own projects
    if (req.user?.role === UserRole.SALES) {
      where.salespersonId = req.user.id;
    }

    // Handle array filters
    if (statusArray.length > 0) where.projectStatus = { in: statusArray as string[] };
    if (typeArray.length > 0) where.type = { in: typeArray as string[] };
    if (projectServiceTypeArray.length > 0) where.projectServiceType = { in: projectServiceTypeArray as string[] };
    if (salespersonIdArray.length > 0 && req.user?.role !== UserRole.SALES) {
      where.salespersonId = { in: salespersonIdArray as string[] };
    }
    if (year) where.year = year;

    // Handle search - combine with existing conditions using AND
    if (search) {
      const searchConditions = {
        OR: [
          { customer: { customerName: { contains: search as string, mode: 'insensitive' } } },
          { customer: { customerId: { contains: search as string, mode: 'insensitive' } } },
          { customer: { consumerNumber: { contains: search as string, mode: 'insensitive' } } },
        ],
      };

      const topLevelKeys = Object.keys(where).filter(key => key !== 'AND' && key !== 'OR');
      if (topLevelKeys.length > 0) {
        const existingConditions: any[] = [];
        topLevelKeys.forEach(key => {
          existingConditions.push({ [key]: where[key] });
        });
        where.AND = [...existingConditions, searchConditions];
        topLevelKeys.forEach(key => {
          delete where[key];
        });
      } else {
        where.OR = searchConditions.OR;
      }
    }

    // Build orderBy based on sortBy parameter
    let orderBy: any[] = [];
    if (sortBy) {
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      switch (sortBy) {
        case 'systemCapacity':
          orderBy = [{ systemCapacity: order }, { createdAt: 'desc' }];
          break;
        case 'projectCost':
          orderBy = [{ projectCost: order }, { createdAt: 'desc' }];
          break;
        case 'confirmationDate':
          orderBy = [{ confirmationDate: order }, { createdAt: 'desc' }];
          break;
        case 'profitability':
          orderBy = [{ profitability: order }, { createdAt: 'desc' }];
          break;
        case 'customerName':
          orderBy = [{ customer: { customerName: order } }, { createdAt: 'desc' }];
          break;
        default:
          orderBy = [{ confirmationDate: 'desc' }, { createdAt: 'desc' }];
      }
    } else {
      orderBy = [
        { confirmationDate: 'desc' },
        { createdAt: 'desc' },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        customer: {
          select: {
            customerId: true,
            customerName: true,
            firstName: true,
            middleName: true,
            lastName: true,
            prefix: true,
            consumerNumber: true,
          },
        },
        salesperson: {
          select: { name: true, email: true },
        },
      },
      orderBy,
    });

    // Format data for CSV
    const exportData = projects.map((project) => {
      return {
        'SL No': project.slNo || '',
        'Customer ID': project.customer?.customerId || '',
        'Customer Name': getCustomerDisplayNameForExport(project.customer) || project.customer?.customerName || '',
        'Consumer Number': project.customer?.consumerNumber || '',
        'Project Type': project.type.replace(/_/g, ' ') || '',
        'Project Service Type': project.projectServiceType?.replace(/_/g, ' ') || '',
        'System Capacity (kW)': project.systemCapacity || 0,
        'Project Cost': project.projectCost || 0,
        'Project Status': project.projectStatus.replace(/_/g, ' ') || '',
        'Payment Status': project.paymentStatus?.replace(/_/g, ' ') || '',
        'Salesperson': project.salesperson?.name || '',
        'Salesperson Email': project.salesperson?.email || '',
        'Year': project.year || '',
        'Confirmation Date': project.confirmationDate ? new Date(project.confirmationDate).toLocaleDateString('en-IN') : '',
        'Created At': project.createdAt ? new Date(project.createdAt).toLocaleDateString('en-IN') : '',
      };
    });

    // Convert to CSV
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=projects-export-${Date.now()}.csv`);
    res.send(csv);
  } catch (error: any) {
    console.error('Error exporting projects to CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
