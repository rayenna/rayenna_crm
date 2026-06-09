/**
 * Dismissible banner confirming that proposal data was just loaded fresh from
 * the server.  Helps cross-device users see that they are not looking at a
 * stale local copy.
 *
 * Stateless — parent owns syncedAt and onDismiss.
 */

interface Props {
  syncedAt: string; // ISO timestamp of the successful sync
  onDismiss: () => void;
}

export function ServerSyncBanner({ syncedAt, onDismiss }: Props) {
  const timeStr = new Date(syncedAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-emerald-500 text-sm leading-none flex-shrink-0">✓</span>
        <span className="min-w-0">
          <strong>Up to date.</strong>{' '}
          Synced with server at {timeStr} — latest saved version on all your devices.
        </span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss sync notice"
        className="text-emerald-500 hover:text-emerald-700 flex-shrink-0 leading-none text-base transition-colors"
      >
        ×
      </button>
    </div>
  );
}
