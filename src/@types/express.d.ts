import "express";
import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
      consumer?: {
        id: string;
        username: string;
        projectId: string;
      };
    }
  }
}
