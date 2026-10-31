import { apiFetch } from './core';

export async function fetchThemePreference(): Promise<'light' | 'dark' | null> {
  const data = await apiFetch<{ theme?: unknown }>('/api/auth/theme');
  return data?.theme === 'light' || data?.theme === 'dark' ? data.theme : null;
}

export async function putThemePreference(theme: 'light' | 'dark'): Promise<'light' | 'dark'> {
  const data = await apiFetch<{ theme?: unknown }>('/api/auth/theme', {
    method: 'PUT',
    body: JSON.stringify({ theme }),
  });
  return data?.theme === 'light' || data?.theme === 'dark' ? data.theme : theme;
}
