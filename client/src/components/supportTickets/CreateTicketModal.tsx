import { useState, useEffect } from 'react'
import { useModalEscape } from '../../contexts/ModalEscapeContext'
import { createPortal } from 'react-dom'
import { useMutation } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import toast from 'react-hot-toast'
import { stGhostBtn, stInputCls, stLabelCls, stMutedCls, stPrimaryBtn, stSectionInner } from './supportTicketsZenith'

interface CreateTicketModalProps {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}

const CreateTicketModal = ({ projectId, onClose, onSuccess }: CreateTicketModalProps) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useModalEscape(true, onClose)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const createMutation = useMutation({
    mutationFn: async (data: { projectId: string; title: string; description?: string }) => {
      const res = await axiosInstance.post('/api/support-tickets', data)
      return res.data
    },
    onSuccess: () => {
      toast.success('Support ticket created successfully')
      onSuccess()
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    createMutation.mutate({
      projectId,
      title: title.trim(),
      description: description.trim() || undefined,
    })
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[color:var(--bg-overlay)] p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-ticket-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="zenith-root my-auto flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-modal)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--border-strong)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-5 py-4 backdrop-blur-xl sm:px-6">
          <h2 id="create-ticket-title" className="truncate text-base font-bold text-[color:var(--text-primary)] sm:text-lg">
            Create Support Ticket
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 sm:p-6">
          <div className="space-y-6">
            <div className={stSectionInner}>
              <div className="mb-4 flex items-center gap-2 border-b border-[color:var(--border-default)] pb-3">
                <svg className="h-5 w-5 text-[color:var(--accent-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-primary)]">Ticket Details</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={stLabelCls}>
                    Title <span className="text-[color:var(--accent-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`mt-1.5 ${stInputCls}`}
                    placeholder="Brief description of the issue"
                    maxLength={500}
                    required
                  />
                  <p className={`${stMutedCls} mt-1.5`}>{title.length}/500 characters</p>
                </div>
                <div>
                  <label className={stLabelCls}>Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className={`mt-1.5 min-h-[6rem] resize-y ${stInputCls}`}
                    placeholder="Detailed description of the issue, steps to reproduce, etc."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-[color:var(--border-default)] pt-4">
              <button type="button" onClick={onClose} className={stGhostBtn} disabled={createMutation.isPending}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || !title.trim()}
                className={stPrimaryBtn}
              >
                {createMutation.isPending ? 'Creating…' : 'Create Ticket'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}

export default CreateTicketModal
