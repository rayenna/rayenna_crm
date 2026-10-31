import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { getToken } from '../lib/api/session';
import { fetchThemePreference, putThemePreference } from '../lib/api/theme';
import {
  applyDocumentTheme,
  clearThemeSession,
  isPeTheme,
  readSessionTheme,
  writeSessionTheme,
  type PeTheme,
} from './theme';

type ThemeContextValue = {
  theme: PeTheme;
  setTheme: (theme: PeTheme) => void;
  persistTheme: (theme: PeTheme) => void;
  resetTheme: () => void;
  hydrateFromServer: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  persistTheme: () => {},
  resetTheme: () => {},
  hydrateFromServer: async () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [theme, setThemeState] = useState<PeTheme>(() => readSessionTheme() ?? 'light');

  const setTheme = useCallback((next: PeTheme) => {
    setThemeState(next);
    writeSessionTheme(next);
  }, []);

  const persistTheme = useCallback(
    (next: PeTheme) => {
      setTheme(next);
      if (!getToken()) return;
      void putThemePreference(next).catch(() => {});
    },
    [setTheme],
  );

  const resetTheme = useCallback(() => {
    setThemeState('light');
    clearThemeSession();
  }, []);

  const hydrateFromServer = useCallback(async () => {
    if (!getToken()) return;
    try {
      const remote = await fetchThemePreference();
      if (isPeTheme(remote)) setTheme(remote);
    } catch {
      // Keep session/local Light until the next successful fetch.
    }
  }, [setTheme]);

  useEffect(() => {
    if (pathname === '/login') {
      applyDocumentTheme('dark');
      return;
    }
    if (pathname.startsWith('/view/')) {
      applyDocumentTheme('light');
      return;
    }
    applyDocumentTheme(theme);
  }, [theme, pathname]);

  useEffect(() => {
    if (!getToken()) return;
    void hydrateFromServer();
  }, [hydrateFromServer]);

  const value = useMemo(
    () => ({ theme, setTheme, persistTheme, resetTheme, hydrateFromServer }),
    [theme, setTheme, persistTheme, resetTheme, hydrateFromServer],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}
