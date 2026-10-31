import { useEffect, useState } from 'react';
import { useThemeContext } from '../theme/ThemeProvider';

const MOBILE_MAX = 1279;

export default function ThemeToggle({ forceCompact }: { forceCompact?: boolean } = {}) {
  const { theme, persistTheme } = useThemeContext();
  const [compactMq, setCompactMq] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_MAX : false,
  );

  useEffect(() => {
    if (forceCompact !== undefined) return;
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const onChange = () => setCompactMq(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [forceCompact]);

  const compact = forceCompact ?? compactMq;

  const btn = (active: boolean) =>
    [
      'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition-colors',
      active
        ? 'bg-[#EA580C]/20 text-[#FDBA74] border border-[#EA580C]/40 font-semibold'
        : 'text-white/70 border border-transparent hover:text-white hover:bg-white/10',
    ].join(' ');

  return (
    <div
      className="inline-flex items-center rounded-full border border-white/20 bg-white/10 p-0.5 gap-0.5 shrink-0"
      role="group"
      aria-label="Theme switcher"
    >
      <button
        type="button"
        className={btn(theme === 'dark')}
        onClick={() => persistTheme('dark')}
        title="Switch to dark theme"
        aria-pressed={theme === 'dark'}
      >
        <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        {!compact ? 'Dark' : null}
      </button>
      <button
        type="button"
        className={btn(theme === 'light')}
        onClick={() => persistTheme('light')}
        title="Switch to light theme"
        aria-pressed={theme === 'light'}
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
  );
}
