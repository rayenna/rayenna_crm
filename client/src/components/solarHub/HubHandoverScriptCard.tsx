import { useState } from 'react'
import toast from 'react-hot-toast'
import { Copy, MessageCircle, Smartphone } from 'lucide-react'
import {
  buildHubCustomerWhatsApp,
  buildHubHandoverChecklist,
  getSolarHubPublicUrl,
  type HubHandoverPhone,
} from '../../utils/hubHandoverScript'

type Props = {
  username?: string | null
  defaultOpen?: boolean
  /** Slimmer chrome for list pages so the account list stays above the fold on phones. */
  compact?: boolean
}

export default function HubHandoverScriptCard({
  username,
  defaultOpen = false,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [phone, setPhone] = useState<HubHandoverPhone>('android')
  const hubUrl = getSolarHubPublicUrl()
  const checklist = buildHubHandoverChecklist({ hubUrl, username, phone })
  const whatsapp = buildHubCustomerWhatsApp({ hubUrl, username })

  const copyText = async (text: string, ok: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(ok)
    } catch {
      toast.error('Could not copy — select the script and copy manually')
    }
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(whatsapp)}`

  return (
    <div
      className={
        compact
          ? 'rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] ring-1 ring-[color:var(--border-default)]'
          : 'rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] p-3'
      }
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 text-left touch-manipulation ${
          compact ? 'min-h-[44px] px-3 py-2' : 'items-start'
        }`}
        aria-expanded={open}
      >
        <Smartphone
          className={`h-4 w-4 shrink-0 text-[color:var(--accent-gold)] ${compact ? '' : 'mt-0.5'}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-[color:var(--text-primary)]">
            {compact ? 'Install Hub script' : 'Install Hub on this visit'}
          </span>
          {compact ? null : (
            <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
              Script for sales/ops: sign in on the customer’s phone and Add to Home Screen
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs font-semibold text-[color:var(--accent-gold)]">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open ? (
        <div className={`space-y-3 ${compact ? 'border-t border-[color:var(--border-default)] px-3 pb-3 pt-3' : 'mt-3'}`}>
          <div className="flex gap-1 rounded-lg bg-[color:var(--bg-card)] p-1">
            {(['android', 'iphone'] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setPhone(id)}
                className={`min-h-[40px] flex-1 touch-manipulation rounded-md px-2 py-1.5 text-xs font-semibold ${
                  phone === id
                    ? 'bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)]'
                    : 'text-[color:var(--text-secondary)]'
                }`}
              >
                {id === 'android' ? 'Android (Chrome)' : 'iPhone (Safari)'}
              </button>
            ))}
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-[color:var(--bg-card)] p-3 text-[11px] leading-relaxed text-[color:var(--text-primary)]">
            {checklist}
          </pre>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyText(checklist, 'Handover script copied')}
              className="inline-flex min-h-[40px] touch-manipulation items-center gap-1.5 rounded-lg bg-[color:var(--accent-gold)] px-3 py-2 text-xs font-bold text-[color:var(--text-inverse)]"
            >
              <Copy className="h-3.5 w-3.5" /> Copy script
            </button>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] touch-manipulation items-center gap-1.5 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)]"
            >
              <MessageCircle className="h-3.5 w-3.5 text-[color:var(--accent-teal)]" />
              WhatsApp (no password)
            </a>
            {hubUrl ? (
              <a
                href={hubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] touch-manipulation items-center gap-1.5 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-3 py-2 text-xs font-semibold text-[color:var(--accent-teal)]"
              >
                Open Hub
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
