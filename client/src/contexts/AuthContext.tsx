import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import axiosInstance from '../utils/axios'
import { setAuthErrorCallback } from '../utils/authErrorHandler'
import { User, UserRole } from '../types'

// Inactivity timeout configuration
const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const WARNING_BEFORE_MS = 60 * 1000 // Show warning 1 minute before logout

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
  }, [])

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
    try {
      const response = await axiosInstance.post('/api/auth/login', { email, password })
      const { token: newToken, user: newUser } = response.data
      setToken(newToken)
      setUser(newUser)
      sessionStorage.setItem('token', newToken)
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      // Start inactivity timer after login
      resetIdleTimer()
    } catch (error) {
      throw error
    }
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
      
      {/* Inactivity Warning Modal */}
      {showIdleWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Session Timeout Warning
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                You've been inactive for a while. For security reasons, you'll be automatically logged out in:
              </p>
              <div className="flex justify-center mb-6">
                <div className="bg-red-50 border-2 border-red-200 rounded-full w-24 h-24 flex items-center justify-center">
                  <span className="text-4xl font-bold text-red-600">{idleCountdown}</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 text-center mb-6">seconds remaining</p>
              <div className="flex gap-3">
                <button
                  onClick={handleStayLoggedIn}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-semibold hover:from-primary-700 hover:to-primary-800 transition-all shadow-md hover:shadow-lg"
                >
                  Stay Logged In
                </button>
                <button
                  onClick={logout}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                >
                  Logout Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  )
}
