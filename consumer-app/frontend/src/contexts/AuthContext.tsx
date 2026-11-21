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
  isStillWakingError,
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
const forceWakeupPreview =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('wakeup') === '1'

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

type MeResult = 'ok' | 'unauthorized' | 'network' | 'other'

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
    try {
      const res = await axiosInstance.get<ConsumerUser>('/api/consumer/auth/me')
      setUser(res.data)
      return 'ok'
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 401) return 'unauthorized'
      // API up but still mounting routes (503) or network flake — keep saved token + wake UI.
      if (isStillWakingError(error)) return 'network'
      return 'other'
    }
  }, [])

  useEffect(() => {
    if (!token) {
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
        if (forceWakeupPreview) {
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
        if (result === 'network' && isHubProdApiConfigured()) {
          setSessionWake(true)
          return
        }
        clearAuth()
        setIsLoading(false)
      } catch {
        if (cancelled || gen !== restoreGen.current) return
        if (isHubProdApiConfigured()) {
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
    const result = await fetchMe()
    if (result === 'ok') {
      setSessionWake(false)
      setIsLoading(false)
      return
    }
    // Still waking — remount loader; never clear a remembered session for 503/network.
    if (result === 'network') {
      window.setTimeout(() => setWakeEpoch((n) => n + 1), 1500)
      return
    }
    // Only drop remembered login for real auth failure (401) / hard errors.
    clearAuth()
    setIsLoading(false)
  }, [clearAuth, fetchMe])

  const login = async (username: string, password: string, remember = true) => {
    const { data } = await axiosInstance.post<ConsumerAuthResponse>('/api/consumer/auth/login', {
      username,
      password,
    })
    persistConsumerToken(data.token, remember)
    setConsumerAuthToken(data.token)
    setToken(data.token)
    setUser(data.user)
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
          previewDelayMs={forceWakeupPreview ? PREVIEW_COLD_MS : 0}
          onReady={() => {
            void handleSessionWakeReady()
          }}
        />
      ) : null}
      {children}
    </AuthContext.Provider>
  )
}
