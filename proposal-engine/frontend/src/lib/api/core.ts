import { getToken, handleUnauthorized } from './session';

const RAW_API_BASE_URL: string = (import.meta as any).env?.VITE_API_BASE_URL || '';
const API_BASE_URL: string = RAW_API_BASE_URL.replace(/\/+$/, '');

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/** Timeout for health check and cold-start tolerance (matches CRM). 90s for Render free-tier wake. */
export const HEALTH_CHECK_TIMEOUT_MS = 90_000;

export function isTimeoutOrNetworkError(error: unknown): boolean {
  if (error == null) return false;
  const err = error as { name?: string; code?: string; message?: string };
  const msg = typeof err.message === 'string' ? err.message.toLowerCase() : '';
  return (
    err.name === 'AbortError' ||
    err.code === 'ECONNABORTED' ||
    err.code === 'ERR_NETWORK' ||
    msg === 'network error' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('cannot reach') ||
    msg.includes('reachable')
  );
}

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions extends Omit<RequestInit, 'method'> {
  method?: ApiMethod;
  /** When false, omits Authorization header even if a token exists. */
  auth?: boolean;
}

export async function apiFetch<TResponse = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const method: ApiMethod = options.method ?? 'GET';
  const auth = options.auth ?? true;

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const headers = new Headers(options.headers ?? {});

  if (!headers.has('Content-Type') && method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = getToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  const text = await response.text();
  let parsed: TResponse;
  try {
    parsed = (text ? JSON.parse(text) : undefined) as TResponse;
  } catch {
    parsed = text as unknown as TResponse;
  }

  if (!response.ok) {
    const errMsg =
      (parsed as { error?: string })?.error ||
      (parsed as { message?: string })?.message ||
      response.statusText ||
      `Request failed (${response.status})`;
    throw new Error(errMsg);
  }

  return parsed;
}
