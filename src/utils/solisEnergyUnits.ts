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
 * Solis mixes Wh and kWh, and often puts the true amount in energyStr ("795.20kWh")
 * while `energy` is 795200. Trust a leading number in energyStr; then cap vs nameplate.
 */
export function energyToKwh(
  energy: number,
  energyStr?: string | null,
  capacityKw?: number | null,
): number {
  if (!Number.isFinite(energy) || energy < 0) return 0;
  const compact = (energyStr ?? '').toLowerCase().replace(/\s+/g, '');
  const unit = unitFromEnergyStr(compact) ?? 'kwh';
  const lead = compact.match(/^(\d+(?:\.\d+)?)/);
  const fromStr = lead ? Number(lead[1]) : NaN;
  const hasStrAmount = Number.isFinite(fromStr);

  let kwh = toKwh(hasStrAmount ? fromStr : energy, unit);

  const maxKwh = monthlyKwhPhysicalMax(capacityKw);
  if (kwh > maxKwh && energy >= 1000) {
    const fromFieldWh = energy / 1000;
    if (fromFieldWh > 0 && fromFieldWh <= maxKwh) kwh = fromFieldWh;
  }
  if (kwh > maxKwh && hasStrAmount && fromStr >= 1000) {
    const fromStrWh = fromStr / 1000;
    if (fromStrWh > 0 && fromStrWh <= maxKwh) kwh = fromStrWh;
  }
  return kwh;
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

function unwrapRecordList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as {
    data?: unknown;
    page?: { records?: unknown };
    records?: unknown;
  };
  const data = root.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const inner = data as { page?: { records?: unknown }; records?: unknown };
    if (Array.isArray(inner.page?.records)) return inner.page.records;
    if (Array.isArray(inner.records)) return inner.records;
  }
  if (Array.isArray(root.page?.records)) return root.page.records;
  if (Array.isArray(root.records)) return root.records;
  return [];
}

export function parseStationYearPoints(payload: unknown, capacityKw?: number | null): SolisStationYearPoint[] {
  const list = unwrapRecordList(payload);
  const out: SolisStationYearPoint[] = [];
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as { energy?: unknown; energyStr?: unknown; date?: unknown };
    const period = monthFromSolisDate(rec.date);
    const energy = Number(rec.energy);
    if (!period || !Number.isFinite(energy)) continue;
    const kwh = Math.round(
      energyToKwh(energy, typeof rec.energyStr === 'string' ? rec.energyStr : null, capacityKw),
    );
    if (kwh <= 0) continue;
    out.push({ ...period, kwh });
  }
  return out;
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
