import { useEffect, useState, type CSSProperties } from 'react'
import { useThemeContext } from '../hooks/useTheme'
import axiosInstance from '../utils/axios'

const MOBILE_MAX = 767

const pill: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  background: 'var(--nav-active-bg)',
  border: '1px solid var(--nav-border)',
  borderRadius: 20,
  padding: 3,
  gap: 2,
  flexShrink: 0,
}

const ThemeToggle = () => {
  const { theme, setDark, setLight } = useThemeContext()
  const [compact, setCompact] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_MAX : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`)
    const onChange = () => setCompact(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const btnBase: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 10px',
    borderRadius: 16,
    fontSize: 11,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={pill} role="group" aria-label="Theme switcher">
      <button
        type="button"
        onClick={() => {
          setDark()
          void axiosInstance.put('/api/auth/theme', { theme: 'dark' }).catch(() => {})
        }}
        title="Switch to dark theme"
        aria-pressed={theme === 'dark'}
        style={{
          ...btnBase,
          border:
            theme === 'dark' ? '1px solid var(--accent-gold-border)' : '1px solid transparent',
          background: theme === 'dark' ? 'var(--accent-gold-muted)' : 'transparent',
          color: theme === 'dark' ? 'var(--accent-gold)' : 'var(--nav-text)',
          fontWeight: theme === 'dark' ? 600 : 400,
        }}
      >
        <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        {!compact ? 'Dark' : null}
      </button>
      <button
        type="button"
        onClick={() => {
          setLight()
          void axiosInstance.put('/api/auth/theme', { theme: 'light' }).catch(() => {})
        }}
        title="Switch to light theme"
        aria-pressed={theme === 'light'}
        style={{
          ...btnBase,
          border:
            theme === 'light' ? '1px solid var(--accent-gold-border)' : '1px solid transparent',
          background: theme === 'light' ? 'var(--accent-gold-muted)' : 'transparent',
          color: theme === 'light' ? 'var(--accent-gold)' : 'var(--nav-text)',
          fontWeight: theme === 'light' ? 600 : 400,
        }}
      >
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        {!compact ? 'Light' : null}
      </button>
    </div>
  )
}

export default ThemeToggle
