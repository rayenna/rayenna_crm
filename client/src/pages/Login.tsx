import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiBaseUrl, isTimeoutOrNetworkError } from '../utils/axios'
import axios from 'axios'
import toast from 'react-hot-toast'

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

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundImage: 'url(/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="max-w-md w-full space-y-6 sm:space-y-8 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-white/20 border-l-4 border-l-primary-500">
        {apiNotConfigured && (
          <div className="mb-4 p-3 rounded-lg bg-amber-100 border border-amber-400 text-amber-900 text-sm">
            <strong>API not configured.</strong> Set <code className="bg-amber-200/60 px-1 rounded">VITE_API_BASE_URL</code> in your deployment (Render: Static Site → Environment; Vercel: Settings → Environment Variables) to your backend URL (e.g. <code className="bg-amber-200/60 px-1 rounded">https://rayenna-crm.onrender.com</code>), then <strong>redeploy</strong>. Login will not work until then.
          </div>
        )}

        {/* Server warm-up status banner */}
        {isProd && !apiNotConfigured && serverStatus === 'checking' && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 shrink-0 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span>Connecting to server — this can take up to 60 s after a period of inactivity. Please wait before signing in.</span>
          </div>
        )}
        {isProd && !apiNotConfigured && serverStatus === 'ready' && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            <span>Server is ready.</span>
          </div>
        )}
        {isProd && !apiNotConfigured && serverStatus === 'slow' && !isLoading && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            Server is slow to respond (free-tier wake-up). Try signing in — it may succeed now, or wait a few more seconds and try again.
          </div>
        )}
        <div className="text-center">
          <div className="flex justify-center items-center py-4 sm:py-6 px-2">
            <img 
              src="/CRM_Logo.jpg" 
              alt="Rayenna CRM" 
              className="h-36 sm:h-40 md:h-44 w-auto max-w-[85vw] object-contain mx-auto drop-shadow-lg"
            />
          </div>
          <p className="mt-2 text-sm font-medium text-gray-600">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-secondary-300 placeholder-secondary-400 text-secondary-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm bg-white"
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-secondary-300 placeholder-secondary-400 text-secondary-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm bg-white"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || serverStatus === 'checking'}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading
                ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    {elapsed > 10
                      ? `Waking server up… ${elapsed}s — please wait`
                      : 'Signing in…'}
                  </span>
                )
                : serverStatus === 'checking'
                  ? 'Connecting to server…'
                  : 'Sign in'}
            </button>
            {isLoading && elapsed > 5 && (
              <p className="mt-2 text-xs text-center text-gray-500">
                The server may be waking from sleep. <strong>Please do not press the button again</strong> — your request is in progress.
              </p>
            )}
          </div>
        </form>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-600">
            Forgot your Password? Contact your administrator
          </p>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            By signing in, you acknowledge and agree to the Credits, Copyright, intellectual property and Terms of Usage of this product. Refer the About section to know more
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
