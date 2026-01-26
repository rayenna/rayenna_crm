import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { UserRole } from '@prisma/client';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logPasswordReset } from '../utils/passwordResetAudit';

const router = express.Router();

// Register (Admin only - handled in users route)
// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const jwtSecret: string = process.env.JWT_SECRET!;
      const expiresIn: string = process.env.JWT_EXPIRES_IN || '7d';

      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      // Type assertion to fix TypeScript overload resolution
      const token = (jwt.sign as any)(
        payload,
        jwtSecret,
        { expiresIn }
      ) as string;

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error: any) {
      console.error('Login error:', {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack,
      });
      
      // Provide better error messages for common issues
      let errorMessage = 'Internal server error';
      if (error?.code === 'P1001') {
        errorMessage = 'Database connection failed. Please check DATABASE_URL.';
      } else if (error?.code?.startsWith('P1')) {
        errorMessage = `Database error: ${error.message}`;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      const response: any = { error: errorMessage };
      if (process.env.NODE_ENV === 'development') {
        response.details = {
          name: error?.name,
          code: error?.code,
          meta: error?.meta,
        };
      }
      
      res.status(500).json(response);
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
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

// Change password (authenticated users can change their own password)
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: req.user.id },
        data: { password: hashedPassword },
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Admin-initiated password reset (Admin only)
// Generates a one-time reset token with expiry
router.post(
  '/admin/reset-password',
  authenticate,
  authorize(UserRole.ADMIN),
  [
    body('userId').notEmpty().withMessage('User ID is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { userId } = req.body;

      // Find the user to reset password for
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate secure random token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Store token and expiry in database
      await prisma.user.update({
        where: { id: userId },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      });

      // Audit log
      await logPasswordReset({
        userId: targetUser.id,
        userEmail: targetUser.email,
        action: 'reset_initiated',
        initiatedBy: req.user.id,
        token: resetToken.substring(0, 8) + '...', // Log partial token for tracking
      });

      // Return reset token (admin can share this link with user)
      res.json({
        message: 'Password reset token generated successfully',
        resetToken,
        resetLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`,
        expiresAt: resetTokenExpiry.toISOString(),
      });
    } catch (error: any) {
      console.error('[Admin Reset Password] Error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate reset token' });
    }
  }
);

// Verify reset token validity
router.get('/verify-reset-token/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Reset token is required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(), // Token must not be expired
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        resetTokenExpiry: true,
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    res.json({
      valid: true,
      email: user.email,
      name: user.name,
      expiresAt: user.resetTokenExpiry,
    });
  } catch (error: any) {
    console.error('[Verify Reset Token] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify reset token' });
  }
});

// Reset password with token
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, newPassword } = req.body;

      // Find user with valid token
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date(), // Token must not be expired
          },
        },
      });

      if (!user) {
        await logPasswordReset({
          userId: 'unknown',
          userEmail: 'unknown',
          action: 'reset_failed',
          token: token.substring(0, 8) + '...',
          reason: 'Invalid or expired token',
        });
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and invalidate token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      // Audit log
      await logPasswordReset({
        userId: user.id,
        userEmail: user.email,
        action: 'reset_completed',
        token: token.substring(0, 8) + '...',
      });

      res.json({ message: 'Password reset successfully' });
    } catch (error: any) {
      console.error('[Reset Password] Error:', error);
      res.status(500).json({ error: error.message || 'Failed to reset password' });
    }
  }
);

export default router;
