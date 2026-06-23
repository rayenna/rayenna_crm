import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import axiosInstance, {
  CONSUMER_TOKEN_KEY,
  setConsumerAuthToken,
} from '@/utils/axios'
import type { ConsumerAuthResponse, ConsumerUser } from '@/types'

const IDLE_TIMEOUT_MS = 10 * 60 * 1000
const WARNING_BEFORE_MS = 60 * 1000

interface AuthContextType {
  user: ConsumerUser | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<ConsumerUser | null>(null)
  const [token, setToken] = useState<string | null>(() => {
    const stored = sessionStorage.getItem(CONSUMER_TOKEN_KEY)
    if (stored) setConsumerAuthToken(stored)
    return stored
  })
  const [isLoading, setIsLoading] = useState(() => Boolean(sessionStorage.getItem(CONSUMER_TOKEN_KEY)))
  const [showIdleWarning, setShowIdleWarning] = useState(false)
  const [idleCountdown, setIdleCountdown] = useState(60)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearAuth = useCallback(() => {
    setToken(null)
    setUser(null)
    sessionStorage.removeItem(CONSUMER_TOKEN_KEY)
    setConsumerAuthToken(null)
    queryClient.clear()
  }, [queryClient])

  const logout = useCallback(() => {
    clearAuth()
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    setShowIdleWarning(false)
  }, [clearAuth])

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    setShowIdleWarning(false)
    setIdleCountdown(60)

    if (!sessionStorage.getItem(CONSUMER_TOKEN_KEY)) return

    warningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true)
      setIdleCountdown(60)
      countdownRef.current = setInterval(() => {
        setIdleCountdown((c) => (c <= 1 ? 0 : c - 1))
      }, 1000)
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS)

    idleTimerRef.current = setTimeout(() => {
      logout()
    }, IDLE_TIMEOUT_MS)
  }, [logout])

  useEffect(() => {
    if (!token) return

    axiosInstance
      .get<ConsumerUser>('/api/consumer/auth/me')
      .then((res) => {
        setUser(res.data)
        resetIdleTimer()
      })
      .catch(() => {
        clearAuth()
      })
      .finally(() => setIsLoading(false))
  }, [clearAuth, resetIdleTimer, token])

  useEffect(() => {
    if (!token) return

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const
    const onActivity = () => resetIdleTimer()
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    queueMicrotask(() => resetIdleTimer())

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [token, resetIdleTimer])

  const login = async (username: string, password: string) => {
    const { data } = await axiosInstance.post<ConsumerAuthResponse>('/api/consumer/auth/login', {
      username,
      password,
    })
    sessionStorage.setItem(CONSUMER_TOKEN_KEY, data.token)
    setConsumerAuthToken(data.token)
    setToken(data.token)
    setUser(data.user)
    resetIdleTimer()
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
      {showIdleWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--bg-overlay)] p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-modal)] p-6 shadow-[var(--shadow-modal)]">
            <h2 className="zenith-display text-lg font-semibold text-[color:var(--text-primary)]">
              Session expiring
            </h2>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              You will be logged out in {idleCountdown} seconds due to inactivity.
            </p>
            <button
              type="button"
              onClick={resetIdleTimer}
              className="mt-4 w-full rounded-xl bg-[color:var(--accent-gold)] py-2.5 text-sm font-bold text-[color:var(--text-inverse)]"
            >
              Stay signed in
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  )
}
