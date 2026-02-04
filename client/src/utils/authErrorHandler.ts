/**
 * Callback for auth errors (e.g. 401). Set by AuthProvider on mount.
 * Axios interceptor calls this to clear session when token expires.
 */
let authErrorCallback: (() => void) | null = null

export const setAuthErrorCallback = (cb: (() => void) | null) => {
  authErrorCallback = cb
}

export const notifyAuthError = () => {
  authErrorCallback?.()
}
