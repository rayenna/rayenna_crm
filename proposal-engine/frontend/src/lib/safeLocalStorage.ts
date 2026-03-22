/**
 * Centralized localStorage writes with quota / privacy-mode handling.
 * Dispatches a window event so Layout (or App) can show a user-visible message (P2).
 */

export const RAYENNA_BROWSER_STORAGE_ERROR_EVENT = 'rayenna-browser-storage-error';

export type BrowserStorageErrorDetail = {
  kind: 'quota' | 'unknown';
  message: string;
  key?: string;
};

function isQuotaError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DOMException) {
    return error.name === 'QuotaExceededError' || error.code === 22;
  }
  return (error as Error).name === 'QuotaExceededError';
}

/** Fire a global notification (listeners show toast / banner). */
export function reportStorageFailure(key: string | undefined, error: unknown): void {
  if (typeof window === 'undefined') return;
  const kind = isQuotaError(error) ? 'quota' : 'unknown';
  const message =
    kind === 'quota'
      ? 'Browser storage is full. Free disk space or clear site data for this app — your latest changes may not have been saved. Export important work if needed.'
      : `Could not save to browser storage: ${error instanceof Error ? error.message : String(error)}`;
  window.dispatchEvent(
    new CustomEvent<BrowserStorageErrorDetail>(RAYENNA_BROWSER_STORAGE_ERROR_EVENT, {
      detail: { kind, message, key },
    }),
  );
}

export function setLocalStorageItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    reportStorageFailure(key, e);
    return false;
  }
}

export function removeLocalStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
