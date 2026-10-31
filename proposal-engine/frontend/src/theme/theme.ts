export type PeTheme = 'light' | 'dark';

/** Session-scoped so User A’s choice never sticks for User B on a shared PC. */
export const PE_THEME_SESSION_KEY = 'rayenna-theme-session';

export function isPeTheme(value: unknown): value is PeTheme {
  return value === 'light' || value === 'dark';
}

export function readSessionTheme(): PeTheme | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.sessionStorage.getItem(PE_THEME_SESSION_KEY);
    return isPeTheme(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function writeSessionTheme(theme: PeTheme): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PE_THEME_SESSION_KEY, theme);
  } catch {
    // Private mode / quota — preference still lives on the server.
  }
}

export function clearThemeSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PE_THEME_SESSION_KEY);
  } catch {
    // ignore
  }
  applyDocumentTheme('light');
}

export function applyDocumentTheme(theme: PeTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}
