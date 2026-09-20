import prisma from '../prisma';
import { calendarYmdInTimeZone } from '../utils/istCalendar';
import { isDemoHubUsername } from '../utils/consumerUsername';
import { upsertLoggedGeneration } from './consumerEnergyService';
import { deyePublicStatus, getDeyeCloudConfig, listDeyeStationMonthEnergy, listDeyeStations, DeyeCloudError } from './deyeCloudClient';
import { effectiveCapacityKw } from '../utils/solisEnergyUnits';
import type { SolisStationYearPoint } from '../utils/solisEnergyUnits';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function addMonths(ym: { year: number; month: number }, delta: number): { year: number; month: number } {
  const idx = ym.year * 12 + (ym.month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

function formatYm(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export type DeyeIngestSummary = {
  skipped: boolean;
  reason?: string;
  plants: number;
  monthsWritten: number;
  failed: number;
};

export async function setProjectDeyeStation(projectId: string, stationId: string | null): Promise<void> {
  const normalized = stationId?.trim() || null;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { solisStationId: true },
  });
  if (!project) throw new Error('Project not found');
  if (normalized && project.solisStationId) {
    throw new Error('This project is already linked to a SolisCloud plant. Unlink Solis first.');
  }
  if (normalized) {
    const clash = await prisma.project.findFirst({
      where: { deyeStationId: normalized, NOT: { id: projectId } },
      select: {
        slNo: true,
        customer: { select: { customerName: true } },
        consumerUser: { select: { username: true } },
      },
    });
    if (clash) {
      const who = clash.consumerUser?.username
        ? `@${clash.consumerUser.username}`
        : clash.customer.customerName;
      throw new Error(`That Deye plant is already linked to project #${clash.slNo} (${who}). Unlink it there first.`);
    }
  }
  await prisma.project.update({
    where: { id: projectId },
    data: { deyeStationId: normalized },
  });
}

export async function ingestDeyeEnergyForProject(projectId: string): Promise<{ monthsWritten: number }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      deyeStationId: true,
      systemCapacity: true,
      consumerUser: { select: { id: true, username: true, isActive: true } },
    },
  });
  if (!project?.deyeStationId) {
    throw new Error('This project has no Deye plant linked');
  }
  const consumer = project.consumerUser;
  if (!consumer) {
    throw new Error('No Solar Hub user for this project');
  }
  if (isDemoHubUsername(consumer.username)) {
    throw new Error('Demo Hub account cannot use live Deye data');
  }

  let deyeCapacityKw: number | null = null;
  try {
    const stations = await listDeyeStations();
    deyeCapacityKw = stations.find((s) => s.id === project.deyeStationId)?.capacityKw ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[deye] station list for capacity failed project ${projectId}: ${msg}`);
  }

  const capacityKw = effectiveCapacityKw(project.systemCapacity, deyeCapacityKw);
  const nowYmd = calendarYmdInTimeZone(new Date());
  const currentYear = Number(nowYmd.slice(0, 4));
  const currentMonth = Number(nowYmd.slice(5, 7));
  const start = { year: currentYear - 1, month: 1 };
  const end = { year: currentYear, month: currentMonth };

  const points: SolisStationYearPoint[] = [];
  let cursor = start;
  while (cursor.year < end.year || (cursor.year === end.year && cursor.month <= end.month)) {
    const rangeEnd = addMonths(cursor, 11);
    const clip =
      rangeEnd.year > end.year || (rangeEnd.year === end.year && rangeEnd.month > end.month) ? end : rangeEnd;
    const chunk = await listDeyeStationMonthEnergy(
      project.deyeStationId,
      formatYm(cursor.year, cursor.month),
      formatYm(clip.year, clip.month),
      capacityKw,
    );
    points.push(...chunk);
    await sleep(500);
    cursor = addMonths(clip, 1);
  }

  let monthsWritten = 0;
  for (const p of points) {
    try {
      if (monthsWritten === 0) {
        console.info(
          `[deye] ingest ${project.deyeStationId} ${p.year}-${String(p.month).padStart(2, '0')} → ${p.kwh} kWh (capacity ${capacityKw} kW)`,
        );
      }
      await upsertLoggedGeneration(consumer.id, p.year, p.month, p.kwh);
      monthsWritten += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[deye] skip month ${p.year}-${p.month} project ${projectId}: ${msg}`);
    }
  }
  return { monthsWritten };
}

export async function ingestAllMappedDeyePlants(): Promise<DeyeIngestSummary> {
  if (!getDeyeCloudConfig()) {
    return { skipped: true, reason: 'Deye Cloud env not set', plants: 0, monthsWritten: 0, failed: 0 };
  }

  const projects = await prisma.project.findMany({
    where: { deyeStationId: { not: null }, consumerUser: { isNot: null } },
    select: {
      id: true,
      slNo: true,
      consumerUser: { select: { username: true, isActive: true } },
    },
  });

  let monthsWritten = 0;
  let failed = 0;
  for (const p of projects) {
    const username = p.consumerUser?.username;
    if (!username || isDemoHubUsername(username) || !p.consumerUser?.isActive) continue;
    try {
      const result = await ingestDeyeEnergyForProject(p.id);
      monthsWritten += result.monthsWritten;
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[deye] ingest failed project #${p.slNo}: ${msg}`);
    }
    await sleep(500);
  }

  return { skipped: false, plants: projects.length, monthsWritten, failed };
}

export async function listDeyeStationsForAdmin() {
  if (!getDeyeCloudConfig()) {
    throw new DeyeCloudError('Add DEYE_APP_ID, DEYE_APP_SECRET, DEYE_LOGIN, and DEYE_PASSWORD on the CRM API, then redeploy');
  }
  const stations = await listDeyeStations();
  const ids = stations.map((s) => s.id);
  const linkedRows = await prisma.project.findMany({
    where: { deyeStationId: { in: ids } },
    select: {
      slNo: true,
      deyeStationId: true,
      customer: { select: { customerName: true } },
      consumerUser: { select: { username: true } },
    },
  });
  const byStation = new Map(linkedRows.map((p) => [p.deyeStationId, p]));
  return stations.map((s) => {
    const p = byStation.get(s.id);
    return {
      ...s,
      linkedSlNo: p?.slNo ?? null,
      linkedUsername: p?.consumerUser?.username ?? null,
      linkedCustomerName: p?.customer.customerName ?? null,
    };
  });
}

export { DeyeCloudError, deyePublicStatus };
