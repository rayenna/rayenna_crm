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
