import express, { Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient, UserRole } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { generateCustomerId } from '../utils/customerId';

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to check if user can create/update customers
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
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        search,
        page = '1',
        limit = '50',
      } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = {};

      if (search) {
        where.OR = [
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
        ];
      }

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { projects: true },
            },
          },
        }),
        prisma.customer.count({ where }),
      ]);

      res.json({
        customers,
        total,
        page: parseInt(page as string),
        limit: take,
        totalPages: Math.ceil(total / take),
      });
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get single customer (all authenticated users can view)
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
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
    body('leadSource').optional().trim(),
    body('leadBroughtBy').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!canModifyCustomer(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions to create customers' });
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
        contactNumbers, 
        consumerNumber,
        email,
        idProofNumber,
        idProofType,
        companyName,
        companyGst,
        leadSource, 
        leadBroughtBy 
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
          contactNumbers: contactNumbersStr,
          consumerNumber: consumerNumber || null,
          email: emailsStr,
          idProofNumber: idProofNumber || null,
          idProofType: idProofType || null,
          companyName: companyName || null,
          companyGst: companyGst || null,
          leadSource: leadSource || null,
          leadBroughtBy: leadBroughtBy || null,
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
    body('leadSource').optional().trim(),
    body('leadBroughtBy').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!canModifyCustomer(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions to update customers' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const customer = await prisma.customer.findUnique({
        where: { id: req.params.id },
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
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
        contactNumbers, 
        consumerNumber,
        email,
        idProofNumber,
        idProofType,
        companyName,
        companyGst,
        leadSource, 
        leadBroughtBy 
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
      if (consumerNumber !== undefined) updateData.consumerNumber = consumerNumber || null;
      if (email !== undefined) updateData.email = email || null;
      if (idProofNumber !== undefined) updateData.idProofNumber = idProofNumber || null;
      if (idProofType !== undefined) updateData.idProofType = idProofType || null;
      if (companyName !== undefined) updateData.companyName = companyName || null;
      if (companyGst !== undefined) updateData.companyGst = companyGst || null;
      if (leadSource !== undefined) updateData.leadSource = leadSource || null;
      if (leadBroughtBy !== undefined) updateData.leadBroughtBy = leadBroughtBy || null;

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

      const updatedCustomer = await prisma.customer.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.json(updatedCustomer);
    } catch (error: any) {
      console.error('Error updating customer:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete customer (Admin only, and only if no projects exist)
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
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

export default router;
