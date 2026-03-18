import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import { setAuthErrorCallback } from '../utils/authErrorHandler'
import { User, UserRole } from '../types'
import { ErrorModal } from '@/components/common/ErrorModal'

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
    delete axiosInstance.defaults.headers.common['Authorization']
    // Clear React Query cache so next user sees fresh data (no stale tiles/dashboard from previous user)
    queryClient.clear()
  }, [queryClient])

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

  // Set up activity event listeners
  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    
    const handleActivity = () => {
      if (sessionStorage.getItem('token')) {
        resetIdleTimer()
      }
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
        try {
          const response = await axiosInstance.get('/api/auth/me')
          if (!cancelled) setUser(response.data)
        } catch {
          if (!cancelled) clearAuth()
        } finally {
          if (!cancelled) setIsLoading(false)
        }
      })()
    } else {
      setIsLoading(false)
    }
    return () => { cancelled = true }
  }, [clearAuth])

  const login = async (email: string, password: string) => {
    const response = await axiosInstance.post('/api/auth/login', { email, password })
    const { token: newToken, user: newUser } = response.data
    setToken(newToken)
    setUser(newUser)
    sessionStorage.setItem('token', newToken)
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    // Start inactivity timer after login
    resetIdleTimer()
  }

  const logout = useCallback(() => {
    // Clear inactivity timers
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    setShowIdleWarning(false)
    clearAuth()
  }, [clearAuth])

  const hasRole = (roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false
  }

  // Handle "Stay Logged In" button click
  const handleStayLoggedIn = () => {
    resetIdleTimer()
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, hasRole }}>
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
