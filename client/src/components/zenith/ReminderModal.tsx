import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, X } from 'lucide-react'
import {
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

  useEffect(() => {
    setVisible(true)
    setChannel(null)
  }, [project])

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

  const handleSend = () => {
    if (channel === 'whatsapp') {
      const withCode = waMeDigits(phoneRaw)
      const message = encodeURIComponent(getWhatsAppMessage(project))
      if (withCode) {
        window.open(`https://wa.me/${withCode}?text=${message}`, '_blank', 'noopener,noreferrer')
      } else {
        window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer')
      }
      requestClose()
      return
    }
    if (channel === 'email') {
      const subject = encodeURIComponent(getEmailSubject(project))
      const body = encodeURIComponent(getEmailBody(project))
      const to = emailRaw ? encodeURIComponent(emailRaw) : ''
      window.open(
        to ? `mailto:${to}?subject=${subject}&body=${body}` : `mailto:?subject=${subject}&body=${body}`,
        '_blank',
        'noopener,noreferrer',
      )
      requestClose()
    }
  }

  const modal = (
    <AnimatePresence onExitComplete={onClose}>
      {visible ? (
        <motion.div
          key="reminder-overlay"
          role="presentation"
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
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
              background: '#0F0F1A',
              border: '1px solid rgba(255,255,255,0.1)',
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
              className="absolute top-4 right-4 p-1 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>

            <h2
              id="reminder-modal-title"
              className="text-[17px] font-bold text-white pr-10"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Send Payment Reminder
            </h2>
            <p className="mt-1 text-[13px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {name}
            </p>
            <p className="mt-0.5 text-[13px] font-medium" style={{ color: '#F5A623' }}>
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
              }).format(Math.round(outstanding))}{' '}
              outstanding
            </p>

            {channel === null ? (
              <>
                <p className="mt-6 text-[12px] mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
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
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(37,211,102,0.18)'
                      e.currentTarget.style.borderColor = 'rgba(37,211,102,0.5)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(37,211,102,0.1)'
                      e.currentTarget.style.borderColor = 'rgba(37,211,102,0.3)'
                    }}
                  >
                    <span className="text-2xl leading-none block mb-1" aria-hidden>
                      💬
                    </span>
                    <span className="text-[14px] font-semibold block" style={{ color: '#25D366' }}>
                      WhatsApp
                    </span>
                    <span className="text-[11px] block mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Opens WhatsApp with pre-filled message
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
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(59,139,255,0.18)'
                      e.currentTarget.style.borderColor = 'rgba(59,139,255,0.5)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(59,139,255,0.1)'
                      e.currentTarget.style.borderColor = 'rgba(59,139,255,0.3)'
                    }}
                  >
                    <Mail className="w-6 h-6 mx-auto mb-1" style={{ color: '#3B8BFF' }} strokeWidth={2} />
                    <span className="text-[14px] font-semibold block" style={{ color: '#3B8BFF' }}>
                      Email
                    </span>
                    <span className="text-[11px] block mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Opens email client with pre-filled message
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setChannel(null)}
                  className="mt-5 mb-4 text-[12px] bg-transparent border-0 cursor-pointer p-0 hover:text-white/70"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  ← Change channel
                </button>
                <p
                  className="text-[11px] uppercase tracking-widest mb-2"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  Message Preview
                </p>
                <div
                  className="rounded-[10px] p-3.5 text-[13px] leading-relaxed whitespace-pre-wrap overflow-y-auto zenith-reminder-preview-scroll"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)',
                    maxHeight: 240,
                  }}
                >
                  {channel === 'whatsapp' ? getWhatsAppMessage(project) : getEmailBody(project)}
                </div>
                <p className="mt-1.5 text-[11px] italic" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  You can edit the message after it opens
                </p>
              </>
            )}

            <div
              className="flex justify-end gap-2.5 mt-5 pt-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
            >
              <button
                type="button"
                onClick={requestClose}
                className="rounded-lg px-[18px] py-2 text-[13px] cursor-pointer transition-opacity bg-transparent"
                style={{
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                Cancel
              </button>
              {channel ? (
                <button
                  type="button"
                  onClick={handleSend}
                  className="rounded-lg px-5 py-2 text-[14px] font-semibold text-white cursor-pointer transition-opacity border-0"
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
