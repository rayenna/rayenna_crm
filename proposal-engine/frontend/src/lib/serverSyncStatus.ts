/**
 * Lightweight sessionStorage flag that records when a PE record was last
 * successfully hydrated from the server.  Components (primarily Dashboard)
 * read this to show a "synced from server" confirmation badge.
 *
 * sessionStorage is intentionally used (not localStorage) so the notice is
 * per-tab and clears automatically when the tab closes.
 */

const KEY = 'pe_server_sync';

/** How long after a sync the banner remains visible (ms). */
const STALE_MS = 3 * 60 * 1000; // 3 minutes

interface SyncEntry {
  recordId: string;
  syncedAt: string; // ISO
}

/** Call immediately after a successful applyProposalEngineProjectDetail + upsertCustomer. */
export function markServerSynced(recordId: string): void {
  try {
    const entry: SyncEntry = { recordId, syncedAt: new Date().toISOString() };
    sessionStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage unavailable — ignore silently
  }
}

/**
 * Returns the sync timestamp if the given record was synced from the server
 * within the last STALE_MS milliseconds; null otherwise.
 */
export function getServerSyncStatus(recordId: string): { syncedAt: string } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as SyncEntry;
    if (entry.recordId !== recordId) return null;
    const ageMs = Date.now() - new Date(entry.syncedAt).getTime();
    if (ageMs > STALE_MS) return null;
    return { syncedAt: entry.syncedAt };
  } catch {
    return null;
  }
}

/** Dismiss the banner manually — removes the flag from sessionStorage. */
export function clearServerSyncStatus(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
