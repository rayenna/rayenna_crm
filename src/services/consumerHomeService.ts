import { TIER_LABELS } from '../utils/consumerGamification';
import { buildConsumerProjectStatus, greetingForHour } from '../utils/consumerProjectStatus';
import { getOrCreateMonthlyReading } from './consumerEnergyService';
import { getSystemHealth, getMaintenanceSchedule } from './consumerMaintainService';
import { listConsumerNotifications } from './consumerProfileService';
import prisma from '../prisma';

export type HomeEnergySummaryDto = {
  year: number;
  month: number;
  monthLabel: string;
  totalGenerated: number;
  totalSavings: number;
  estimatedTodayKwh: number;
  isEstimated: boolean;
  systemKw: number;
};

export type ConsumerHomeDto = {
  greeting: string;
  displayName: string;
  project: {
    headline: string;
    subline: string | null;
    siteAddress: string | null;
    systemKw: number;
    progressPercent: number;
    steps: { key: string; label: string; state: 'complete' | 'current' | 'upcoming' }[];
    isLive: boolean;
  };
  energy: HomeEnergySummaryDto;
  systemHealth: {
    status: string;
    label: string;
    message: string;
  };
  nextMaintenance: {
    title: string;
    statusLabel: string;
  } | null;
  member: {
    tier: string;
    tierLabel: string;
    points: number;
  };
  unreadNotifications: number;
};

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function monthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

function displayName(firstName: string | null, lastName: string | null, email: string): string {
  const full = [firstName, lastName].filter(Boolean).join(' ').trim();
  return full || email.split('@')[0] || 'Member';
}

export async function getConsumerHome(consumerUserId: string): Promise<ConsumerHomeDto> {
  const consumer = await prisma.consumerUser.findUnique({
    where: { id: consumerUserId },
    include: {
      project: {
        select: {
          projectStage: true,
          projectStatus: true,
          siteAddress: true,
          systemCapacity: true,
        },
      },
    },
  });
  if (!consumer) throw new Error('Consumer not found');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [energy, health, schedule, notifications] = await Promise.all([
    getOrCreateMonthlyReading(consumerUserId, year, month),
    getSystemHealth(consumerUserId),
    getMaintenanceSchedule(consumerUserId),
    listConsumerNotifications(consumerUserId),
  ]);

  const days = daysInMonth(year, month);
  const estimatedTodayKwh = days > 0 ? Math.round(energy.totalGenerated / days) : 0;

  const projectStatus = buildConsumerProjectStatus(
    consumer.project.projectStage,
    consumer.project.projectStatus,
  );

  const systemKw =
    consumer.project.systemCapacity && consumer.project.systemCapacity > 0
      ? consumer.project.systemCapacity
      : energy.systemKw;

  const nextDue = schedule.find(
    (item) => item.status === 'DUE' || item.status === 'OVERDUE',
  );

  return {
    greeting: greetingForHour(now.getHours()),
    displayName: displayName(consumer.firstName, consumer.lastName, consumer.email),
    project: {
      headline: projectStatus.headline,
      subline: projectStatus.subline,
      siteAddress: consumer.project.siteAddress,
      systemKw,
      progressPercent: projectStatus.progressPercent,
      steps: projectStatus.steps,
      isLive: projectStatus.isLive,
    },
    energy: {
      year,
      month,
      monthLabel: monthLabel(month, year),
      totalGenerated: energy.totalGenerated,
      totalSavings: energy.totalSavings,
      estimatedTodayKwh,
      isEstimated: energy.isEstimated,
      systemKw: energy.systemKw,
    },
    systemHealth: {
      status: health.status,
      label: health.label,
      message: health.message,
    },
    nextMaintenance: nextDue
      ? { title: nextDue.title, statusLabel: nextDue.statusLabel }
      : null,
    member: {
      tier: consumer.memberTier,
      tierLabel: TIER_LABELS[consumer.memberTier],
      points: consumer.points,
    },
    unreadNotifications: notifications.unreadCount,
  };
}
