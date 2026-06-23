import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import {
  buildHourlyReadings,
  estimateMonthlyEnergy,
  type HourlyEnergyPoint,
} from '../utils/consumerEnergyEstimate';

export const ENERGY_ESTIMATE_DISCLAIMER =
  'Estimated based on system size and local conditions.';

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
    disclaimer: isEstimated ? ENERGY_ESTIMATE_DISCLAIMER : null,
    systemKw,
  };
}

export async function getOrCreateMonthlyReading(
  consumerUserId: string,
  year: number,
  month: number,
): Promise<EnergyReadingDto> {
  if (month < 1 || month > 12) {
    throw new Error('Invalid month');
  }

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
  let anyEstimated = false;

  for (let month = 1; month <= 12; month++) {
    const reading = await getOrCreateMonthlyReading(consumerUserId, year, month);
    if (reading.isEstimated) anyEstimated = true;
    months.push(reading);
  }

  return {
    year,
    months,
    isEstimated: anyEstimated,
    disclaimer: anyEstimated ? ENERGY_ESTIMATE_DISCLAIMER : null,
  };
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
