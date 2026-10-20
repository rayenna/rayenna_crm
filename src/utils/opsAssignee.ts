import { ProjectStatus, UserRole } from '@prisma/client';
import prisma from '../prisma';

/** Project statuses that belong to Ops delivery workload. */
export const CONFIRMED_OR_BEYOND: readonly ProjectStatus[] = [
  ProjectStatus.CONFIRMED,
  ProjectStatus.UNDER_INSTALLATION,
  ProjectStatus.SUBMITTED_FOR_SUBSIDY,
  ProjectStatus.COMPLETED,
  ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
] as const;

export function isConfirmedOrBeyond(status: ProjectStatus | string | null | undefined): boolean {
  if (!status) return false;
  return (CONFIRMED_OR_BEYOND as readonly string[]).includes(String(status));
}

export type OpsUserLite = { id: string; name: string; email: string };

export async function listActiveOpsUsers(): Promise<OpsUserLite[]> {
  return prisma.user.findMany({
    where: { role: UserRole.OPERATIONS, isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
}

export function canChooseOpsAssignee(role: UserRole | string | null | undefined): boolean {
  return role === UserRole.ADMIN || role === UserRole.SALES;
}

/**
 * Resolve `assignedOpsId` for create/update.
 * - Not Confirmed+: keep current (or null on create).
 * - 0 Ops users: null when Confirmed+.
 * - 1 Ops user: always that user when Confirmed+.
 * - 2+ Ops: Admin/Sales may set a valid Ops id; else keep current if still valid; else null.
 */
export function resolveAssignedOpsId(args: {
  finalStatus: ProjectStatus | string;
  currentOpsId: string | null | undefined;
  requestedOpsId: string | null | undefined;
  canChooseOps: boolean;
  opsUsers: ReadonlyArray<{ id: string }>;
}): string | null {
  const { finalStatus, currentOpsId, requestedOpsId, canChooseOps, opsUsers } = args;
  if (!isConfirmedOrBeyond(finalStatus)) {
    return currentOpsId ?? null;
  }

  if (opsUsers.length === 0) return null;
  if (opsUsers.length === 1) return opsUsers[0]!.id;

  const opsIds = new Set(opsUsers.map((u) => u.id));
  const requested =
    requestedOpsId != null && String(requestedOpsId).trim() !== ''
      ? String(requestedOpsId).trim()
      : null;

  if (canChooseOps && requested && opsIds.has(requested)) {
    return requested;
  }
  if (currentOpsId && opsIds.has(currentOpsId)) {
    return currentOpsId;
  }
  return null;
}

/** Assign the sole Ops user to all Confirmed+ projects missing an assignee. */
export async function backfillSoleOpsAssignee(): Promise<{
  opsUserId: string | null;
  updated: number;
}> {
  const opsUsers = await listActiveOpsUsers();
  if (opsUsers.length !== 1) {
    return { opsUserId: null, updated: 0 };
  }
  const opsUserId = opsUsers[0]!.id;
  const result = await prisma.project.updateMany({
    where: {
      projectStatus: { in: [...CONFIRMED_OR_BEYOND] },
      assignedOpsId: null,
    },
    data: { assignedOpsId: opsUserId },
  });
  return { opsUserId, updated: result.count };
}
