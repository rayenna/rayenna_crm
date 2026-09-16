import crypto from 'crypto';
import { parseDeyeHistoryPoints, parseDeyeStationList, type DeyeStationListItem } from '../utils/deyeEnergyUnits';
import type { SolisStationYearPoint } from '../utils/solisEnergyUnits';

export class DeyeCloudError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeyeCloudError';
  }
}

export type DeyeCloudConfig = {
  appId: string;
  appSecret: string;
  login: string;
  password: string;
  baseUrl: string;
  companyId: string | null;
};

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

export function getDeyeCloudConfig(): DeyeCloudConfig | null {
  const appId = (process.env.DEYE_APP_ID || '').trim();
  const appSecret = (process.env.DEYE_APP_SECRET || '').trim();
  const login = (process.env.DEYE_LOGIN || process.env.DEYE_EMAIL || '').trim();
  const password = (process.env.DEYE_PASSWORD || '').trim();
  const rawBase = (process.env.DEYE_API_BASE_URL || 'https://india-developer.deyecloud.com').trim().replace(/\/$/, '');
  const companyId = (process.env.DEYE_COMPANY_ID || '').trim() || null;
  if (!appId || !appSecret || !login || !password) return null;
  const baseUrl = rawBase.endsWith('/v1.0') ? rawBase : `${rawBase}/v1.0`;
  return { appId, appSecret, login, password, baseUrl, companyId };
}

export function deyePublicStatus(): { configured: boolean; apiHost: string | null } {
  const cfg = getDeyeCloudConfig();
  if (!cfg) return { configured: false, apiHost: null };
  try {
    return { configured: true, apiHost: new URL(cfg.baseUrl).host };
  } catch {
    return { configured: true, apiHost: 'configured' };
  }
}

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;
let stationCache: { at: number; items: DeyeStationListItem[] } | null = null;

async function deyePost(path: string, payload: Record<string, unknown>, token?: string): Promise<unknown> {
  const cfg = getDeyeCloudConfig();
  if (!cfg) throw new DeyeCloudError('Deye Cloud is not configured');
  const url = path.startsWith('http') ? path : `${cfg.baseUrl}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `bearer ${token}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    msg?: string;
    message?: string;
    code?: string | number;
    data?: unknown;
    accessToken?: string;
    stationList?: unknown;
    stationDataItems?: unknown;
  } | null;
  if (!res.ok) {
    throw new DeyeCloudError(json?.msg || json?.message || `HTTP ${res.status}`);
  }
  if (json && json.success === false) {
    throw new DeyeCloudError(json.msg || json.message || 'Deye Cloud request failed');
  }
  if (json?.data && typeof json.data === 'object' && !Array.isArray(json.data)) {
    return { ...json, ...(json.data as Record<string, unknown>) };
  }
  return json;
}

export async function getDeyeAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const cfg = getDeyeCloudConfig();
  if (!cfg) throw new DeyeCloudError('Deye Cloud is not configured');
  const body: Record<string, unknown> = {
    appSecret: cfg.appSecret,
    password: sha256Hex(cfg.password),
  };
  if (cfg.login.includes('@')) body.email = cfg.login;
  else body.username = cfg.login;
  if (cfg.companyId) body.companyId = cfg.companyId;
  const json = (await deyePost(`/account/token?appId=${encodeURIComponent(cfg.appId)}`, body)) as {
    accessToken?: string;
  };
  if (!json.accessToken) throw new DeyeCloudError('Deye Cloud token was empty');
  tokenCache = { token: json.accessToken, expiresAt: Date.now() + 45 * 60 * 1000 };
  return json.accessToken;
}

export async function listDeyeStations(): Promise<DeyeStationListItem[]> {
  if (stationCache && Date.now() - stationCache.at < 5 * 60 * 1000) return stationCache.items;
  const token = await getDeyeAccessToken();
  const all: DeyeStationListItem[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const json = await deyePost('/station/list', { page, size: 50 }, token);
    const pageItems = parseDeyeStationList(json);
    all.push(...pageItems);
    if (pageItems.length < 50) break;
  }
  stationCache = { at: Date.now(), items: all };
  return all;
}

export async function listDeyeStationMonthEnergy(
  stationId: string,
  startYm: string,
  endYm: string,
  capacityKw?: number | null,
): Promise<SolisStationYearPoint[]> {
  const token = await getDeyeAccessToken();
  const json = await deyePost(
    '/station/history',
    {
      stationId: Number(stationId) || stationId,
      granularity: 3,
      startAt: startYm,
      endAt: endYm,
    },
    token,
  );
  return parseDeyeHistoryPoints(json, capacityKw);
}

export { DeyeStationListItem };
