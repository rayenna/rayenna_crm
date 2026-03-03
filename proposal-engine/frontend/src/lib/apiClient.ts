const TOKEN_KEY = 'pe_jwt';

// Match CRM frontend behaviour:
// - In dev: VITE_API_BASE_URL is usually empty → use relative `/api/...` (Vite proxy).
// - In prod: VITE_API_BASE_URL is the backend origin, e.g. https://rayenna-crm.onrender.com
//   and we always prefix paths with `/api/...`.
const RAW_API_BASE_URL: string = (import.meta as any).env?.VITE_API_BASE_URL || '';
const API_BASE_URL: string = RAW_API_BASE_URL.replace(/\/+$/, '');

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore quota / storage errors
  }
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

function handleUnauthorized() {
  clearToken();
  // Hard redirect so any in-memory state is reset
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
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
  if (!text) {
    // No body
    return undefined as TResponse;
  }

  try {
    return JSON.parse(text) as TResponse;
  } catch {
    // Non-JSON response
    return text as unknown as TResponse;
  }
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export async function loginWithEmailPassword(email: string, password: string): Promise<LoginResponse> {
  const body = JSON.stringify({ email, password });

  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });

  let rawText: string | null = null;
  let data: any = null;

  try {
    rawText = await res.text();
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    // Non-JSON or empty body – handled below.
  }

  if (!res.ok) {
    const message =
      data?.error ||
      data?.message ||
      (Array.isArray(data?.errors) && data.errors[0]?.msg) ||
      (rawText && rawText.trim().length > 0
        ? `Login failed (${res.status}).`
        : 'Login failed. No response body from server.');
    throw new Error(message);
  }

  if (!data?.token) {
    throw new Error('Login succeeded but no token was returned by the CRM backend.');
  }

  return data as LoginResponse;
}

