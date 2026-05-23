import express, { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { UserRole } from '@prisma/client';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';
import { generateCustomerId } from '../utils/customerId';
import {
  buildCustomerNameForSave,
  getCustomerDisplayNameForExport,
  isBusinessCustomerType,
  normalizeGstFields,
  validateCustomerIdentity,
} from '../utils/customerRecord';
import {
  aggregateEmailsFromContacts,
  aggregatePhonesFromContacts,
  contactsToPrismaJson,
  normalizeContactsForSave,
  parseContactsPayload,
  stringifyContactArrays,
  validateBusinessContacts,
} from '../utils/customerContacts';
import { validateIdProofTypeForCustomer } from '../utils/customerIdProof';
import { getKeralaMapGpsWarning } from '../utils/mapGpsValidation';
import { CustomerType, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

const router = express.Router();

function customerResponseWithMapGpsWarning<T extends { latitude: number | null; longitude: number | null }>(
  record: T,
): T & { mapGpsWarning?: string } {
  if (record.latitude == null || record.longitude == null) return record;
  const mapGpsWarning = getKeralaMapGpsWarning(record.latitude, record.longitude);
  return mapGpsWarning ? { ...record, mapGpsWarning } : record;
}

// Helper function to check if user can create customers (Sales, Management, Admin)
const canCreateCustomer = (role: UserRole): boolean => {
  return role === UserRole.SALES || role === UserRole.MANAGEMENT || role === UserRole.ADMIN;
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

      // For Sales users: if myCustomers is 'true', show only customers
      // where they are the *currently assigned* salesperson.
      if (req.user?.role === UserRole.SALES && myCustomers === 'true') {
        where.salespersonId = req.user.id;
      } else if (req.user?.role !== UserRole.SALES) {
        // For non-Sales users: filter by current salesperson assignment if provided
        if (salespersonId) {
          const salespersonIdArray = Array.isArray(salespersonId) ? salespersonId : [salespersonId];
          // Filter out empty strings and null values, and ensure they're strings
          const validSalespersonIds = salespersonIdArray
            .filter((id): id is string => typeof id === 'string' && id.trim() !== '');
          
          if (validSalespersonIds.length > 0) {
            // Build condition: filter by current salesperson assignment on the customer
            // and by any projects currently assigned to that salesperson.
            const userProjects = await prisma.project.findMany({
              where: {
                salespersonId: { in: validSalespersonIds },
              },
              select: {
                customerId: true,
              },
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

      if (process.env.NODE_ENV === 'development') {
        console.log('[CUSTOMERS API] Query params:', { search, page, limit, salespersonId, myCustomers, userRole: req.user?.role, userId: req.user?.id });
        console.log('[CUSTOMERS API] Where clause:', JSON.stringify(where, null, 2));
      }
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
            customerType: true,
            companyName: true,
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
      if (process.env.NODE_ENV === 'development') console.log('[CUSTOMERS API] Found customers:', customers.length, 'Total:', total);
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
        contacts: true,
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
    body('firstName').optional().trim(),
    body('customerType').optional().isIn(['RESIDENTIAL', 'APARTMENT', 'COMMERCIAL']),
    body('contactPerson').optional().trim(),
    body('companyName').optional().trim(),
    body('companyGst').optional().trim(),
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
        return res.status(403).json({ error: 'Only Sales, Management and Admin users can create customers' });
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
        customerType: customerTypeFromBody,
        contactPerson,
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
        companyGst,
        contacts: contactsFromBody,
        salespersonId: salespersonIdFromBody,
      } = req.body;

      const customerType: CustomerType =
        customerTypeFromBody && Object.values(CustomerType).includes(customerTypeFromBody as CustomerType)
          ? (customerTypeFromBody as CustomerType)
          : CustomerType.RESIDENTIAL;

      const identityError = validateCustomerIdentity({
        customerType,
        companyName,
        firstName,
        middleName,
        lastName,
      });
      if (identityError) {
        return res.status(400).json({ error: identityError });
      }
      
      const idProofError = validateIdProofTypeForCustomer(customerType, idProofNumber, idProofType);
      if (idProofError) {
        return res.status(400).json({ error: idProofError });
      }

      // Admin must select a Sales Person when creating a new customer
      let resolvedSalespersonId: string | null = null;
      if (req.user.role === UserRole.SALES) {
        resolvedSalespersonId = req.user.id; // Auto-tag Sales user
      } else if (req.user.role === UserRole.ADMIN) {
        const spId = salespersonIdFromBody != null ? String(salespersonIdFromBody).trim() : '';
        if (!spId) {
          return res.status(400).json({ error: 'Sales Person is required when Admin creates a new customer' });
        }
        const salesperson = await prisma.user.findUnique({
          where: { id: spId },
          select: { id: true, role: true },
        });
        if (!salesperson) {
          return res.status(400).json({ error: 'Invalid salesperson ID: User not found' });
        }
        resolvedSalespersonId = salesperson.id;
      }

      // Generate unique customer ID
      const customerId = await generateCustomerId();

      const customerName = buildCustomerNameForSave({
        customerType,
        companyName,
        firstName,
        middleName,
        lastName,
      });
      const gstFields = normalizeGstFields(companyGst);

      let contactNumbersStr: string | null = null;
      let emailsStr: string | null = null;
      let contactsJson: ReturnType<typeof contactsToPrismaJson> | null = null;
      let savePrefix: string | null = prefix || null;
      let saveFirstName: string | null = firstName?.trim() || null;
      let saveMiddleName: string | null = middleName || null;
      let saveLastName: string | null = lastName || null;

      if (isBusinessCustomerType(customerType)) {
        const parsedContacts = parseContactsPayload(contactsFromBody);
        const contactErr = validateBusinessContacts(parsedContacts);
        if (contactErr) {
          return res.status(400).json({ error: contactErr });
        }
        const normalizedContacts = normalizeContactsForSave(parsedContacts);
        const phones = aggregatePhonesFromContacts(normalizedContacts);
        const emails = aggregateEmailsFromContacts(normalizedContacts);
        const aggregated = stringifyContactArrays(phones, emails);
        contactNumbersStr = aggregated.contactNumbersStr;
        emailsStr = aggregated.emailsStr;
        contactsJson = contactsToPrismaJson(normalizedContacts);
        const primary = normalizedContacts[0];
        savePrefix = primary.prefix || null;
        saveFirstName = primary.firstName || null;
        saveMiddleName = primary.middleName || null;
        saveLastName = primary.lastName || null;
      } else {
        if (contactNumbers) {
          if (Array.isArray(contactNumbers)) {
            contactNumbersStr = JSON.stringify(contactNumbers);
          } else if (typeof contactNumbers === 'string') {
            try {
              JSON.parse(contactNumbers);
              contactNumbersStr = contactNumbers;
            } catch {
              contactNumbersStr = JSON.stringify([contactNumbers]);
            }
          }
        }
        if (!contactNumbersStr) {
          return res.status(400).json({ error: 'At least one contact number is required.' });
        }

        if (email !== undefined && email !== null) {
          if (Array.isArray(email)) {
            emailsStr = JSON.stringify(email);
          } else if (typeof email === 'string') {
            try {
              JSON.parse(email);
              emailsStr = email;
            } catch {
              emailsStr = JSON.stringify([email]);
            }
          }
        }
      }

      const customer = await prisma.customer.create({
        data: {
          customerId,
          customerName,
          customerType,
          contactPerson: null,
          contacts: isBusinessCustomerType(customerType) ? contactsJson! : Prisma.JsonNull,
          prefix: savePrefix,
          firstName: saveFirstName,
          middleName: saveMiddleName,
          lastName: saveLastName,
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
          companyName: companyName?.trim() || null,
          companyGst: gstFields.companyGst,
          gstNumber: gstFields.gstNumber,
          createdById: req.user.id, // Track who created the customer
          salespersonId: resolvedSalespersonId,
        },
      });

      res.status(201).json(customerResponseWithMapGpsWarning(customer));
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
        if (process.env.NODE_ENV === 'development') console.log('[CUSTOMER UPDATE] Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }
      if (process.env.NODE_ENV === 'development') console.log('[CUSTOMER UPDATE] Starting update for customer:', req.params.id, 'by user:', req.user?.id);
      const customer = await prisma.customer.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          createdById: true,
          salespersonId: true,
          customerType: true,
          companyName: true,
          contactPerson: true,
          prefix: true,
          firstName: true,
          middleName: true,
          lastName: true,
          idProofNumber: true,
          idProofType: true,
        },
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Check permissions for editing
      const isAdmin = req.user.role === UserRole.ADMIN;
      const isManagement = req.user.role === UserRole.MANAGEMENT;
      
      if (isAdmin || isManagement) {
        // Admin and Management can always edit (and can change salesperson assignment)
      } else if (req.user.role === UserRole.SALES) {
        // For Sales users: they may edit only when they are the *currently assigned*
        // salesperson for this customer.
        const isAssignedSalesperson =
          customer.salespersonId != null && customer.salespersonId === req.user.id;

        if (process.env.NODE_ENV === 'development') {
          console.log('[CUSTOMER UPDATE] Permission check (Sales):', {
            userId: req.user.id,
            customerId: customer.id,
            createdById: customer.createdById,
            salespersonId: customer.salespersonId,
            isAssignedSalesperson,
          });
        }

        if (!isAssignedSalesperson) {
          if (process.env.NODE_ENV === 'development') console.log('[CUSTOMER UPDATE] Permission denied - Sales user is not current salesperson');
          return res.status(403).json({
            error: 'Only the Sales person currently assigned to this customer, or Admin/Management, can edit it',
          });
        }
      } else {
        // Other roles cannot edit
        return res.status(403).json({
          error: 'Only the currently assigned Sales user, Admin, or Management can edit customers',
        });
      }

      const { 
        prefix,
        firstName,
        middleName,
        lastName,
        customerType: customerTypeFromBody,
        contactPerson,
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
        companyGst,
        contacts: contactsFromBody,
      } = req.body;
      
      const updateData: any = {};

      if (customerTypeFromBody !== undefined) {
        if (
          customerTypeFromBody === null ||
          customerTypeFromBody === '' ||
          !Object.values(CustomerType).includes(customerTypeFromBody as CustomerType)
        ) {
          return res.status(400).json({ error: 'Invalid customer type' });
        }
        updateData.customerType = customerTypeFromBody as CustomerType;
        if (!isBusinessCustomerType(customerTypeFromBody as CustomerType)) {
          updateData.contacts = null;
          updateData.contactPerson = null;
        }
      }
      if (prefix !== undefined) updateData.prefix = prefix || null
      if (firstName !== undefined) updateData.firstName = firstName?.trim() || null
      if (middleName !== undefined) updateData.middleName = middleName || null
      if (lastName !== undefined) updateData.lastName = lastName || null
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
      if (companyName !== undefined) updateData.companyName = companyName?.trim() || null;
      if (companyGst !== undefined) {
        const gstFields = normalizeGstFields(companyGst);
        updateData.companyGst = gstFields.companyGst;
        updateData.gstNumber = gstFields.gstNumber;
      }

      const effectiveCustomerType: CustomerType =
        updateData.customerType ?? customer.customerType ?? CustomerType.RESIDENTIAL;

      if (contactsFromBody !== undefined) {
        if (isBusinessCustomerType(effectiveCustomerType)) {
          const parsedContacts = parseContactsPayload(contactsFromBody);
          const contactErr = validateBusinessContacts(parsedContacts);
          if (contactErr) {
            return res.status(400).json({ error: contactErr });
          }
          const normalizedContacts = normalizeContactsForSave(parsedContacts);
          const aggregated = stringifyContactArrays(
            aggregatePhonesFromContacts(normalizedContacts),
            aggregateEmailsFromContacts(normalizedContacts),
          );
          updateData.contacts = contactsToPrismaJson(normalizedContacts);
          updateData.contactPerson = null;
          updateData.contactNumbers = aggregated.contactNumbersStr;
          updateData.email = aggregated.emailsStr;
          const primary = normalizedContacts[0];
          updateData.prefix = primary.prefix || null;
          updateData.firstName = primary.firstName || null;
          updateData.middleName = primary.middleName || null;
          updateData.lastName = primary.lastName || null;
        } else {
          updateData.contacts = null;
          updateData.contactPerson = null;
        }
      }

      const identityFieldsTouched = [
        'customerType',
        'companyName',
        'prefix',
        'firstName',
        'middleName',
        'lastName',
        'contacts',
      ].some((key) => req.body[key] !== undefined);

      if (identityFieldsTouched) {
        const mergedIdentity = {
          customerType: updateData.customerType ?? customer.customerType,
          companyName: updateData.companyName !== undefined ? updateData.companyName : customer.companyName,
          firstName: updateData.firstName !== undefined ? updateData.firstName : customer.firstName,
          middleName: updateData.middleName !== undefined ? updateData.middleName : customer.middleName,
          lastName: updateData.lastName !== undefined ? updateData.lastName : customer.lastName,
        };
        const identityError = validateCustomerIdentity(mergedIdentity);
        if (identityError) {
          return res.status(400).json({ error: identityError });
        }
        updateData.customerName = buildCustomerNameForSave(mergedIdentity);
      }

      if (!isBusinessCustomerType(effectiveCustomerType)) {
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
          if (!updateData.contactNumbers) {
            return res.status(400).json({ error: 'At least one contact number is required.' });
          }
        }

        if (email !== undefined) {
          if (Array.isArray(email)) {
            updateData.email = JSON.stringify(email);
          } else if (typeof email === 'string') {
            try {
              JSON.parse(email);
              updateData.email = email;
            } catch {
              updateData.email = JSON.stringify([email]);
            }
          } else if (email === null || email === '') {
            updateData.email = null;
          }
        }
      }

      // Handle salespersonId - Only Management and Admin can change it
      // When changed, cascade to all projects under this customer
      let newSalespersonId: string | null | undefined = undefined; // Only set if salespersonId is being changed
      if (req.body.salespersonId !== undefined) {
        const canChangeSalesperson = req.user.role === UserRole.ADMIN || req.user.role === UserRole.MANAGEMENT;
        
        if (!canChangeSalesperson) {
          return res.status(403).json({ error: 'Only Management and Admin users can change the salesperson for a customer' });
        }

        if (req.body.salespersonId === null || req.body.salespersonId === '' || req.body.salespersonId === 'null') {
          updateData.salespersonId = null;
          newSalespersonId = null;
        } else {
          const salespersonIdStr = String(req.body.salespersonId).trim();
          if (!salespersonIdStr) {
            updateData.salespersonId = null;
            newSalespersonId = null;
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
              newSalespersonId = salespersonIdStr;
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
      const finalCustomerType: CustomerType =
        updateData.customerType ?? customer.customerType ?? CustomerType.RESIDENTIAL;
      const finalIdProofNumber =
        idProofNumber !== undefined ? idProofNumber : customer.idProofNumber;
      const finalIdProofType = idProofType !== undefined ? idProofType : customer.idProofType;
      const idProofValidationError = validateIdProofTypeForCustomer(
        finalCustomerType,
        finalIdProofNumber,
        finalIdProofType,
      );
      if (idProofValidationError) {
        return res.status(400).json({ error: idProofValidationError });
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[CUSTOMER UPDATE] About to update customer:', {
          customerId: req.params.id,
          updateDataKeys: Object.keys(updateData),
          updateDataSize: JSON.stringify(updateData).length,
        });
      }
      const updatedCustomer = await prisma.customer.update({
        where: { id: req.params.id },
        data: updateData,
      });

      // When salespersonId changed, cascade to all projects under this customer
      // so they reflect when querying by sales person
      if (newSalespersonId !== undefined) {
        await prisma.project.updateMany({
          where: { customerId: req.params.id },
          data: { salespersonId: newSalespersonId },
        });
        if (process.env.NODE_ENV === 'development') {
          const count = await prisma.project.count({ where: { customerId: req.params.id } });
          console.log('[CUSTOMER UPDATE] Cascaded salespersonId to', count, 'projects for customer', req.params.id);
        }
      }

      if (process.env.NODE_ENV === 'development') console.log('[CUSTOMER UPDATE] Customer updated successfully:', updatedCustomer.id);
      res.json(customerResponseWithMapGpsWarning(updatedCustomer));
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
          where: { salespersonId: { in: validSalespersonIds } },
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
        'Customer Type': customer.customerType || '',
        'Contact Person': customer.contactPerson || '',
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
        'Company GST': customer.companyGst || customer.gstNumber || '',
        'GST Number': customer.gstNumber || customer.companyGst || '',
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
          where: { salespersonId: { in: validSalespersonIds } },
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
        'Customer Type': customer.customerType || '',
        'Contact Person': customer.contactPerson || '',
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
        'Company GST': customer.companyGst || customer.gstNumber || '',
        'GST Number': customer.gstNumber || customer.companyGst || '',
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
