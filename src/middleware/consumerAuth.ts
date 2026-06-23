/// <reference path="../@types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import {
  CONSUMER_JWT_ROLE,
  type ConsumerJwtPayload,
  getConsumerJwtSecret,
} from '../utils/consumerAuth';

export async function authenticateConsumer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const secret = getConsumerJwtSecret();
    if (!secret) {
      return res.status(503).json({ error: 'Consumer authentication is not configured' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, secret) as ConsumerJwtPayload;
    if (decoded.role !== CONSUMER_JWT_ROLE) {
      return res.status(403).json({ error: 'Invalid consumer token' });
    }

    const consumer = await prisma.consumerUser.findUnique({
      where: { id: decoded.consumerId },
    });

    if (!consumer || !consumer.isActive) {
      return res.status(401).json({ error: 'Account not found or deactivated' });
    }

    if (consumer.email !== decoded.email) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.consumer = {
      id: consumer.id,
      email: consumer.email,
      projectId: consumer.projectId,
    };

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/** Reject CRM staff tokens on consumer-only routes when they use the staff JWT secret by mistake. */
export function rejectStaffTokenOnConsumerRoutes(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !process.env.JWT_SECRET) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { role?: string };
    if (decoded.role && decoded.role !== CONSUMER_JWT_ROLE) {
      return res.status(403).json({ error: 'Staff tokens cannot access consumer routes' });
    }
  } catch {
    // Not a staff token — consumer auth will validate next
  }

  next();
}
