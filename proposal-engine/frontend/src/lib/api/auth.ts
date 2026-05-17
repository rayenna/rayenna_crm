import { apiFetch, getApiBaseUrl } from './core';

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
  try {
    const data = await apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password }),
    });

    if (!data?.token) {
      throw new Error('Login succeeded but no token was returned by the CRM backend.');
    }

    return data;
  } catch (err: unknown) {
    const rawMsg = String((err as { message?: string })?.message || '');
    if (rawMsg.toLowerCase().includes('failed to fetch') || rawMsg.toLowerCase().includes('networkerror')) {
      const base = getApiBaseUrl() || window.location.origin;
      throw new Error(
        `Cannot reach CRM backend from Proposal Engine. Check the backend is running and reachable. (Base: ${base})`,
      );
    }
    throw err;
  }
}
