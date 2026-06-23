import { ProjectStage, ProjectStatus } from '@prisma/client';
import prisma from '../prisma';
import { buildConsumerProjectStatus } from '../utils/consumerProjectStatus';
import {
  buildConsumerHelpContextSuggestions,
  filterSuggestionsForScreen,
  isMonsoonMonth,
  maintenanceFlagsFromSchedule,
  type ConsumerHelpContextSuggestion,
  type HelpContextScreen,
} from '../utils/consumerHelpContext';
import { getOrCreateMonthlyReading } from './consumerEnergyService';
import {
  ensureWarrantyAndSchedule,
  getMaintenanceSchedule,
  getSystemHealth,
  getWarrantyPayload,
} from './consumerMaintainService';

export type ConsumerHelpContextPayload = {
  suggestions: ConsumerHelpContextSuggestion[];
};

function currentStepKey(
  projectStage: ProjectStage | null,
  projectStatus: ProjectStatus,
  steps: { key: string; state: string }[],
): string | null {
  const current = steps.find((s) => s.state === 'current');
  if (current) return current.key;
  const status = buildConsumerProjectStatus(projectStage, projectStatus);
  if (status.isLive) return 'live';
  return null;
}

export async function getConsumerHelpContext(
  consumerUserId: string,
  screen: HelpContextScreen = 'all',
): Promise<ConsumerHelpContextPayload> {
  const consumer = await prisma.consumerUser.findUnique({
    where: { id: consumerUserId },
    include: {
      project: {
        select: {
          projectStage: true,
          projectStatus: true,
          subsidyRequestDate: true,
        },
      },
    },
  });
  if (!consumer) throw new Error('Consumer not found');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  await ensureWarrantyAndSchedule(consumerUserId);

  const [health, schedule, warranty, energy] = await Promise.all([
    getSystemHealth(consumerUserId),
    getMaintenanceSchedule(consumerUserId),
    getWarrantyPayload(consumerUserId),
    getOrCreateMonthlyReading(consumerUserId, year, month),
  ]);

  const projectStatus = buildConsumerProjectStatus(
    consumer.project.projectStage,
    consumer.project.projectStatus,
  );

  const maintenanceFlags = maintenanceFlagsFromSchedule(schedule);
  const warrantyYears = warranty.items.map((w) => w.yearsRemaining);
  const warrantyYearsMin = warrantyYears.length > 0 ? Math.min(...warrantyYears) : null;

  const signals = {
    isLive: projectStatus.isLive,
    currentStepKey: currentStepKey(
      consumer.project.projectStage,
      consumer.project.projectStatus,
      projectStatus.steps,
    ),
    hasNetMeterDate: Boolean(consumer.project.subsidyRequestDate),
    systemHealth: health.status,
    hasOverdueMaintenance: maintenanceFlags.hasOverdueMaintenance,
    hasDueMaintenance: maintenanceFlags.hasDueMaintenance,
    warrantyYearsMin,
    monthGeneratedKwh: energy.totalGenerated,
    isEstimatedEnergy: energy.isEstimated,
    isMonsoonSeason: isMonsoonMonth(month),
    hasGridExport: energy.gridExport > 0,
  };

  const all = buildConsumerHelpContextSuggestions(signals);
  const limit = screen === 'help' ? 5 : 3;

  return {
    suggestions: filterSuggestionsForScreen(all, screen, limit),
  };
}
