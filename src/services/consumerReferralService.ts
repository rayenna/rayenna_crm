import { ProjectStatus } from '@prisma/client';
import prisma from '../prisma';
import { extractHubReferralCandidates } from '../utils/consumerReferral';
import { tierFromPoints } from '../utils/consumerAuth';

export const REFERRAL_ATTRIBUTE_POINTS = 50;

export async function countReferralSuccesses(consumerUserId: string): Promise<number> {
  return prisma.consumerUser.count({
    where: {
      referredById: consumerUserId,
      project: { projectStatus: { not: ProjectStatus.LOST } },
    },
  });
}

async function awardReferralPoints(consumerUserId: string): Promise<void> {
  const updated = await prisma.consumerUser.update({
    where: { id: consumerUserId },
    data: { points: { increment: REFERRAL_ATTRIBUTE_POINTS } },
  });
  await prisma.consumerUser.update({
    where: { id: consumerUserId },
    data: { memberTier: tierFromPoints(updated.points) },
  });
}

/** Link a new/existing Hub user to a referrer when CRM lead details include their Hub code. */
export async function attributeHubReferralIfPresent(consumerUserId: string): Promise<boolean> {
  const consumer = await prisma.consumerUser.findUnique({
    where: { id: consumerUserId },
    select: {
      id: true,
      referredById: true,
      project: {
        select: {
          customerId: true,
          leadSourceDetails: true,
        },
      },
    },
  });
  if (!consumer || consumer.referredById) return false;

  const candidates = extractHubReferralCandidates(consumer.project.leadSourceDetails);
  if (candidates.length === 0) return false;

  const referrer = await prisma.consumerUser.findFirst({
    where: {
      referralCode: { in: candidates },
      id: { not: consumerUserId },
      project: { customerId: { not: consumer.project.customerId } },
    },
    select: { id: true },
  });
  if (!referrer) return false;

  await prisma.consumerUser.update({
    where: { id: consumerUserId },
    data: { referredById: referrer.id },
  });
  await awardReferralPoints(referrer.id);
  return true;
}

export async function attributeHubReferralForProject(projectId: string): Promise<void> {
  const consumer = await prisma.consumerUser.findUnique({
    where: { projectId },
    select: { id: true },
  });
  if (!consumer) return;
  try {
    await attributeHubReferralIfPresent(consumer.id);
  } catch (err) {
    console.error('Hub referral attribute failed', consumer.id, err);
  }
}

export function scheduleHubReferralAttribute(projectId: string): void {
  void attributeHubReferralForProject(projectId);
}
