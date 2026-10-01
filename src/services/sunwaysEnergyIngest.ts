import prisma from '../prisma';
import { calendarYmdInTimeZone } from '../utils/istCalendar';
import { isDemoHubUsername } from '../utils/consumerUsername';
import { upsertLoggedGeneration } from './consumerEnergyService';
import {
  getSunwaysCloudConfig,
  listSunwaysStationMonthEnergy,
  listSunwaysStations,
  sunwaysPublicStatus,
  SunwaysCloudError,
} from './sunwaysCloudClient';
import { effectiveCapacityKw } from '../utils/solisEnergyUnits';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export type SunwaysIngestSummary = {
  skipped: boolean;
  reason?: string;
  plants: number;
  monthsWritten: number;
  failed: number;
};

export async function setProjectSunwaysStation(projectId: string, stationId: string | null): Promise<void> {
  const normalized = stationId?.trim() || null;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { solisStationId: true, deyeStationId: true },
  });
  if (!project) throw new Error('Project not found');
  if (normalized && project.solisStationId) {
    throw new Error('This project is already linked to a SolisCloud plant. Unlink Solis first.');
  }
  if (normalized && project.deyeStationId) {
    throw new Error('This project is already linked to a Deye Cloud plant. Unlink Deye first.');
  }
  if (normalized) {
    const clash = await prisma.project.findFirst({
      where: { sunwaysStationId: normalized, NOT: { id: projectId } },
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
      throw new Error(
        `That Sunways plant is already linked to project #${clash.slNo} (${who}). Unlink it there first.`,
      );
    }
  }
  await prisma.project.update({
    where: { id: projectId },
    data: { sunwaysStationId: normalized },
  });
}

export async function ingestSunwaysEnergyForProject(projectId: string): Promise<{ monthsWritten: number }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      sunwaysStationId: true,
      systemCapacity: true,
      consumerUser: { select: { id: true, username: true, isActive: true } },
    },
  });
  if (!project?.sunwaysStationId) {
    throw new Error('This project has no Sunways plant linked');
  }
  const consumer = project.consumerUser;
  if (!consumer) {
    throw new Error('No Solar Hub user for this project');
  }
  if (isDemoHubUsername(consumer.username)) {
    throw new Error('Demo Hub account cannot use live Sunways data');
  }

  let sunwaysCapacityKw: number | null = null;
  try {
    const stations = await listSunwaysStations();
    sunwaysCapacityKw = stations.find((s) => s.id === project.sunwaysStationId)?.capacityKw ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[sunways] station list for capacity failed project ${projectId}: ${msg}`);
  }

  const capacityKw = effectiveCapacityKw(project.systemCapacity, sunwaysCapacityKw);
  const nowYmd = calendarYmdInTimeZone(new Date());
  const currentYear = Number(nowYmd.slice(0, 4));
  const points = await listSunwaysStationMonthEnergy(
    project.sunwaysStationId,
    [currentYear - 1, currentYear],
    capacityKw,
  );

  let monthsWritten = 0;
  for (const p of points) {
    try {
      if (monthsWritten === 0) {
        console.info(
          `[sunways] ingest ${project.sunwaysStationId} ${p.year}-${String(p.month).padStart(2, '0')} → ${p.kwh} kWh (capacity ${capacityKw} kW)`,
        );
      }
      await upsertLoggedGeneration(consumer.id, p.year, p.month, p.kwh);
      monthsWritten += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[sunways] skip month ${p.year}-${p.month} project ${projectId}: ${msg}`);
    }
  }
  return { monthsWritten };
}

export async function ingestAllMappedSunwaysPlants(): Promise<SunwaysIngestSummary> {
  if (!getSunwaysCloudConfig()) {
    return { skipped: true, reason: 'Sunways Portal env not set', plants: 0, monthsWritten: 0, failed: 0 };
  }

  const projects = await prisma.project.findMany({
    where: { sunwaysStationId: { not: null }, consumerUser: { isNot: null } },
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
      const result = await ingestSunwaysEnergyForProject(p.id);
      monthsWritten += result.monthsWritten;
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[sunways] ingest failed project #${p.slNo}: ${msg}`);
    }
    await sleep(500);
  }

  return { skipped: false, plants: projects.length, monthsWritten, failed };
}

export async function listSunwaysStationsForAdmin() {
  if (!getSunwaysCloudConfig()) {
    throw new SunwaysCloudError(
      'Add SUNWAYS_EMAIL, SUNWAYS_PASSWORD, and optionally SUNWAYS_DISTRIBUTOR_CODES on the CRM API, then redeploy',
    );
  }
  const stations = await listSunwaysStations();
  const ids = stations.map((s) => s.id);
  const linkedRows = await prisma.project.findMany({
    where: { sunwaysStationId: { in: ids } },
    select: {
      slNo: true,
      sunwaysStationId: true,
      customer: { select: { customerName: true } },
      consumerUser: { select: { username: true } },
    },
  });
  const byStation = new Map(linkedRows.map((p) => [p.sunwaysStationId, p]));
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

export { SunwaysCloudError, sunwaysPublicStatus };
