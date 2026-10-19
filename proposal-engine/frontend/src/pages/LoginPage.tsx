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

/**
 * Matches the Rayenna CRM login card (Zenith dark): frosted navy panel, gold
 * left edge, gold Ver / Sign-in, same solar wallpaper. Values are local so PE
 * does not import CRM styles.
 */
const LOGIN = {
  page: '#0A0A0F',
  card: 'rgba(17, 17, 24, 0.95)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  gold: '#F5A623',
  goldBorder: 'rgba(245, 166, 35, 0.3)',
  teal: '#00D4B4',
  tealBorder: 'rgba(0, 212, 180, 0.3)',
  text: 'rgba(255, 255, 255, 0.75)',
  textActive: '#FFFFFF',
  textInverse: '#0A0A0F',
  inputBg: 'rgba(255, 255, 255, 0.05)',
  inputBorder: 'rgba(255, 255, 255, 0.12)',
  focusBorder: 'rgba(245, 166, 35, 0.5)',
  placeholder: 'rgba(255, 255, 255, 0.22)',
  shadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
  borderDefault: 'rgba(255, 255, 255, 0.09)',
} as const;

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

  const fieldCls =
    'block w-full rounded-xl px-3 py-2.5 shadow-inner transition-all focus:outline-none focus:ring-2 sm:text-sm';

  return (
    <div
      className="relative flex min-h-screen min-h-[100dvh] items-center justify-center overflow-auto py-12 px-4 sm:px-6 lg:px-8 [-webkit-tap-highlight-color:transparent]"
      style={{ backgroundColor: LOGIN.page }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/background.jpg)' }}
        aria-hidden
      />
      <div
        className="relative z-10 w-full max-w-md space-y-6 rounded-2xl border border-l-4 p-6 backdrop-blur-md sm:space-y-8 sm:p-8"
        style={{
          backgroundColor: LOGIN.card,
          borderColor: LOGIN.cardBorder,
          borderLeftColor: LOGIN.gold,
          color: LOGIN.textActive,
          boxShadow: LOGIN.shadow,
          outline: `1px solid ${LOGIN.borderDefault}`,
        }}
      >
        {apiNotConfigured && (
          <div
            className="mb-1 rounded-xl border p-3 text-sm"
            style={{
              borderColor: LOGIN.goldBorder,
              backgroundColor: 'color-mix(in srgb, #111118 88%, #F5A623 12%)',
              color: LOGIN.textActive,
            }}
          >
            <strong style={{ color: LOGIN.gold }}>API not configured.</strong> Set{' '}
            <code
              className="rounded px-1.5 py-0.5"
              style={{ backgroundColor: 'rgba(17, 17, 24, 0.85)', color: LOGIN.textActive }}
            >
              VITE_API_BASE_URL
            </code>{' '}
            in your deployment (Render: Static Site → Environment; Vercel: Settings → Environment
            Variables) to your backend URL (e.g.{' '}
            <code
              className="rounded px-1.5 py-0.5"
              style={{ backgroundColor: 'rgba(17, 17, 24, 0.85)', color: LOGIN.textActive }}
            >
              https://rayenna-crm.onrender.com
            </code>
            ), then <strong>redeploy</strong>. Login will not work until then.
          </div>
        )}

        {isProd && !apiNotConfigured && serverStatus === 'checking' && (
          <div
            className="mb-1 flex items-center gap-2 rounded-xl border p-3 text-sm"
            style={{
              borderColor: LOGIN.borderDefault,
              backgroundColor: 'rgba(17, 17, 24, 0.92)',
              color: LOGIN.text,
            }}
          >
            <svg
              className="h-4 w-4 shrink-0 animate-spin"
              style={{ color: LOGIN.gold }}
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
          <div
            className="mb-1 flex items-center gap-2 rounded-xl border p-3 text-sm"
            style={{
              borderColor: LOGIN.tealBorder,
              backgroundColor: 'color-mix(in srgb, #111118 88%, #00D4B4 12%)',
              color: LOGIN.textActive,
            }}
          >
            <svg
              className="h-4 w-4 shrink-0"
              style={{ color: LOGIN.teal }}
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
          <div
            className="mb-1 rounded-xl border p-3 text-sm"
            style={{
              borderColor: LOGIN.goldBorder,
              backgroundColor: 'color-mix(in srgb, #111118 88%, #F5A623 12%)',
              color: LOGIN.textActive,
            }}
          >
            Server is slow to respond (free-tier wake-up). Try signing in — it may succeed now, or
            wait a few more seconds and try again.
          </div>
        )}

        <div className="text-center">
          <div className="flex items-center justify-center px-2 pt-4 pb-0 sm:pt-6 sm:pb-0">
            <img
              src="/Proposals_Logo.jpg"
              alt="Rayenna Proposals"
              className="mx-auto h-36 max-h-[44vh] w-auto max-w-[85vw] object-contain drop-shadow-lg sm:h-40 md:h-44"
            />
          </div>
          <p
            className="mt-0.5 text-base font-semibold tracking-wide sm:mt-1 sm:text-lg"
            style={{ color: LOGIN.gold }}
          >
            Ver 2.0
          </p>
          <p className="mt-2 text-sm font-medium" style={{ color: LOGIN.text }}>
            Sign in to your account with your Rayenna CRM credentials
          </p>
        </div>

        {error && (
          <AlertCard variant="error" title="Login failed" message={error} />
        )}

        <form className="mt-6 space-y-4 sm:mt-8" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={fieldCls}
                style={{
                  backgroundColor: LOGIN.inputBg,
                  border: `1px solid ${LOGIN.inputBorder}`,
                  color: LOGIN.textActive,
                }}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = LOGIN.focusBorder;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${LOGIN.goldBorder}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = LOGIN.inputBorder;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={fieldCls}
                style={{
                  backgroundColor: LOGIN.inputBg,
                  border: `1px solid ${LOGIN.inputBorder}`,
                  color: LOGIN.textActive,
                }}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = LOGIN.focusBorder;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${LOGIN.goldBorder}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = LOGIN.inputBorder;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting || serverStatus === 'checking'}
              className="relative flex w-full justify-center rounded-xl py-3 px-4 text-sm font-extrabold transition-all hover:opacity-95 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: LOGIN.gold,
                color: LOGIN.textInverse,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
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
                  {elapsed > 10
                    ? `Waking server up… ${elapsed}s — please wait`
                    : 'Signing in…'}
                </span>
              ) : serverStatus === 'checking' ? (
                'Connecting to server…'
              ) : (
                'Sign in'
              )}
            </button>
            {submitting && elapsed > 5 && (
              <p className="mt-2 text-center text-xs" style={{ color: LOGIN.text }}>
                The server may be waking from sleep.{' '}
                <strong style={{ color: LOGIN.textActive }}>Please do not press the button again</strong>{' '}
                — your request is in progress.
              </p>
            )}
          </div>
        </form>

        <div className="text-center">
          <p className="text-xs" style={{ color: LOGIN.text }}>
            Forgot your Password? Contact your administrator
          </p>
        </div>

        <div className="border-t pt-6" style={{ borderColor: LOGIN.borderDefault }}>
          <p className="text-center text-xs leading-relaxed" style={{ color: LOGIN.text }}>
            By signing in, you acknowledge and agree to the Credits, Copyright, intellectual
            property and Terms of Usage of this product. Refer the About section to know more
          </p>
        </div>
      </div>
      <style>{`
        #email::placeholder, #password::placeholder {
          color: ${LOGIN.placeholder};
        }
      `}</style>
    </div>
  );
}
