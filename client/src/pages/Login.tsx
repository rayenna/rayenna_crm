import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiBaseUrl, getFriendlyApiErrorMessage, isTimeoutOrNetworkError } from '../utils/axios'
import axios from 'axios'
import toast from 'react-hot-toast'
import '../styles/zenith.css'
import { CRM_DEFAULT_HOME } from '../constants/defaultHomeRoute'
import { ServerWakeupLoader } from '../components/serverWakeup'

/**
 * Set to false to restore the previous inline wake-up banners on Login
 * (and skip ServerWakeupLoader). Prefer git revert of this file +
 * client/src/components/serverWakeup/ if you want a full rollback.
 */
const USE_SERVER_WAKEUP_LOADER = true

/** Local preview: /login?wakeup=1 simulates a cold boot for this long after Sign in. */
const PREVIEW_COLD_MS = 15_000

/** How long to wait for a health probe before treating the API as cold. */
const HEALTH_PROBE_MS = 3_000

/** iOS Safari may discard the tab during a long wake; restore auto-login from here. */
const PENDING_WAKE_KEY = 'rayenna_crm_pending_wake_login'
const PENDING_WAKE_MAX_AGE_MS = 10 * 60 * 1000

const isProd = typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
const apiNotConfigured = isProd && !apiBaseUrl

/** Open /login?wakeup=1 → enter credentials → Sign in → 15s animation → auto-enter app. */
const forceWakeupPreview =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('wakeup') === '1'

function readPendingWake(): { email: string; password: string } | null {
  try {
    const raw = sessionStorage.getItem(PENDING_WAKE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { email?: string; password?: string; at?: number }
    if (!parsed?.email || !parsed?.password || typeof parsed.at !== 'number') {
      sessionStorage.removeItem(PENDING_WAKE_KEY)
      return null
    }
    if (Date.now() - parsed.at > PENDING_WAKE_MAX_AGE_MS) {
      sessionStorage.removeItem(PENDING_WAKE_KEY)
      return null
    }
    return { email: parsed.email, password: parsed.password }
  } catch {
    return null
  }
}

function writePendingWake(creds: { email: string; password: string }) {
  try {
    sessionStorage.setItem(
      PENDING_WAKE_KEY,
      JSON.stringify({ email: creds.email, password: creds.password, at: Date.now() }),
    )
  } catch {
    /* ignore quota */
  }
}

function clearPendingWake() {
  try {
    sessionStorage.removeItem(PENDING_WAKE_KEY)
  } catch {
    /* ignore */
  }
}

type ServerStatus = 'checking' | 'ready' | 'slow' | 'unknown'

async function probeHealthOk(baseUrl: string, timeoutMs = HEALTH_PROBE_MS): Promise<boolean> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/health`
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal, cache: 'no-store' })
    return res.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}

function credentialsFromSubmit(
  form: HTMLFormElement,
  stateEmail: string,
  statePassword: string,
): { email: string; password: string } {
  // iOS Chrome/Safari autofill often fills the DOM without firing React onChange.
  const fd = new FormData(form)
  const email = String(fd.get('email') ?? stateEmail).trim()
  const password = String(fd.get('password') ?? statePassword)
  return { email, password }
}

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [serverStatus, setServerStatus] = useState<ServerStatus>('unknown')
  /** When set, wake overlay is up and we will auto-login with these creds once API is live. */
  const [pendingWakeLogin, setPendingWakeLogin] = useState<{
    email: string
    password: string
  } | null>(null)
  /** Remount wake loader to resume health polling after a flaky auto-login. */
  const [wakeEpoch, setWakeEpoch] = useState(0)
  const { login } = useAuth()
  const navigate = useNavigate()
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoLoginInFlight = useRef(false)
  const submitLockRef = useRef(false)

  const showWakeupLoader = USE_SERVER_WAKEUP_LOADER && pendingWakeLogin != null
  const pendingWakeRef = useRef<{ email: string; password: string } | null>(null)

  // Resume wake auto-login if iOS discarded the tab mid-animation.
  useEffect(() => {
    if (!USE_SERVER_WAKEUP_LOADER) return
    const saved = readPendingWake()
    if (!saved) return
    pendingWakeRef.current = saved
    setEmail(saved.email)
    setPassword(saved.password)
    setPendingWakeLogin(saved)
    setIsLoading(true)
    submitLockRef.current = true
  }, [])

  // Legacy pre-warm only (USE_SERVER_WAKEUP_LOADER false).
  useEffect(() => {
    if (USE_SERVER_WAKEUP_LOADER) return
    if (!apiBaseUrl || !isProd) return
    let mounted = true
    setServerStatus('checking')
    const controller = new AbortController()
    axios
      .get(`${apiBaseUrl}/api/health`, { signal: controller.signal, timeout: 90_000 })
      .then(() => {
        if (mounted) setServerStatus('ready')
      })
      .catch((err) => {
        if (!mounted) return
        if (axios.isCancel(err) || err?.code === 'ERR_CANCELED') return
        setServerStatus('slow')
      })
    return () => {
      mounted = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
  }, [])

  const startElapsedCounter = () => {
    setElapsed(0)
    elapsedRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
  }

  const stopElapsedCounter = () => {
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current)
      elapsedRef.current = null
    }
    setElapsed(0)
  }

  const finishLoginSuccess = () => {
    stopElapsedCounter()
    clearPendingWake()
    pendingWakeRef.current = null
    setPendingWakeLogin(null)
    setIsLoading(false)
    submitLockRef.current = false
    toast.success('Login successful')
    navigate(CRM_DEFAULT_HOME)
  }

  const failLogin = (message: string) => {
    stopElapsedCounter()
    clearPendingWake()
    pendingWakeRef.current = null
    setPendingWakeLogin(null)
    setIsLoading(false)
    submitLockRef.current = false
    toast.error(message)
    setServerStatus('slow')
  }

  const isWrongCredentialsError = (error: unknown): boolean => {
    const status = (error as { response?: { status?: number } })?.response?.status
    return status === 401 || status === 400
  }

  const completeLoginWithCredentials = async (creds: { email: string; password: string }) => {
    if (autoLoginInFlight.current) return
    autoLoginInFlight.current = true
    try {
      await login(creds.email, creds.password)
      finishLoginSuccess()
    } catch (error: unknown) {
      autoLoginInFlight.current = false
      // After the wake animation turns green, never bounce back to the form unless
      // credentials are actually wrong. Health can be up while DB/routes still fail (500 etc).
      if (isWrongCredentialsError(error)) {
        failLogin('Incorrect email or password. Please try again.')
        return
      }
      window.setTimeout(() => setWakeEpoch((n) => n + 1), 1500)
    }
  }

  const handleWakeReady = () => {
    const creds = pendingWakeRef.current ?? pendingWakeLogin ?? readPendingWake()
    if (!creds?.email || !creds?.password) {
      // Keep overlay; remount so we do not silently drop back to the form on iPhone.
      window.setTimeout(() => setWakeEpoch((n) => n + 1), 1500)
      return
    }
    void completeLoginWithCredentials(creds)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (submitLockRef.current || showWakeupLoader) return

    const creds = credentialsFromSubmit(e.currentTarget, email, password)
    if (!creds.email || !creds.password) {
      toast.error('Enter your email and password to sign in.')
      return
    }
    // Keep controlled inputs in sync with autofill for later wake auto-login.
    setEmail(creds.email)
    setPassword(creds.password)

    submitLockRef.current = true
    setIsLoading(true)
    startElapsedCounter()
    autoLoginInFlight.current = false

    const beginWake = (c: { email: string; password: string }) => {
      pendingWakeRef.current = c
      writePendingWake(c)
      setPendingWakeLogin(c)
      setWakeEpoch((n) => n + 1)
    }

    // Local preview: keep credentials, animate 15s, then auto-login.
    if (USE_SERVER_WAKEUP_LOADER && forceWakeupPreview) {
      beginWake(creds)
      return
    }

    // Production: probe health FIRST. If Render is cold / still mounting routes,
    // show the wake animation immediately (do not sit on the old 90s login spinner).
    if (USE_SERVER_WAKEUP_LOADER && isProd && apiBaseUrl) {
      const awake = await probeHealthOk(apiBaseUrl, HEALTH_PROBE_MS)
      if (!awake) {
        beginWake(creds)
        return
      }
    }

    try {
      await login(creds.email, creds.password)
      finishLoginSuccess()
    } catch (error: unknown) {
      // Wrong password only → show form. Everything else on prod → keep wake UI.
      if (isWrongCredentialsError(error)) {
        failLogin('Incorrect email or password. Please try again.')
        return
      }

      if (USE_SERVER_WAKEUP_LOADER && isProd && apiBaseUrl) {
        beginWake(creds)
        return
      }

      const msg =
        typeof window !== 'undefined' && window.location.hostname.includes('localhost')
          ? 'Cannot reach API. Start backend and frontend: run "npm run dev" from the project root (backend on :3000, frontend on :5173).'
          : isTimeoutOrNetworkError(error)
            ? 'Server took too long to respond. It may still be waking up — please try again.'
            : getFriendlyApiErrorMessage(error)
      failLogin(msg)
    }
  }

  const fieldCls =
    'block w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-[color:var(--text-primary)] placeholder:text-[color:var(--text-placeholder)] shadow-inner transition-all focus:border-[color:var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-border)] sm:text-sm'

  const signInBlocked = isLoading || showWakeupLoader

  return (
    <div
      className="relative flex h-full min-h-0 items-center justify-center overflow-y-auto overscroll-none bg-[color:var(--bg-page)] py-12 px-4 sm:px-6 lg:px-8 [-webkit-tap-highlight-color:transparent] [touch-action:pan-y]"
      style={{
        paddingTop: 'max(3rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(3rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      {showWakeupLoader && pendingWakeLogin ? (
        <ServerWakeupLoader
          key={wakeEpoch}
          apiUrl={apiBaseUrl}
          healthEndpoint="/api/health"
          appMode="crm"
          initialDelayMs={0}
          previewDelayMs={forceWakeupPreview ? PREVIEW_COLD_MS : 0}
          onReady={handleWakeReady}
        />
      ) : null}

      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/background.jpg)' }}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md space-y-6 rounded-2xl border border-[color:var(--nav-border)] border-l-4 border-l-[color:var(--accent-gold)] bg-[color:color-mix(in_srgb,var(--nav-bg)_95%,transparent)] p-6 text-[color:var(--nav-text-active)] shadow-[var(--shadow-modal)] ring-1 ring-[color:var(--border-default)] backdrop-blur-md sm:space-y-8 sm:p-8">
        {apiNotConfigured && (
          <div className="mb-1 rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:color-mix(in_srgb,var(--nav-bg)_88%,var(--accent-gold)_12%)] p-3 text-sm text-[color:var(--nav-text-active)]">
            <strong className="text-[color:var(--accent-gold)]">API not configured.</strong> Set{' '}
            <code className="rounded bg-[color:color-mix(in_srgb,var(--nav-bg)_85%,transparent)] px-1.5 py-0.5 text-[color:var(--nav-text-active)]">
              VITE_API_BASE_URL
            </code>{' '}
            in your deployment (Render: Static Site → Environment; Vercel: Settings → Environment
            Variables) to your backend URL (e.g.{' '}
            <code className="rounded bg-[color:color-mix(in_srgb,var(--nav-bg)_85%,transparent)] px-1.5 py-0.5 text-[color:var(--nav-text-active)]">
              https://rayenna-crm.onrender.com
            </code>
            ), then <strong>redeploy</strong>. Login will not work until then.
          </div>
        )}

        {!USE_SERVER_WAKEUP_LOADER && isProd && !apiNotConfigured && serverStatus === 'checking' && (
          <div className="mb-1 flex items-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:color-mix(in_srgb,var(--nav-bg)_92%,transparent)] p-3 text-sm text-[color:var(--nav-text)]">
            <svg
              className="h-4 w-4 shrink-0 animate-spin text-[color:var(--accent-gold)]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span>
              Connecting to server — this can take up to 60 s after a period of inactivity. Please wait
              before signing in.
            </span>
          </div>
        )}
        {!USE_SERVER_WAKEUP_LOADER && isProd && !apiNotConfigured && serverStatus === 'ready' && (
          <div className="mb-1 flex items-center gap-2 rounded-xl border border-[color:var(--accent-teal-border)] bg-[color:color-mix(in_srgb,var(--nav-bg)_88%,var(--accent-teal)_12%)] p-3 text-sm text-[color:var(--nav-text-active)]">
            <svg
              className="h-4 w-4 shrink-0 text-[color:var(--accent-teal)]"
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
        {( !USE_SERVER_WAKEUP_LOADER || isProd ) &&
          !apiNotConfigured &&
          serverStatus === 'slow' &&
          !isLoading &&
          !showWakeupLoader && (
            <div className="mb-1 rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:color-mix(in_srgb,var(--nav-bg)_88%,var(--accent-gold)_12%)] p-3 text-sm text-[color:var(--nav-text-active)]">
              Server is slow to respond (free-tier wake-up). Try signing in — it may succeed now, or wait
              a few more seconds and try again.
            </div>
          )}

        <div className="text-center">
          <div className="flex items-center justify-center px-2 pb-0 pt-4 sm:pb-0 sm:pt-6">
            <img
              src="/CRM_Logo.jpg"
              alt="Rayenna CRM"
              className="mx-auto h-36 max-h-[44vh] w-auto max-w-[85vw] object-contain drop-shadow-lg sm:h-40 md:h-44"
            />
          </div>
          <p className="mt-0.5 text-base font-semibold tracking-wide text-[color:var(--accent-gold)] sm:mt-1 sm:text-lg">
            Ver 2.0
          </p>
          <p className="mt-2 text-sm font-medium text-[color:var(--nav-text)]">Sign in to your account</p>
        </div>
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
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                required
                className={fieldCls}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={signInBlocked}
              className="relative flex w-full justify-center rounded-xl bg-[color:var(--accent-gold)] px-4 py-3 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-[var(--shadow-card)] transition-all hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading || showWakeupLoader ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  {showWakeupLoader
                    ? 'Waking server… signing you in'
                    : elapsed > 10
                      ? `Waking server up… ${elapsed}s — please wait`
                      : 'Signing in…'}
                </span>
              ) : (
                'Sign in'
              )}
            </button>
            {isLoading && !showWakeupLoader && elapsed > 5 && (
              <p className="mt-2 text-center text-xs text-[color:var(--nav-text)]">
                The server may be waking from sleep.{' '}
                <strong className="text-[color:var(--nav-text-active)]">
                  Please do not press the button again
                </strong>{' '}
                — your request is in progress.
              </p>
            )}
          </div>
        </form>

        <div className="text-center">
          <p className="text-xs text-[color:var(--nav-text)]">
            Forgot your Password? Contact your administrator
          </p>
        </div>

        <div className="border-t border-[color:var(--border-default)] pt-6">
          <p className="text-center text-xs leading-relaxed text-[color:var(--nav-text)]">
            By signing in, you acknowledge and agree to the Credits, Copyright, intellectual property and
            Terms of Usage of this product. Refer the About section to know more
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
