const TOKEN_KEY = 'pe_jwt';

const API_BASE =
  // Prefer explicit base URL when deployed (e.g. https://rayenna-crm.onrender.com)
  // and fall back to relative /api for local dev (proxied via Vite).
  (import.meta as any).env?.VITE_API_BASE_URL ?? '/api';

export function getApiBaseUrl(): string {
  return API_BASE;
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

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

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

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });

  const data = (await res.json()) as any;

  if (!res.ok) {
    const message =
      data?.error ||
      data?.message ||
      (Array.isArray(data?.errors) && data.errors[0]?.msg) ||
      'Login failed';
    throw new Error(message);
  }

  if (!data?.token) {
    throw new Error('Login succeeded but no token was returned.');
  }

  return data as LoginResponse;
}

