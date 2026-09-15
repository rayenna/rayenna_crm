import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import {
  buildHourlyReadings,
  derivedTotalsFromGeneration,
  estimateMonthlyEnergy,
  isEnergyPeriodInFuture,
  type HourlyEnergyPoint,
} from '../utils/consumerEnergyEstimate';

export const ENERGY_ESTIMATE_DISCLAIMER =
  'Expected generation for a plant this size in Kerala — not live inverter data.';

export const ENERGY_MANUAL_DISCLAIMER =
  'Generation from the inverter or SolisCloud. Self-use, export and rupee savings use typical splits — not your KSEB bill.';

export const ENERGY_MIXED_YEAR_DISCLAIMER =
  'Some months are expected (Kerala typical). Logged months use inverter units; splits are still typical, not the bill.';

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
  disclaimer: string | null;
  systemKw: number;
};

export type AnnualEnergyDto = {
  year: number;
  months: EnergyReadingDto[];
  isEstimated: boolean;
  disclaimer: string | null;
};

const DEFAULT_SYSTEM_KW = 5.5;

async function resolveSystemKw(consumerUserId: string): Promise<number> {
  const consumer = await prisma.consumerUser.findUnique({
    where: { id: consumerUserId },
    include: { project: { select: { systemCapacity: true } } },
  });
  const kw = consumer?.project?.systemCapacity;
  if (kw && kw > 0) return kw;
  return DEFAULT_SYSTEM_KW;
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
): EnergyReadingDto {
  const dailyReadings = Array.isArray(row.dailyReadings)
    ? (row.dailyReadings as HourlyEnergyPoint[])
    : [];
  return {
    year: row.year,
    month: row.month,
    totalGenerated: row.totalGenerated,
    totalConsumed: row.totalConsumed,
    gridExport: row.gridExport,
    totalSavings: row.totalSavings,
    dailyReadings,
    isEstimated,
    disclaimer: isEstimated ? ENERGY_ESTIMATE_DISCLAIMER : ENERGY_MANUAL_DISCLAIMER,
    systemKw,
  };
}

export async function getOrCreateMonthlyReading(
  consumerUserId: string,
  year: number,
  month: number,
): Promise<EnergyReadingDto> {
  assertUsablePeriod(year, month);

  const systemKw = await resolveSystemKw(consumerUserId);

  const existing = await prisma.energyReading.findUnique({
    where: {
      consumerUserId_year_month: { consumerUserId, year, month },
    },
  });

  if (existing) {
    return rowToDto(existing, systemKw, existing.isEstimated);
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

  return rowToDto(created, systemKw, true);
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
  for (let month = 1; month <= lastMonth; month++) {
    const reading = await getOrCreateMonthlyReading(consumerUserId, year, month);
    if (reading.isEstimated) estimatedCount += 1;
    months.push(reading);
  }

  const anyEstimated = estimatedCount > 0;
  const allEstimated = lastMonth > 0 && estimatedCount === months.length;
  let disclaimer: string | null = null;
  if (allEstimated) disclaimer = ENERGY_ESTIMATE_DISCLAIMER;
  else if (anyEstimated) disclaimer = ENERGY_MIXED_YEAR_DISCLAIMER;
  else if (months.length > 0) disclaimer = ENERGY_MANUAL_DISCLAIMER;

  return {
    year,
    months,
    isEstimated: anyEstimated,
    disclaimer,
  };
}

export async function upsertLoggedGeneration(
  consumerUserId: string,
  year: number,
  month: number,
  totalGenerated: number,
): Promise<EnergyReadingDto> {
  return upsertManualReading(consumerUserId, year, month, derivedTotalsFromGeneration(totalGenerated));
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

  const systemKw = await resolveSystemKw(consumerUserId);
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

  return rowToDto(row, systemKw, false);
}
