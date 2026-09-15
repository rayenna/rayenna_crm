import { calendarYmdInTimeZone } from './istCalendar';

/**
 * Convert Solis energy + unit string to kWh.
 * Solis often sends Wh while energyStr says kWh; use plant size as a sanity check.
 */
export function energyToKwh(
  energy: number,
  energyStr?: string | null,
  capacityKw?: number | null,
): number {
  if (!Number.isFinite(energy) || energy < 0) return 0;
  const unit = (energyStr ?? '').toLowerCase().replace(/\s+/g, '');

  let kwh: number;
  if (unit.includes('gwh')) kwh = energy * 1_000_000;
  else if (unit.includes('mwh')) kwh = energy * 1000;
  else if (unit.includes('kwh')) kwh = energy;
  else if (unit.includes('wh')) kwh = energy / 1000;
  else kwh = energy;

  const cap = capacityKw && capacityKw > 0 ? capacityKw : 15;
  const maxPlausibleKwh = cap * 12 * 31 * 1.25;
  if (kwh > maxPlausibleKwh && energy >= 1000) {
    const asWh = energy / 1000;
    if (asWh > 0 && asWh <= maxPlausibleKwh) return asWh;
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
