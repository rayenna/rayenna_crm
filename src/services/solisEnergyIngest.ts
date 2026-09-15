import prisma from '../prisma';
import { calendarYmdInTimeZone } from '../utils/istCalendar';
import { isDemoHubUsername } from '../utils/consumerUsername';
import { upsertLoggedGeneration } from './consumerEnergyService';
import { getSolisCloudConfig, listSolisStations, listStationMonthEnergy, listStationYearEnergy, SolisCloudError } from './solisCloudClient';
import {
  ABSURD_MONTHLY_KWH,
  effectiveCapacityKw,
  normalizeCapacityKw,
  sanitizeStoredMonthlyKwh,
} from '../utils/solisEnergyUnits';
import { buildHourlyReadings, derivedTotalsFromGeneration, estimateMonthlyGenerationKw } from '../utils/consumerEnergyEstimate';
import { Prisma } from '@prisma/client';

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

function monthNeedsDailyFill(kwh: number | undefined, capacityKw: number, year: number, month: number): boolean {
  if (kwh == null || kwh <= 0) return true;
  const expected = estimateMonthlyGenerationKw(capacityKw, year, month);
  return kwh < Math.max(20, expected * 0.08);
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
  const nowYmd = calendarYmdInTimeZone(new Date());
  const currentMonth = Number(nowYmd.slice(5, 7));
  const years = [year - 1, year];
  let monthsWritten = 0;
  for (const y of years) {
    const points = await listStationYearEnergy(project.solisStationId, y, capacityKw);
    await sleep(600);
    const byMonth = new Map(points.filter((p) => p.year === y).map((p) => [p.month, p.kwh]));
    const lastMonth = y < year ? 12 : currentMonth;
    for (let m = 1; m <= lastMonth; m += 1) {
      let kwh = byMonth.get(m);
      if (monthNeedsDailyFill(kwh, capacityKw, y, m)) {
        try {
          const dailySum = await listStationMonthEnergy(project.solisStationId, y, m, capacityKw);
          await sleep(600);
          if (dailySum > (kwh ?? 0)) kwh = dailySum;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[solis] stationMonth ${y}-${m} project ${projectId}: ${msg}`);
        }
      }
      if (kwh == null || kwh <= 0) continue;
      try {
        if (monthsWritten === 0) {
          console.info(
            `[solis] ingest ${project.solisStationId} ${y}-${String(m).padStart(2, '0')} → ${kwh} kWh (capacity ${capacityKw} kW)`,
          );
        }
        await upsertLoggedGeneration(consumer.id, y, m, kwh);
        monthsWritten += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[solis] skip month ${y}-${m} project ${projectId}: ${msg}`);
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

export type SolisHubSmokePlant = {
  slNo: number;
  customerName: string;
  username: string;
  liveMonths: number;
  repairedMonths: number;
  minKwh: number | null;
  maxKwh: number | null;
};

export type SolisHubSmokeReport = {
  plants: number;
  repairedMonths: number;
  errors: string[];
  plantsOut: SolisHubSmokePlant[];
};

const EXPECTED_SOLIS_HUB_PLANTS = 17;

export async function smokeMappedSolisHubUsers(): Promise<SolisHubSmokeReport> {
  const projects = await prisma.project.findMany({
    where: { solisStationId: { not: null }, consumerUser: { isNot: null } },
    select: {
      id: true,
      slNo: true,
      systemCapacity: true,
      solisStationId: true,
      customer: { select: { customerName: true } },
      consumerUser: { select: { id: true, username: true, isActive: true } },
    },
    orderBy: { slNo: 'asc' },
  });

  const errors: string[] = [];
  const plantsOut: SolisHubSmokePlant[] = [];
  let repairedMonths = 0;

  if (projects.length !== EXPECTED_SOLIS_HUB_PLANTS) {
    errors.push(`Expected ${EXPECTED_SOLIS_HUB_PLANTS} Solis Hub plants, found ${projects.length}`);
  }

  for (const p of projects) {
    const customerName = p.customer?.customerName?.trim() || `Project #${p.slNo}`;
    const consumer = p.consumerUser;
    const label = `#${p.slNo} ${customerName}`;
    if (!consumer) {
      errors.push(`${label}: no Hub user`);
      continue;
    }
    if (!consumer.isActive) {
      errors.push(`${label}: Hub user inactive`);
      continue;
    }
    if (isDemoHubUsername(consumer.username)) {
      errors.push(`${label}: demo Hub user cannot be live Solis`);
      continue;
    }
    if (!p.solisStationId?.trim()) {
      errors.push(`${label}: empty Solis plant id`);
      continue;
    }

    const capacityKw = normalizeCapacityKw(p.systemCapacity);
    const rows = await prisma.energyReading.findMany({
      where: { consumerUserId: consumer.id, isEstimated: false },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });

    if (rows.length === 0) {
      errors.push(`${label}: no live kWh months stored (plant is linked — Pull kWh after API deploy)`);
      plantsOut.push({
        slNo: p.slNo,
        customerName,
        username: consumer.username,
        liveMonths: 0,
        repairedMonths: 0,
        minKwh: null,
        maxKwh: null,
      });
      continue;
    }

    let repaired = 0;
    const kwhs: number[] = [];
    for (const row of rows) {
      const kwh = sanitizeStoredMonthlyKwh(row.totalGenerated, capacityKw);
      if (kwh <= 0) {
        errors.push(`${label}: ${row.year}-${String(row.month).padStart(2, '0')} converted to 0 kWh`);
        continue;
      }
      if (kwh >= ABSURD_MONTHLY_KWH) {
        errors.push(`${label}: ${row.year}-${String(row.month).padStart(2, '0')} still ${kwh} kWh after convert`);
        continue;
      }
      if (kwh !== Math.round(row.totalGenerated)) {
        const data = derivedTotalsFromGeneration(kwh);
        const dailyReadings = buildHourlyReadings(data.totalGenerated, data.totalConsumed);
        await prisma.energyReading.update({
          where: { id: row.id },
          data: {
            ...data,
            dailyReadings: dailyReadings as unknown as Prisma.InputJsonValue,
          },
        });
        repaired += 1;
        repairedMonths += 1;
      }
      kwhs.push(kwh);
    }

    plantsOut.push({
      slNo: p.slNo,
      customerName,
      username: consumer.username,
      liveMonths: kwhs.length,
      repairedMonths: repaired,
      minKwh: kwhs.length ? Math.min(...kwhs) : null,
      maxKwh: kwhs.length ? Math.max(...kwhs) : null,
    });
  }

  return { plants: projects.length, repairedMonths, errors, plantsOut };
}

export async function listSolisStationsForAdmin() {
  if (!getSolisCloudConfig()) {
    throw new SolisCloudError('Add SOLIS_KEY_ID, SOLIS_KEY_SECRET, and SOLIS_API_BASE_URL on the CRM API, then redeploy');
  }
  return listSolisStations();
}

export { SolisCloudError };
