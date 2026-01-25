import express, { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { UserRole } from '@prisma/client';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';
import { generateCustomerId } from '../utils/customerId';
import * as XLSX from 'xlsx';

const router = express.Router();

// Helper function to check if user can create customers (only Sales and Admin)
const canCreateCustomer = (role: UserRole): boolean => {
  return role === UserRole.SALES || role === UserRole.ADMIN;
};

// Helper function to check if user can modify customers
const canModifyCustomer = (role: UserRole): boolean => {
  const allowedRoles: UserRole[] = [UserRole.SALES, UserRole.OPERATIONS, UserRole.MANAGEMENT, UserRole.ADMIN];
  return allowedRoles.includes(role);
};

// Get all customers with filters (all authenticated users can view)
router.get(
  '/',
  authenticate,
  [
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 10000 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        search,
        page = '1',
        limit = '25',
        salespersonId,
        myCustomers, // For Sales users: 'true' to show only their customers
      } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = {};

      // For Sales users: if myCustomers is 'true', filter to their customers
      if (req.user?.role === UserRole.SALES && myCustomers === 'true') {
        // Get customer IDs where this Sales user has created projects (backward compatibility)
        const userProjects = await prisma.project.findMany({
          where: {
            createdById: req.user.id,
          },
          select: {
            customerId: true,
          },
          distinct: ['customerId'],
        });
        const customerIdsFromProjects = userProjects.map(p => p.customerId);
        
        // Build OR condition: created by user, tagged to user, OR has projects created by user
        const orConditions: any[] = [
          { createdById: req.user.id },
          { salespersonId: req.user.id },
        ];
        
        // Add customer IDs from projects if any exist
        if (customerIdsFromProjects.length > 0) {
          orConditions.push({ id: { in: customerIdsFromProjects } });
        }
        
        where.OR = orConditions;
      } else if (req.user?.role !== UserRole.SALES) {
        // For non-Sales users: filter by salespersonId if provided
        if (salespersonId) {
          const salespersonIdArray = Array.isArray(salespersonId) ? salespersonId : [salespersonId];
          // Filter out empty strings and null values, and ensure they're strings
          const validSalespersonIds = salespersonIdArray
            .filter((id): id is string => typeof id === 'string' && id.trim() !== '');
          
          if (validSalespersonIds.length > 0) {
            // Get customer IDs where this salesperson has created projects (backward compatibility)
            const userProjects = await prisma.project.findMany({
              where: {
                createdById: { in: validSalespersonIds },
              },
              select: {
                customerId: true,
              },
              distinct: ['customerId'],
            });
            const customerIdsFromProjects = userProjects.map(p => p.customerId);
            
            // Build OR condition: salespersonId matches OR customer has projects created by salesperson
            const orConditions: any[] = [
              { salespersonId: { in: validSalespersonIds } },
            ];
            
            // Add customer IDs from projects if any exist
            if (customerIdsFromProjects.length > 0) {
              orConditions.push({ id: { in: customerIdsFromProjects } });
            }
            
            where.OR = orConditions;
          }
        }
        // If no salespersonId is provided, show all customers (no filter applied)
      }

      if (search) {
        const searchConditions = {
          OR: [
            { firstName: { contains: search as string, mode: 'insensitive' } },
            { middleName: { contains: search as string, mode: 'insensitive' } },
            { lastName: { contains: search as string, mode: 'insensitive' } },
            { customerName: { contains: search as string, mode: 'insensitive' } }, // Legacy search
            { customerId: { contains: search as string, mode: 'insensitive' } },
            { consumerNumber: { contains: search as string, mode: 'insensitive' } },
            { addressLine1: { contains: search as string, mode: 'insensitive' } },
            { city: { contains: search as string, mode: 'insensitive' } },
            { state: { contains: search as string, mode: 'insensitive' } },
            { pinCode: { contains: search as string, mode: 'insensitive' } },
          ],
        };
        
        // If we already have OR conditions (from myCustomers or salespersonId filter), combine them with AND
        if (where.OR) {
          const existingOR = where.OR;
          where.AND = [
            { OR: existingOR },
            searchConditions,
          ];
          delete where.OR;
        } else {
          // If we have other conditions (like salespersonId as direct filter), combine with AND
          const existingConditions: any = {};
          Object.keys(where).forEach(key => {
            if (key !== 'AND' && key !== 'OR') {
              existingConditions[key] = where[key];
              delete where[key];
            }
          });
          
          if (Object.keys(existingConditions).length > 0) {
            where.AND = [
              existingConditions,
              searchConditions,
            ];
          } else {
            where.OR = searchConditions.OR;
          }
        }
      }

      // Debug logging
      console.log('[CUSTOMERS API] Query params:', { search, page, limit, salespersonId, myCustomers, userRole: req.user?.role, userId: req.user?.id });
      console.log('[CUSTOMERS API] Where clause:', JSON.stringify(where, null, 2));

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            customerId: true,
            customerName: true,
            prefix: true,
            firstName: true,
            middleName: true,
            lastName: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            country: true,
            pinCode: true,
            latitude: true,
            longitude: true,
            consumerNumber: true,
            contactNumbers: true,
            email: true,
            createdAt: true,
            createdById: true,
            salespersonId: true,
            _count: {
              select: { projects: true },
            },
            projects: {
              select: {
                createdById: true,
              },
              take: 1,
            },
          },
        }),
        prisma.customer.count({ where }),
      ]);

      console.log('[CUSTOMERS API] Found customers:', customers.length, 'Total:', total);

      res.json({
        customers,
        total,
        page: parseInt(page as string),
        limit: take,
        totalPages: Math.ceil(total / take),
      });
    } catch (error: any) {
      console.error('[CUSTOMERS API] Error fetching customers:', error);
      console.error('[CUSTOMERS API] Error stack:', error.stack);
      console.error('[CUSTOMERS API] Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
      });
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Get single customer (all authenticated users can view)
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        customerId: true,
        customerName: true,
        prefix: true,
        firstName: true,
        middleName: true,
        lastName: true,
        customerType: true,
        contactPerson: true,
        phone: true,
        email: true,
        address: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        country: true,
        pinCode: true,
        latitude: true,
        longitude: true,
        gstNumber: true,
        contactNumbers: true,
        consumerNumber: true,
        idProofNumber: true,
        idProofType: true,
        companyName: true,
        companyGst: true,
        createdById: true,
        salespersonId: true,
        createdAt: true,
        updatedAt: true,
        projects: {
          select: {
            id: true,
            slNo: true,
            type: true,
            projectStatus: true,
            projectCost: true,
            confirmationDate: true,
            createdAt: true,
          },
          orderBy: { confirmationDate: 'desc' },
        },
        _count: {
          select: { projects: true },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error: any) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create customer (Sales, Operations, Management, Admin)
router.post(
  '/',
  authenticate,
  [
    body('firstName').notEmpty().trim(),
    body('prefix').optional().trim(),
    body('middleName').optional().trim(),
    body('lastName').optional().trim(),
    body('addressLine1').optional().trim(),
    body('addressLine2').optional().trim(),
    body('city').optional().trim(),
    body('state').optional().trim(),
    body('country').optional().trim(),
    body('pinCode').optional().trim(),
    body('contactNumbers').optional(),
    body('consumerNumber').optional().trim(),
  ],
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!canCreateCustomer(req.user.role)) {
        return res.status(403).json({ error: 'Only Sales and Admin users can create customers' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { 
        prefix,
        firstName,
        middleName,
        lastName,
        addressLine1, 
        addressLine2, 
        city, 
        state, 
        country, 
        pinCode,
        latitude,
        longitude,
        contactNumbers, 
        consumerNumber,
        email,
        idProofNumber,
        idProofType,
        companyName,
        companyGst
      } = req.body;
      
      // Validate: If Id Proof# is provided, Type of Id Proof is mandatory
      if (idProofNumber && idProofNumber.trim() !== '' && (!idProofType || idProofType.trim() === '')) {
        return res.status(400).json({ error: 'Type of Id Proof is required when Id Proof# is provided' });
      }

      // Generate unique customer ID
      const customerId = await generateCustomerId();

      // Construct customerName from name parts for backward compatibility
      const nameParts = [firstName, middleName, lastName].filter(Boolean).join(' ')
      const customerName = nameParts || firstName // Fallback to firstName if all empty

      // Handle contactNumbers - ensure it's a JSON string
      let contactNumbersStr: string | null = null;
      if (contactNumbers) {
        if (Array.isArray(contactNumbers)) {
          contactNumbersStr = JSON.stringify(contactNumbers);
        } else if (typeof contactNumbers === 'string') {
          try {
            // Validate it's valid JSON
            JSON.parse(contactNumbers);
            contactNumbersStr = contactNumbers;
          } catch {
            // If not valid JSON, wrap it as an array
            contactNumbersStr = JSON.stringify([contactNumbers]);
          }
        }
      }

      // Handle emails - ensure it's a JSON string (similar to contactNumbers)
      let emailsStr: string | null = null;
      if (email !== undefined && email !== null) {
        if (Array.isArray(email)) {
          emailsStr = JSON.stringify(email);
        } else if (typeof email === 'string') {
          try {
            // Validate it's valid JSON
            JSON.parse(email);
            emailsStr = email;
          } catch {
            // If not valid JSON, wrap it as an array
            emailsStr = JSON.stringify([email]);
          }
        }
      }

      const customer = await prisma.customer.create({
        data: {
          customerId,
          customerName, // Legacy field
          prefix: prefix || null,
          firstName,
          middleName: middleName || null,
          lastName: lastName || null,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          city: city || null,
          state: state || null,
          country: country || null,
          pinCode: pinCode || null,
          latitude: latitude !== undefined && latitude !== null && latitude !== '' 
            ? (isNaN(parseFloat(String(latitude))) ? null : parseFloat(String(latitude)))
            : null,
          longitude: longitude !== undefined && longitude !== null && longitude !== '' 
            ? (isNaN(parseFloat(String(longitude))) ? null : parseFloat(String(longitude)))
            : null,
          contactNumbers: contactNumbersStr,
          consumerNumber: consumerNumber || null,
          email: emailsStr,
          idProofNumber: idProofNumber || null,
          idProofType: idProofType || null,
          companyName: companyName || null,
          companyGst: companyGst || null,
          createdById: req.user.id, // Track who created the customer
          // Auto-tag the creating Sales person as the salesperson for this customer
          salespersonId: req.user.role === UserRole.SALES ? req.user.id : null,
        },
      });

      res.status(201).json(customer);
    } catch (error: any) {
      console.error('Error creating customer:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update customer (Sales, Operations, Management, Admin)
router.put(
  '/:id',
  authenticate,
  [
    body('customerName').optional().notEmpty().trim(),
    body('addressLine1').optional().trim(),
    body('addressLine2').optional().trim(),
    body('city').optional().trim(),
    body('state').optional().trim(),
    body('country').optional().trim(),
    body('pinCode').optional().trim(),
    body('contactNumbers').optional(),
    body('consumerNumber').optional().trim(),
  ],
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('[CUSTOMER UPDATE] Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      console.log('[CUSTOMER UPDATE] Starting update for customer:', req.params.id, 'by user:', req.user?.id);

      const customer = await prisma.customer.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          createdById: true,
          salespersonId: true,
          firstName: true,
          middleName: true,
          lastName: true,
        },
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Check permissions for editing
      const isAdmin = req.user.role === UserRole.ADMIN;
      const isManagement = req.user.role === UserRole.MANAGEMENT;
      
      if (isAdmin || isManagement) {
        // Admin and Management can always edit (Management needs this to change salesperson)
      } else if (req.user.role === UserRole.SALES) {
        // For Sales users, ONLY allow if they created the customer OR are tagged as salesperson
        // OR if they have created projects for this customer (backward compatibility)
        // This logic MUST match the GET endpoint filter logic exactly
        const isCreator = customer.createdById != null && customer.createdById === req.user.id;
        const isTaggedSalesperson = customer.salespersonId != null && customer.salespersonId === req.user.id;
        
        // Always check for projects (backward compatibility) - matches GET endpoint logic
        const userProjectCount = await prisma.project.count({
          where: {
            customerId: customer.id,
            createdById: req.user.id,
          },
        });
        const hasUserProjects = userProjectCount > 0;
        
        console.log('[CUSTOMER UPDATE] Permission check:', {
          userId: req.user.id,
          customerId: customer.id,
          createdById: customer.createdById,
          salespersonId: customer.salespersonId,
          isCreator,
          isTaggedSalesperson,
          userProjectCount,
          hasUserProjects,
          permissionGranted: isCreator || isTaggedSalesperson || hasUserProjects,
        });
        
        if (!isCreator && !isTaggedSalesperson && !hasUserProjects) {
          console.log('[CUSTOMER UPDATE] Permission denied - user does not have access');
          return res.status(403).json({ error: 'Only the Sales person who created or is tagged to this customer, or Admin/Management can edit it' });
        }
        
        console.log('[CUSTOMER UPDATE] Permission granted');
      } else {
        // Other roles cannot edit
        return res.status(403).json({ error: 'Only Sales users (who created or are tagged to the customer), Admin, or Management can edit customers' });
      }

      const { 
        prefix,
        firstName,
        middleName,
        lastName,
        addressLine1, 
        addressLine2, 
        city, 
        state, 
        country, 
        pinCode,
        latitude,
        longitude,
        contactNumbers, 
        consumerNumber,
        email,
        idProofNumber,
        idProofType,
        companyName,
        companyGst
      } = req.body;
      
      // Validate: If Id Proof# is provided, Type of Id Proof is mandatory
      if (idProofNumber && idProofNumber.trim() !== '' && (!idProofType || idProofType.trim() === '')) {
        return res.status(400).json({ error: 'Type of Id Proof is required when Id Proof# is provided' });
      }

      const updateData: any = {};

      // Update name fields
      if (firstName !== undefined) {
        updateData.firstName = firstName
        // Reconstruct customerName for backward compatibility
        const currentMiddleName = middleName !== undefined ? middleName : customer.middleName
        const currentLastName = lastName !== undefined ? lastName : customer.lastName
        const nameParts = [firstName, currentMiddleName, currentLastName].filter(Boolean).join(' ')
        updateData.customerName = nameParts || firstName
      }
      if (prefix !== undefined) updateData.prefix = prefix || null
      if (middleName !== undefined) {
        updateData.middleName = middleName || null
        // Reconstruct customerName if firstName exists
        const currentFirstName = firstName !== undefined ? firstName : customer.firstName
        const currentLastName = lastName !== undefined ? lastName : customer.lastName
        if (currentFirstName) {
          const nameParts = [currentFirstName, middleName || null, currentLastName].filter(Boolean).join(' ')
          updateData.customerName = nameParts || currentFirstName
        }
      }
      if (lastName !== undefined) {
        updateData.lastName = lastName || null
        // Reconstruct customerName if firstName exists
        const currentFirstName = firstName !== undefined ? firstName : customer.firstName
        const currentMiddleName = middleName !== undefined ? middleName : customer.middleName
        if (currentFirstName) {
          const nameParts = [currentFirstName, currentMiddleName || null, lastName || null].filter(Boolean).join(' ')
          updateData.customerName = nameParts || currentFirstName
        }
      }
      if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1 || null;
      if (addressLine2 !== undefined) updateData.addressLine2 = addressLine2 || null;
      if (city !== undefined) updateData.city = city || null;
      if (state !== undefined) updateData.state = state || null;
      if (country !== undefined) updateData.country = country || null;
      if (pinCode !== undefined) updateData.pinCode = pinCode || null;
      if (latitude !== undefined) {
        if (latitude === null || latitude === '') {
          updateData.latitude = null;
        } else {
          const latNum = parseFloat(String(latitude));
          updateData.latitude = isNaN(latNum) ? null : latNum;
        }
      }
      if (longitude !== undefined) {
        if (longitude === null || longitude === '') {
          updateData.longitude = null;
        } else {
          const lngNum = parseFloat(String(longitude));
          updateData.longitude = isNaN(lngNum) ? null : lngNum;
        }
      }
      if (consumerNumber !== undefined) updateData.consumerNumber = consumerNumber || null;
      if (email !== undefined) updateData.email = email || null;
      if (idProofNumber !== undefined) updateData.idProofNumber = idProofNumber || null;
      if (idProofType !== undefined) updateData.idProofType = idProofType || null;
      if (companyName !== undefined) updateData.companyName = companyName || null;
      if (companyGst !== undefined) updateData.companyGst = companyGst || null;

      // Handle contactNumbers
      if (contactNumbers !== undefined) {
        if (Array.isArray(contactNumbers)) {
          updateData.contactNumbers = JSON.stringify(contactNumbers);
        } else if (typeof contactNumbers === 'string') {
          try {
            JSON.parse(contactNumbers);
            updateData.contactNumbers = contactNumbers;
          } catch {
            updateData.contactNumbers = JSON.stringify([contactNumbers]);
          }
        } else if (contactNumbers === null || contactNumbers === '') {
          updateData.contactNumbers = null;
        }
      }

      // Handle emails (similar to contactNumbers)
      if (email !== undefined) {
        if (Array.isArray(email)) {
          updateData.email = JSON.stringify(email);
        } else if (typeof email === 'string') {
          try {
            JSON.parse(email);
            updateData.email = email;
          } catch {
            // If not valid JSON, wrap it as an array
            updateData.email = JSON.stringify([email]);
          }
        } else if (email === null || email === '') {
          updateData.email = null;
        }
      }

      // Handle salespersonId - Only Management and Admin can change it
      if (req.body.salespersonId !== undefined) {
        const canChangeSalesperson = req.user.role === UserRole.ADMIN || req.user.role === UserRole.MANAGEMENT;
        
        if (!canChangeSalesperson) {
          return res.status(403).json({ error: 'Only Management and Admin users can change the salesperson for a customer' });
        }

        if (req.body.salespersonId === null || req.body.salespersonId === '' || req.body.salespersonId === 'null') {
          updateData.salespersonId = null;
        } else {
          const salespersonIdStr = String(req.body.salespersonId).trim();
          if (!salespersonIdStr) {
            updateData.salespersonId = null;
          } else {
            try {
              const salesperson = await prisma.user.findUnique({
                where: { id: salespersonIdStr },
                select: { id: true, role: true },
              });
              if (!salesperson) {
                return res.status(400).json({ error: 'Invalid salesperson ID: User not found' });
              }
              updateData.salespersonId = salespersonIdStr;
            } catch (error: any) {
              console.error('Error validating salespersonId:', error);
              return res.status(400).json({ error: `Invalid salesperson ID format: ${error.message}` });
            }
          }
        }
      }

      // Remove relation objects before update (if any were accidentally included)
      const relationFields = ['customer', 'createdBy', 'salesperson'];
      relationFields.forEach(field => {
        if (updateData[field] !== undefined) {
          delete updateData[field];
        }
      });

      console.log('[CUSTOMER UPDATE] About to update customer:', {
        customerId: req.params.id,
        updateDataKeys: Object.keys(updateData),
        updateDataSize: JSON.stringify(updateData).length,
      });

      const updatedCustomer = await prisma.customer.update({
        where: { id: req.params.id },
        data: updateData,
      });

      console.log('[CUSTOMER UPDATE] Customer updated successfully:', updatedCustomer.id);
      res.json(updatedCustomer);
    } catch (error: any) {
      console.error('[CUSTOMER UPDATE] Error updating customer:', error);
      console.error('[CUSTOMER UPDATE] Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      });
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete customer (Admin only, and only if no projects exist)
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer._count.projects > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete customer with existing projects. Please delete or reassign projects first.' 
      });
    }

    await prisma.customer.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Customer deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to get customer display name
const getCustomerDisplayNameForExport = (customer: any): string => {
  const parts = [customer.prefix, customer.firstName, customer.middleName, customer.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : customer.customerName || '';
};

// Export customers to Excel (Admin only)
router.get('/export/excel', authenticate, authorize(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { search, salespersonId, myCustomers } = req.query;

    const where: any = {};

    // Apply filters similar to GET /api/customers
    if (req.user?.role === UserRole.SALES && myCustomers === 'true') {
      const userProjects = await prisma.project.findMany({
        where: { createdById: req.user.id },
        select: { customerId: true },
        distinct: ['customerId'],
      });
      const customerIdsFromProjects = userProjects.map(p => p.customerId);
      const orConditions: any[] = [
        { createdById: req.user.id },
        { salespersonId: req.user.id },
      ];
      if (customerIdsFromProjects.length > 0) {
        orConditions.push({ id: { in: customerIdsFromProjects } });
      }
      where.OR = orConditions;
    } else if (req.user?.role !== UserRole.SALES && salespersonId) {
      const salespersonIdArray = Array.isArray(salespersonId) ? salespersonId : [salespersonId];
      const validSalespersonIds = salespersonIdArray
        .filter((id): id is string => typeof id === 'string' && id.trim() !== '');
      if (validSalespersonIds.length > 0) {
        const userProjects = await prisma.project.findMany({
          where: { createdById: { in: validSalespersonIds } },
          select: { customerId: true },
          distinct: ['customerId'],
        });
        const customerIdsFromProjects = userProjects.map(p => p.customerId);
        const orConditions: any[] = [
          { salespersonId: { in: validSalespersonIds } },
        ];
        if (customerIdsFromProjects.length > 0) {
          orConditions.push({ id: { in: customerIdsFromProjects } });
        }
        where.OR = orConditions;
      }
    }

    if (search) {
      const searchConditions = {
        OR: [
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { middleName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
          { customerName: { contains: search as string, mode: 'insensitive' } },
          { customerId: { contains: search as string, mode: 'insensitive' } },
          { consumerNumber: { contains: search as string, mode: 'insensitive' } },
          { addressLine1: { contains: search as string, mode: 'insensitive' } },
          { city: { contains: search as string, mode: 'insensitive' } },
          { state: { contains: search as string, mode: 'insensitive' } },
          { pinCode: { contains: search as string, mode: 'insensitive' } },
        ],
      };
      if (where.OR) {
        const existingOR = where.OR;
        where.AND = [{ OR: existingOR }, searchConditions];
        delete where.OR;
      } else {
        const existingConditions: any = {};
        Object.keys(where).forEach(key => {
          if (key !== 'AND' && key !== 'OR') {
            existingConditions[key] = where[key];
            delete where[key];
          }
        });
        if (Object.keys(existingConditions).length > 0) {
          where.AND = [existingConditions, searchConditions];
        } else {
          where.OR = searchConditions.OR;
        }
      }
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        salesperson: {
          select: { name: true, email: true },
        },
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format data for Excel
    const exportData = customers.map((customer) => {
      const contactNumbers = customer.contactNumbers ? 
        (typeof customer.contactNumbers === 'string' ? JSON.parse(customer.contactNumbers) : customer.contactNumbers) : [];
      const emails = customer.email ? 
        (typeof customer.email === 'string' ? JSON.parse(customer.email) : customer.email) : [];

      return {
        'Customer ID': customer.customerId || '',
        'Name': getCustomerDisplayNameForExport(customer),
        'Prefix': customer.prefix || '',
        'First Name': customer.firstName || '',
        'Middle Name': customer.middleName || '',
        'Last Name': customer.lastName || '',
        'Address Line 1': customer.addressLine1 || '',
        'Address Line 2': customer.addressLine2 || '',
        'City': customer.city || '',
        'State': customer.state || '',
        'Country': customer.country || '',
        'PIN Code': customer.pinCode || '',
        'Consumer Number': customer.consumerNumber || '',
        'Contact Numbers': Array.isArray(contactNumbers) ? contactNumbers.join(', ') : contactNumbers || '',
        'Email': Array.isArray(emails) ? emails.join(', ') : emails || '',
        'ID Proof Type': customer.idProofType || '',
        'ID Proof Number': customer.idProofNumber || '',
        'Company Name': customer.companyName || '',
        'Company GST': customer.companyGst || '',
        'Salesperson': customer.salesperson?.name || '',
        'Salesperson Email': customer.salesperson?.email || '',
        'Total Projects': customer._count.projects || 0,
        'Created At': customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-IN') : '',
      };
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=customers-export-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error: any) {
    console.error('Error exporting customers to Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export customers to CSV (Admin only)
router.get('/export/csv', authenticate, authorize(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { search, salespersonId, myCustomers } = req.query;

    const where: any = {};

    // Apply filters similar to GET /api/customers
    if (req.user?.role === UserRole.SALES && myCustomers === 'true') {
      const userProjects = await prisma.project.findMany({
        where: { createdById: req.user.id },
        select: { customerId: true },
        distinct: ['customerId'],
      });
      const customerIdsFromProjects = userProjects.map(p => p.customerId);
      const orConditions: any[] = [
        { createdById: req.user.id },
        { salespersonId: req.user.id },
      ];
      if (customerIdsFromProjects.length > 0) {
        orConditions.push({ id: { in: customerIdsFromProjects } });
      }
      where.OR = orConditions;
    } else if (req.user?.role !== UserRole.SALES && salespersonId) {
      const salespersonIdArray = Array.isArray(salespersonId) ? salespersonId : [salespersonId];
      const validSalespersonIds = salespersonIdArray
        .filter((id): id is string => typeof id === 'string' && id.trim() !== '');
      if (validSalespersonIds.length > 0) {
        const userProjects = await prisma.project.findMany({
          where: { createdById: { in: validSalespersonIds } },
          select: { customerId: true },
          distinct: ['customerId'],
        });
        const customerIdsFromProjects = userProjects.map(p => p.customerId);
        const orConditions: any[] = [
          { salespersonId: { in: validSalespersonIds } },
        ];
        if (customerIdsFromProjects.length > 0) {
          orConditions.push({ id: { in: customerIdsFromProjects } });
        }
        where.OR = orConditions;
      }
    }

    if (search) {
      const searchConditions = {
        OR: [
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { middleName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
          { customerName: { contains: search as string, mode: 'insensitive' } },
          { customerId: { contains: search as string, mode: 'insensitive' } },
          { consumerNumber: { contains: search as string, mode: 'insensitive' } },
          { addressLine1: { contains: search as string, mode: 'insensitive' } },
          { city: { contains: search as string, mode: 'insensitive' } },
          { state: { contains: search as string, mode: 'insensitive' } },
          { pinCode: { contains: search as string, mode: 'insensitive' } },
        ],
      };
      if (where.OR) {
        const existingOR = where.OR;
        where.AND = [{ OR: existingOR }, searchConditions];
        delete where.OR;
      } else {
        const existingConditions: any = {};
        Object.keys(where).forEach(key => {
          if (key !== 'AND' && key !== 'OR') {
            existingConditions[key] = where[key];
            delete where[key];
          }
        });
        if (Object.keys(existingConditions).length > 0) {
          where.AND = [existingConditions, searchConditions];
        } else {
          where.OR = searchConditions.OR;
        }
      }
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        salesperson: {
          select: { name: true, email: true },
        },
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format data for CSV
    const exportData = customers.map((customer) => {
      const contactNumbers = customer.contactNumbers ? 
        (typeof customer.contactNumbers === 'string' ? JSON.parse(customer.contactNumbers) : customer.contactNumbers) : [];
      const emails = customer.email ? 
        (typeof customer.email === 'string' ? JSON.parse(customer.email) : customer.email) : [];

      return {
        'Customer ID': customer.customerId || '',
        'Name': getCustomerDisplayNameForExport(customer),
        'Prefix': customer.prefix || '',
        'First Name': customer.firstName || '',
        'Middle Name': customer.middleName || '',
        'Last Name': customer.lastName || '',
        'Address Line 1': customer.addressLine1 || '',
        'Address Line 2': customer.addressLine2 || '',
        'City': customer.city || '',
        'State': customer.state || '',
        'Country': customer.country || '',
        'PIN Code': customer.pinCode || '',
        'Consumer Number': customer.consumerNumber || '',
        'Contact Numbers': Array.isArray(contactNumbers) ? contactNumbers.join(', ') : contactNumbers || '',
        'Email': Array.isArray(emails) ? emails.join(', ') : emails || '',
        'ID Proof Type': customer.idProofType || '',
        'ID Proof Number': customer.idProofNumber || '',
        'Company Name': customer.companyName || '',
        'Company GST': customer.companyGst || '',
        'Salesperson': customer.salesperson?.name || '',
        'Salesperson Email': customer.salesperson?.email || '',
        'Total Projects': customer._count.projects || 0,
        'Created At': customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-IN') : '',
      };
    });

    // Convert to CSV
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=customers-export-${Date.now()}.csv`);
    res.send(csv);
  } catch (error: any) {
    console.error('Error exporting customers to CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
