import { energyToKwh, type SolisStationYearPoint } from './solisEnergyUnits';

export type SunwaysStationListItem = {
  id: string;
  name: string;
  capacityKw: number | null;
};

function parseCapacityKw(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Portal often reports Wp / W for small residential plants.
  if (n >= 1000) return n / 1000;
  return n;
}

function unwrapRecords(payload: unknown): unknown[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as { records?: unknown; data?: { records?: unknown } | unknown[] };
  if (Array.isArray(root.records)) return root.records;
  if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) {
    const nested = root.data as { records?: unknown };
    if (Array.isArray(nested.records)) return nested.records;
  }
  if (Array.isArray(root.data)) return root.data;
  return [];
}

export function parseSunwaysStationList(payload: unknown): SunwaysStationListItem[] {
  const out: SunwaysStationListItem[] = [];
  for (const row of unwrapRecords(payload)) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as {
      id?: unknown;
      stationId?: unknown;
      name?: unknown;
      stationName?: unknown;
      componentCapacity?: unknown;
      installedCapacity?: unknown;
      capacity?: unknown;
      instatlledPower?: unknown;
      installedPower?: unknown;
    };
    const idRaw = rec.id ?? rec.stationId;
    const id = idRaw == null ? '' : String(idRaw).trim();
    if (!id) continue;
    const nameRaw =
      typeof rec.name === 'string' ? rec.name : typeof rec.stationName === 'string' ? rec.stationName : '';
    out.push({
      id,
      name: nameRaw.trim() || `Plant ${id}`,
      capacityKw:
        parseCapacityKw(rec.componentCapacity) ??
        parseCapacityKw(rec.installedCapacity) ??
        parseCapacityKw(rec.capacity) ??
        parseCapacityKw(rec.installedPower) ??
        parseCapacityKw(rec.instatlledPower),
    });
  }
  return out;
}

function readEnergyWithUnit(
  value: unknown,
  unit: unknown,
  capacityKw?: number | null,
): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unitStr = typeof unit === 'string' ? unit : 'kWh';
  const kwh = Math.round(energyToKwh(n, unitStr, capacityKw));
  return kwh > 0 ? kwh : null;
}

/** Current calendar month generation from getSingleStationOverview. */
export function parseSunwaysOverviewMonthKwh(
  payload: unknown,
  year: number,
  month: number,
  capacityKw?: number | null,
): SolisStationYearPoint | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as { data?: Record<string, unknown> } & Record<string, unknown>;
  const data = (root.data && typeof root.data === 'object' ? root.data : root) as Record<string, unknown>;
  const kwh =
    readEnergyWithUnit(data.eMonth ?? data.emonth, data.eMonthUnit ?? data.emonthUnit, capacityKw) ??
    readEnergyWithUnit(data.eMonth ?? data.emonth, 'kWh', capacityKw);
  if (kwh == null) return null;
  return { year, month, kwh };
}

function unwrapCurve(payload: unknown): unknown[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as { data?: { curve?: unknown } | unknown[]; curve?: unknown };
  if (Array.isArray(root.curve)) return root.curve;
  if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) {
    const nested = root.data as { curve?: unknown };
    if (Array.isArray(nested.curve)) return nested.curve;
  }
  if (Array.isArray(root.data)) return root.data;
  return [];
}

function pointEnergyKwh(rec: Record<string, unknown>, capacityKw?: number | null): number | null {
  const candidates: Array<[unknown, unknown]> = [
    [rec.e, rec.eUnit ?? rec.unit],
    [rec.energy, rec.energyUnit ?? rec.unit],
    [rec.generation, rec.generationUnit ?? rec.unit],
    [rec.generationValue, rec.unit],
    [rec.value, rec.unit],
    [rec.y, rec.unit],
    [rec.pvGeneration, rec.unit],
    [rec.epvTotal, rec.unit],
  ];
  for (const [value, unit] of candidates) {
    const kwh = readEnergyWithUnit(value, unit ?? 'kWh', capacityKw);
    if (kwh != null) return kwh;
  }
  return null;
}

function stampToYearMonth(rec: Record<string, unknown>): { year: number; month: number } | null {
  const year = Number(rec.year);
  const month = Number(rec.month);
  if (Number.isInteger(year) && year >= 2000 && Number.isInteger(month) && month >= 1 && month <= 12) {
    return { year, month };
  }
  const stamp =
    typeof rec.date === 'string'
      ? rec.date
      : typeof rec.dateTime === 'string'
        ? rec.dateTime
        : typeof rec.time === 'string'
          ? rec.time
          : '';
  const m = stamp.match(/^(\d{4})-(\d{2})/);
  if (m) return { year: Number(m[1]), month: Number(m[2]) };

  const ms = Number(rec.dateStamp ?? rec.timestamp ?? rec.timeStamp);
  if (Number.isFinite(ms) && ms > 1e11) {
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) {
      // Interpret in IST for Hub calendar months.
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
      }).formatToParts(d);
      const y = Number(parts.find((p) => p.type === 'year')?.value);
      const mo = Number(parts.find((p) => p.type === 'month')?.value);
      if (Number.isInteger(y) && Number.isInteger(mo)) return { year: y, month: mo };
    }
  }
  return null;
}

/** Aggregate curve points into monthly kWh (year or month duration responses). */
export function parseSunwaysCurveMonthlyPoints(
  payload: unknown,
  capacityKw?: number | null,
): SolisStationYearPoint[] {
  const byMonth = new Map<string, number>();
  for (const row of unwrapCurve(payload)) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    const ym = stampToYearMonth(rec);
    if (!ym) continue;
    const kwh = pointEnergyKwh(rec, capacityKw);
    if (kwh == null) continue;
    const key = `${ym.year}-${ym.month}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + kwh);
  }
  return [...byMonth.entries()]
    .map(([key, kwh]) => {
      const [y, m] = key.split('-').map(Number);
      return { year: y, month: m, kwh: Math.round(kwh) };
    })
    .filter((p) => p.kwh > 0)
    .sort((a, b) => a.year - b.year || a.month - b.month);
}
