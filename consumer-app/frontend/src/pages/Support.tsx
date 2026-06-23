import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Gift,
  Headphones,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Share2,
} from 'lucide-react'
import { useSubmitSupportQuery, useSupportFaq, useSupportMeta } from '@/hooks/useConsumerSupport'

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

export default function Support() {
  const metaQuery = useSupportMeta()
  const faqQuery = useSupportFaq()
  const submitQuery = useSubmitSupportQuery()
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)

  const meta = metaQuery.data
  const faqs = faqQuery.data?.faqs ?? []
  const tips = faqQuery.data?.tips ?? []
  const loading = metaQuery.isLoading || faqQuery.isLoading

  const copyReferral = async () => {
    if (!meta?.referralCode) return
    try {
      await navigator.clipboard.writeText(meta.referralCode)
      toast.success('Referral code copied')
    } catch {
      toast.error('Could not copy code')
    }
  }

  const shareReferral = async () => {
    if (!meta?.referralCode) return
    const text = `Join Rayenna Solar with my referral code ${meta.referralCode}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Rayenna Referral', text })
      } catch {
        /* user cancelled */
      }
    } else {
      copyReferral()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const ticket = await submitQuery.mutateAsync({
        subject: subject.trim(),
        description: description.trim() || undefined,
      })
      toast.success(`Query submitted — ticket ${ticket.ticketNumber}`)
      setSubject('')
      setDescription('')
    } catch {
      toast.error('Could not submit query. Please try again.')
    }
  }

  return (
    <div className="px-4 py-6">
      <header className="mb-4">
        <h1 className="zenith-display text-2xl font-bold text-[color:var(--text-primary)]">
          Support
        </h1>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">We&apos;re here to help</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--accent-gold)] border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Emergency */}
          <section className="overflow-hidden rounded-2xl border border-[color:var(--accent-green-border)] bg-[color:var(--accent-green-muted)] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--accent-green)]" />
              <div>
                <h2 className="text-sm font-bold text-[color:var(--text-primary)]">
                  24/7 Emergency Support
                </h2>
                <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                  For system failures or urgent issues
                </p>
              </div>
            </div>
            <a
              href={meta ? telHref(meta.emergencyPhone) : '#'}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--accent-green)] py-3 text-sm font-bold text-white"
            >
              <Phone className="h-4 w-4" />
              Call: {meta?.emergencyPhone ?? '—'}
            </a>
          </section>

          {/* Contact channels */}
          <section className="grid grid-cols-3 gap-2">
            <a
              href="mailto:support@rayennaenergy.com"
              className="zenith-glass flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center"
            >
              <MessageCircle className="h-5 w-5 text-[color:var(--accent-teal)]" />
              <span className="text-[10px] font-semibold text-[color:var(--text-secondary)]">
                Live Chat
              </span>
            </a>
            <a
              href={meta ? telHref(meta.emergencyPhone) : '#'}
              className="zenith-glass flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center"
            >
              <Phone className="h-5 w-5 text-[color:var(--accent-gold)]" />
              <span className="text-[10px] font-semibold text-[color:var(--text-secondary)]">
                Call Us
              </span>
            </a>
            <a
              href={`mailto:${meta?.supportEmail ?? 'support@rayennaenergy.com'}`}
              className="zenith-glass flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center"
            >
              <Mail className="h-5 w-5 text-[color:var(--accent-green)]" />
              <span className="text-[10px] font-semibold text-[color:var(--text-secondary)]">
                Email
              </span>
            </a>
          </section>

          {/* Query form */}
          <section className="zenith-glass rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-2">
              <Headphones className="h-5 w-5 text-[color:var(--accent-gold)]" />
              <h2 className="text-sm font-bold text-[color:var(--text-primary)]">Send a Query</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-placeholder)] outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-border)]"
              />
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your question or issue…"
                className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-placeholder)] outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-border)]"
              />
              <button
                type="submit"
                disabled={submitQuery.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--accent-green)] py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {submitQuery.isPending ? 'Submitting…' : 'Submit Query'}
              </button>
            </form>
          </section>

          {/* Refer & Earn */}
          {meta && (
            <section className="relative overflow-hidden rounded-2xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] p-4">
              <div className="flex items-start gap-3 pr-12">
                <Gift className="h-6 w-6 shrink-0 text-[color:var(--accent-gold)]" />
                <div>
                  <h2 className="text-sm font-bold text-[color:var(--text-primary)]">Refer & Earn</h2>
                  <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
                    {meta.referralRewardLabel}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[color:var(--bg-card)] px-3 py-1.5">
                    <span className="font-mono text-sm font-bold tracking-wide text-[color:var(--text-primary)]">
                      {meta.referralCode}
                    </span>
                    <button
                      type="button"
                      onClick={copyReferral}
                      className="text-[color:var(--accent-gold)]"
                      aria-label="Copy referral code"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={shareReferral}
                className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)] shadow-md"
                aria-label="Share referral"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </section>
          )}

          {/* FAQ */}
          <section>
            <h2 className="mb-3 text-sm font-bold text-[color:var(--text-primary)]">
              Frequently Asked
            </h2>
            <div className="zenith-glass divide-y divide-[color:var(--border-default)] overflow-hidden rounded-2xl">
              {faqs.map((faq) => {
                const open = expandedFaq === faq.id
                return (
                  <div key={faq.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(open ? null : faq.id)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[color:var(--text-primary)]">
                          {faq.question}
                        </p>
                        <p className="text-xs text-[color:var(--accent-gold)]">{faq.category}</p>
                      </div>
                      {open ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                      )}
                    </button>
                    {open && (
                      <p className="border-t border-[color:var(--border-default)] px-4 py-3 text-xs leading-relaxed text-[color:var(--text-secondary)]">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Learn & Tips */}
          <section>
            <h2 className="mb-3 text-sm font-bold text-[color:var(--text-primary)]">
              Learn & Tips
            </h2>
            <div className="space-y-2">
              {tips.map((tip) => (
                <button
                  key={tip.id}
                  type="button"
                  onClick={() => toast('Full article — coming soon')}
                  className="zenith-glass flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                      {tip.title}
                    </p>
                    <p className="text-xs text-[color:var(--text-muted)]">{tip.subtitle}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-[color:var(--text-muted)]">
                    {tip.readMinutes} min read
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
