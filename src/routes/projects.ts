import express, { Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient, ProjectStatus, ProjectType, ProjectServiceType, UserRole } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/audit';
import { calculatePayments, calculateExpectedProfit, calculateGrossProfit, calculateProfitability, calculateFY } from '../utils/calculations';
import { predictProjectDelay } from '../utils/ai';
import { suggestOptimalPricing } from '../utils/ai';

const router = express.Router();
const prisma = new PrismaClient();

// Get all projects with filters
router.get(
  '/',
  authenticate,
  [
    query('status').optional().isIn(Object.values(ProjectStatus)),
    query('type').optional().isIn(Object.values(ProjectType)),
    query('projectServiceType').optional().isIn(Object.values(ProjectServiceType)),
    query('salespersonId').optional().isString(),
    query('year').optional().isString(),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: AuthRequest, res: Response) => {
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
        limit = '50',
      } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = {};

      if (status) where.projectStatus = status;
      if (type) where.type = type;
      if (projectServiceType) where.projectServiceType = projectServiceType;
      if (salespersonId) where.salespersonId = salespersonId;
      if (year) where.year = year;
      if (search) {
        where.OR = [
          { customer: { customerName: { contains: search as string, mode: 'insensitive' } } },
          { customer: { customerId: { contains: search as string, mode: 'insensitive' } } },
          { customer: { consumerNumber: { contains: search as string, mode: 'insensitive' } } },
        ];
      }

      // Role-based filtering
      if (req.user?.role === UserRole.SALES) {
        where.salespersonId = req.user.id;
      }

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          include: {
            customer: true,
            createdBy: {
              select: { id: true, name: true, email: true },
            },
            salesperson: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: [
            { confirmationDate: 'desc' },
            { createdAt: 'desc' }, // Fallback for projects without confirmation date
          ],
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
      res.status(500).json({ error: error.message });
    }
  }
);

// Get single project
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
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
  async (req: AuthRequest, res: Response) => {
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
      } = req.body;

      // Verify customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
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

      // Calculate payments
      const paymentCalculations = calculatePayments({
        advanceReceived: 0,
        payment1: 0,
        payment2: 0,
        payment3: 0,
        lastPayment: 0,
        projectCost: projectCostNum,
      });

      const project = await prisma.project.create({
        data: {
          customerId,
          type,
          projectServiceType: projectServiceType || ProjectServiceType.EPC_PROJECT,
          salespersonId: salespersonId || (req.user?.role === UserRole.SALES ? req.user.id : null),
          year: calculatedYear, // Use auto-calculated year
          systemCapacity: systemCapacityNum,
          projectCost: projectCostNum,
          confirmationDate: confirmationDate ? new Date(confirmationDate) : null,
          loanDetails: loanDetails ? (typeof loanDetails === 'object' ? JSON.stringify(loanDetails) : loanDetails) : null,
          incentiveEligible: incentiveEligible || false,
          expectedProfit,
          grossProfit,
          profitability,
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

      // Create audit log
      await createAuditLog({
        projectId: project.id,
        userId: req.user!.id,
        action: 'created',
        remarks: 'Project created',
      });

      res.status(201).json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
  async (req: AuthRequest, res: Response) => {
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
        
        // Handle string fields - ensure they're strings or null
        const stringFields = ['year', 'mnreInstallationDetails', 'remarks', 'internalNotes'];
        for (const field of stringFields) {
          if (updateData[field] !== undefined) {
            if (updateData[field] === null || updateData[field] === '' || updateData[field] === 'null') {
              updateData[field] = null;
            } else {
              updateData[field] = String(updateData[field]);
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
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete project (Admin only)
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  async (req: AuthRequest, res: Response) => {
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
  async (req: AuthRequest, res: Response) => {
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
  async (req: AuthRequest, res: Response) => {
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

export default router;
