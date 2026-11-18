/** Kerala peak sun hours per day (Rayenna Solar Hub — Option B auto-estimation). */
export const KERALA_SUN_HOURS_BY_MONTH: Record<number, number> = {
  1: 5.2,
  2: 5.6,
  3: 5.8,
  4: 5.4,
  5: 4.8,
  6: 3.2,
  7: 2.8,
  8: 3.0,
  9: 3.8,
  10: 4.6,
  11: 5.0,
  12: 5.1,
};

export const ESTIMATION_EFFICIENCY = 0.78;
export const SELF_CONSUMPTION_RATIO = 0.6;
export const GRID_EXPORT_RATIO = 0.3;
/** ₹/kWh — blended retail tariff for savings display */
export const DEFAULT_TARIFF_RS = 6.5;
/** ₹/kWh — KSEB net-meter export credit (approximate) */
export const DEFAULT_EXPORT_RATE_RS = 3.5;

export type HourlyEnergyPoint = {
  hour: number;
  label: string;
  generated: number;
  consumed: number;
};

export type MonthlyEnergyEstimate = {
  totalGenerated: number;
  totalConsumed: number;
  gridExport: number;
  totalSavings: number;
  dailyReadings: HourlyEnergyPoint[];
};

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 12) return hour === 0 ? '12 AM' : '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

/** Solar weight curve for hours 6–20 (peak around solar noon). */
function hourlyWeights(): number[] {
  const hours = Array.from({ length: 15 }, (_, i) => i + 6);
  const weights = hours.map((h) => {
    const x = (h - 13) / 4.5;
    return Math.exp(-0.5 * x * x);
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / sum);
}

export function estimateMonthlyGenerationKw(
  systemKw: number,
  year: number,
  month: number,
): number {
  const sunHours = KERALA_SUN_HOURS_BY_MONTH[month] ?? 5.0;
  const days = daysInMonth(year, month);
  return systemKw * sunHours * days * ESTIMATION_EFFICIENCY;
}

export function buildHourlyReadings(
  totalGenerated: number,
  totalConsumed: number,
): HourlyEnergyPoint[] {
  const weights = hourlyWeights();
  const hours = Array.from({ length: 15 }, (_, i) => i + 6);
  return hours.map((hour, idx) => ({
    hour,
    label: formatHourLabel(hour),
    generated: Math.round(totalGenerated * weights[idx] * 10) / 10,
    consumed: Math.round(totalConsumed * weights[idx] * 10) / 10,
  }));
}

/** Split + rupee totals from inverter kWh. Self-use / export are typical ratios, not the bill. */
export function derivedTotalsFromGeneration(
  totalGenerated: number,
  tariffRs = DEFAULT_TARIFF_RS,
  exportRateRs = DEFAULT_EXPORT_RATE_RS,
): Pick<MonthlyEnergyEstimate, 'totalGenerated' | 'totalConsumed' | 'gridExport' | 'totalSavings'> {
  const gen = Math.round(Math.max(0, totalGenerated));
  const totalConsumed = Math.round(gen * SELF_CONSUMPTION_RATIO);
  const gridExport = Math.round(gen * GRID_EXPORT_RATIO);
  const totalSavings = Math.round(totalConsumed * tariffRs + gridExport * exportRateRs);
  return {
    totalGenerated: gen,
    totalConsumed,
    gridExport,
    totalSavings,
  };
}

export function isEnergyPeriodInFuture(year: number, month: number, now = new Date()): boolean {
  const nowKey = now.getFullYear() * 12 + (now.getMonth() + 1);
  return year * 12 + month > nowKey;
}

/** Calendar month key for compare (year*12 + month). */
export function energyMonthKey(year: number, month: number): number {
  return year * 12 + month;
}

/** Parse YYYY-MM-DD (IST calendar) into year/month/day. */
export function yearMonthDayFromYmd(ymd: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/**
 * True when the Track month is before the net-meter install calendar month (IST YMD).
 * With no net-meter date, every month is treated as not yet generating.
 */
export function isEnergyMonthBeforeNetMeter(
  year: number,
  month: number,
  netMeterYmd: string | null | undefined,
): boolean {
  if (!netMeterYmd) return true;
  const parsed = yearMonthDayFromYmd(netMeterYmd);
  if (!parsed) return true;
  return energyMonthKey(year, month) < energyMonthKey(parsed.year, parsed.month);
}

/**
 * Fraction of the month that counts after net-meter install (inclusive of install day).
 * Full months after install → 1. Install month → remaining days / days-in-month.
 */
export function netMeterMonthProrateFactor(
  year: number,
  month: number,
  netMeterYmd: string | null | undefined,
): number {
  if (!netMeterYmd) return 0;
  const parsed = yearMonthDayFromYmd(netMeterYmd);
  if (!parsed) return 0;
  if (energyMonthKey(year, month) < energyMonthKey(parsed.year, parsed.month)) return 0;
  if (energyMonthKey(year, month) > energyMonthKey(parsed.year, parsed.month)) return 1;
  const dim = daysInMonth(year, month);
  const remaining = Math.max(0, dim - parsed.day + 1);
  return Math.min(1, remaining / dim);
}

export function estimateMonthlyEnergy(
  systemKw: number,
  year: number,
  month: number,
  tariffRs = DEFAULT_TARIFF_RS,
  exportRateRs = DEFAULT_EXPORT_RATE_RS,
): MonthlyEnergyEstimate {
  const totals = derivedTotalsFromGeneration(
    estimateMonthlyGenerationKw(systemKw, year, month),
    tariffRs,
    exportRateRs,
  );

  return {
    ...totals,
    dailyReadings: buildHourlyReadings(totals.totalGenerated, totals.totalConsumed),
  };
}

export function distributionSlices(totalGenerated: number, totalConsumed: number) {
  const selfConsumed = Math.min(totalConsumed, totalGenerated);
  const gridExport = Math.max(0, totalGenerated - selfConsumed);
  const gridImport = Math.max(0, totalConsumed - selfConsumed);
  const total = selfConsumed + gridExport + gridImport || 1;
  return [
    { name: 'Self Consumed', value: selfConsumed, percent: Math.round((selfConsumed / total) * 100) },
    { name: 'Grid Export', value: gridExport, percent: Math.round((gridExport / total) * 100) },
    { name: 'Grid Import', value: gridImport, percent: Math.round((gridImport / total) * 100) },
  ];
}
