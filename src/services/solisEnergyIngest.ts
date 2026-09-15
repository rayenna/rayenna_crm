import prisma from '../prisma';
import { calendarYmdInTimeZone } from '../utils/istCalendar';
import { isDemoHubUsername } from '../utils/consumerUsername';
import { upsertLoggedGeneration } from './consumerEnergyService';
import { getSolisCloudConfig, listSolisStations, listStationYearEnergy, SolisCloudError } from './solisCloudClient';
import { effectiveCapacityKw } from '../utils/solisEnergyUnits';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function istYearNow(now = new Date()): number {
  return Number(calendarYmdInTimeZone(now).slice(0, 4));
}

export type SolisIngestSummary = {
  skipped: boolean;
  reason?: string;
  plants: number;
  monthsWritten: number;
  failed: number;
};

export async function setProjectSolisStation(projectId: string, stationId: string | null): Promise<void> {
  const normalized = stationId?.trim() || null;
  if (normalized) {
    const clash = await prisma.project.findFirst({
      where: { solisStationId: normalized, NOT: { id: projectId } },
      select: { slNo: true },
    });
    if (clash) {
      throw new Error(`That Solis plant is already linked to project #${clash.slNo}`);
    }
  }
  await prisma.project.update({
    where: { id: projectId },
    data: { solisStationId: normalized },
  });
}

export async function ingestSolisEnergyForProject(projectId: string): Promise<{ monthsWritten: number }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      solisStationId: true,
      systemCapacity: true,
      consumerUser: { select: { id: true, username: true, isActive: true } },
    },
  });
  if (!project?.solisStationId) {
    throw new Error('This project has no Solis plant linked');
  }
  const consumer = project.consumerUser;
  if (!consumer) {
    throw new Error('No Solar Hub user for this project');
  }
  if (isDemoHubUsername(consumer.username)) {
    throw new Error('Demo Hub account cannot use live Solis data');
  }

  let solisCapacityKw: number | null = null;
  try {
    const stations = await listSolisStations();
    solisCapacityKw = stations.find((s) => s.id === project.solisStationId)?.capacityKw ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[solis] station list for capacity failed project ${projectId}: ${msg}`);
  }
  await sleep(600);

  const capacityKw = effectiveCapacityKw(project.systemCapacity, solisCapacityKw);
  const year = istYearNow();
  const years = [year - 1, year];
  let monthsWritten = 0;
  for (const y of years) {
    const points = await listStationYearEnergy(project.solisStationId, y, capacityKw);
    await sleep(600);
    for (const p of points) {
      try {
        await upsertLoggedGeneration(consumer.id, p.year, p.month, p.kwh);
        monthsWritten += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[solis] skip month ${p.year}-${p.month} project ${projectId}: ${msg}`);
      }
    }
  }
  return { monthsWritten };
}

export async function ingestAllMappedSolisPlants(): Promise<SolisIngestSummary> {
  if (!getSolisCloudConfig()) {
    return { skipped: true, reason: 'SolisCloud env not set', plants: 0, monthsWritten: 0, failed: 0 };
  }

  const projects = await prisma.project.findMany({
    where: { solisStationId: { not: null }, consumerUser: { isNot: null } },
    select: {
      id: true,
      slNo: true,
      solisStationId: true,
      consumerUser: { select: { username: true, isActive: true } },
    },
  });

  let monthsWritten = 0;
  let failed = 0;
  for (const p of projects) {
    const username = p.consumerUser?.username;
    if (!username || isDemoHubUsername(username) || !p.consumerUser?.isActive) continue;
    try {
      const result = await ingestSolisEnergyForProject(p.id);
      monthsWritten += result.monthsWritten;
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[solis] ingest failed project #${p.slNo}: ${msg}`);
    }
    await sleep(600);
  }

  return { skipped: false, plants: projects.length, monthsWritten, failed };
}

export async function listSolisStationsForAdmin() {
  if (!getSolisCloudConfig()) {
    throw new SolisCloudError('Add SOLIS_KEY_ID, SOLIS_KEY_SECRET, and SOLIS_API_BASE_URL on the CRM API, then redeploy');
  }
  return listSolisStations();
}

export { SolisCloudError };
