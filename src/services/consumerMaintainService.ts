import {
  ConsumerMaintenanceRequestStatus,
  ConsumerMaintenanceRequestType,
  MaintenanceScheduleStatus,
} from '@prisma/client';
import prisma from '../prisma';

const PANEL_WARRANTY_YEARS = 25;
const INVERTER_WARRANTY_YEARS = 5;
const DEFAULT_PANEL_W = 275;

export type SystemHealthStatus = 'OPTIMAL' | 'WARNING' | 'CRITICAL';

export type SystemHealthDto = {
  status: SystemHealthStatus;
  label: string;
  message: string;
  systemKw: number;
  panelCount: number;
  installedAt: string | null;
  installedLabel: string | null;
};

export type WarrantyItemDto = {
  id: string;
  componentKey: string;
  name: string;
  specification: string | null;
  totalYears: number;
  yearsRemaining: number;
  expiryDate: string;
  progressPercent: number;
};

export type MaintenanceScheduleItemDto = {
  id: string;
  taskKey: string;
  title: string;
  status: MaintenanceScheduleStatus;
  dueDate: string | null;
  completedAt: string | null;
  statusLabel: string;
};

export type MaintenanceRequestDto = {
  id: string;
  requestType: ConsumerMaintenanceRequestType;
  title: string;
  description: string | null;
  preferredDate: string | null;
  status: ConsumerMaintenanceRequestStatus;
  createdAt: string;
};

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatInstalledLabel(d: Date): string {
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function addYears(from: Date, years: number): Date {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

function yearsBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

function scheduleStatusLabel(
  status: MaintenanceScheduleStatus,
  dueDate: Date | null,
  completedAt: Date | null,
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (status === MaintenanceScheduleStatus.COMPLETED && completedAt) {
    const days = Math.floor((today.getTime() - completedAt.getTime()) / (24 * 60 * 60 * 1000));
    if (days < 14) return 'Completed 2 weeks ago';
    if (days < 60) return `Completed ${Math.floor(days / 7)} weeks ago`;
    return `Completed ${completedAt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
  }

  if (!dueDate) return 'Scheduled';

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
  if (diffDays === 0) return 'Due today';
  if (diffDays <= 60) return `Due in ${diffDays} days`;
  return due.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

async function loadConsumerProject(consumerUserId: string) {
  const consumer = await prisma.consumerUser.findUnique({
    where: { id: consumerUserId },
    include: {
      project: {
        select: {
          systemCapacity: true,
          panelCapacityW: true,
          panelBrand: true,
          panelType: true,
          inverterBrand: true,
          inverterCapacityKw: true,
          installationCompletionDate: true,
          confirmationDate: true,
          createdAt: true,
        },
      },
    },
  });
  if (!consumer) throw new Error('Consumer not found');
  return consumer;
}

function resolveInstallDate(project: {
  installationCompletionDate: Date | null;
  confirmationDate: Date | null;
  createdAt: Date;
}): Date {
  return (
    project.installationCompletionDate ??
    project.confirmationDate ??
    project.createdAt
  );
}

function resolvePanelCount(
  systemKw: number,
  panelCapacityW: number | null,
): number {
  const w = panelCapacityW && panelCapacityW > 0 ? panelCapacityW : DEFAULT_PANEL_W;
  return Math.max(1, Math.round((systemKw * 1000) / w));
}

export async function ensureWarrantyAndSchedule(consumerUserId: string): Promise<void> {
  const consumer = await loadConsumerProject(consumerUserId);
  const project = consumer.project;
  const systemKw = project.systemCapacity && project.systemCapacity > 0 ? project.systemCapacity : 5.5;
  const installDate = resolveInstallDate(project);
  const panelCount = resolvePanelCount(systemKw, project.panelCapacityW);
  const panelW = project.panelCapacityW ?? DEFAULT_PANEL_W;
  const panelType = project.panelType ?? 'Monocrystalline';

  const existingWarranty = await prisma.consumerWarrantyItem.count({
    where: { consumerUserId },
  });

  if (existingWarranty === 0) {
    const panelExpiry = addYears(installDate, PANEL_WARRANTY_YEARS);
    const inverterExpiry = addYears(installDate, INVERTER_WARRANTY_YEARS);
    const now = new Date();

    const inverterName = project.inverterBrand
      ? `${project.inverterBrand}${project.inverterCapacityKw ? ` ${project.inverterCapacityKw}.0` : ''}`
      : 'Solar Inverter';

    await prisma.consumerWarrantyItem.createMany({
      data: [
        {
          consumerUserId,
          componentKey: 'panels',
          name: 'Solar Panels',
          specification: `${panelCount}×${panelW}W ${panelType}`,
          totalYears: PANEL_WARRANTY_YEARS,
          yearsRemaining: Math.max(0, yearsBetween(now, panelExpiry)),
          expiryDate: panelExpiry,
        },
        {
          consumerUserId,
          componentKey: 'inverter',
          name: 'Inverter',
          specification: inverterName,
          totalYears: INVERTER_WARRANTY_YEARS,
          yearsRemaining: Math.max(0, yearsBetween(now, inverterExpiry)),
          expiryDate: inverterExpiry,
        },
      ],
    });
  }

  const existingSchedule = await prisma.maintenanceScheduleItem.count({
    where: { consumerUserId },
  });

  if (existingSchedule === 0) {
    const today = new Date();
    await prisma.maintenanceScheduleItem.createMany({
      data: [
        {
          consumerUserId,
          taskKey: 'panel_cleaning',
          title: 'Panel Cleaning',
          status: MaintenanceScheduleStatus.DUE,
          dueDate: addDays(today, 12),
        },
        {
          consumerUserId,
          taskKey: 'system_inspection',
          title: 'System Inspection',
          status: MaintenanceScheduleStatus.COMPLETED,
          dueDate: addDays(today, -30),
          completedAt: addDays(today, -14),
        },
        {
          consumerUserId,
          taskKey: 'inverter_check',
          title: 'Inverter Check',
          status: MaintenanceScheduleStatus.DUE,
          dueDate: addDays(today, 45),
        },
      ],
    });
  }
}

export async function getSystemHealth(consumerUserId: string): Promise<SystemHealthDto> {
  await ensureWarrantyAndSchedule(consumerUserId);
  const consumer = await loadConsumerProject(consumerUserId);
  const project = consumer.project;
  const systemKw = project.systemCapacity && project.systemCapacity > 0 ? project.systemCapacity : 5.5;
  const installDate = resolveInstallDate(project);
  const panelCount = resolvePanelCount(systemKw, project.panelCapacityW);

  const [overdueSchedule, openCritical] = await Promise.all([
    prisma.maintenanceScheduleItem.count({
      where: {
        consumerUserId,
        status: MaintenanceScheduleStatus.OVERDUE,
      },
    }),
    prisma.consumerMaintenanceRequest.count({
      where: {
        consumerUserId,
        requestType: ConsumerMaintenanceRequestType.REPORT_ISSUE,
        status: { in: [ConsumerMaintenanceRequestStatus.OPEN, ConsumerMaintenanceRequestStatus.IN_PROGRESS] },
      },
    }),
  ]);

  const dueSoon = await prisma.maintenanceScheduleItem.count({
    where: {
      consumerUserId,
      status: MaintenanceScheduleStatus.DUE,
      dueDate: { lte: addDays(new Date(), 7) },
    },
  });

  let status: SystemHealthStatus = 'OPTIMAL';
  let message = 'All components operating normally';
  if (openCritical > 0) {
    status = 'CRITICAL';
    message = 'An urgent issue has been reported — our team will follow up';
  } else if (overdueSchedule > 0 || dueSoon > 0) {
    status = 'WARNING';
    message = 'Maintenance tasks are due soon — consider scheduling service';
  }

  return {
    status,
    label: status === 'OPTIMAL' ? 'Optimal' : status === 'WARNING' ? 'Warning' : 'Critical',
    message,
    systemKw,
    panelCount,
    installedAt: toDateOnly(installDate),
    installedLabel: formatInstalledLabel(installDate),
  };
}

export async function getWarrantyItems(consumerUserId: string): Promise<WarrantyItemDto[]> {
  await ensureWarrantyAndSchedule(consumerUserId);
  const rows = await prisma.consumerWarrantyItem.findMany({
    where: { consumerUserId },
    orderBy: { componentKey: 'asc' },
  });

  return rows.map((row) => {
    const progressPercent =
      row.totalYears > 0
        ? Math.min(100, Math.round((row.yearsRemaining / row.totalYears) * 100))
        : 0;
    return {
      id: row.id,
      componentKey: row.componentKey,
      name: row.name,
      specification: row.specification,
      totalYears: row.totalYears,
      yearsRemaining: Math.round(row.yearsRemaining * 10) / 10,
      expiryDate: toDateOnly(row.expiryDate),
      progressPercent,
    };
  });
}

export async function getMaintenanceSchedule(
  consumerUserId: string,
): Promise<MaintenanceScheduleItemDto[]> {
  await ensureWarrantyAndSchedule(consumerUserId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await prisma.maintenanceScheduleItem.findMany({
    where: { consumerUserId },
    orderBy: { dueDate: 'asc' },
  });

  // Mark past-due items as OVERDUE when still DUE
  for (const row of rows) {
    if (
      row.status === MaintenanceScheduleStatus.DUE &&
      row.dueDate &&
      row.dueDate < today
    ) {
      await prisma.maintenanceScheduleItem.update({
        where: { id: row.id },
        data: { status: MaintenanceScheduleStatus.OVERDUE },
      });
      row.status = MaintenanceScheduleStatus.OVERDUE;
    }
  }

  return rows.map((row) => ({
    id: row.id,
    taskKey: row.taskKey,
    title: row.title,
    status: row.status,
    dueDate: row.dueDate ? toDateOnly(row.dueDate) : null,
    completedAt: row.completedAt ? toDateOnly(row.completedAt) : null,
    statusLabel: scheduleStatusLabel(row.status, row.dueDate, row.completedAt),
  }));
}

export async function listMaintenanceRequests(
  consumerUserId: string,
): Promise<MaintenanceRequestDto[]> {
  const rows = await prisma.consumerMaintenanceRequest.findMany({
    where: { consumerUserId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return rows.map((row) => ({
    id: row.id,
    requestType: row.requestType,
    title: row.title,
    description: row.description,
    preferredDate: row.preferredDate ? toDateOnly(row.preferredDate) : null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createMaintenanceRequest(
  consumerUserId: string,
  input: {
    requestType: ConsumerMaintenanceRequestType;
    title: string;
    description?: string;
    preferredDate?: string;
  },
): Promise<MaintenanceRequestDto> {
  const preferredDate = input.preferredDate
    ? new Date(`${input.preferredDate}T00:00:00.000Z`)
    : undefined;

  const row = await prisma.consumerMaintenanceRequest.create({
    data: {
      consumerUserId,
      requestType: input.requestType,
      title: input.title.slice(0, 500),
      description: input.description?.slice(0, 5000),
      preferredDate,
    },
  });

  return {
    id: row.id,
    requestType: row.requestType,
    title: row.title,
    description: row.description,
    preferredDate: row.preferredDate ? toDateOnly(row.preferredDate) : null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export type WarrantyResponse = {
  systemHealth: SystemHealthDto;
  items: WarrantyItemDto[];
};

export async function getWarrantyPayload(consumerUserId: string): Promise<WarrantyResponse> {
  const [systemHealth, items] = await Promise.all([
    getSystemHealth(consumerUserId),
    getWarrantyItems(consumerUserId),
  ]);
  return { systemHealth, items };
}
