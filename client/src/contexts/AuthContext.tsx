import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import axiosInstance from '../utils/axios'
import { setAuthErrorCallback } from '../utils/authErrorHandler'
import { User, UserRole } from '../types'

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

  const clearAuth = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    delete axiosInstance.defaults.headers.common['Authorization']
  }, [])

  useEffect(() => {
    setAuthErrorCallback(() => clearAuth())
    return () => setAuthErrorCallback(null)
  }, [clearAuth])

  useEffect(() => {
    let cancelled = false
    const storedToken = localStorage.getItem('token')
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
      localStorage.setItem('token', newToken)
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    } catch (error) {
      throw error
    }
  }

  const logout = useCallback(() => {
    clearAuth()
  }, [clearAuth])

  const hasRole = (roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}
