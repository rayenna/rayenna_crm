import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

const DISMISS_KEY = 'hub-a2hs-dismissed'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || Boolean(nav.standalone)
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const ios = /iPad|iPhone|iPod/.test(ua)
  const webkit = /WebKit/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua)
  return ios && webkit
}

export default function InstallHubPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [open, setOpen] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return
    } catch {
      return
    }

    setIos(isIosSafari())

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setOpen(true)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)

    if (isIosSafari()) setOpen(true)

    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const dismiss = () => {
    setOpen(false)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    const choice = await deferred.userChoice
    setDeferred(null)
    if (choice.outcome === 'accepted') dismiss()
    else dismiss()
  }

  if (!open || isStandalone()) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-40 px-3">
      <div className="pointer-events-auto mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-[color:var(--accent-gold-border)] bg-[color:var(--bg-card)] p-3">
        <Download className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--accent-gold)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Add Solar Hub to your home screen</p>
          <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
            {ios ? (
              <>
                Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" aria-hidden /> Share, then{' '}
                <strong>Add to Home Screen</strong>.
              </>
            ) : (
              'Install the app for quicker access — no App Store needed.'
            )}
          </p>
          {!ios && deferred ? (
            <button
              type="button"
              onClick={() => void install()}
              className="mt-2 rounded-lg bg-[color:var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-[color:var(--text-inverse)]"
            >
              Add to Home Screen
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-[color:var(--text-tertiary)]"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
