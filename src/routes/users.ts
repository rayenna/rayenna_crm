import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { UserRole } from '@prisma/client';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logSecurityAudit } from '../utils/auditLogger';

const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticate, authorize(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single user
router.get('/:id', authenticate, authorize(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create user (Admin only)
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  [
    body('email').isEmail().normalizeEmail(),
    body('name').notEmpty().trim(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(Object.values(UserRole)),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, name, password, role } = req.body;

      // Enforce single ADMIN user constraint
      if (role === UserRole.ADMIN) {
        const existingAdmin = await prisma.user.findFirst({
          where: { role: UserRole.ADMIN },
        });
        if (existingAdmin) {
          return res.status(400).json({ 
            error: 'Only one ADMIN user is allowed. An ADMIN user already exists.' 
          });
        }
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      if (req.user) {
        logSecurityAudit({ userId: req.user.id, role: req.user.role, actionType: 'user_created', entityType: 'User', entityId: user.id, summary: `Created user ${user.email} (${user.role})`, req });
      }
      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update user (Admin only)
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  [
    body('email').optional().isEmail().normalizeEmail(),
    body('name').optional().notEmpty().trim(),
    body('password').optional().isLength({ min: 6 }),
    body('role').optional().isIn(Object.values(UserRole)),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, name, password, role } = req.body;
      const userId = req.params.id;

      // Get current user data
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!currentUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Enforce single ADMIN user constraint when changing role to ADMIN
      if (role === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN) {
        const existingAdmin = await prisma.user.findFirst({
          where: { 
            role: UserRole.ADMIN,
            id: { not: userId }, // Exclude current user
          },
        });
        if (existingAdmin) {
          return res.status(400).json({ 
            error: 'Only one ADMIN user is allowed. An ADMIN user already exists.' 
          });
        }
      }

      // Prevent changing ADMIN role to another role if it's the only ADMIN
      if (currentUser.role === UserRole.ADMIN && role && role !== UserRole.ADMIN) {
        const adminCount = await prisma.user.count({
          where: { role: UserRole.ADMIN },
        });
        if (adminCount === 1) {
          return res.status(400).json({ 
            error: 'Cannot change ADMIN role. At least one ADMIN user must exist.' 
          });
        }
      }

      const updateData: any = {};
      if (email) updateData.email = email;
      if (name) updateData.name = name;
      if (role) updateData.role = role;
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (req.user && role !== undefined && role !== currentUser.role) {
        logSecurityAudit({ userId: req.user.id, role: req.user.role, actionType: 'user_role_changed', entityType: 'User', entityId: userId, summary: `Role ${currentUser.role} -> ${role}`, req });
      }
      res.json(user);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete user (Admin only)
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    // Prevent deleting yourself
    if (req.params.id === req.user?.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get salespersons (for dropdowns)
router.get('/role/sales', authenticate, async (req: Request, res: Response) => {
  try {
    const salespersons = await prisma.user.findMany({
      where: {
        role: UserRole.SALES,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(salespersons);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
