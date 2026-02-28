import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

type HealthStatus = { status: string; message: string };

const NAV = [
  { label: 'Dashboard',     to: '/'         },
  { label: 'Costing Sheet', to: '/costing'  },
  { label: 'BOM',           to: '/bom'      },
  { label: 'ROI',           to: '/roi'      },
  { label: 'Proposal',      to: '/proposal' },
];

/* Exact gradient used by the CRM navbar */
const NAV_GRADIENT = 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)';
/* CRM active link: bg-white/30 = rgba(255,255,255,0.30) */
const ACTIVE_LINK  = 'bg-white/30 text-white shadow-md font-bold border-2 border-white/40';
const IDLE_LINK    = 'text-white hover:bg-white/20 hover:text-white';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [health, setHealth]     = useState<HealthStatus | null>(null);
  const [error, setError]       = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    fetch('/health')
      .then((r) => r.json())
      .then((d: HealthStatus) => setHealth(d))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/80">

      {/* ── Navbar — pixel-perfect match to CRM ── */}
      <nav
        style={{ background: NAV_GRADIENT }}
        className="shadow-lg border-b-4 border-primary-400 sticky top-0 z-20"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex items-center justify-between h-20 gap-2">

            {/* Brand */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-9 h-9 rounded-lg bg-white/25 border border-white/40 flex items-center justify-center text-white font-bold text-xs shadow-lg">
                PE
              </div>
              <span className="text-white font-bold tracking-tight text-sm sm:text-base drop-shadow">
                Proposal Engine
              </span>
              <span className="text-[10px] text-white/70 bg-white/10 border border-white/20 px-2 py-0.5 rounded-full hidden md:inline">
                v1.0 · dev
              </span>
            </div>

            {/* Desktop nav */}
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
            </div>

            <div className="flex items-center gap-3">
              {/* Health pill */}
              <div className="hidden sm:flex items-center">
                {error ? (
                  <span className="flex items-center gap-1.5 text-xs text-red-200 bg-red-900/40 border border-red-300/30 px-3 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-300 inline-block" />
                    <span className="hidden lg:inline">Offline</span>
                  </span>
                ) : health ? (
                  <span className="flex items-center gap-1.5 text-xs text-white/90 bg-white/20 border border-white/30 px-3 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse inline-block" />
                    <span className="hidden lg:inline">{health.message}</span>
                    <span className="lg:hidden">Live</span>
                  </span>
                ) : (
                  <span className="text-xs text-white/50 animate-pulse">…</span>
                )}
              </div>

              {/* Hamburger — mobile only */}
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Toggle menu"
                className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 rounded-md hover:bg-white/20 transition-colors"
              >
                <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block w-5 h-0.5 bg-white transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div
            className="md:hidden border-t border-white/20 backdrop-blur-sm"
            style={{ background: '#0d1b3aF2' }}
          >
            <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    pathname === n.to
                      ? 'bg-white/30 text-white border border-white/40'
                      : 'text-white/90 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {n.label}
                </Link>
              ))}
              <div className="mt-2 pt-2 border-t border-white/20">
                {error ? (
                  <p className="text-xs text-red-200 px-4">Backend offline</p>
                ) : health ? (
                  <p className="text-xs text-white/80 px-4 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse inline-block" />
                    {health.message}
                  </p>
                ) : null}
              </div>
            </nav>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
