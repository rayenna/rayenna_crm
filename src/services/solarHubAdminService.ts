import {
  ConsumerMaintenanceRequestStatus,
  ConsumerMaintenanceRequestType,
  ProjectStatus,
  UserRole,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { consumerMasterContactFields } from '../utils/consumerCustomerProfile';
import { consumerProvisioningPassword, generateHubTemporaryPassword, isDemoHubUsername } from '../utils/consumerUsername';
import { syncConsumerHubForProject, type ProvisionResult } from './consumerHubProvision';

const HUB_VIEW_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.OPERATIONS, UserRole.MANAGEMENT];
const HUB_MANAGE_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.OPERATIONS];

export function canViewSolarHub(role: UserRole): boolean {
  return HUB_VIEW_ROLES.includes(role);
}

export function canManageSolarHub(role: UserRole): boolean {
  return HUB_MANAGE_ROLES.includes(role);
}

export function canAdminSolarHub(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

export type SolarHubUserListItem = {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  isDemo: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  project: {
    id: string;
    slNo: number;
    projectStatus: ProjectStatus;
    customerName: string;
  };
};

export type SolarHubUserDetail = SolarHubUserListItem & {
  firstName: string | null;
  lastName: string | null;
  referralCode: string;
  points: number;
  memberTier: string;
  project: SolarHubUserListItem['project'] & {
    customerId: string;
  };
};

function mapListItem(
  row: {
    id: string;
    username: string;
    email: string | null;
    phone: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    project: {
      id: string;
      slNo: number;
      projectStatus: ProjectStatus;
      customer: { customerName: string };
    };
  },
): SolarHubUserListItem {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    phone: row.phone,
    isActive: row.isActive,
    isDemo: isDemoHubUsername(row.username),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    project: {
      id: row.project.id,
      slNo: row.project.slNo,
      projectStatus: row.project.projectStatus,
      customerName: row.project.customer.customerName,
    },
  };
}

export async function listSolarHubUsers(input: {
  search?: string;
  active?: 'true' | 'false';
  page?: number;
  limit?: number;
}): Promise<{ items: SolarHubUserListItem[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const skip = (page - 1) * limit;

  const where: {
    isActive?: boolean;
    OR?: Array<Record<string, unknown>>;
  } = {};

  if (input.active === 'true') where.isActive = true;
  if (input.active === 'false') where.isActive = false;

  const q = input.search?.trim();
  if (q) {
    where.OR = [
      { username: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { project: { customer: { customerName: { contains: q, mode: 'insensitive' } } } },
      { project: { customer: { customerId: { contains: q, mode: 'insensitive' } } } },
    ];
    const slNo = Number(q.replace(/^#/, ''));
    if (Number.isFinite(slNo) && slNo > 0) {
      where.OR.push({ project: { slNo } });
    }
  }

  const [total, rows] = await Promise.all([
    prisma.consumerUser.count({ where }),
    prisma.consumerUser.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      include: {
        project: {
          select: {
            id: true,
            slNo: true,
            projectStatus: true,
            customer: { select: { customerName: true } },
          },
        },
      },
    }),
  ]);

  return { items: rows.map(mapListItem), total, page, limit };
}

export async function getSolarHubUser(id: string): Promise<SolarHubUserDetail | null> {
  const row = await prisma.consumerUser.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          slNo: true,
          projectStatus: true,
          customer: { select: { customerName: true, customerId: true } },
        },
      },
    },
  });
  if (!row) return null;

  const base = mapListItem(row);
  return {
    ...base,
    firstName: row.firstName,
    lastName: row.lastName,
    referralCode: row.referralCode,
    points: row.points,
    memberTier: row.memberTier,
    project: {
      ...base.project,
      customerId: row.project.customer.customerId,
    },
  };
}

export async function getSolarHubUserForProject(projectId: string) {
  const row = await prisma.consumerUser.findUnique({
    where: { projectId },
    include: {
      project: {
        select: {
          id: true,
          slNo: true,
          projectStatus: true,
          customer: { select: { customerName: true, customerId: true } },
        },
      },
    },
  });
  if (!row) return null;
  return getSolarHubUser(row.id);
}

export async function deactivateSolarHubUser(id: string): Promise<SolarHubUserDetail> {
  const existing = await prisma.consumerUser.findUnique({ where: { id } });
  if (!existing) throw new Error('Solar Hub user not found');
  if (isDemoHubUsername(existing.username)) {
    throw new Error('The demo account cannot be deactivated');
  }

  await prisma.consumerUser.update({
    where: { id },
    data: { isActive: false },
  });

  const detail = await getSolarHubUser(id);
  if (!detail) throw new Error('Solar Hub user not found');
  return detail;
}

export async function activateSolarHubUser(id: string): Promise<SolarHubUserDetail> {
  const existing = await prisma.consumerUser.findUnique({ where: { id } });
  if (!existing) throw new Error('Solar Hub user not found');

  await prisma.consumerUser.update({
    where: { id },
    data: { isActive: true },
  });

  const detail = await getSolarHubUser(id);
  if (!detail) throw new Error('Solar Hub user not found');
  return detail;
}

export async function deleteSolarHubUser(id: string): Promise<void> {
  const existing = await prisma.consumerUser.findUnique({
    where: { id },
    include: { project: { select: { projectStatus: true } } },
  });
  if (!existing) throw new Error('Solar Hub user not found');
  if (isDemoHubUsername(existing.username)) {
    throw new Error('The demo account cannot be deleted');
  }
  if (existing.project.projectStatus !== ProjectStatus.LOST) {
    throw new Error('Solar Hub accounts can only be deleted when the linked project status is LOST');
  }

  await prisma.consumerUser.delete({ where: { id } });
}

export type ResetPasswordResult = {
  username: string;
  temporaryPassword: string;
};

export async function resetSolarHubPassword(
  id: string,
  mode: 'default' | 'generated',
): Promise<ResetPasswordResult> {
  const existing = await prisma.consumerUser.findUnique({ where: { id } });
  if (!existing) throw new Error('Solar Hub user not found');

  const envInitial = consumerProvisioningPassword();
  const temporaryPassword =
    mode === 'default' && envInitial
      ? envInitial
      : generateHubTemporaryPassword();

  const hashed = await bcrypt.hash(temporaryPassword, 10);
  await prisma.consumerUser.update({
    where: { id },
    data: { password: hashed, mustChangePassword: true },
  });

  return { username: existing.username, temporaryPassword };
}

export async function resyncSolarHubUserFromCustomer(id: string): Promise<SolarHubUserDetail> {
  const existing = await prisma.consumerUser.findUnique({
    where: { id },
    include: { project: { include: { customer: true } } },
  });
  if (!existing) throw new Error('Solar Hub user not found');

  const fields = consumerMasterContactFields(existing.project.customer);
  await prisma.consumerUser.update({
    where: { id },
    data: {
      phone: fields.phone,
      email: fields.email,
      firstName: existing.project.customer.firstName,
      lastName: existing.project.customer.lastName,
    },
  });

  const detail = await getSolarHubUser(id);
  if (!detail) throw new Error('Solar Hub user not found');
  return detail;
}

export async function provisionSolarHubForProjectAdmin(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error('Project not found');
  return syncConsumerHubForProject(projectId, project.projectStatus);
}

const ELIGIBLE_HUB_STATUSES: ProjectStatus[] = [
  ProjectStatus.COMPLETED,
  ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
];

export type ProvisioningGapItem = {
  projectId: string;
  slNo: number;
  projectStatus: ProjectStatus;
  customerName: string;
  customerId: string;
};

export async function listProvisioningGaps(input: {
  page?: number;
  limit?: number;
}): Promise<{ items: ProvisioningGapItem[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const skip = (page - 1) * limit;

  const where = {
    projectStatus: { in: ELIGIBLE_HUB_STATUSES },
    consumerUser: null,
  };

  const [total, rows] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { slNo: 'desc' },
      include: { customer: { select: { customerName: true, customerId: true } } },
    }),
  ]);

  return {
    items: rows.map((p) => ({
      projectId: p.id,
      slNo: p.slNo,
      projectStatus: p.projectStatus,
      customerName: p.customer.customerName,
      customerId: p.customer.customerId,
    })),
    total,
    page,
    limit,
  };
}

export type BulkProvisionSummary = {
  created: number;
  reactivated: number;
  synced: number;
  unchanged: number;
  skipped: number;
  errors: { projectId: string; message: string }[];
};

export async function bulkProvisionSolarHub(projectIds: string[]): Promise<BulkProvisionSummary> {
  const summary: BulkProvisionSummary = {
    created: 0,
    reactivated: 0,
    synced: 0,
    unchanged: 0,
    skipped: 0,
    errors: [],
  };

  const uniqueIds = [...new Set(projectIds.filter(Boolean))];

  for (const projectId of uniqueIds) {
    try {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        summary.errors.push({ projectId, message: 'Project not found' });
        continue;
      }
      if (!ELIGIBLE_HUB_STATUSES.includes(project.projectStatus)) {
        summary.skipped += 1;
        continue;
      }
      const result = await syncConsumerHubForProject(projectId, project.projectStatus);
      applyProvisionResult(summary, result);
    } catch (err) {
      summary.errors.push({
        projectId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summary;
}

export async function provisionAllSolarHubGaps(): Promise<BulkProvisionSummary> {
  const rows = await prisma.project.findMany({
    where: {
      projectStatus: { in: ELIGIBLE_HUB_STATUSES },
      consumerUser: null,
    },
    select: { id: true },
  });
  return bulkProvisionSolarHub(rows.map((r) => r.id));
}

function applyProvisionResult(
  summary: BulkProvisionSummary,
  result: ProvisionResult,
): void {
  if (result.action === 'created') summary.created += 1;
  else if (result.action === 'reactivated') summary.reactivated += 1;
  else if (result.action === 'synced') summary.synced += 1;
  else if (result.action === 'unchanged') summary.unchanged += 1;
  else summary.skipped += 1;
}

export type HubMaintenanceRequestItem = {
  id: string;
  requestType: ConsumerMaintenanceRequestType;
  title: string;
  description: string | null;
  preferredDate: string | null;
  status: ConsumerMaintenanceRequestStatus;
  createdAt: string;
  updatedAt: string;
  username: string;
  projectId: string;
  projectSlNo: number;
  customerName: string;
};

type MaintenanceRowWithRelations = {
  id: string;
  requestType: ConsumerMaintenanceRequestType;
  title: string;
  description: string | null;
  preferredDate: Date | null;
  status: ConsumerMaintenanceRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  consumerUser: {
    username: string;
    project: {
      id: string;
      slNo: number;
      customer: { customerName: string };
    };
  };
};

function mapMaintenanceRow(r: MaintenanceRowWithRelations): HubMaintenanceRequestItem {
  return {
    id: r.id,
    requestType: r.requestType,
    title: r.title,
    description: r.description,
    preferredDate: r.preferredDate ? r.preferredDate.toISOString().slice(0, 10) : null,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    username: r.consumerUser.username,
    projectId: r.consumerUser.project.id,
    projectSlNo: r.consumerUser.project.slNo,
    customerName: r.consumerUser.project.customer.customerName,
  };
}

export async function listHubMaintenanceRequests(input: {
  status?: ConsumerMaintenanceRequestStatus;
  page?: number;
  limit?: number;
}): Promise<{ items: HubMaintenanceRequestItem[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const skip = (page - 1) * limit;

  const where = input.status ? { status: input.status } : {};

  const [total, rows] = await Promise.all([
    prisma.consumerMaintenanceRequest.count({ where }),
    prisma.consumerMaintenanceRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        consumerUser: {
          select: {
            username: true,
            project: {
              select: {
                id: true,
                slNo: true,
                customer: { select: { customerName: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    items: rows.map(mapMaintenanceRow),
    total,
    page,
    limit,
  };
}

export async function updateHubMaintenanceRequestStatus(
  id: string,
  status: ConsumerMaintenanceRequestStatus,
): Promise<HubMaintenanceRequestItem> {
  const existing = await prisma.consumerMaintenanceRequest.findUnique({ where: { id } });
  if (!existing) throw new Error('Maintenance request not found');

  const refreshed = await prisma.consumerMaintenanceRequest.update({
    where: { id },
    data: { status },
    include: {
      consumerUser: {
        select: {
          username: true,
          project: {
            select: {
              id: true,
              slNo: true,
              customer: { select: { customerName: true } },
            },
          },
        },
      },
    },
  });

  return mapMaintenanceRow(refreshed);
}

export async function verifyHubUserPassword(consumerUserId: string, password: string): Promise<boolean> {
  const user = await prisma.consumerUser.findUnique({ where: { id: consumerUserId } });
  if (!user) return false;
  return bcrypt.compare(password, user.password);
}
