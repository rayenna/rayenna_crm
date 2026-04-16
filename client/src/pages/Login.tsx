import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiBaseUrl, isTimeoutOrNetworkError } from '../utils/axios'
import axios from 'axios'
import toast from 'react-hot-toast'
import '../styles/zenith.css'

const isProd = typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
const apiNotConfigured = isProd && !apiBaseUrl

type ServerStatus = 'checking' | 'ready' | 'slow' | 'unknown'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [serverStatus, setServerStatus] = useState<ServerStatus>('unknown')
  const { login } = useAuth()
  const navigate = useNavigate()
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Pre-warm the backend as soon as the login page loads.
  // Guard against setting state after unmount (abort fires the catch).
  useEffect(() => {
    if (!apiBaseUrl || !isProd) return
    let mounted = true
    setServerStatus('checking')
    const controller = new AbortController()
    axios
      .get(`${apiBaseUrl}/api/health`, { signal: controller.signal, timeout: 90_000 })
      .then(() => { if (mounted) setServerStatus('ready') })
      .catch((err) => {
        if (!mounted) return
        // AbortError means the component unmounted — not a real failure
        if (axios.isCancel(err) || err?.code === 'ERR_CANCELED') return
        setServerStatus('slow')
      })
    return () => {
      mounted = false
      controller.abort()
    }
  }, [])

  // Clean up the elapsed interval on unmount (e.g. if user navigates away mid-login)
  useEffect(() => {
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
  }, [])

  const startElapsedCounter = () => {
    setElapsed(0)
    elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
  }

  const stopElapsedCounter = () => {
    if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null }
    setElapsed(0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    startElapsedCounter()

    try {
      await login(email, password)
      stopElapsedCounter()
      toast.success('Login successful')
      navigate('/dashboard')
    } catch (error: unknown) {
      stopElapsedCounter()
      const err = error as { response?: { data?: { error?: string }; status?: number } }
      const fallback = typeof window !== 'undefined' && window.location.hostname.includes('localhost')
        ? 'Cannot reach API. Start backend and frontend: run "npm run dev" from the project root (backend on :3000, frontend on :5173).'
        : isTimeoutOrNetworkError(error)
          ? 'Server took too long to respond. It may still be waking up — please try again.'
          : 'Cannot reach API. Set VITE_API_BASE_URL, redeploy static site, ensure backend is live.'
      const msg = err?.response?.data?.error ?? (err?.response ? 'Login failed' : fallback)
      toast.error(msg)
      setServerStatus('slow')
    } finally {
      setIsLoading(false)
    }
  }

  const fieldCls =
    'block w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-[color:var(--text-primary)] placeholder:text-[color:var(--text-placeholder)] shadow-inner transition-all focus:border-[color:var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-border)] sm:text-sm'

  return (
    <div
      className="relative flex min-h-screen min-h-[100dvh] items-center justify-center overflow-auto bg-[color:var(--bg-page)] py-12 px-4 sm:px-6 lg:px-8 [-webkit-tap-highlight-color:transparent]"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/background.jpg)' }}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md space-y-6 rounded-2xl border border-[color:var(--nav-border)] border-l-4 border-l-[color:var(--accent-gold)] bg-[color:color-mix(in_srgb,var(--nav-bg)_95%,transparent)] p-6 text-[color:var(--nav-text-active)] shadow-[var(--shadow-modal)] ring-1 ring-[color:var(--border-default)] backdrop-blur-md sm:space-y-8 sm:p-8">
        {apiNotConfigured && (
          <div className="mb-1 rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:color-mix(in_srgb,var(--nav-bg)_88%,var(--accent-gold)_12%)] p-3 text-sm text-[color:var(--nav-text-active)]">
            <strong className="text-[color:var(--accent-gold)]">API not configured.</strong> Set{' '}
            <code className="rounded bg-[color:color-mix(in_srgb,var(--nav-bg)_85%,transparent)] px-1.5 py-0.5 text-[color:var(--nav-text-active)]">VITE_API_BASE_URL</code> in your deployment (Render: Static Site → Environment; Vercel: Settings → Environment Variables) to your backend URL (e.g.{' '}
            <code className="rounded bg-[color:color-mix(in_srgb,var(--nav-bg)_85%,transparent)] px-1.5 py-0.5 text-[color:var(--nav-text-active)]">https://rayenna-crm.onrender.com</code>), then <strong>redeploy</strong>. Login will not work until then.
          </div>
        )}

        {isProd && !apiNotConfigured && serverStatus === 'checking' && (
          <div className="mb-1 flex items-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:color-mix(in_srgb,var(--nav-bg)_92%,transparent)] p-3 text-sm text-[color:var(--nav-text)]">
            <svg className="h-4 w-4 shrink-0 animate-spin text-[color:var(--accent-gold)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span>Connecting to server — this can take up to 60 s after a period of inactivity. Please wait before signing in.</span>
          </div>
        )}
        {isProd && !apiNotConfigured && serverStatus === 'ready' && (
          <div className="mb-1 flex items-center gap-2 rounded-xl border border-[color:var(--accent-teal-border)] bg-[color:color-mix(in_srgb,var(--nav-bg)_88%,var(--accent-teal)_12%)] p-3 text-sm text-[color:var(--nav-text-active)]">
            <svg className="h-4 w-4 shrink-0 text-[color:var(--accent-teal)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Server is ready.</span>
          </div>
        )}
        {isProd && !apiNotConfigured && serverStatus === 'slow' && !isLoading && (
          <div className="mb-1 rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:color-mix(in_srgb,var(--nav-bg)_88%,var(--accent-gold)_12%)] p-3 text-sm text-[color:var(--nav-text-active)]">
            Server is slow to respond (free-tier wake-up). Try signing in — it may succeed now, or wait a few more seconds and try again.
          </div>
        )}
        <div className="text-center">
          <div className="flex items-center justify-center px-2 pt-4 pb-0 sm:pt-6 sm:pb-0">
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
                autoComplete="email"
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
              disabled={isLoading || serverStatus === 'checking'}
              className="relative flex w-full justify-center rounded-xl bg-[color:var(--accent-gold)] py-3 px-4 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-[var(--shadow-card)] transition-all hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  {elapsed > 10 ? `Waking server up… ${elapsed}s — please wait` : 'Signing in…'}
                </span>
              ) : serverStatus === 'checking' ? (
                'Connecting to server…'
              ) : (
                'Sign in'
              )}
            </button>
            {isLoading && elapsed > 5 && (
              <p className="mt-2 text-center text-xs text-[color:var(--nav-text)]">
                The server may be waking from sleep. <strong className="text-[color:var(--nav-text-active)]">Please do not press the button again</strong> — your request is in progress.
              </p>
            )}
          </div>
        </form>

        <div className="text-center">
          <p className="text-xs text-[color:var(--nav-text)]">Forgot your Password? Contact your administrator</p>
        </div>

        <div className="border-t border-[color:var(--border-default)] pt-6">
          <p className="text-center text-xs leading-relaxed text-[color:var(--nav-text)]">
            By signing in, you acknowledge and agree to the Credits, Copyright, intellectual property and Terms of Usage of this product. Refer the About section to know more
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
