import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getActiveCustomer } from '../lib/customerStore';
import { clearToken, getToken } from '../lib/apiClient';
import TipOfTheDay from './TipOfTheDay';

const NAV = [
  { label: 'Dashboard',     to: '/'          },
  { label: 'Customers',     to: '/customers' },
  { label: 'Costing Sheet', to: '/costing'   },
  { label: 'BOM',           to: '/bom'       },
  { label: 'ROI',           to: '/roi'       },
  { label: 'Proposal',      to: '/proposal'  },
];

/* Exact gradient used by the CRM navbar */
const NAV_GRADIENT = 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)';
/* CRM active link: bg-white/30 = rgba(255,255,255,0.30) */
const ACTIVE_LINK  = 'bg-white/30 text-white shadow-md font-bold border-2 border-white/40';
const IDLE_LINK    = 'text-white hover:bg-white/20 hover:text-white';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const [menuOpen, setMenuOpen]     = useState(false);
  const [helpOpen, setHelpOpen]     = useState(false);
  const helpRef                     = useRef<HTMLDivElement>(null);
  // Re-read active customer on every navigation so the pill stays current
  const activeCustomer = getActiveCustomer();
  const hasToken       = !!getToken();

  useEffect(() => { setMenuOpen(false); setHelpOpen(false); }, [pathname]);

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

  // For the login page, render children without the full chrome to keep the
  // experience focused and avoid showing navigation before authentication.
  if (pathname === '/login') {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/80">

      {/* ── Navbar ── */}
      <nav
        style={{ background: NAV_GRADIENT }}
        className="shadow-lg border-b-4 border-primary-400 sticky top-0 z-20"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          {/* Navbar row — shorter in landscape (h-12) vs portrait (h-16) vs desktop (h-20) */}
          <div className="flex items-center justify-between h-16 landscape:h-12 md:landscape:h-20 md:h-20 gap-2">

            {/* Brand */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 landscape:w-7 landscape:h-7 md:w-9 md:h-9 rounded-lg bg-white/25 border border-white/40 flex items-center justify-center text-white font-bold text-xs shadow-lg">
                PE
              </div>
              <span className="text-white font-bold tracking-tight text-sm drop-shadow">
                Proposal Engine
              </span>
              <span className="text-[10px] text-white/70 bg-white/10 border border-white/20 px-2 py-0.5 rounded-full hidden md:inline">
                v1.0 · dev
              </span>
            </div>

            {/* Desktop nav (md and above) */}
            <div className="hidden md:flex items-center gap-1 flex-1 justify-center flex-wrap">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`inline-flex items-center px-3 py-2 rounded-lg text-xs xl:text-sm font-semibold transition-colors duration-200 whitespace-nowrap ${
                    pathname === n.to ? ACTIVE_LINK : IDLE_LINK
                  }`}
                >
                  {n.label}
                </Link>
              ))}

              {/* Help dropdown */}
              <div ref={helpRef} className="relative">
                <button
                  onClick={() => setHelpOpen((o) => !o)}
                  className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs xl:text-sm font-semibold transition-colors duration-200 whitespace-nowrap ${
                    pathname === '/help' || pathname === '/about' ? ACTIVE_LINK : IDLE_LINK
                  }`}
                >
                  <span>? Help</span>
                  <span className={`text-[10px] transition-transform duration-150 ${helpOpen ? 'rotate-180' : ''}`}>▾</span>
                </button>
                {helpOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-30">
                    <Link
                      to="/help"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    >
                      <span>📘</span>
                      <span className="font-medium">User Guide</span>
                    </Link>
                    <button
                      onClick={() => { setHelpOpen(false); navigate(`${pathname}?showTip=1`); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors border-t border-gray-100"
                    >
                      <span>💡</span>
                      <span className="font-medium">Tip of the Day</span>
                    </button>
                    <Link
                      to="/about"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors border-t border-gray-100"
                    >
                      <span>ℹ️</span>
                      <span className="font-medium">About</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Active customer pill — desktop only */}
              {activeCustomer && (
                <Link
                  to={`/customers/${activeCustomer.id}`}
                  className="hidden md:flex items-center gap-1.5 text-xs text-white/90 bg-white/15 hover:bg-white/25 border border-white/30 px-2.5 py-1 rounded-full transition-colors max-w-[160px] xl:max-w-[200px]"
                  title={`Active: ${activeCustomer.master.name}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-300 inline-block flex-shrink-0 animate-pulse" />
                  <span className="truncate font-medium">{activeCustomer.master.name}</span>
                </Link>
              )}

              {/* Active customer dot — mobile only (compact) */}
              {activeCustomer && (
                <Link
                  to={`/customers/${activeCustomer.id}`}
                  className="md:hidden flex items-center gap-1 text-[11px] text-white/90 bg-white/15 border border-white/30 px-2 py-0.5 rounded-full max-w-[110px]"
                  title={`Active: ${activeCustomer.master.name}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-300 inline-block flex-shrink-0 animate-pulse" />
                  <span className="truncate font-medium">{activeCustomer.master.name}</span>
                </Link>
              )}

              {/* Logout button — desktop only */}
              {hasToken && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden md:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold text-slate-900 bg-white/90 hover:bg-amber-300 border border-white/70 shadow-sm transition-colors"
                >
                  Logout
                </button>
              )}

              {/* Hamburger — mobile only */}
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Toggle menu"
                className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 rounded-md hover:bg-white/20 transition-colors flex-shrink-0"
              >
                <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block w-5 h-0.5 bg-white transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile dropdown — scrollable, compact in landscape ── */}
        {menuOpen && (
          <div
            className="md:hidden border-t border-white/20 backdrop-blur-sm"
            style={{ background: '#0d1b3aF2' }}
          >
            {/*
              max-h: limits height so it never covers the whole screen.
              In portrait: up to 70vh. In landscape: up to 60vh (less vertical room).
              overflow-y-auto: enables scrolling when content overflows.
            */}
            <nav
              className="max-w-7xl mx-auto px-3 py-2 overflow-y-auto"
              style={{ maxHeight: 'min(70vh, 480px)' }}
            >
              {/* Nav links — 2-column grid in landscape, 1-column in portrait */}
              <div className="grid grid-cols-1 landscape:grid-cols-2 gap-1">
                {NAV.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      pathname === n.to
                        ? 'bg-white/30 text-white border border-white/40'
                        : 'text-white/90 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    {n.label}
                  </Link>
                ))}
              </div>

              {/* Help group — 3-column grid in landscape */}
              <div className="mt-1 pt-1 border-t border-white/20">
                <div className="grid grid-cols-1 landscape:grid-cols-3 gap-1">
                  <Link
                    to="/help"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      pathname === '/help'
                        ? 'bg-white/30 text-white border border-white/40'
                        : 'text-white/90 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <span>📘</span>
                    <span>User Guide</span>
                  </Link>
                  <button
                    onClick={() => { setMenuOpen(false); navigate(`${pathname}?showTip=1`); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white/90 hover:bg-white/20 hover:text-white transition-colors"
                  >
                    <span>💡</span>
                    <span>Tip of the Day</span>
                  </button>
                  <Link
                    to="/about"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      pathname === '/about'
                        ? 'bg-white/30 text-white border border-white/40'
                        : 'text-white/90 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <span>ℹ️</span>
                    <span>About</span>
                  </Link>
                </div>
              </div>
            </nav>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>

      <TipOfTheDay />
    </div>
  );
}
