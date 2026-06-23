import { useConsumerNotifications, useMarkNotificationRead } from '@/hooks/useConsumerProfile'

export default function NotificationsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notificationsQuery = useConsumerNotifications()
  const markRead = useMarkNotificationRead()

  if (!open) return null

  const items = notificationsQuery.data?.items ?? []

  const handleOpen = async (id: string, isRead: boolean) => {
    if (isRead) return
    try {
      await markRead.mutateAsync(id)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color:var(--bg-overlay)] p-4 sm:items-center">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-modal)] shadow-[var(--shadow-modal)]">
        <div className="flex items-center justify-between border-b border-[color:var(--border-default)] p-4">
          <h2 className="zenith-display text-lg font-bold text-[color:var(--text-primary)]">
            Notifications
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-[color:var(--accent-gold)]"
          >
            Done
          </button>
        </div>
        <div className="overflow-y-auto p-2">
          {notificationsQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent-gold)] border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-[color:var(--text-tertiary)]">
              No notifications yet
            </p>
          ) : (
            <ul className="space-y-1">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleOpen(n.id, n.isRead)}
                    className={`w-full rounded-xl p-3 text-left ${
                      n.isRead ? 'bg-transparent' : 'bg-[color:var(--accent-gold-muted)]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">{n.body}</p>
                    <p className="mt-1 text-[10px] text-[color:var(--text-tertiary)]">
                      {new Date(n.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
