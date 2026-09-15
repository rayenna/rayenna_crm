import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import {
  buildHourlyReadings,
  derivedTotalsFromGeneration,
  estimateMonthlyEnergy,
  isEnergyPeriodInFuture,
  type HourlyEnergyPoint,
} from '../utils/consumerEnergyEstimate';
import { normalizeCapacityKw, sanitizeStoredMonthlyKwh } from '../utils/solisEnergyUnits';

export const ENERGY_ESTIMATE_DISCLAIMER =
  'Expected generation for a plant this size in Kerala — not live inverter data.';

export const ENERGY_MANUAL_DISCLAIMER =
  'Generation logged from the inverter. Self-use, export and rupee savings use typical splits — not your KSEB bill.';

export const ENERGY_SOLIS_DISCLAIMER =
  'Live generation from your Solis inverter via SolisCloud. Self-use, export and rupee savings are typical splits — not your KSEB bill.';

export const ENERGY_MIXED_YEAR_DISCLAIMER =
  'Some months are expected (Kerala typical). Logged months use inverter units; splits are still typical, not the bill.';

export const ENERGY_SOLIS_MIXED_YEAR_DISCLAIMER =
  'Some months are live from SolisCloud. Others are expected Kerala typical. Splits are still typical, not the bill.';

export class EnergyPeriodError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnergyPeriodError';
  }
}

export type EnergyReadingDto = {
  year: number;
  month: number;
  totalGenerated: number;
  totalConsumed: number;
  gridExport: number;
  totalSavings: number;
  dailyReadings: HourlyEnergyPoint[];
  isEstimated: boolean;
  liveFromSolis: boolean;
  disclaimer: string | null;
  systemKw: number;
};

export type AnnualEnergyDto = {
  year: number;
  months: EnergyReadingDto[];
  isEstimated: boolean;
  liveFromSolis: boolean;
  disclaimer: string | null;
};

const DEFAULT_SYSTEM_KW = 5.5;

async function resolveEnergyMeta(consumerUserId: string): Promise<{
  systemKw: number;
  solisLinked: boolean;
}> {
  const consumer = await prisma.consumerUser.findUnique({
    where: { id: consumerUserId },
    include: { project: { select: { systemCapacity: true, solisStationId: true } } },
  });
  const kw = consumer?.project?.systemCapacity;
  return {
    systemKw: kw && kw > 0 ? normalizeCapacityKw(kw) : DEFAULT_SYSTEM_KW,
    solisLinked: Boolean(consumer?.project?.solisStationId),
  };
}

async function repairInflatedSolisReading(row: {
  id: string;
  year: number;
  month: number;
  totalGenerated: number;
  totalConsumed: number;
  gridExport: number;
  totalSavings: number;
  dailyReadings: Prisma.JsonValue;
  isEstimated: boolean;
  consumerUserId: string;
  createdAt: Date;
  updatedAt: Date;
}, systemKw: number, solisLinked: boolean) {
  if (!solisLinked || row.isEstimated) return row;
  const kwh = sanitizeStoredMonthlyKwh(row.totalGenerated, systemKw);
  if (kwh <= 0 || kwh >= row.totalGenerated) return row;
  const data = derivedTotalsFromGeneration(kwh);
  const dailyReadings = buildHourlyReadings(data.totalGenerated, data.totalConsumed);
  return prisma.energyReading.update({
    where: { id: row.id },
    data: {
      ...data,
      dailyReadings: dailyReadings as unknown as Prisma.InputJsonValue,
    },
  });
}

function disclaimerFor(isEstimated: boolean, liveFromSolis: boolean): string | null {
  if (isEstimated) return ENERGY_ESTIMATE_DISCLAIMER;
  if (liveFromSolis) return ENERGY_SOLIS_DISCLAIMER;
  return ENERGY_MANUAL_DISCLAIMER;
}

function assertUsablePeriod(year: number, month: number): void {
  if (month < 1 || month > 12) {
    throw new EnergyPeriodError('Invalid month');
  }
  if (isEnergyPeriodInFuture(year, month)) {
    throw new EnergyPeriodError('Cannot use energy data for a future month');
  }
}

function rowToDto(
  row: {
    year: number;
    month: number;
    totalGenerated: number;
    totalConsumed: number;
    gridExport: number;
    totalSavings: number;
    dailyReadings: Prisma.JsonValue;
    isEstimated: boolean;
  },
  systemKw: number,
  isEstimated: boolean,
  solisLinked: boolean,
): EnergyReadingDto {
  const dailyReadings = Array.isArray(row.dailyReadings)
    ? (row.dailyReadings as HourlyEnergyPoint[])
    : [];
  const liveFromSolis = solisLinked && !isEstimated;
  return {
    year: row.year,
    month: row.month,
    totalGenerated: row.totalGenerated,
    totalConsumed: row.totalConsumed,
    gridExport: row.gridExport,
    totalSavings: row.totalSavings,
    dailyReadings,
    isEstimated,
    liveFromSolis,
    disclaimer: disclaimerFor(isEstimated, liveFromSolis),
    systemKw,
  };
}

export async function getOrCreateMonthlyReading(
  consumerUserId: string,
  year: number,
  month: number,
): Promise<EnergyReadingDto> {
  assertUsablePeriod(year, month);

  const { systemKw, solisLinked } = await resolveEnergyMeta(consumerUserId);

  const existing = await prisma.energyReading.findUnique({
    where: {
      consumerUserId_year_month: { consumerUserId, year, month },
    },
  });

  if (existing) {
    const repaired = await repairInflatedSolisReading(existing, systemKw, solisLinked);
    return rowToDto(repaired, systemKw, repaired.isEstimated, solisLinked);
  }

  const estimate = estimateMonthlyEnergy(systemKw, year, month);

  const created = await prisma.energyReading.create({
    data: {
      consumerUserId,
      year,
      month,
      totalGenerated: estimate.totalGenerated,
      totalConsumed: estimate.totalConsumed,
      gridExport: estimate.gridExport,
      totalSavings: estimate.totalSavings,
      dailyReadings: estimate.dailyReadings as unknown as Prisma.InputJsonValue,
      isEstimated: true,
    },
  });

  return rowToDto(created, systemKw, true, solisLinked);
}

export async function getAnnualReadings(
  consumerUserId: string,
  year: number,
): Promise<AnnualEnergyDto> {
  const months: EnergyReadingDto[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const lastMonth = year < currentYear ? 12 : year === currentYear ? currentMonth : 0;

  let estimatedCount = 0;
  let liveSolisCount = 0;
  for (let month = 1; month <= lastMonth; month++) {
    const reading = await getOrCreateMonthlyReading(consumerUserId, year, month);
    if (reading.isEstimated) estimatedCount += 1;
    if (reading.liveFromSolis) liveSolisCount += 1;
    months.push(reading);
  }

  const anyEstimated = estimatedCount > 0;
  const allEstimated = lastMonth > 0 && estimatedCount === months.length;
  const liveFromSolis = liveSolisCount > 0;
  let disclaimer: string | null = null;
  if (allEstimated) disclaimer = ENERGY_ESTIMATE_DISCLAIMER;
  else if (liveFromSolis && anyEstimated) disclaimer = ENERGY_SOLIS_MIXED_YEAR_DISCLAIMER;
  else if (liveFromSolis) disclaimer = ENERGY_SOLIS_DISCLAIMER;
  else if (anyEstimated) disclaimer = ENERGY_MIXED_YEAR_DISCLAIMER;
  else if (months.length > 0) disclaimer = ENERGY_MANUAL_DISCLAIMER;

  return {
    year,
    months,
    isEstimated: anyEstimated,
    liveFromSolis,
    disclaimer,
  };
}

export async function upsertLoggedGeneration(
  consumerUserId: string,
  year: number,
  month: number,
  totalGenerated: number,
): Promise<EnergyReadingDto> {
  const { systemKw } = await resolveEnergyMeta(consumerUserId);
  const kwh = sanitizeStoredMonthlyKwh(totalGenerated, systemKw);
  return upsertManualReading(consumerUserId, year, month, derivedTotalsFromGeneration(kwh));
}

export async function upsertManualReading(
  consumerUserId: string,
  year: number,
  month: number,
  data: {
    totalGenerated: number;
    totalConsumed: number;
    gridExport: number;
    totalSavings: number;
  },
): Promise<EnergyReadingDto> {
  assertUsablePeriod(year, month);

  const { systemKw, solisLinked } = await resolveEnergyMeta(consumerUserId);
  const dailyReadings = buildHourlyReadings(data.totalGenerated, data.totalConsumed);

  const row = await prisma.energyReading.upsert({
    where: {
      consumerUserId_year_month: { consumerUserId, year, month },
    },
    create: {
      consumerUserId,
      year,
      month,
      ...data,
      dailyReadings: dailyReadings as unknown as Prisma.InputJsonValue,
      isEstimated: false,
    },
    update: {
      ...data,
      dailyReadings: dailyReadings as unknown as Prisma.InputJsonValue,
      isEstimated: false,
    },
  });

  return rowToDto(row, systemKw, false, solisLinked);
}
