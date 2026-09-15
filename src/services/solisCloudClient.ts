import { solisRequestHeaders, compactJsonBody } from '../utils/solisCloudSign';
import { parseStationList, parseStationYearPoints, quoteOversizedJsonInts, type SolisStationListItem, type SolisStationYearPoint } from '../utils/solisEnergyUnits';

export class SolisCloudError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SolisCloudError';
  }
}

export type SolisCloudConfig = {
  keyId: string;
  keySecret: string;
  baseUrl: string;
};

export function getSolisCloudConfig(): SolisCloudConfig | null {
  const keyId = (process.env.SOLIS_KEY_ID || '').trim();
  const keySecret = (process.env.SOLIS_KEY_SECRET || '').trim();
  const baseUrl = (process.env.SOLIS_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (!keyId || !keySecret || !baseUrl) return null;
  return { keyId, keySecret, baseUrl };
}

export function solisPublicStatus(): { configured: boolean; apiHost: string | null } {
  const cfg = getSolisCloudConfig();
  if (!cfg) return { configured: false, apiHost: null };
  try {
    return { configured: true, apiHost: new URL(cfg.baseUrl).host };
  } catch {
    return { configured: true, apiHost: 'configured' };
  }
}

async function solisPost(canonicalizedResource: string, payload: Record<string, unknown>): Promise<unknown> {
  const cfg = getSolisCloudConfig();
  if (!cfg) {
    throw new SolisCloudError('SolisCloud is not configured');
  }

  const body = compactJsonBody(payload).replace(/"id":"(\d+)"/g, '"id":$1');
  const headers = solisRequestHeaders({
    keyId: cfg.keyId,
    keySecret: cfg.keySecret,
    body,
    canonicalizedResource,
  });

  const url = `${cfg.baseUrl}${canonicalizedResource}`;
  const res = await fetch(url, { method: 'POST', headers, body });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(quoteOversizedJsonInts(text)) : null;
  } catch {
    throw new SolisCloudError(`SolisCloud returned non-JSON (${res.status})`);
  }

  if (!res.ok) {
    const msg =
      json && typeof json === 'object' && 'message' in json && typeof (json as { message: unknown }).message === 'string'
        ? (json as { message: string }).message
        : `HTTP ${res.status}`;
    throw new SolisCloudError(msg);
  }

  const envelope = json as { success?: boolean; code?: string | number; msg?: string; data?: unknown };
  if (envelope && envelope.success === false) {
    throw new SolisCloudError(envelope.msg || 'SolisCloud request failed');
  }
  if (envelope && envelope.code != null && String(envelope.code) !== '0') {
    throw new SolisCloudError(envelope.msg || 'SolisCloud request failed');
  }
  return json;
}

export async function listSolisStations(): Promise<SolisStationListItem[]> {
  const all: SolisStationListItem[] = [];
  for (let pageNo = 1; pageNo <= 20; pageNo += 1) {
    const json = await solisPost('/v1/api/userStationList', { pageNo, pageSize: 100 });
    const page = parseStationList(json);
    all.push(...page);
    if (page.length < 100) break;
    await new Promise((r) => setTimeout(r, 600));
  }
  return all;
}

export async function listStationYearEnergy(
  stationId: string,
  year: number,
  capacityKw?: number | null,
): Promise<SolisStationYearPoint[]> {
  const json = await solisPost('/v1/api/stationYear', {
    id: stationId,
    money: 'INR',
    year: String(year),
  });
  return parseStationYearPoints(json, capacityKw);
}
