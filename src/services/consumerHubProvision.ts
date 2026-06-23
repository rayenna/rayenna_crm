import { ProjectStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { generateReferralCode } from '../utils/consumerAuth';
import { consumerMasterContactFields } from '../utils/consumerCustomerProfile';
import {
  buildBaseUsername,
  CONSUMER_DEFAULT_PASSWORD,
  HUB_ELIGIBLE_PROJECT_STATUSES,
  isDemoHubUsername,
  resolveUniqueUsernameCandidate,
  resolveUsernameNameParts,
} from '../utils/consumerUsername';

export function isHubEligibleProjectStatus(status: ProjectStatus): boolean {
  return (HUB_ELIGIBLE_PROJECT_STATUSES as readonly string[]).includes(status);
}

async function countCustomerHubAccounts(customerId: string, excludeProjectId?: string): Promise<number> {
  return prisma.consumerUser.count({
    where: {
      project: {
        customerId,
        ...(excludeProjectId ? { id: { not: excludeProjectId } } : {}),
      },
    },
  });
}

async function loadTakenUsernames(): Promise<Set<string>> {
  const rows = await prisma.consumerUser.findMany({ select: { username: true } });
  return new Set(rows.map((r) => r.username));
}

async function allocateUsername(customerId: string, projectId: string): Promise<string> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error('Customer not found');

  const existingCount = await countCustomerHubAccounts(customerId, projectId);
  const parts = resolveUsernameNameParts(customer);
  const base = buildBaseUsername(parts, existingCount);
  const taken = await loadTakenUsernames();
  return resolveUniqueUsernameCandidate(base, taken);
}

async function allocateReferralCode(nameSeed: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateReferralCode(nameSeed);
    const clash = await prisma.consumerUser.findUnique({ where: { referralCode: code } });
    if (!clash) return code;
  }
  return generateReferralCode(`${nameSeed}${Date.now()}`);
}

async function syncConsumerUserContactFields(consumerUserId: string, customerId: string): Promise<void> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return;

  const { phone, email } = consumerMasterContactFields(customer);
  await prisma.consumerUser.update({
    where: { id: consumerUserId },
    data: { phone, email },
  });
}

export type ProvisionResult =
  | { action: 'created'; username: string }
  | { action: 'reactivated'; username: string }
  | { action: 'deactivated'; username: string }
  | { action: 'synced'; username: string }
  | { action: 'unchanged'; username: string | null }
  | { action: 'skipped'; reason: string };

export async function syncConsumerUsersForCustomer(customerId: string): Promise<number> {
  const users = await prisma.consumerUser.findMany({
    where: { project: { customerId } },
    select: { id: true },
  });

  for (const user of users) {
    await syncConsumerUserContactFields(user.id, customerId);
  }

  return users.length;
}

export function scheduleConsumerContactSyncForCustomer(customerId: string): void {
  syncConsumerUsersForCustomer(customerId).catch((err) => {
    console.error('Consumer Hub contact sync failed for customer', customerId, err);
  });
}

export async function syncConsumerHubForProject(
  projectId: string,
  projectStatus: ProjectStatus,
): Promise<ProvisionResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { customer: true, consumerUser: true },
  });
  if (!project) {
    return { action: 'skipped', reason: 'project_not_found' };
  }

  const eligible = isHubEligibleProjectStatus(projectStatus);
  const existing = project.consumerUser;
  const contactFields = consumerMasterContactFields(project.customer);

  if (!eligible) {
    if (!existing) {
      return { action: 'unchanged', username: null };
    }
    if (isDemoHubUsername(existing.username)) {
      await prisma.consumerUser.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          phone: contactFields.phone,
          email: contactFields.email,
        },
      });
      return { action: 'synced', username: existing.username };
    }
    if (!existing.isActive) {
      return { action: 'unchanged', username: existing.username };
    }
    await prisma.consumerUser.update({
      where: { id: existing.id },
      data: { isActive: false },
    });
    return { action: 'deactivated', username: existing.username };
  }

  if (existing) {
    await prisma.consumerUser.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        phone: contactFields.phone,
        email: contactFields.email,
        firstName: project.customer.firstName,
        lastName: project.customer.lastName,
      },
    });
    if (existing.isActive) {
      return { action: 'synced', username: existing.username };
    }
    return { action: 'reactivated', username: existing.username };
  }

  const username = await allocateUsername(project.customerId, project.id);
  const nameSeed = project.customer.firstName || project.customer.companyName || project.customer.customerName;
  const referralCode = await allocateReferralCode(nameSeed);
  const password = await bcrypt.hash(CONSUMER_DEFAULT_PASSWORD, 10);

  await prisma.consumerUser.create({
    data: {
      username,
      email: contactFields.email,
      password,
      projectId: project.id,
      firstName: project.customer.firstName,
      lastName: project.customer.lastName,
      phone: contactFields.phone,
      referralCode,
    },
  });

  return { action: 'created', username };
}

export type BackfillSummary = {
  created: number;
  reactivated: number;
  deactivated: number;
  synced: number;
  unchanged: number;
  skipped: number;
  errors: { projectId: string; message: string }[];
};

export async function backfillConsumerHubAccounts(): Promise<BackfillSummary> {
  const summary: BackfillSummary = {
    created: 0,
    reactivated: 0,
    deactivated: 0,
    synced: 0,
    unchanged: 0,
    skipped: 0,
    errors: [],
  };

  const projects = await prisma.project.findMany({
    select: { id: true, projectStatus: true },
  });

  const total = projects.length;
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    if (i === 0 || (i + 1) % 10 === 0 || i + 1 === total) {
      console.log(`Solar Hub backfill: ${i + 1}/${total} projects…`);
    }
    try {
      const result = await syncConsumerHubForProject(project.id, project.projectStatus);
      if (result.action === 'created') summary.created += 1;
      else if (result.action === 'reactivated') summary.reactivated += 1;
      else if (result.action === 'deactivated') summary.deactivated += 1;
      else if (result.action === 'synced') summary.synced += 1;
      else if (result.action === 'unchanged') summary.unchanged += 1;
      else summary.skipped += 1;
    } catch (err) {
      summary.errors.push({
        projectId: project.id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summary;
}

/** Fire-and-forget hook from CRM project routes — errors are logged, not thrown. */
export function scheduleConsumerHubSync(projectId: string, projectStatus: ProjectStatus): void {
  syncConsumerHubForProject(projectId, projectStatus).catch((err) => {
    console.error('Consumer Hub sync failed for project', projectId, err);
  });
}
