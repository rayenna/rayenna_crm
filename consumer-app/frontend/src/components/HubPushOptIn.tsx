import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getHubPushConfig, subscribeHubPush } from '@/utils/hubPush'

const DISMISS_KEY = 'hub-push-dismissed'

export default function HubPushOptIn() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const run = async () => {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) return
      try {
        const config = await getHubPushConfig()
        if (!config.enabled || cancelled) return

        if (Notification.permission === 'granted') {
          await subscribeHubPush()
          return
        }
        if (Notification.permission === 'denied') return
        if (localStorage.getItem(DISMISS_KEY) === '1') return
        setOpen(true)
      } catch {
        /* ignore */
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [user])

  const dismiss = () => {
    setOpen(false)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const enable = async () => {
    const result = await subscribeHubPush()
    if (result === 'subscribed' || result === 'denied') dismiss()
    else setOpen(false)
  }

  if (!open) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(8.5rem+env(safe-area-inset-bottom,0px))] z-30 px-3">
      <div className="pointer-events-auto mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] p-3">
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--accent-gold)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Allow alerts on this phone</p>
          <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
            Get ticket, cleaning, and service updates even when Hub is closed. iPhone needs Add to Home
            Screen first.
          </p>
          <button
            type="button"
            onClick={() => void enable()}
            className="mt-2 rounded-lg bg-[color:var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-[color:var(--text-inverse)]"
          >
            Enable alerts
          </button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-[color:var(--text-tertiary)]"
          aria-label="Dismiss alerts prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
