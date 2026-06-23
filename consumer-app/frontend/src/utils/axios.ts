import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const API_TIMEOUT_MS = 90_000
export const apiBaseUrl = API_BASE_URL

export const CONSUMER_TOKEN_KEY = 'consumerToken'

export function isTimeoutOrNetworkError(error: unknown): boolean {
  const err = error as { code?: string; message?: string }
  return (
    err?.code === 'ECONNABORTED' ||
    err?.code === 'ERR_NETWORK' ||
    err?.code === 'ECONNREFUSED' ||
    err?.message === 'Network Error'
  )
}

export function getFriendlyApiErrorMessage(error: unknown): string {
  if (isTimeoutOrNetworkError(error)) {
    return 'The server may be waking up. Please try again in a moment.'
  }
  const err = error as { response?: { status?: number; data?: { error?: string } } }
  if (err?.response?.status === 401) {
    return 'Invalid email or password.'
  }
  if (err?.response?.status === 503) {
    return 'Consumer login is not configured on the API yet. Add CONSUMER_JWT_SECRET to the repo root .env and restart the backend (npm run dev:server).'
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
    if (err?.response?.status === 401) {
      sessionStorage.removeItem(CONSUMER_TOKEN_KEY)
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
