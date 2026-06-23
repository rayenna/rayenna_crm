import { ConsumerAchievementType } from '@prisma/client';
import prisma from '../prisma';
import { tierFromPoints, toConsumerPublicUser } from '../utils/consumerAuth';
import {
  buildConsumerCrmProfile,
  displayNameFromCrmProfile,
  type ConsumerCrmProfileDto,
} from '../utils/consumerCustomerProfile';
import {
  ACHIEVEMENT_META,
  ACHIEVEMENT_POINTS,
  CO2_KG_PER_KWH,
  isEarlyAdopterEligible,
  isOneYearSolarEligible,
  isReferralChampionEligible,
  memberStatusFromPoints,
  type MemberStatusDto,
} from '../utils/consumerGamification';
import { estimateMonthlyEnergy } from '../utils/consumerEnergyEstimate';

const DEFAULT_SYSTEM_KW = 5.5;

export type AchievementDto = {
  type: ConsumerAchievementType;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt: string | null;
};

export type SystemStatsDto = {
  systemKw: number;
  installedLabel: string;
  co2TonsSaved: number;
};

export type ConsumerProfileDto = {
  user: ReturnType<typeof toConsumerPublicUser>;
  crmProfile: ConsumerCrmProfileDto;
  systemStats: SystemStatsDto;
  memberStatus: MemberStatusDto;
  achievements: AchievementDto[];
};

export type ConsumerNotificationDto = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

function resolveInstallDate(project: {
  installationCompletionDate: Date | null;
  expectedCommissioningDate: Date | null;
  confirmationDate: Date | null;
  createdAt: Date;
}): Date {
  return (
    project.installationCompletionDate ??
    project.expectedCommissioningDate ??
    project.confirmationDate ??
    project.createdAt
  );
}

function formatInstalledLabel(installDate: Date): string {
  return installDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function monthsBetween(start: Date, end: Date): { year: number; month: number }[] {
  const items: { year: number; month: number }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    items.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return items;
}

async function estimateCo2TonsSaved(
  consumerUserId: string,
  systemKw: number,
  installDate: Date,
): Promise<number> {
  const readings = await prisma.energyReading.findMany({
    where: { consumerUserId },
    select: { totalGenerated: true },
  });

  let totalKwh = readings.reduce((sum, r) => sum + r.totalGenerated, 0);

  if (totalKwh <= 0) {
    const now = new Date();
    for (const { year, month } of monthsBetween(installDate, now)) {
      totalKwh += estimateMonthlyEnergy(systemKw, year, month).totalGenerated;
    }
  }

  return Math.round((totalKwh * CO2_KG_PER_KWH) / 1000 * 10) / 10;
}

async function countReferralSuccesses(_referralCode: string): Promise<number> {
  // Phase 1: referral attribution is not persisted yet; unlock when CRM adds referredBy tracking.
  void _referralCode;
  return 0;
}

async function awardPoints(consumerUserId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const updated = await prisma.consumerUser.update({
    where: { id: consumerUserId },
    data: { points: { increment: amount } },
  });
  await prisma.consumerUser.update({
    where: { id: consumerUserId },
    data: { memberTier: tierFromPoints(updated.points) },
  });
}

async function syncAchievements(
  consumerUserId: string,
  installDate: Date,
  referralCode: string,
): Promise<void> {
  const existing = await prisma.consumerAchievement.findMany({
    where: { consumerUserId },
    select: { type: true },
  });
  const unlocked = new Set(existing.map((a) => a.type));

  const referralCount = await countReferralSuccesses(referralCode);

  const checks: { type: ConsumerAchievementType; eligible: boolean }[] = [
    { type: ConsumerAchievementType.EARLY_ADOPTER, eligible: isEarlyAdopterEligible(installDate) },
    { type: ConsumerAchievementType.ONE_YEAR_SOLAR, eligible: isOneYearSolarEligible(installDate) },
    {
      type: ConsumerAchievementType.REFERRAL_CHAMPION,
      eligible: isReferralChampionEligible(referralCount),
    },
  ];

  for (const { type, eligible } of checks) {
    if (!eligible || unlocked.has(type)) continue;
    await prisma.consumerAchievement.create({
      data: { consumerUserId, type },
    });
    await awardPoints(consumerUserId, ACHIEVEMENT_POINTS[type]);
    unlocked.add(type);
  }
}

async function ensureWelcomeNotification(consumerUserId: string): Promise<void> {
  const count = await prisma.consumerNotification.count({ where: { consumerUserId } });
  if (count > 0) return;

  await prisma.consumerNotification.create({
    data: {
      consumerUserId,
      title: 'Welcome to Rayenna Solar Hub',
      body: 'Track your energy, manage maintenance, and earn rewards as you go solar with Rayenna.',
    },
  });
}

function buildAchievementList(
  unlockedMap: Map<ConsumerAchievementType, Date>,
): AchievementDto[] {
  const types = Object.values(ConsumerAchievementType);
  return types.map((type) => {
    const meta = ACHIEVEMENT_META[type];
    const unlockedAt = unlockedMap.get(type);
    return {
      type,
      title: meta.title,
      description: meta.description,
      unlocked: Boolean(unlockedAt),
      unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
    };
  });
}

export async function getConsumerProfile(consumerUserId: string): Promise<ConsumerProfileDto> {
  const consumer = await prisma.consumerUser.findUnique({
    where: { id: consumerUserId },
    include: {
      project: {
        select: {
          systemCapacity: true,
          installationCompletionDate: true,
          expectedCommissioningDate: true,
          confirmationDate: true,
          createdAt: true,
          customer: true,
        },
      },
      achievements: { select: { type: true, unlockedAt: true } },
    },
  });
  if (!consumer) throw new Error('Consumer not found');

  await ensureWelcomeNotification(consumerUserId);

  const installDate = resolveInstallDate(consumer.project);
  await syncAchievements(consumerUserId, installDate, consumer.referralCode);

  const refreshed = await prisma.consumerUser.findUnique({
    where: { id: consumerUserId },
    include: {
      project: {
        select: {
          systemCapacity: true,
          installationCompletionDate: true,
          expectedCommissioningDate: true,
          confirmationDate: true,
          createdAt: true,
          customer: true,
        },
      },
      achievements: { select: { type: true, unlockedAt: true } },
    },
  });
  if (!refreshed) throw new Error('Consumer not found');

  const systemKw =
    refreshed.project.systemCapacity && refreshed.project.systemCapacity > 0
      ? refreshed.project.systemCapacity
      : DEFAULT_SYSTEM_KW;

  const co2TonsSaved = await estimateCo2TonsSaved(consumerUserId, systemKw, installDate);
  const unlockedMap = new Map(
    refreshed.achievements.map((a) => [a.type, a.unlockedAt] as const),
  );

  const crmProfile = buildConsumerCrmProfile(refreshed.project.customer);

  return {
    user: toConsumerPublicUser(refreshed),
    crmProfile,
    systemStats: {
      systemKw,
      installedLabel: formatInstalledLabel(installDate),
      co2TonsSaved,
    },
    memberStatus: memberStatusFromPoints(refreshed.points),
    achievements: buildAchievementList(unlockedMap),
  };
}

export { displayNameFromCrmProfile, buildConsumerCrmProfile };

export async function listConsumerNotifications(
  consumerUserId: string,
): Promise<{ items: ConsumerNotificationDto[]; unreadCount: number }> {
  await ensureWelcomeNotification(consumerUserId);

  const items = await prisma.consumerNotification.findMany({
    where: { consumerUserId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = items.filter((n) => !n.isRead).length;

  return {
    items: items.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  };
}

export async function markConsumerNotificationRead(
  consumerUserId: string,
  notificationId: string,
): Promise<ConsumerNotificationDto> {
  const notification = await prisma.consumerNotification.findFirst({
    where: { id: notificationId, consumerUserId },
  });
  if (!notification) throw new Error('Notification not found');

  const updated = await prisma.consumerNotification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return {
    id: updated.id,
    title: updated.title,
    body: updated.body,
    isRead: updated.isRead,
    createdAt: updated.createdAt.toISOString(),
  };
}
