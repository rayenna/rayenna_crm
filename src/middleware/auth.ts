/// <reference path="../@types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import prisma from '../prisma';
import { logAccess } from '../utils/auditLogger';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      logAccess({ actionType: 'auth_failure', req });
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      role: UserRole;
    };

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      logAccess({ actionType: 'auth_failure', userId: decoded.userId, email: decoded.email, role: decoded.role, req });
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    logAccess({ actionType: 'auth_failure', req });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      logAccess({ actionType: 'auth_failure', req });
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role as UserRole)) {
      logAccess({ actionType: 'auth_failure', userId: req.user.id, email: req.user.email, role: req.user.role, req });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
