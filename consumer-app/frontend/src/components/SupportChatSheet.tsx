import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Send, X } from 'lucide-react'
import { useConsumerChat } from '@/hooks/useConsumerSupport'
import type { ChatEscalate } from '@/types/support'

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

function whatsAppHref(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}`
}

const CHIPS = [
  { label: 'My generation dropped', text: 'My solar generation dropped. What should I check?' },
  { label: 'Warranty', text: 'What does my Rayenna warranty cover and how do I claim?' },
  { label: 'Net metering', text: 'How does KSEB net metering work on my bill?' },
  { label: 'Talk to someone', text: 'I want to talk to someone' },
]

type ChatLine = {
  id: string
  role: 'user' | 'assistant'
  content: string
  escalate?: ChatEscalate
  articleIds?: string[]
}

export default function SupportChatSheet({
  open,
  onClose,
  emergencyPhone,
}: {
  open: boolean
  onClose: () => void
  emergencyPhone: string
}) {
  const chat = useConsumerChat()
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [input, setInput] = useState('')
  const [lines, setLines] = useState<ChatLine[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi — I can help with Hub, DISCOM, warranty, and energy questions from the Help Center. For smoke, sparks, or exposed wiring, call emergency support immediately.',
    },
  ])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [open, lines])

  if (!open) return null

  const send = async (text: string) => {
    const message = text.trim()
    if (!message || chat.isPending) return
    setInput('')
    setLines((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: message }])
    try {
      const data = await chat.mutateAsync({ sessionId, message })
      setSessionId(data.sessionId)
      setLines((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          escalate: data.escalate,
          articleIds: data.articleIds,
        },
      ])
    } catch {
      setLines((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: 'I could not reply just now. Use WhatsApp or Send a Query on this page.',
          escalate: 'whatsapp',
        },
      ])
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(input)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color:var(--bg-overlay)] sm:items-center sm:p-4">
      <div className="flex h-[min(86dvh,640px)] w-full max-w-md flex-col rounded-t-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-modal)] shadow-[var(--shadow-modal)] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[color:var(--border-default)] px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-[color:var(--text-primary)]">Live Chat</h2>
            <p className="text-[10px] text-[color:var(--text-muted)]">Answers from the Help Center</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[color:var(--text-tertiary)]"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {lines.map((line) => (
            <div
              key={line.id}
              className={line.role === 'user' ? 'ml-8 text-right' : 'mr-8'}
            >
              <div
                className={`inline-block rounded-2xl px-3 py-2 text-left text-sm ${
                  line.role === 'user'
                    ? 'bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)]'
                    : 'bg-[color:var(--bg-badge)] text-[color:var(--text-primary)]'
                }`}
              >
                {line.content}
              </div>
              {line.role === 'assistant' && line.articleIds && line.articleIds.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {line.articleIds.map((id) => (
                    <Link
                      key={id}
                      to={`/help/${id}`}
                      className="rounded-full bg-[color:var(--accent-gold-muted)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--accent-gold)]"
                    >
                      Read guide
                    </Link>
                  ))}
                </div>
              ) : null}
              {line.escalate === 'emergency' ? (
                <a
                  href={telHref(emergencyPhone)}
                  className="mt-2 inline-flex items-center gap-1 rounded-xl bg-[color:var(--accent-green)] px-3 py-1.5 text-xs font-bold text-white"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Call emergency {emergencyPhone}
                </a>
              ) : null}
              {line.escalate === 'whatsapp' || line.escalate === 'ticket' ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    href={whatsAppHref(emergencyPhone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-xl bg-[color:var(--accent-teal)] px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Open WhatsApp
                  </a>
                </div>
              ) : null}
            </div>
          ))}
          {chat.isPending ? (
            <p className="text-xs text-[color:var(--text-muted)]">Thinking…</p>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-[color:var(--border-default)] px-3 pt-2">
          {CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              disabled={chat.isPending}
              onClick={() => void send(chip.text)}
              className="rounded-full bg-[color:var(--bg-badge)] px-2.5 py-1 text-[10px] font-semibold text-[color:var(--text-secondary)] disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your solar system…"
            className="min-w-0 flex-1 rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-border)]"
          />
          <button
            type="submit"
            disabled={chat.isPending || !input.trim()}
            className="rounded-xl bg-[color:var(--accent-green)] px-3 text-white disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
