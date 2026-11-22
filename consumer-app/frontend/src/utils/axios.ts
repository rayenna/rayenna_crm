import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const API_TIMEOUT_MS = 90_000
export const apiBaseUrl = API_BASE_URL

export const CONSUMER_TOKEN_KEY = 'consumerToken'
export const CONSUMER_REMEMBER_KEY = 'consumerRememberMe'

export function readConsumerToken(): string | null {
  try {
    return localStorage.getItem(CONSUMER_TOKEN_KEY) || sessionStorage.getItem(CONSUMER_TOKEN_KEY)
  } catch {
    return null
  }
}

export function persistConsumerToken(token: string, remember: boolean): void {
  try {
    sessionStorage.removeItem(CONSUMER_TOKEN_KEY)
    localStorage.removeItem(CONSUMER_TOKEN_KEY)
    if (remember) localStorage.setItem(CONSUMER_TOKEN_KEY, token)
    else sessionStorage.setItem(CONSUMER_TOKEN_KEY, token)
    localStorage.setItem(CONSUMER_REMEMBER_KEY, remember ? '1' : '0')
  } catch {
    sessionStorage.setItem(CONSUMER_TOKEN_KEY, token)
  }
}

export function clearConsumerToken(): void {
  try {
    sessionStorage.removeItem(CONSUMER_TOKEN_KEY)
    localStorage.removeItem(CONSUMER_TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export function readRememberPreference(): boolean {
  try {
    return localStorage.getItem(CONSUMER_REMEMBER_KEY) !== '0'
  } catch {
    return true
  }
}

export function isTimeoutOrNetworkError(error: unknown): boolean {
  const err = error as { code?: string; message?: string }
  return (
    err?.code === 'ECONNABORTED' ||
    err?.code === 'ERR_NETWORK' ||
    err?.code === 'ECONNREFUSED' ||
    err?.message === 'Network Error'
  )
}

/** Boot / cold-start failures — keep wake UI; do not clear session / bounce to form. */
export function isStillWakingError(error: unknown): boolean {
  const err = error as {
    response?: { status?: number; data?: { error?: string; status?: string } }
  }
  const status = err?.response?.status
  // Process up but DB/routes still mounting after Render wake.
  if (status === 500 || status === 502 || status === 504) return true
  if (status === 503) {
    const apiError = err?.response?.data?.error
    // Real misconfig (missing CONSUMER_JWT_SECRET) — not a cold start.
    if (typeof apiError === 'string' && /not configured/i.test(apiError)) return false
    return true
  }
  if (err?.response == null && isTimeoutOrNetworkError(error)) return true
  return false
}

export function getFriendlyApiErrorMessage(error: unknown): string {
  if (isStillWakingError(error)) {
    return 'The server may be waking up. Please try again in a moment.'
  }
  const err = error as { response?: { status?: number; data?: { error?: string } } }
  if (err?.response?.status === 401 || err?.response?.status === 400) {
    return 'Invalid username or password.'
  }
  if (err?.response?.data?.error && typeof err.response.data.error === 'string') {
    return err.response.data.error
  }
  return 'Something went wrong. Please try again.'
}

if (!API_BASE_URL && typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
  console.warn(
    '[Rayenna Solar Hub] VITE_API_BASE_URL is not set. Set it on Render/Vercel and redeploy.'
  )
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
})

axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status
    const url = String(err?.config?.url ?? '')
    // Wrong password on the login form must not wipe / hard-redirect; Login handles it.
    const isLoginAttempt = url.includes('/api/consumer/auth/login')
    if (status === 401 && !isLoginAttempt) {
      clearConsumerToken()
      delete axiosInstance.defaults.headers.common.Authorization
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export function setConsumerAuthToken(token: string | null) {
  if (token) {
    axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete axiosInstance.defaults.headers.common.Authorization
  }
}

export default axiosInstance
