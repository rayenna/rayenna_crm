import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { MessageSquare } from 'lucide-react'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'

type Template = {
  id: string
  label: string
  description: string
  defaultTitle: string
  defaultBody: string
}

type ChannelResult = {
  channel: 'hub' | 'push' | 'whatsapp'
  status: string
  detail: string | null
  waMeUrl?: string | null
}

type OutboundItem = {
  id: string
  channel: string
  templateId: string
  title: string
  status: string
  createdAt: string
}

export default function HubNotifyCard({ userId, phone }: { userId: string; phone: string | null }) {
  const queryClient = useQueryClient()
  const [templateId, setTemplateId] = useState('cleaning_due')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [hub, setHub] = useState(true)
  const [push, setPush] = useState(true)
  const [whatsapp, setWhatsapp] = useState(true)
  const [lastWaUrl, setLastWaUrl] = useState<string | null>(null)

  const templatesQuery = useQuery({
    queryKey: ['solar-hub-message-templates'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/solar-hub/message-templates')
      return res.data as {
        templates: Template[]
        pushConfigured: boolean
        whatsappCloudConfigured: boolean
        whatsappNote: string
      }
    },
  })

  const messagesQuery = useQuery({
    queryKey: ['solar-hub-user-messages', userId],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/admin/solar-hub/users/${userId}/messages`)
      return res.data.items as OutboundItem[]
    },
  })

  const templates = templatesQuery.data?.templates ?? []
  const selected = templates.find((t) => t.id === templateId)

  useEffect(() => {
    const t = templatesQuery.data?.templates.find((item) => item.id === templateId)
    if (!t) return
    setTitle(t.defaultTitle)
    setBody(t.defaultBody)
  }, [templateId, templatesQuery.data])

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post(`/api/admin/solar-hub/users/${userId}/messages`, {
        templateId,
        title: title.trim(),
        body: body.trim(),
        channels: { hub, push, whatsapp },
      })
      return res.data as { results: ChannelResult[] }
    },
    onSuccess: (data) => {
      const wa = data.results.find((r) => r.channel === 'whatsapp')
      setLastWaUrl(wa?.waMeUrl ?? null)
      const summary = data.results.map((r) => `${r.channel}: ${r.status}`).join(' · ')
      toast.success(summary)
      void queryClient.invalidateQueries({ queryKey: ['solar-hub-user-messages', userId] })
    },
    onError: (err) => toast.error(getFriendlyApiErrorMessage(err)),
  })

  return (
    <section className="mb-6 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] p-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-[color:var(--accent-gold)]" />
        <h2 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          Notify customer
        </h2>
      </div>
      <p className="mt-2 text-xs text-[color:var(--text-muted)]">
        Hub bell, Web Push (if they allowed alerts), and WhatsApp. Without Cloud API, WhatsApp opens
        as a draft on your phone — Rayenna does not invent a password in the text. Phone:{' '}
        {phone || 'none on Hub user'}.
      </p>
      {templatesQuery.data ? (
        <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">{templatesQuery.data.whatsappNote}</p>
      ) : null}

      <label className="mt-4 block text-xs font-semibold text-[color:var(--text-muted)]">
        Template
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">{selected.description}</p>
      ) : null}

      <label className="mt-3 block text-xs font-semibold text-[color:var(--text-muted)]">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
      </label>
      <label className="mt-3 block text-xs font-semibold text-[color:var(--text-muted)]">
        Message
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-4 text-sm text-[color:var(--text-primary)]">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={hub} onChange={(e) => setHub(e.target.checked)} />
          Hub bell
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} />
          Web Push
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} />
          WhatsApp
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={sendMutation.isPending || !title.trim() || !body.trim()}
          onClick={() => sendMutation.mutate()}
          className="rounded-xl bg-[color:var(--accent-gold)] px-4 py-2 text-sm font-bold text-[color:var(--text-inverse)] disabled:opacity-50"
        >
          {sendMutation.isPending ? 'Sending…' : 'Send'}
        </button>
        {lastWaUrl ? (
          <a
            href={lastWaUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-[color:var(--border-default)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-teal)]"
          >
            Open WhatsApp draft
          </a>
        ) : null}
      </div>

      {(messagesQuery.data ?? []).length > 0 ? (
        <ul className="mt-4 divide-y divide-[color:var(--border-default)] text-xs">
          {(messagesQuery.data ?? []).slice(0, 6).map((item) => (
            <li key={item.id} className="flex justify-between gap-2 py-2">
              <span className="text-[color:var(--text-primary)]">
                {item.templateId} · {item.channel} · {item.status}
              </span>
              <span className="shrink-0 text-[color:var(--text-muted)]">
                {new Date(item.createdAt).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
