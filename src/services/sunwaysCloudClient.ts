import crypto from 'crypto';
import type { SolisStationYearPoint } from '../utils/solisEnergyUnits';
import {
  parseSunwaysCurveMonthlyPoints,
  parseSunwaysOverviewMonthKwh,
  parseSunwaysStationList,
  type SunwaysStationListItem,
} from '../utils/sunwaysEnergyUnits';

export class SunwaysCloudError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SunwaysCloudError';
  }
}

export type SunwaysCloudConfig = {
  email: string;
  password: string;
  baseUrl: string;
  distributorCodes: string | null;
  timeZoneOffset: number;
};

const DEFAULT_BASE = 'https://www.sunways-portal.com';
const SUCCESS_CODE = '1000000';

export function getSunwaysCloudConfig(): SunwaysCloudConfig | null {
  const email = (process.env.SUNWAYS_EMAIL || process.env.SUNWAYS_LOGIN || '').trim();
  const password = (process.env.SUNWAYS_PASSWORD || '').trim();
  const baseUrl = (process.env.SUNWAYS_API_BASE_URL || DEFAULT_BASE).trim().replace(/\/$/, '');
  const distributorCodes = (process.env.SUNWAYS_DISTRIBUTOR_CODES || '').trim() || null;
  const tzRaw = Number(process.env.SUNWAYS_TIMEZONE_OFFSET_MINUTES || '330');
  const timeZoneOffset = Number.isFinite(tzRaw) ? tzRaw : 330;
  if (!email || !password) return null;
  return { email, password, baseUrl, distributorCodes, timeZoneOffset };
}

export function sunwaysPublicStatus(): { configured: boolean; apiHost: string | null } {
  const cfg = getSunwaysCloudConfig();
  if (!cfg) return { configured: false, apiHost: null };
  try {
    return { configured: true, apiHost: new URL(cfg.baseUrl).host };
  } catch {
    return { configured: true, apiHost: 'configured' };
  }
}

/** Portal login password = Base64(MD5(plain)). */
export function encodeSunwaysPassword(password: string): string {
  const md5Hex = crypto.createHash('md5').update(password, 'utf8').digest('hex');
  return Buffer.from(md5Hex, 'utf8').toString('base64');
}

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;
let stationCache: { at: number; items: SunwaysStationListItem[] } | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function sunwaysRequest(
  method: 'GET' | 'POST',
  path: string,
  opts?: { query?: Record<string, string>; body?: Record<string, unknown>; token?: string },
): Promise<unknown> {
  const cfg = getSunwaysCloudConfig();
  if (!cfg) throw new SunwaysCloudError('Sunways Portal is not configured');

  const url = new URL(path.startsWith('http') ? path : `${cfg.baseUrl}${path}`);
  if (opts?.query) {
    for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v);
  }

  const headers: Record<string, string> = {
    ver: 'pc',
    Accept: 'application/json',
  };
  if (opts?.body) headers['Content-Type'] = 'application/json; charset=UTF-8';
  if (opts?.token) {
    headers.token = opts.token;
    headers.Cookie = `token=${opts.token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });

  const headerToken = res.headers.get('token');
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new SunwaysCloudError(`Sunways Portal returned non-JSON (${res.status})`);
  }

  if (headerToken) {
    tokenCache = { token: headerToken, expiresAt: Date.now() + 50 * 60 * 1000 };
  }

  const envelope = json as { code?: string | number; msg?: string; message?: string; data?: unknown } | null;
  if (!res.ok) {
    throw new SunwaysCloudError(envelope?.msg || envelope?.message || `HTTP ${res.status}`);
  }
  if (envelope && envelope.code != null && String(envelope.code) !== SUCCESS_CODE) {
    const code = String(envelope.code);
    if (code.toLowerCase().startsWith('auth_') || code === '3010022') {
      tokenCache = null;
    }
    throw new SunwaysCloudError(envelope.msg || envelope.message || `Sunways error ${code}`);
  }
  if (envelope && 'data' in envelope) return envelope.data ?? envelope;
  return json;
}

export async function getSunwaysAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const cfg = getSunwaysCloudConfig();
  if (!cfg) throw new SunwaysCloudError('Sunways Portal is not configured');

  await sunwaysRequest('POST', '/monitor/auth/login', {
    body: {
      email: cfg.email,
      password: encodeSunwaysPassword(cfg.password),
      channel: 1,
    },
  });
  if (!tokenCache?.token) {
    throw new SunwaysCloudError('Sunways login succeeded but no token was returned');
  }
  return tokenCache.token;
}

async function withAuth<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const token = await getSunwaysAccessToken();
  try {
    return await fn(token);
  } catch (err) {
    if (err instanceof SunwaysCloudError && /auth|login|token|3010022/i.test(err.message)) {
      tokenCache = null;
      const retry = await getSunwaysAccessToken();
      return fn(retry);
    }
    throw err;
  }
}

export async function listSunwaysStations(): Promise<SunwaysStationListItem[]> {
  if (stationCache && Date.now() - stationCache.at < 5 * 60 * 1000) return stationCache.items;
  const cfg = getSunwaysCloudConfig();
  if (!cfg) throw new SunwaysCloudError('Sunways Portal is not configured');

  const all: SunwaysStationListItem[] = [];
  for (let pageNum = 1; pageNum <= 20; pageNum += 1) {
    const query: Record<string, string> = {
      pageNum: String(pageNum),
      pageSize: '50',
      status: '',
      type: '',
      snOrNameOrEmail: '',
      installStartTime: '',
      installEndTime: '',
      modelTypes: '',
    };
    if (cfg.distributorCodes) query.distributorCodes = cfg.distributorCodes;

    const data = await withAuth((token) =>
      sunwaysRequest('GET', '/monitor/core/power/station/monitoring/getPage', { query, token }),
    );
    const pageItems = parseSunwaysStationList(data);
    all.push(...pageItems);
    if (pageItems.length < 50) break;
    await sleep(300);
  }

  stationCache = { at: Date.now(), items: all };
  return all;
}

export async function getSunwaysStationOverview(stationId: string): Promise<unknown> {
  return withAuth((token) =>
    sunwaysRequest('GET', '/monitor/core/power/station/overview/getSingleStationOverview', {
      query: { id: stationId },
      token,
    }),
  );
}

async function getGridConnectedData(
  stationId: string,
  durationType: number,
  date: string,
  stationType = 1,
): Promise<unknown> {
  const cfg = getSunwaysCloudConfig();
  if (!cfg) throw new SunwaysCloudError('Sunways Portal is not configured');
  return withAuth((token) =>
    sunwaysRequest('GET', '/monitor/core/power/station/overview/getGridConnectedData', {
      query: {
        id: stationId,
        durationType: String(durationType),
        curveType: '1000',
        date,
        stationType: String(stationType),
        timeZoneOffset: String(cfg.timeZoneOffset),
      },
      token,
    }),
  );
}

/**
 * Pull monthly kWh for Hub Track.
 * Prefer year-curve durationType=3; always include current month from station overview.
 */
export async function listSunwaysStationMonthEnergy(
  stationId: string,
  years: number[],
  capacityKw?: number | null,
): Promise<SolisStationYearPoint[]> {
  const byMonth = new Map<string, SolisStationYearPoint>();

  for (const year of years) {
    try {
      const curve = await getGridConnectedData(stationId, 3, `${year}-01-01`);
      for (const p of parseSunwaysCurveMonthlyPoints(curve, capacityKw)) {
        byMonth.set(`${p.year}-${p.month}`, p);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[sunways] year curve ${year} failed for ${stationId}: ${msg}`);
    }
    await sleep(400);
  }

  try {
    const overview = await getSunwaysStationOverview(stationId);
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(now);
    const year = Number(parts.find((p) => p.type === 'year')?.value);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const current = parseSunwaysOverviewMonthKwh(overview, year, month, capacityKw);
    if (current) byMonth.set(`${current.year}-${current.month}`, current);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[sunways] overview month failed for ${stationId}: ${msg}`);
  }

  return [...byMonth.values()].sort((a, b) => a.year - b.year || a.month - b.month);
}
