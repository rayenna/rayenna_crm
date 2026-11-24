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
  clearConsumerToken,
  persistConsumerToken,
  readConsumerToken,
  setConsumerAuthToken,
  apiBaseUrl,
} from '@/utils/axios'
import { unsubscribeHubPush } from '@/utils/hubPush'
import { isHubProdApiConfigured, probeHubHealthOk } from '@/utils/hubHealth'
import { ServerWakeupLoader } from '@/components/serverWakeup'
import type { ConsumerAuthResponse, ConsumerUser } from '@/types'

/** Local preview: with a saved session, `/?wakeup=1` forces the wake animation for 15s. */
const PREVIEW_COLD_MS = 15_000
function isWakeupPreview(): boolean {
  return (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('wakeup') === '1'
  )
}

interface AuthContextType {
  user: ConsumerUser | null
  token: string | null
  login: (username: string, password: string, remember?: boolean) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

type MeResult = 'ok' | 'unauthorized' | 'transient'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<ConsumerUser | null>(null)
  const [token, setToken] = useState<string | null>(() => {
    const stored = readConsumerToken()
    if (stored) setConsumerAuthToken(stored)
    return stored
  })
  const [isLoading, setIsLoading] = useState(() => Boolean(readConsumerToken()))
  /** Saved-session cold start: wake overlay until API is live, then /me → app. */
  const [sessionWake, setSessionWake] = useState(false)
  const [wakeEpoch, setWakeEpoch] = useState(0)
  const restoreGen = useRef(0)
  const userRef = useRef<ConsumerUser | null>(null)
  userRef.current = user

  const clearAuth = useCallback(() => {
    setToken(null)
    setUser(null)
    setSessionWake(false)
    clearConsumerToken()
    setConsumerAuthToken(null)
    queryClient.clear()
  }, [queryClient])

  const logout = useCallback(() => {
    void unsubscribeHubPush()
    clearAuth()
  }, [clearAuth])

  const fetchMe = useCallback(async (): Promise<MeResult> => {
    // Android Chrome can drop in-memory axios defaults after process freeze — re-apply.
    const stored = readConsumerToken()
    if (stored) setConsumerAuthToken(stored)

    try {
      const res = await axiosInstance.get<ConsumerUser>('/api/consumer/auth/me')
      setUser(res.data)
      return 'ok'
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        // One retry after re-binding the token header (common after Android tab restore).
        const again = readConsumerToken()
        if (again) {
          setConsumerAuthToken(again)
          try {
            const res = await axiosInstance.get<ConsumerUser>('/api/consumer/auth/me')
            setUser(res.data)
            return 'ok'
          } catch (retryErr: unknown) {
            const retryStatus = (retryErr as { response?: { status?: number } })?.response?.status
            if (retryStatus === 401) return 'unauthorized'
            return 'transient'
          }
        }
        return 'unauthorized'
      }
      // Anything else while booting (503/500/network) — keep remembered session + wake UI.
      return 'transient'
    }
  }, [])

  const continueWake = useCallback(() => {
    setSessionWake(true)
    window.setTimeout(() => setWakeEpoch((n) => n + 1), 1500)
  }, [])

  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      setSessionWake(false)
      return
    }

    // Fresh login already hydrated user — do not re-run /me (avoids clearAuth race).
    if (userRef.current) {
      setIsLoading(false)
      setSessionWake(false)
      return
    }

    const gen = ++restoreGen.current
    let cancelled = false

    async function restore() {
      setIsLoading(true)
      try {
        // Dev/prod preview: force wake UI even when API is already warm.
        if (isWakeupPreview()) {
          setSessionWake(true)
          return
        }

        if (isHubProdApiConfigured()) {
          const awake = await probeHubHealthOk(apiBaseUrl)
          if (cancelled || gen !== restoreGen.current) return
          if (!awake) {
            setSessionWake(true)
            return
          }
        }

        const result = await fetchMe()
        if (cancelled || gen !== restoreGen.current) return

        if (result === 'ok') {
          setSessionWake(false)
          setIsLoading(false)
          return
        }
        if (result === 'unauthorized') {
          clearAuth()
          setIsLoading(false)
          return
        }
        // Transient boot failure — keep token, show wake, never bounce to login.
        if (isHubProdApiConfigured() || isWakeupPreview()) {
          setSessionWake(true)
          return
        }
        clearAuth()
        setIsLoading(false)
      } catch {
        if (cancelled || gen !== restoreGen.current) return
        if (isHubProdApiConfigured() || isWakeupPreview()) {
          setSessionWake(true)
          return
        }
        clearAuth()
        setIsLoading(false)
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [token, clearAuth, fetchMe])

  const handleSessionWakeReady = useCallback(async () => {
    // Login may have completed while the loader was green.
    if (userRef.current) {
      setSessionWake(false)
      setIsLoading(false)
      return
    }

    const result = await fetchMe()
    if (result === 'ok') {
      setSessionWake(false)
      setIsLoading(false)
      return
    }
    if (result === 'unauthorized') {
      clearAuth()
      setIsLoading(false)
      return
    }
    // Health green but /me not ready yet — keep animating; never ask to re-login.
    continueWake()
  }, [clearAuth, continueWake, fetchMe])

  const login = async (username: string, password: string, remember = true) => {
    const { data } = await axiosInstance.post<ConsumerAuthResponse>('/api/consumer/auth/login', {
      username,
      password,
    })
    // Prefer durable localStorage on mobile — sessionStorage is often lost on Android process death.
    persistConsumerToken(data.token, remember)
    setConsumerAuthToken(data.token)
    // Set user before token so the token-effect skip sees a hydrated session.
    setUser(data.user)
    setToken(data.token)
    setSessionWake(false)
    setIsLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading: isLoading || sessionWake }}>
      {sessionWake ? (
        <ServerWakeupLoader
          key={wakeEpoch}
          apiUrl={apiBaseUrl || 'http://localhost:3000'}
          healthEndpoint="/api/health"
          appMode="consumer"
          initialDelayMs={0}
          previewDelayMs={isWakeupPreview() ? PREVIEW_COLD_MS : 0}
          onReady={() => {
            void handleSessionWakeReady()
          }}
        />
      ) : null}
      {children}
    </AuthContext.Provider>
  )
}
