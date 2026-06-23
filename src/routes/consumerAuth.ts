import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { UserRole } from '@prisma/client';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';
import {
  authenticateConsumer,
  rejectStaffTokenOnConsumerRoutes,
} from '../middleware/consumerAuth';
import { rateLimit } from '../middleware/rateLimit';
import { logSecurityAudit } from '../utils/auditLogger';
import {
  CONSUMER_JWT_ROLE,
  generateReferralCode,
  getConsumerJwtSecret,
  tierFromPoints,
  toConsumerPublicUser,
} from '../utils/consumerAuth';
import {
  buildBaseUsername,
  normalizeUsername,
  resolveUniqueUsernameCandidate,
  resolveUsernameNameParts,
} from '../utils/consumerUsername';
import { syncConsumerHubForProject } from '../services/consumerHubProvision';
import { consumerMasterContactFields } from '../utils/consumerCustomerProfile';

const router = express.Router();

const consumerLoginLimiter = rateLimit(10, 15 * 60 * 1000);

function signConsumerToken(consumerId: string, username: string): string {
  const secret = getConsumerJwtSecret();
  if (!secret) {
    throw new Error('CONSUMER_JWT_SECRET is not set');
  }
  const expiresIn: string = process.env.CONSUMER_JWT_EXPIRES_IN || '7d';
  return (jwt.sign as (payload: object, secret: string, options: object) => string)(
    { consumerId, username, role: CONSUMER_JWT_ROLE },
    secret,
    { expiresIn },
  );
}

async function awardFirstLoginPoints(consumerId: string, currentPoints: number) {
  const bonus = 50;
  const points = currentPoints + bonus;
  return prisma.consumerUser.update({
    where: { id: consumerId },
    data: {
      points,
      memberTier: tierFromPoints(points),
    },
  });
}

router.post(
  '/login',
  rejectStaffTokenOnConsumerRoutes,
  consumerLoginLimiter,
  [
    body('username').trim().notEmpty().isLength({ max: 80 }),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      if (!getConsumerJwtSecret()) {
        return res.status(503).json({ error: 'Consumer authentication is not configured' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body as { username: string; password: string };
      const normalized = normalizeUsername(username);
      if (!normalized) {
        return res.status(400).json({ error: 'Invalid username' });
      }

      const consumer = await prisma.consumerUser.findUnique({ where: { username: normalized } });

      if (!consumer || !consumer.isActive) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, consumer.password);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isFirstLogin = !consumer.lastLoginAt;
      let updated = await prisma.consumerUser.update({
        where: { id: consumer.id },
        data: { lastLoginAt: new Date() },
      });

      if (isFirstLogin) {
        updated = await awardFirstLoginPoints(consumer.id, consumer.points);
      }

      const token = signConsumerToken(updated.id, updated.username);
      return res.json({
        token,
        user: toConsumerPublicUser(updated),
      });
    } catch (err) {
      console.error('Consumer login error:', err);
      return res.status(500).json({ error: 'Login failed' });
    }
  },
);

router.post(
  '/change-password',
  authenticateConsumer,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword: string;
      };

      const consumer = await prisma.consumerUser.findUnique({
        where: { id: req.consumer!.id },
      });
      if (!consumer) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const valid = await bcrypt.compare(currentPassword, consumer.password);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await prisma.consumerUser.update({
        where: { id: consumer.id },
        data: { password: hashed },
      });

      return res.json({ ok: true });
    } catch (err) {
      console.error('Consumer change-password error:', err);
      return res.status(500).json({ error: 'Failed to change password' });
    }
  },
);

router.post(
  '/register',
  authenticate,
  authorize(UserRole.ADMIN),
  [
    body('email').optional().isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('projectId').notEmpty(),
    body('username').optional().isString().trim(),
    body('firstName').optional().isString().trim(),
    body('lastName').optional().isString().trim(),
    body('phone').optional().isString().trim(),
  ],
  async (req: Request, res: Response) => {
    try {
      if (!getConsumerJwtSecret()) {
        return res.status(503).json({ error: 'Consumer authentication is not configured' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, projectId, username, firstName, lastName, phone } = req.body as {
        email?: string;
        password: string;
        projectId: string;
        username?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
      };

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { customer: true },
      });
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const existingForProject = await prisma.consumerUser.findUnique({
        where: { projectId },
      });
      if (existingForProject) {
        return res.status(409).json({ error: 'This project already has a Solar Hub account' });
      }

      let resolvedUsername = username ? normalizeUsername(username) : '';
      if (!resolvedUsername) {
        const existingCount = await prisma.consumerUser.count({
          where: { project: { customerId: project.customerId, id: { not: projectId } } },
        });
        const parts = resolveUsernameNameParts(project.customer);
        const base = buildBaseUsername(parts, existingCount);
        const taken = new Set(
          (await prisma.consumerUser.findMany({ select: { username: true } })).map((u) => u.username),
        );
        resolvedUsername = resolveUniqueUsernameCandidate(base, taken);
      }

      const nameSeed =
        firstName ||
        project.customer.firstName ||
        project.customer.customerName ||
        'RAYENNA';

      let referralCode = generateReferralCode(nameSeed);
      for (let attempt = 0; attempt < 5; attempt++) {
        const clash = await prisma.consumerUser.findUnique({ where: { referralCode } });
        if (!clash) break;
        referralCode = generateReferralCode(nameSeed);
      }

      const hashed = await bcrypt.hash(password, 10);
      const contactFields = consumerMasterContactFields(project.customer);
      const consumer = await prisma.consumerUser.create({
        data: {
          username: resolvedUsername,
          email: email ?? contactFields.email,
          password: hashed,
          projectId,
          firstName: firstName ?? project.customer.firstName ?? null,
          lastName: lastName ?? project.customer.lastName ?? null,
          phone: phone ?? contactFields.phone,
          referralCode,
        },
      });

      logSecurityAudit({
        userId: req.user!.id,
        role: req.user!.role,
        actionType: 'consumer_account_created',
        entityType: 'ConsumerUser',
        entityId: consumer.id,
        summary: `Solar Hub account created for ${resolvedUsername} (project ${projectId})`,
        req,
      });

      return res.status(201).json({ user: toConsumerPublicUser(consumer) });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'P2002') {
        return res.status(409).json({ error: 'Username, email, or referral code already in use' });
      }
      console.error('Consumer register error:', err);
      return res.status(500).json({ error: 'Failed to create consumer account' });
    }
  },
);

router.post(
  '/provision/:projectId',
  authenticate,
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      const result = await syncConsumerHubForProject(project.id, project.projectStatus);
      return res.json(result);
    } catch (err) {
      console.error('Consumer provision error:', err);
      return res.status(500).json({ error: 'Failed to provision Solar Hub account' });
    }
  },
);

router.get('/me', authenticateConsumer, async (req: Request, res: Response) => {
  const consumer = await prisma.consumerUser.findUnique({
    where: { id: req.consumer!.id },
  });
  if (!consumer) {
    return res.status(404).json({ error: 'Account not found' });
  }
  return res.json(toConsumerPublicUser(consumer));
});

export default router;
