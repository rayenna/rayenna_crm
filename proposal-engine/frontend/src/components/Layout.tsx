import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getActiveCustomer } from '../lib/customerStore';
import { clearToken, getCurrentUserName, getToken } from '../lib/apiClient';
import {
  RAYENNA_BROWSER_STORAGE_ERROR_EVENT,
  type BrowserStorageErrorDetail,
} from '../lib/safeLocalStorage';
import TipOfTheDay from './TipOfTheDay';

const NAV = [
  { label: 'Customers',             to: '/customers' },
  { label: 'Dashboard',             to: '/dashboard' },
  { label: 'Costing Sheet',         to: '/costing'   },
  { label: 'BOM',                   to: '/bom'       },
  { label: 'ROI',                   to: '/roi'       },
  { label: 'AI Roof Layout (Beta)', to: '/ai-layout' },
  { label: 'Proposal',              to: '/proposal'  },
];

const ACTIVE_LINK = 'text-white font-semibold border-b-2 border-[#EA580C]';
const IDLE_LINK = 'text-white/70 hover:text-white font-medium border-b-2 border-transparent';
const DRAWER_ACTIVE = 'bg-white/10 text-white border-l-2 border-[#EA580C]';
const DRAWER_IDLE = 'text-white/80 hover:bg-white/10 hover:text-white';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const [menuOpen, setMenuOpen]     = useState(false);
  const [helpOpen, setHelpOpen]     = useState(false);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown]     = useState(60);
  const helpRef                     = useRef<HTMLDivElement>(null);
  // Re-read active customer on every navigation so the pill stays current
  const activeCustomer = getActiveCustomer();
  const hasToken       = !!getToken();
  const userName       = getCurrentUserName();

  // Auto-logout time (no activity): 10 minutes
  const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
  // When the warning timer message pops up: 9 minutes
  const WARNING_BEFORE_MS = 60 * 1000;
  // Warning starts at 10m - 1m = 9m
  // Countdown details: Warning shows and counts down from 60 seconds to 0, then it logs out.

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setMenuOpen(false); setHelpOpen(false); }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Inactivity timer helpers
  const clearIdleTimers = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    idleTimerRef.current = null;
    warningTimerRef.current = null;
    countdownIntervalRef.current = null;
  };

  const resetIdleTimer = () => {
    clearIdleTimers();
    setShowIdleWarning(false);
    setIdleCountdown(60);

    if (!getToken()) return;

    // Warning timer – show 1 minute before auto logout
    warningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true);
      setIdleCountdown(60);

      countdownIntervalRef.current = setInterval(() => {
        setIdleCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Auto-logout timer
    idleTimerRef.current = setTimeout(() => {
      setShowIdleWarning(false);
      clearIdleTimers();
      handleLogout();
    }, IDLE_TIMEOUT_MS);
  };

  // Close Help dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setHelpOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Press ? anywhere (outside inputs) to open Help
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '?') return;
      const tag = (e.target as HTMLElement).tagName;
      const isEditable = (e.target as HTMLElement).isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable) return;
      e.preventDefault();
      navigate('/help');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const handleLogout = () => {
    clearToken();
    navigate('/login', { replace: true });
  };

  const [storageErrorMsg, setStorageErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<BrowserStorageErrorDetail>;
      if (ce.detail?.message) setStorageErrorMsg(ce.detail.message);
    };
    window.addEventListener(RAYENNA_BROWSER_STORAGE_ERROR_EVENT, handler as EventListener);
    return () =>
      window.removeEventListener(RAYENNA_BROWSER_STORAGE_ERROR_EVENT, handler as EventListener);
  }, []);

  const storageAlert =
    storageErrorMsg && (
      <div
        className="fixed top-3 left-3 right-3 z-[100] px-0 sm:px-2"
        role="alert"
      >
        <div className="max-w-4xl mx-auto rounded-xl bg-amber-950 text-amber-50 border border-amber-600 px-4 py-3 flex flex-col sm:flex-row gap-3 sm:items-center shadow-xl text-sm">
          <p className="flex-1 font-medium leading-snug">{storageErrorMsg}</p>
          <button
            type="button"
            onClick={() => setStorageErrorMsg(null)}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-400 text-amber-950 hover:bg-amber-300 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    );

  // Set up global activity listeners to reset inactivity timer
  useEffect(() => {
    const activityEvents: (keyof DocumentEventMap)[] = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleActivity = () => {
      if (getToken()) {
        resetIdleTimer();
      }
    };

    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial timer setup if already logged in
    if (getToken()) {
      resetIdleTimer();
    }

    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      clearIdleTimers();
    };
  }, []);

  // For the login page, render children without the full chrome to keep the
  // experience focused and avoid showing navigation before authentication.
  if (pathname === '/login') {
    return (
      <div className="min-h-screen">
        {storageAlert}
        {children}
      </div>
    );
  }

  // Shared proposal view: read-only, no nav (link is public).
  if (pathname.startsWith('/view/')) {
    return (
      <>
        {storageAlert}
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen">
      {storageAlert}

      {/* ── Navbar ── */}
      <nav
        style={{ background: '#0d1b3a' }}
        className="border-b-2 border-[#EA580C] sticky top-0 z-20"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex items-center justify-between h-14 gap-2">

            {/* Wordmark sits on white so the navy lettering stays readable on the bar. */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                to="/"
                className="flex items-center bg-white rounded-md px-1.5 py-0.5 hover:opacity-90 transition-opacity"
              >
                <img
                  src="/Proposals_Logo.jpg"
                  alt="Proposal Engine"
                  className="h-9 w-auto object-contain"
                />
              </Link>
            </div>

            {/* Desktop nav from laptop width. Tighter padding keeps the seven links in the bar. */}
            <div className="hidden lg:flex items-center flex-1 justify-center min-w-0">
              <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto">
                {NAV.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`inline-flex items-center px-2 py-1 text-xs transition-colors duration-200 whitespace-nowrap ${
                      pathname === n.to ? ACTIVE_LINK : IDLE_LINK
                    }`}
                  >
                    {n.label}
                  </Link>
                ))}
              </div>

              {/* Help dropdown — outside scroll container so panel is not clipped */}
              <div ref={helpRef} className="relative flex-shrink-0 ml-1.5">
                <button
                  type="button"
                  onClick={() => setHelpOpen((o) => !o)}
                  aria-expanded={helpOpen}
                  aria-haspopup="true"
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs transition-colors duration-200 whitespace-nowrap ${
                    pathname === '/help' || pathname === '/about' ? ACTIVE_LINK : IDLE_LINK
                  }`}
                >
                  <span>Help</span>
                  <span className={`text-[10px] transition-transform duration-150 ${helpOpen ? 'rotate-180' : ''}`} aria-hidden>▾</span>
                </button>
                {helpOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-44 bg-white rounded-lg border border-secondary-200 overflow-hidden z-50" role="menu">
                    <Link
                      to="/help"
                      role="menuitem"
                      className="flex items-center px-4 py-2.5 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors"
                      onClick={() => setHelpOpen(false)}
                    >
                      <span className="font-medium">User Guide</span>
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setHelpOpen(false); navigate(`${pathname}?showTip=1`); }}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors border-t border-secondary-100 text-left"
                    >
                      <span className="font-medium">Tip of the Day</span>
                    </button>
                    <Link
                      to="/about"
                      role="menuitem"
                      className="flex items-center px-4 py-2.5 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors border-t border-secondary-100"
                      onClick={() => setHelpOpen(false)}
                    >
                      <span className="font-medium">About</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Active customer pill — desktop only (routes to Dashboard) */}
              {activeCustomer && (
                <Link
                  to="/dashboard"
                  className="hidden lg:flex items-center gap-1.5 text-xs text-white/90 bg-white/10 hover:bg-white/15 border border-white/20 px-2.5 py-1 rounded-full transition-colors max-w-[160px] 2xl:max-w-[200px]"
                  title={`Active on dashboard: ${activeCustomer.master.name}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0A9E87] inline-block flex-shrink-0" />
                  <span className="truncate font-medium">{activeCustomer.master.name}</span>
                </Link>
              )}

              {/* Active customer — compact, when the full link row is hidden */}
              {activeCustomer && (
                <Link
                  to="/dashboard"
                  className="lg:hidden flex items-center gap-1 text-[11px] text-white/90 bg-white/10 border border-white/20 px-2 py-0.5 rounded-full max-w-[min(42vw,11rem)] sm:max-w-[12rem]"
                  title={`Active on dashboard: ${activeCustomer.master.name}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0A9E87] inline-block flex-shrink-0" />
                  <span className="truncate font-medium">{activeCustomer.master.name}</span>
                </Link>
              )}

              {/* Logout button — desktop only */}
              {hasToken && (
                <div className="hidden lg:flex items-center gap-2">
                  {userName && (
                    <span
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium text-white/90 bg-white/10 border border-white/20 max-w-[180px] xl:max-w-[240px]"
                      title={userName}
                    >
                      <span className="truncate">{userName}</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-800 bg-white hover:bg-secondary-100 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                className="lg:hidden flex flex-col justify-center items-center w-11 h-11 min-w-[44px] min-h-[44px] gap-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0 touch-manipulation"
              >
                <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block w-5 h-0.5 bg-white transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Tablet / phone menu drawer — scrollable, touch-friendly (iPad-safe) ── */}
        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="lg:hidden fixed inset-0 z-10 bg-black/40 touch-manipulation"
              onClick={() => setMenuOpen(false)}
            />
            <div
              className="lg:hidden relative z-20 border-t border-white/15"
              style={{ background: '#0d1b3aF2' }}
            >
            <nav
              className="max-w-7xl mx-auto px-3 sm:px-4 py-3 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]"
              style={{ maxHeight: 'min(75dvh, 560px)' }}
            >
              {/* Nav links — 2 columns from sm+ landscape-friendly on iPad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {NAV.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`flex items-center min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                      pathname === n.to ? DRAWER_ACTIVE : DRAWER_IDLE
                    }`}
                  >
                    {n.label}
                  </Link>
                ))}
              </div>

              {/* Help group */}
              <div className="mt-2 pt-2 border-t border-white/20">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <Link
                    to="/help"
                    className={`flex items-center min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                      pathname === '/help' ? DRAWER_ACTIVE : DRAWER_IDLE
                    }`}
                  >
                    <span>User Guide</span>
                  </Link>
                  <button
                    onClick={() => { setMenuOpen(false); navigate(`${pathname}?showTip=1`); }}
                    className={`flex items-center min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${DRAWER_IDLE}`}
                  >
                    <span>Tip of the Day</span>
                  </button>
                  <Link
                    to="/about"
                    className={`flex items-center min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                      pathname === '/about' ? DRAWER_ACTIVE : DRAWER_IDLE
                    }`}
                  >
                    <span>About</span>
                  </Link>
                </div>

                {/* Mobile user name (match CRM: visible in hamburger menu) */}
                {hasToken && userName && (
                  <div className="mt-2 pt-2 border-t border-white/20">
                    <div
                      className="px-3 py-2 rounded-lg text-sm text-white/90 font-medium bg-white/10 border border-white/20 truncate"
                      title={userName}
                    >
                      {userName}
                    </div>
                  </div>
                )}

                {/* Mobile logout button */}
                {hasToken && (
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="mt-2 w-full flex items-center justify-center min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-semibold text-primary-800 bg-white hover:bg-secondary-100 transition-colors touch-manipulation"
                  >
                    <span>Logout</span>
                  </button>
                )}
              </div>
            </nav>
            </div>
          </>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>

      <TipOfTheDay />

      {/* Inactivity warning banner */}
      {showIdleWarning && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3">
          <div className="max-w-md mx-auto rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 text-xs sm:text-sm">
              <p className="font-semibold">
                You’ve been inactive for a while.
              </p>
              <p className="mt-1 text-slate-200">
                For security, you’ll be logged out in{' '}
                <span className="font-bold">{idleCountdown}s</span> unless you choose to stay logged in.
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors"
              >
                Logout now
              </button>
              <button
                type="button"
                onClick={resetIdleTimer}
                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-amber-400 text-slate-900 hover:bg-amber-300 border border-amber-300 transition-colors"
              >
                Stay logged in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
