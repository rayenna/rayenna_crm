import { FormEvent, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  clearToken,
  getApiBaseUrl,
  HEALTH_CHECK_TIMEOUT_MS,
  isTimeoutOrNetworkError,
  loginWithEmailPassword,
  setToken,
  setUserId,
  setUserRole,
  setUserName,
} from '../lib/apiClient';
import { AlertCard } from '../components/AlertCard';

const bgImageUrl = new URL('../assets/background.jpg', import.meta.url).href;

const isProd = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');

type ServerStatus = 'checking' | 'ready' | 'slow' | 'unknown';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromLocation = (location.state as any)?.from;
  const from =
    fromLocation && fromLocation.pathname && fromLocation.pathname !== '/login'
      ? `${fromLocation.pathname}${fromLocation.search ?? ''}`
      : '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus>('unknown');
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const apiBaseUrl = getApiBaseUrl();
  const apiNotConfigured = isProd && !apiBaseUrl;

  // Pre-warm the backend as soon as the login page loads (same as CRM).
  useEffect(() => {
    if (!apiBaseUrl || !isProd) return;
    let mounted = true;
    setServerStatus('checking');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
    const url = `${apiBaseUrl}/api/health`;
    fetch(url, { signal: controller.signal })
      .then(() => {
        clearTimeout(timeoutId);
        if (mounted) setServerStatus('ready');
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (!mounted) return;
        if (err?.name === 'AbortError') {
          setServerStatus('slow');
          return;
        }
        setServerStatus('slow');
      });
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, []);

  const startElapsedCounter = () => {
    setElapsed(0);
    elapsedRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  };

  const stopElapsedCounter = () => {
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
    setElapsed(0);
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password || submitting) return;

    setSubmitting(true);
    setError(null);
    startElapsedCounter();

    try {
      clearToken();
      const result = await loginWithEmailPassword(email, password);
      stopElapsedCounter();
      setToken(result.token);
      setUserId(result.user.id);
      setUserRole(result.user.role);
      setUserName(result.user.name || result.user.email);
      navigate(from, { replace: true });
    } catch (err: any) {
      stopElapsedCounter();
      const fallback =
        typeof window !== 'undefined' && window.location.hostname.includes('localhost')
          ? 'Cannot reach API. Start backend and frontend: run "npm run dev" from the project root (backend on :3000, frontend on :5174).'
          : isTimeoutOrNetworkError(err)
            ? 'Server took too long to respond. It may still be waking up — please try again.'
            : 'Cannot reach API. Set VITE_API_BASE_URL, redeploy static site, ensure backend is live.';
      const msg = err?.response?.data?.error ?? (err?.response ? 'Login failed' : fallback);
      setError(msg);
      setServerStatus('slow');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-900/70 bg-blend-multiply"
      style={{
        backgroundImage: `url(${bgImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-2xl border border-slate-200 px-6 py-6 sm:py-8 space-y-6">
        {apiNotConfigured && (
          <div className="mb-4 p-3 rounded-lg bg-amber-100 border border-amber-400 text-amber-900 text-sm">
            <strong>API not configured.</strong> Set{' '}
            <code className="bg-amber-200/60 px-1 rounded">VITE_API_BASE_URL</code> in your
            deployment (Render: Static Site → Environment; Vercel: Settings → Environment Variables)
            to your backend URL (e.g.{' '}
            <code className="bg-amber-200/60 px-1 rounded">https://rayenna-crm.onrender.com</code>),
            then <strong>redeploy</strong>. Login will not work until then.
          </div>
        )}

        {/* Server warm-up status banner — same messages as CRM */}
        {isProd && !apiNotConfigured && serverStatus === 'checking' && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 shrink-0 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span>
              Connecting to server — this can take up to 60 s after a period of inactivity. Please
              wait before signing in.
            </span>
          </div>
        )}
        {isProd && !apiNotConfigured && serverStatus === 'ready' && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Server is ready.</span>
          </div>
        )}
        {isProd && !apiNotConfigured && serverStatus === 'slow' && !submitting && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            Server is slow to respond (free-tier wake-up). Try signing in — it may succeed now, or
            wait a few more seconds and try again.
          </div>
        )}

        <header className="space-y-3 text-center">
          <div className="flex justify-center items-center py-4 sm:py-6 px-2">
            <img
              src="/Proposals_Logo.jpg"
              alt="Proposal Engine"
              className="h-36 sm:h-40 md:h-44 w-auto max-w-[85vw] object-contain mx-auto drop-shadow-lg"
            />
          </div>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Sign in with your existing Rayenna CRM credentials.
          </p>
        </header>

        {error && (
          <AlertCard variant="error" title="Login failed" message={error} />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Work email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:ring-offset-0 outline-none"
              placeholder="you@rayenna.in"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-400 focus:ring-offset-0 outline-none"
              placeholder="Enter your password"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting || !email || !password || serverStatus === 'checking'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-md hover:bg-amber-400 disabled:bg-amber-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  {elapsed > 10 ? `Waking server up… ${elapsed}s — please wait` : 'Signing in…'}
                </>
              ) : serverStatus === 'checking' ? (
                'Connecting to server…'
              ) : (
                'Sign in'
              )}
            </button>
            {submitting && elapsed > 5 && (
              <p className="mt-2 text-xs text-center text-slate-500">
                The server may be waking from sleep.{' '}
                <strong>Please do not press the button again</strong> — your request is in progress.
              </p>
            )}
          </div>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-slate-600">
            Forgot your Password? Contact your administrator
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            By signing in, you acknowledge and agree to the Credits, Copyright, intellectual
            property and Terms of Usage of this product. Refer the About section to know more
          </p>
        </div>
      </div>
    </div>
  );
}
