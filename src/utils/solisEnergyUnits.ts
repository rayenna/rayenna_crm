import { calendarYmdInTimeZone } from './istCalendar';

export type SolisEnergyUnit = 'wh' | 'kwh' | 'mwh' | 'gwh';

/** CRM sometimes stores watts in the kW field (e.g. 5500). Solis capacity is usually true kW. */
export function normalizeCapacityKw(capacityKw: number | null | undefined): number {
  if (capacityKw == null || !Number.isFinite(capacityKw) || capacityKw <= 0) return 15;
  if (capacityKw >= 1000) return capacityKw / 1000;
  return capacityKw;
}

export function effectiveCapacityKw(
  crmKw: number | null | undefined,
  solisKw: number | null | undefined,
): number {
  if (solisKw != null && solisKw > 0) return normalizeCapacityKw(solisKw);
  return normalizeCapacityKw(crmKw);
}

/** A plant cannot generate more than 24h × 31d at nameplate. */
export function monthlyKwhPhysicalMax(capacityKw: number | null | undefined): number {
  return normalizeCapacityKw(capacityKw) * 24 * 31;
}

/**
 * Solis stationYear `energyStr` is the unit ("kWh"), not a formatted amount.
 * When they still send Wh in `energy`, Hub months land around 7,95,200 "kWh".
 * 100 MWh in one month is not a Rayenna rooftop — treat that as Wh.
 */
export const ABSURD_MONTHLY_KWH = 100_000;

function unitFromEnergyStr(compact: string): SolisEnergyUnit | null {
  if (compact.includes('gwh')) return 'gwh';
  if (compact.includes('mwh')) return 'mwh';
  if (compact.includes('kwh')) return 'kwh';
  if (compact.includes('wh')) return 'wh';
  return null;
}

function toKwh(value: number, unit: SolisEnergyUnit): number {
  if (unit === 'gwh') return value * 1_000_000;
  if (unit === 'mwh') return value * 1000;
  if (unit === 'wh') return value / 1000;
  return value;
}

/**
 * Convert one Solis stationYear point to kWh.
 * Prefer a decimal display in energyStr ("795.20kWh"); otherwise apply the unit
 * and keep dividing by 1000 until the month fits the plant (or the 100 MWh cap).
 */
export function energyToKwh(
  energy: number,
  energyStr?: string | null,
  capacityKw?: number | null,
): number {
  if (!Number.isFinite(energy) || energy < 0) return 0;
  const compact = (energyStr ?? '').toLowerCase().replace(/\s+/g, '');
  const unit = unitFromEnergyStr(compact) ?? 'kwh';
  const numMatch = compact.match(/(\d+(?:\.\d+)?)/);
  const strNum = numMatch ? Number(numMatch[1]) : NaN;
  const strHasDecimal = Boolean(numMatch?.[1]?.includes('.'));

  let kwh: number;
  if (strHasDecimal && Number.isFinite(strNum) && !(strNum < 10 && energy >= 100)) {
    kwh = unit === 'wh' ? strNum / 1000 : toKwh(strNum, unit);
  } else {
    kwh = toKwh(energy, unit);
  }

  const maxKwh = monthlyKwhPhysicalMax(capacityKw);
  while (kwh >= 1000 && (kwh > maxKwh || kwh >= ABSURD_MONTHLY_KWH)) {
    kwh /= 1000;
  }
  return kwh;
}

/** Fix Wh stored as kWh in EnergyReading after a bad ingest. */
export function sanitizeStoredMonthlyKwh(
  totalGenerated: number,
  capacityKw?: number | null,
): number {
  return Math.round(energyToKwh(totalGenerated, 'kWh', capacityKw));
}

export function stationIdToString(id: unknown): string | null {
  if (id == null) return null;
  if (typeof id === 'number') {
    if (!Number.isFinite(id)) return null;
    if (!Number.isSafeInteger(id)) return null;
    return String(id);
  }
  const s = String(id).trim();
  return s.length > 0 ? s : null;
}

/** JSON.parse mangles Solis plant ids above 2^53-1. Quote 16+ digit integers first. */
export function quoteOversizedJsonInts(raw: string): string {
  return raw.replace(/(:\s*)(\d{16,})(\s*[,}\]])/g, '$1"$2"$3');
}

export function monthFromSolisDate(date: unknown): { year: number; month: number } | null {
  if (typeof date === 'string') {
    const m = date.match(/^(\d{4})-(\d{2})/);
    if (m) {
      const year = Number(m[1]);
      const month = Number(m[2]);
      if (year >= 2000 && month >= 1 && month <= 12) return { year, month };
    }
    const asNum = Number(date);
    if (Number.isFinite(asNum) && asNum > 1e11) {
      return monthFromSolisDate(asNum);
    }
  }
  if (typeof date === 'number' && Number.isFinite(date)) {
    const ms = date < 1e12 ? date * 1000 : date;
    const ymd = calendarYmdInTimeZone(new Date(ms));
    const [y, m] = ymd.split('-').map(Number);
    if (y && m) return { year: y, month: m };
  }
  return null;
}

export type SolisStationYearPoint = {
  year: number;
  month: number;
  kwh: number;
};

function looksLikeEnergyRows(rows: unknown[]): boolean {
  return rows.some(
    (row) =>
      row &&
      typeof row === 'object' &&
      ('energy' in row || 'energyStr' in row) &&
      ('date' in row || 'dateStr' in row || 'year' in row || 'month' in row),
  );
}

function energyArrayScore(rows: unknown[]): number {
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as { date?: unknown; dateStr?: unknown };
    const period = monthFromSolisDate(rec.date) ?? monthFromSolisDate(rec.dateStr);
    if (period) seen.add(`${period.year}-${period.month}`);
  }
  const distinct = seen.size;
  if (distinct > 0 && distinct === rows.length && rows.length <= 24) return 100 + distinct;
  if (rows.length > 24) return 10 + distinct;
  return distinct;
}

function unwrapRecordList(payload: unknown): unknown[] {
  const found: unknown[][] = [];
  const walk = (node: unknown, depth: number) => {
    if (depth > 6 || node == null) return;
    if (Array.isArray(node)) {
      if (looksLikeEnergyRows(node) || node.some((x) => x && typeof x === 'object' && 'stationName' in (x as object))) {
        found.push(node);
      } else {
        for (const item of node) walk(item, depth + 1);
      }
      return;
    }
    if (typeof node !== 'object') return;
    for (const value of Object.values(node as Record<string, unknown>)) walk(value, depth + 1);
  };
  walk(payload, 0);
  const energy = found.filter((rows) => looksLikeEnergyRows(rows));
  if (energy.length === 0) return found[0] ?? [];
  energy.sort((a, b) => energyArrayScore(b) - energyArrayScore(a));
  return energy[0];
}

export function parseStationYearPoints(payload: unknown, capacityKw?: number | null): SolisStationYearPoint[] {
  const list = unwrapRecordList(payload);
  const byMonth = new Map<string, SolisStationYearPoint>();
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as { energy?: unknown; energyStr?: unknown; date?: unknown; dateStr?: unknown };
    const period = monthFromSolisDate(rec.date) ?? monthFromSolisDate(rec.dateStr);
    const energy = Number(rec.energy);
    if (!period || !Number.isFinite(energy)) continue;
    const kwh = Math.round(
      energyToKwh(energy, typeof rec.energyStr === 'string' ? rec.energyStr : null, capacityKw),
    );
    if (kwh <= 0) continue;
    const key = `${period.year}-${period.month}`;
    const prev = byMonth.get(key);
    byMonth.set(key, { ...period, kwh: (prev?.kwh ?? 0) + kwh });
  }
  return [...byMonth.values()].sort((a, b) => a.year - b.year || a.month - b.month);
}

export type SolisStationListItem = {
  id: string;
  name: string;
  capacityKw: number | null;
};

function parseCapacityKw(capacity: unknown, capacityStr?: unknown): number | null {
  const n = Number(capacity);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = String(capacityStr ?? '').toLowerCase();
  if (unit.includes('mw')) return n * 1000;
  return n;
}

export function parseStationList(payload: unknown): SolisStationListItem[] {
  const list = unwrapRecordList(payload);
  const out: SolisStationListItem[] = [];
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as {
      id?: unknown;
      stationId?: unknown;
      stationName?: unknown;
      capacity?: unknown;
      capacityStr?: unknown;
    };
    const id = stationIdToString(rec.id) ?? stationIdToString(rec.stationId);
    if (!id) continue;
    out.push({
      id,
      name: typeof rec.stationName === 'string' && rec.stationName.trim() ? rec.stationName.trim() : `Plant ${id}`,
      capacityKw: parseCapacityKw(rec.capacity, rec.capacityStr),
    });
  }
  return out;
}
