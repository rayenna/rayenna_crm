import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import axiosInstance, {
  clearConsumerToken,
  persistConsumerToken,
  readConsumerToken,
  setConsumerAuthToken,
} from '@/utils/axios'
import { unsubscribeHubPush } from '@/utils/hubPush'
import type { ConsumerAuthResponse, ConsumerUser } from '@/types'

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<ConsumerUser | null>(null)
  const [token, setToken] = useState<string | null>(() => {
    const stored = readConsumerToken()
    if (stored) setConsumerAuthToken(stored)
    return stored
  })
  const [isLoading, setIsLoading] = useState(() => Boolean(readConsumerToken()))

  const clearAuth = useCallback(() => {
    setToken(null)
    setUser(null)
    clearConsumerToken()
    setConsumerAuthToken(null)
    queryClient.clear()
  }, [queryClient])

  const logout = useCallback(() => {
    void unsubscribeHubPush()
    clearAuth()
  }, [clearAuth])

  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }

    axiosInstance
      .get<ConsumerUser>('/api/consumer/auth/me')
      .then((res) => {
        setUser(res.data)
      })
      .catch(() => {
        clearAuth()
      })
      .finally(() => setIsLoading(false))
  }, [clearAuth, token])

  const login = async (username: string, password: string, remember = true) => {
    const { data } = await axiosInstance.post<ConsumerAuthResponse>('/api/consumer/auth/login', {
      username,
      password,
    })
    persistConsumerToken(data.token, remember)
    setConsumerAuthToken(data.token)
    setToken(data.token)
    setUser(data.user)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
