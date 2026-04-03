import axios from 'axios';
import { notifyAuthError } from './authErrorHandler';

// Get API base URL from environment variable
// Falls back to empty string (relative URLs) for local development with Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/** Timeout for API requests (ms). 90s allows backend to wake from Render free-tier hibernation (~15–80s). */
export const API_TIMEOUT_MS = 90_000;

/** Exported for Login-page check when API is not configured (production). */
export const apiBaseUrl = API_BASE_URL;

/** Full URL for a CRM API path (used by offline sync replay with `fetch` + credentials). */
export function buildAbsoluteApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = API_BASE_URL.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  if (base) {
    return `${base}${p}`;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${p}`;
  }
  return p;
}

/** Check if error is due to timeout or backend unreachable (e.g. cold start). */
export function isTimeoutOrNetworkError(error: unknown): boolean {
  const err = error as { code?: string; message?: string }
  return err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK' || err?.message === 'Network Error'
}

/** User-friendly message for API errors (dashboard, lists, etc.). Handles timeout, network, 401, 403, and generic. */
export function getFriendlyApiErrorMessage(error: unknown): string {
  if (isTimeoutOrNetworkError(error)) {
    return 'The server may be waking up (e.g. after idle). Please try again in a moment.'
  }
  const err = error as { response?: { status?: number; data?: { error?: string } }; message?: string }
  if (err?.response?.status === 401) {
    return 'Your session may have expired. Please log in again.'
  }
  if (err?.response?.status === 403) {
    return 'You do not seem to have access to this page. Please check with your Leadership team or the Administrator.'
  }
  if (err?.response?.data?.error && typeof err.response.data.error === 'string') {
    return err.response.data.error
  }
  if (err?.message && typeof err.message === 'string' && err.message !== 'Network Error') {
    return err.message
  }
  return 'The server may be busy or your connection was interrupted. Please try again.'
}

// Warn if API base is missing in production (causes login/API calls to fail)
if (!API_BASE_URL && typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
  console.warn(
    '[Rayenna CRM] VITE_API_BASE_URL is not set. Login and API calls will fail. ' +
    'Set it on your host (e.g. Render Static Site Environment) and redeploy.'
  );
}

// Create axios instance with base URL and timeout for cold-start tolerance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  withCredentials: true, // Include credentials (cookies, JWT) in cross-origin requests
});

// Response interceptor: on 401, clear auth so user is redirected to login (token expired)
axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      notifyAuthError();
    }
    return Promise.reject(err);
  }
);

// Request interceptor: Set Content-Type only for non-FormData requests
axiosInstance.interceptors.request.use((config) => {
  // If data is FormData, let axios/browser set Content-Type automatically with boundary
  // Otherwise, set Content-Type to application/json
  if (config.data instanceof FormData) {
    // Remove Content-Type header - browser/axios will set it with boundary
    delete config.headers['Content-Type'];
  } else if (config.data && typeof config.data === 'object') {
    // Set Content-Type for JSON requests
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

export default axiosInstance;
