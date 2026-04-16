import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const DEFAULT_THEME = 'dark' as const
const SESSION_KEY = 'rayenna-theme-session'

export type RayennaTheme = 'light' | 'dark'

export type ThemeContextValue = {
  theme: RayennaTheme
  setTheme: (theme: RayennaTheme) => void
  toggleTheme: () => void
  setDark: () => void
  setLight: () => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  setDark: () => {},
  setLight: () => {},
})

function readInitialTheme(): RayennaTheme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  // Session-scoped cache so user A’s choice never “sticks” for user B on shared PCs.
  const saved = sessionStorage.getItem(SESSION_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light'
  return DEFAULT_THEME
}

function applyDocumentTheme(theme: RayennaTheme) {
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light'
}

/** Call once at app root — owns state, persistence, and `data-theme` on `<html>`. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<RayennaTheme>(readInitialTheme)

  useEffect(() => {
    applyDocumentTheme(theme)
    sessionStorage.setItem(SESSION_KEY, theme)
  }, [theme])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const saved = sessionStorage.getItem(SESSION_KEY)
      if (!saved) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])
  const setDark = useCallback(() => setTheme('dark'), [])
  const setLight = useCallback(() => setTheme('light'), [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme, setDark, setLight }),
    [theme, setTheme, toggleTheme, setDark, setLight],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext)
}

/** @deprecated Prefer `useThemeContext` — alias for parity with spec. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
