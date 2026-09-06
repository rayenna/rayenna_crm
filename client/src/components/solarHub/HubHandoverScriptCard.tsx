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
}

export default function HubHandoverScriptCard({ username, defaultOpen = false }: Props) {
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
    <div className="rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 text-left"
        aria-expanded={open}
      >
        <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--accent-gold)]" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-[color:var(--text-primary)]">
            Install Hub on this visit
          </span>
          <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
            Script for sales/ops: sign in on the customer’s phone and Add to Home Screen
          </span>
        </span>
        <span className="text-xs font-semibold text-[color:var(--accent-gold)]">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open ? (
        <div className="mt-3 space-y-3">
          <div className="flex gap-1 rounded-lg bg-[color:var(--bg-card)] p-1">
            {(['android', 'iphone'] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setPhone(id)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ${
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--accent-gold)] px-3 py-2 text-xs font-bold text-[color:var(--text-inverse)]"
            >
              <Copy className="h-3.5 w-3.5" /> Copy script
            </button>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)]"
            >
              <MessageCircle className="h-3.5 w-3.5 text-[color:var(--accent-teal)]" />
              WhatsApp (no password)
            </a>
            {hubUrl ? (
              <a
                href={hubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-3 py-2 text-xs font-semibold text-[color:var(--accent-teal)]"
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
