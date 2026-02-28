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

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [health, setHealth]     = useState<HealthStatus | null>(null);
  const [error, setError]       = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    fetch('/health')
      .then((r) => r.json())
      .then((d: HealthStatus) => setHealth(d))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/60 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">

          {/* ── Brand ── */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              PE
            </div>
            <span className="text-white font-semibold tracking-tight text-sm sm:text-base">
              Proposal Engine
            </span>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full hidden md:inline">
              v1.0.0 · dev
            </span>
          </div>

          {/* ── Desktop nav (hidden on mobile) ── */}
          <nav className="hidden md:flex items-center gap-1 mx-4 flex-1 justify-center">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap ${
                  pathname === n.to
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* ── Health pill (hidden on xs) ── */}
            <div className="hidden sm:flex items-center">
              {error ? (
                <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/50 border border-red-800 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                  Offline
                </span>
              ) : health ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span className="hidden lg:inline">{health.message}</span>
                  <span className="lg:hidden">Live</span>
                </span>
              ) : (
                <span className="text-xs text-gray-500 animate-pulse">…</span>
              )}
            </div>

            {/* ── Hamburger (visible on mobile only) ── */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
              className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 rounded-md hover:bg-gray-800 transition-colors"
            >
              <span className={`block w-5 h-0.5 bg-gray-300 transition-transform duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-gray-300 transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-gray-300 transition-transform duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown menu ── */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm">
            <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    pathname === n.to
                      ? 'bg-gray-800 text-white font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  {n.label}
                </Link>
              ))}
              {/* Health status in mobile menu */}
              <div className="mt-2 pt-2 border-t border-gray-800">
                {error ? (
                  <p className="text-xs text-red-400 px-4">Backend offline</p>
                ) : health ? (
                  <p className="text-xs text-emerald-400 px-4 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    {health.message}
                  </p>
                ) : null}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
