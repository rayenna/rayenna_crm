import { energyToKwh, type SolisStationYearPoint } from './solisEnergyUnits';

export type DeyeStationListItem = {
  id: string;
  name: string;
  capacityKw: number | null;
};

function unwrapStationList(payload: unknown): unknown[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as { stationList?: unknown; data?: { stationList?: unknown } };
  if (Array.isArray(root.stationList)) return root.stationList;
  if (Array.isArray(root.data?.stationList)) return root.data.stationList;
  return [];
}

function parseCapacityKw(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1000) return n / 1000;
  return n;
}

export function parseDeyeStationList(payload: unknown): DeyeStationListItem[] {
  const out: DeyeStationListItem[] = [];
  for (const row of unwrapStationList(payload)) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as {
      id?: unknown;
      stationId?: unknown;
      name?: unknown;
      stationName?: unknown;
      installedCapacity?: unknown;
      capacity?: unknown;
      connectionPower?: unknown;
    };
    const idRaw = rec.id ?? rec.stationId;
    const id = idRaw == null ? '' : String(idRaw).trim();
    if (!id) continue;
    const nameRaw = typeof rec.name === 'string' ? rec.name : typeof rec.stationName === 'string' ? rec.stationName : '';
    out.push({
      id,
      name: nameRaw.trim() || `Plant ${id}`,
      capacityKw:
        parseCapacityKw(rec.installedCapacity) ?? parseCapacityKw(rec.capacity) ?? parseCapacityKw(rec.connectionPower),
    });
  }
  return out;
}

function unwrapHistoryItems(payload: unknown): unknown[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as { stationDataItems?: unknown; data?: { stationDataItems?: unknown } };
  if (Array.isArray(root.stationDataItems)) return root.stationDataItems;
  if (Array.isArray(root.data?.stationDataItems)) return root.data.stationDataItems;
  return [];
}

export function parseDeyeHistoryPoints(payload: unknown, capacityKw?: number | null): SolisStationYearPoint[] {
  const byMonth = new Map<string, SolisStationYearPoint>();
  for (const row of unwrapHistoryItems(payload)) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as {
      generationValue?: unknown;
      year?: unknown;
      month?: unknown;
      dateTime?: unknown;
      date?: unknown;
    };
    let year = Number(rec.year);
    let month = Number(rec.month);
    const stamp = typeof rec.dateTime === 'string' ? rec.dateTime : typeof rec.date === 'string' ? rec.date : '';
    const stampMatch = stamp.match(/^(\d{4})-(\d{2})/);
    if (stampMatch) {
      year = Number(stampMatch[1]);
      month = Number(stampMatch[2]);
    }
    if (!Number.isInteger(year) || year < 2000 || !Number.isInteger(month) || month < 1 || month > 12) continue;
    const energy = Number(rec.generationValue);
    if (!Number.isFinite(energy) || energy <= 0) continue;
    const kwh = Math.round(energyToKwh(energy, 'kWh', capacityKw));
    if (kwh <= 0) continue;
    const key = `${year}-${month}`;
    const prev = byMonth.get(key);
    byMonth.set(key, { year, month, kwh: (prev?.kwh ?? 0) + kwh });
  }
  return [...byMonth.values()].sort((a, b) => a.year - b.year || a.month - b.month);
}
