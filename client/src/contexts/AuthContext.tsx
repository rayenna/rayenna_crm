import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import axiosInstance, { isTimeoutOrNetworkError } from '../utils/axios'
import { setAuthErrorCallback } from '../utils/authErrorHandler'
import { User, UserRole } from '../types'
import { ErrorModal } from '@/components/common/ErrorModal'
import { setSessionStorageItem } from '../lib/safeLocalStorage'
import { useThemeContext } from '../hooks/useTheme'

// Auto-logout time (no activity): 10 minutes
const IDLE_TIMEOUT_MS = 10 * 60 * 1000
// When the warning timer message pops up: 9 minutes
const WARNING_BEFORE_MS = 60 * 1000
// Warning starts at 10m - 1m = 9m
// Countdown details: Warning shows and counts down from 60 seconds to 0, then it logs out.

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  hasRole: (roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient()
  const { setTheme } = useThemeContext()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Inactivity timeout state
  const [showIdleWarning, setShowIdleWarning] = useState(false)
  const [idleCountdown, setIdleCountdown] = useState(60)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const clearAuth = useCallback(() => {
    setToken(null)
    setUser(null)
    sessionStorage.clear() // Clear all session data (token, filters, etc.) on logout
    setTheme('dark')
    delete axiosInstance.defaults.headers.common['Authorization']
    // Clear React Query cache so next user sees fresh data (no stale tiles/dashboard from previous user)
    queryClient.clear()
  }, [queryClient, setTheme])

  // Reset inactivity timer on user activity
  const resetIdleTimer = useCallback(() => {
    // Clear existing timers
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    
    // Hide warning if showing
    setShowIdleWarning(false)
    setIdleCountdown(60)
    
    // Only set timers if user is logged in
    if (!sessionStorage.getItem('token')) return
    
    // Set warning timer (fires 1 minute before logout)
    warningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true)
      setIdleCountdown(60)
      
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setIdleCountdown(prev => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS)
    
    // Set logout timer
    idleTimerRef.current = setTimeout(() => {
      setShowIdleWarning(false)
      clearAuth()
    }, IDLE_TIMEOUT_MS)
  }, [clearAuth])

  // Set up activity event listeners (throttle — mousemove/scroll fire very often)
  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    let lastReset = 0
    const THROTTLE_MS = 1000

    const handleActivity = () => {
      if (!sessionStorage.getItem('token')) return
      const now = Date.now()
      if (now - lastReset < THROTTLE_MS) return
      lastReset = now
      resetIdleTimer()
    }
    
    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })
    
    // Initial timer setup if already logged in
    if (sessionStorage.getItem('token')) {
      resetIdleTimer()
    }
    
    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [resetIdleTimer])

  useEffect(() => {
    setAuthErrorCallback(() => clearAuth())
    return () => setAuthErrorCallback(null)
  }, [clearAuth])

  useEffect(() => {
    let cancelled = false
    const storedToken = sessionStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
      ;(async () => {
        // iPhone cold-start race: wake login can succeed, then a remount /me fails while
        // Neon/API is still settling — never clearAuth on network/5xx; only on real 401.
        const maxAttempts = 10
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          if (cancelled) return
          try {
            const response = await axiosInstance.get('/api/auth/me')
            if (cancelled) return
            const u = response.data as User
            setUser(u)
            if (u?.themePreference === 'light' || u?.themePreference === 'dark') {
              setTheme(u.themePreference)
            }
            setIsLoading(false)
            return
          } catch (error: unknown) {
            if (cancelled) return
            const status = (error as { response?: { status?: number } })?.response?.status
            if (status === 401) {
              clearAuth()
              setIsLoading(false)
              return
            }
            const transient =
              status === 500 ||
              status === 502 ||
              status === 503 ||
              status === 504 ||
              status == null ||
              isTimeoutOrNetworkError(error)
            if (status != null && !transient) {
              clearAuth()
              setIsLoading(false)
              return
            }
            if (attempt === maxAttempts - 1) {
              // Keep token; background retry effect continues. PrivateRoute waits on token&&!user.
              setIsLoading(false)
              return
            }
            await new Promise((r) => window.setTimeout(r, 1500))
          }
        }
      })()
    } else {
      setIsLoading(false)
    }
    return () => { cancelled = true }
  }, [clearAuth, setTheme])

  // Keep retrying /me while we have a token but no user (post-wake iPhone remount / flaky Neon).
  useEffect(() => {
    if (!token || user) return
    let cancelled = false
    const tick = async () => {
      while (!cancelled) {
        try {
          const response = await axiosInstance.get('/api/auth/me')
          if (cancelled) return
          const u = response.data as User
          setUser(u)
          if (u?.themePreference === 'light' || u?.themePreference === 'dark') {
            setTheme(u.themePreference)
          }
          return
        } catch (error: unknown) {
          if (cancelled) return
          const status = (error as { response?: { status?: number } })?.response?.status
          if (status === 401) {
            clearAuth()
            return
          }
          await new Promise((r) => window.setTimeout(r, 2500))
        }
      }
    }
    void tick()
    return () => {
      cancelled = true
    }
  }, [token, user, clearAuth, setTheme])

  const login = useCallback(async (email: string, password: string) => {
    const response = await axiosInstance.post('/api/auth/login', { email, password })
    const { token: newToken, user: newUser } = response.data
    // Set user before any follow-up requests so a flaky theme call cannot leave us "logged out".
    setUser(newUser)
    setToken(newToken)
    setSessionStorageItem('token', newToken)
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    setIsLoading(false)
    if (newUser?.themePreference === 'light' || newUser?.themePreference === 'dark') {
      setTheme(newUser.themePreference)
    } else {
      // Best-effort; never let theme sync clear the new session (401 interceptor skips login only).
      void axiosInstance.put('/api/auth/theme', { theme: 'dark' }).catch(() => {})
    }
    // Start inactivity timer after login
    resetIdleTimer()
  }, [resetIdleTimer, setTheme])

  const logout = useCallback(() => {
    // Clear inactivity timers
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    setShowIdleWarning(false)
    clearAuth()
  }, [clearAuth])

  const hasRole = useCallback((roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false
  }, [user])

  const authValue = useMemo(
    () => ({ user, token, login, logout, isLoading, hasRole }),
    [user, token, login, logout, isLoading, hasRole],
  )

  // Handle "Stay Logged In" button click
  const handleStayLoggedIn = () => {
    resetIdleTimer()
  }

  return (
    <AuthContext.Provider value={authValue}>
      {children}

      {/* Inactivity Warning: unified ErrorModal with seconds counter */}
      <ErrorModal
        open={showIdleWarning}
        onClose={() => {}}
        type="warning"
        countdown={idleCountdown}
        message="You've been inactive for a while. For security reasons, you'll be automatically logged out when the counter reaches zero. Click Stay Logged In to continue your session."
        actions={[
          { label: 'Logout Now', variant: 'ghost', onClick: logout },
          { label: 'Stay Logged In', variant: 'primary', onClick: handleStayLoggedIn },
        ]}
      />
    </AuthContext.Provider>
  )
}
