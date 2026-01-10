import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuditLogData {
  projectId: string;
  userId: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  remarks?: string;
}

export const createAuditLog = async (data: AuditLogData) => {
  try {
    await prisma.auditLog.create({
      data,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main flow
  }
};
