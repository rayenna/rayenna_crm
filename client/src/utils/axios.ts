import axios from 'axios';
import { notifyAuthError } from './authErrorHandler';

// Get API base URL from environment variable
// Falls back to empty string (relative URLs) for local development with Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/** Exported for Login-page check when API is not configured (production). */
export const apiBaseUrl = API_BASE_URL;

// Warn if API base is missing in production (causes login/API calls to fail)
if (!API_BASE_URL && typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
  console.warn(
    '[Rayenna CRM] VITE_API_BASE_URL is not set. Login and API calls will fail. ' +
    'Set it on your host (e.g. Render Static Site Environment) and redeploy.'
  );
}

// Create axios instance with base URL
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
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
