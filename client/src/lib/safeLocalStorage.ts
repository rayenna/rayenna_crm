/**
 * Browser storage writes with quota handling — same event name as Proposal Engine
 * so either app can listen consistently on a shared origin.
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

export function reportStorageFailure(key: string | undefined, error: unknown): void {
  if (typeof window === 'undefined') return;
  const kind = isQuotaError(error) ? 'quota' : 'unknown';
  const message =
    kind === 'quota'
      ? 'Browser storage is full. Free disk space or clear site data — your latest changes may not have been saved.'
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

export function setSessionStorageItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (e) {
    reportStorageFailure(key, e);
    return false;
  }
}
