import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useModalEscape } from '../../contexts/ModalEscapeContext'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import {
  buildPaymentReminderRemark,
  getWhatsAppMessage,
  getEmailSubject,
  getEmailBody,
  type ReminderTemplateProject,
} from '../../utils/reminderTemplates'

function waMeDigits(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (!cleaned) return ''
  if (cleaned.startsWith('91') && cleaned.length >= 12) return cleaned
  if (cleaned.length === 10) return `91${cleaned}`
  return cleaned
}

type Channel = null | 'whatsapp' | 'email'

export default function ReminderModal({
  project,
  onClose,
}: {
  project: ReminderTemplateProject
  onClose: () => void
}) {
  const [visible, setVisible] = useState(true)
  const [channel, setChannel] = useState<Channel>(null)
  const [draftBody, setDraftBody] = useState('')
  const [draftSubject, setDraftSubject] = useState('')
  const [logRemark, setLogRemark] = useState(true)
  const [sending, setSending] = useState(false)

  const projectId =
    typeof project.projectId === 'string' && project.projectId.trim()
      ? project.projectId.trim()
      : typeof project.id === 'string' && project.id.trim()
        ? project.id.trim()
        : ''

  useModalEscape(visible, () => setVisible(false))

  // Reset only when the project identity changes — parents often pass a fresh mapped object each render.
  useEffect(() => {
    setVisible(true)
    setChannel(null)
    setDraftBody('')
    setDraftSubject('')
    setLogRemark(Boolean(projectId))
    setSending(false)
  }, [projectId])

  useEffect(() => {
    if (channel === 'whatsapp') {
      setDraftBody(getWhatsAppMessage(project))
    } else if (channel === 'email') {
      setDraftSubject(getEmailSubject(project))
      setDraftBody(getEmailBody(project))
    }
    // Rebuild templates when channel or project id changes, not on every new project object reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: project fields read at channel/id change
  }, [channel, projectId])

  const name =
    (typeof project.customerName === 'string' && project.customerName) ||
    (typeof project.customer_name === 'string' && project.customer_name) ||
    'Customer'
  const outstanding =
    typeof project.amount === 'number'
      ? project.amount
      : typeof project.amount_outstanding === 'number'
        ? project.amount_outstanding
        : 0

  const phoneRaw =
    (typeof project.customerPhone === 'string' && project.customerPhone) ||
    (typeof project.customer_phone === 'string' && project.customer_phone) ||
    (typeof project.phone === 'string' && project.phone) ||
    ''
  const emailRaw =
    (typeof project.customerEmail === 'string' && project.customerEmail) ||
    (typeof project.customer_email === 'string' && project.customer_email) ||
    (typeof project.email === 'string' && project.email) ||
    ''

  const requestClose = () => setVisible(false)

  const handleSend = async () => {
    if (!channel || sending) return
    setSending(true)
    try {
      if (channel === 'whatsapp') {
        const withCode = waMeDigits(phoneRaw)
        const message = encodeURIComponent(draftBody || getWhatsAppMessage(project))
        if (withCode) {
          window.open(`https://wa.me/${withCode}?text=${message}`, '_blank', 'noopener,noreferrer')
        } else {
          window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer')
        }
      } else {
        const subject = encodeURIComponent(draftSubject || getEmailSubject(project))
        const body = encodeURIComponent(draftBody || getEmailBody(project))
        const to = emailRaw ? encodeURIComponent(emailRaw) : ''
        window.open(
          to ? `mailto:${to}?subject=${subject}&body=${body}` : `mailto:?subject=${subject}&body=${body}`,
          '_blank',
          'noopener,noreferrer',
        )
      }

      if (logRemark && projectId) {
        try {
          await axiosInstance.post(`/api/remarks/project/${projectId}`, {
            remark: buildPaymentReminderRemark(channel, project),
          })
          toast.success('Reminder opened and logged on the project')
        } catch (err: unknown) {
          toast.error(
            getFriendlyApiErrorMessage(err) ||
              'Reminder opened, but could not log a project remark',
          )
        }
      }

      requestClose()
    } finally {
      setSending(false)
    }
  }

  const modal = (
    <AnimatePresence onExitComplete={onClose}>
      {visible ? (
        <motion.div
          key="reminder-overlay"
          role="presentation"
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={requestClose}
        >
          <motion.div
            role="dialog"
            aria-labelledby="reminder-modal-title"
            className="relative w-full max-w-[480px] rounded-2xl p-6 text-left"
            style={{
              background: 'var(--bg-modal)',
              border: '1px solid var(--border-card)',
              fontFamily: 'DM Sans, sans-serif',
            }}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={requestClose}
              className="absolute top-4 right-4 p-1 rounded-lg text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-card-hover)] transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>

            <h2
              id="reminder-modal-title"
              className="text-[17px] font-bold text-[color:var(--text-primary)] pr-10"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Draft payment reminder
            </h2>
            <p className="mt-1 text-[13px] text-[color:var(--text-secondary)]">
              {name}
            </p>
            <p className="mt-0.5 text-[13px] font-medium text-[color:var(--accent-gold)]">
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
              }).format(Math.round(outstanding))}{' '}
              outstanding
            </p>

            {channel === null ? (
              <>
                <p className="mt-6 text-[12px] mb-3 text-[color:var(--text-muted)]">
                  Choose how to send:
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setChannel('whatsapp')}
                    className="flex-1 rounded-xl p-4 text-center transition-all duration-200 cursor-pointer"
                    style={{
                      background: 'rgba(37,211,102,0.1)',
                      border: '1px solid rgba(37,211,102,0.3)',
                    }}
                  >
                    <span className="text-2xl leading-none block mb-1" aria-hidden>
                      WA
                    </span>
                    <span className="text-[14px] font-semibold block" style={{ color: '#25D366' }}>
                      WhatsApp
                    </span>
                    <span className="text-[11px] block mt-1 text-[color:var(--text-muted)]">
                      Edit draft, then open WhatsApp
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('email')}
                    className="flex-1 rounded-xl p-4 text-center transition-all duration-200 cursor-pointer"
                    style={{
                      background: 'rgba(59,139,255,0.1)',
                      border: '1px solid rgba(59,139,255,0.3)',
                    }}
                  >
                    <Mail className="w-6 h-6 mx-auto mb-1" style={{ color: '#3B8BFF' }} strokeWidth={2} />
                    <span className="text-[14px] font-semibold block" style={{ color: '#3B8BFF' }}>
                      Email
                    </span>
                    <span className="text-[11px] block mt-1 text-[color:var(--text-muted)]">
                      Edit draft, then open mail client
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setChannel(null)}
                  className="mt-5 mb-4 text-[12px] bg-transparent border-0 cursor-pointer p-0 text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]"
                >
                  ← Change channel
                </button>
                {channel === 'email' ? (
                  <>
                    <label
                      className="text-[11px] uppercase tracking-widest mb-1.5 block"
                      style={{ color: 'var(--text-muted)' }}
                      htmlFor="reminder-subject"
                    >
                      Subject
                    </label>
                    <input
                      id="reminder-subject"
                      value={draftSubject}
                      onChange={(e) => setDraftSubject(e.target.value)}
                      className="mb-3 w-full rounded-[10px] px-3 py-2 text-[13px]"
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </>
                ) : null}
                <label
                  className="text-[11px] uppercase tracking-widest mb-1.5 block"
                  style={{ color: 'var(--text-muted)' }}
                  htmlFor="reminder-body"
                >
                  Message draft
                </label>
                <textarea
                  id="reminder-body"
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  rows={10}
                  className="w-full rounded-[10px] p-3.5 text-[13px] leading-relaxed zenith-reminder-preview-scroll"
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)',
                    maxHeight: 240,
                    resize: 'vertical',
                  }}
                />
                <p className="mt-1.5 text-[11px] italic text-[color:var(--text-muted)]">
                  Opens in your device app — Rayenna does not send the message for you.
                </p>
                {projectId ? (
                  <label className="mt-3 flex items-start gap-2 text-[12px] text-[color:var(--text-secondary)] cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={logRemark}
                      onChange={(e) => setLogRemark(e.target.checked)}
                    />
                    <span>Log a project remark that this reminder was drafted/opened</span>
                  </label>
                ) : null}
              </>
            )}

            <div
              className="flex justify-end gap-2.5 mt-5 pt-4"
              style={{ borderTop: '1px solid var(--border-default)' }}
            >
              <button
                type="button"
                onClick={requestClose}
                className="rounded-lg px-[18px] py-2 text-[13px] cursor-pointer transition-opacity bg-transparent"
                style={{
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </button>
              {channel ? (
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || !draftBody.trim()}
                  className="rounded-lg px-5 py-2 text-[14px] font-semibold text-[color:var(--text-inverse)] cursor-pointer transition-opacity border-0 disabled:opacity-50"
                  style={{
                    background: channel === 'whatsapp' ? '#25D366' : '#3B8BFF',
                  }}
                >
                  {channel === 'whatsapp' ? 'Open WhatsApp →' : 'Open Email Client →'}
                </button>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  return createPortal(modal, document.body)
}
