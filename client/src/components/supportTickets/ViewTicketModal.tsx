import { useState } from 'react'
import { useModalEscape } from '@/contexts/ModalEscapeContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { SupportTicket, SupportTicketStatus, UserRole } from '../../types'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { ErrorModal } from '@/components/common/ErrorModal'
import {
  stFieldMetaLabelCls,
  stGhostBtn,
  stInputCls,
  stLabelCls,
  stMutedCls,
  stPrimaryBtn,
  stSelectCls,
  stTimestampCls,
  supportTicketStatusLabel,
  supportTicketStatusPillClass,
} from './supportTicketsZenith'

interface ViewTicketModalProps {
  ticket: SupportTicket
  onClose: () => void
  onRefresh: () => void
}

const ViewTicketModal = ({ ticket, onClose, onRefresh }: ViewTicketModalProps) => {
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()
  useModalEscape(true, onClose)
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [activityNote, setActivityNote] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [confirmAction, setConfirmAction] = useState<'close' | 'delete' | null>(null)

  const canManageTickets = hasRole([UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS])
  const isAdmin = hasRole([UserRole.ADMIN])

  const { data: fullTicket, isLoading } = useQuery({
    queryKey: ['support-ticket', ticket.id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/support-tickets/${ticket.id}`)
      return res.data as SupportTicket
    },
  })

  const addActivityMutation = useMutation({
    mutationFn: async (data: { note: string; followUpDate?: string }) => {
      const res = await axiosInstance.post(`/api/support-tickets/${ticket.id}/activity`, data)
      return res.data
    },
    onSuccess: () => {
      toast.success('Follow-up added successfully')
      setActivityNote('')
      setFollowUpDate('')
      setShowAddActivity(false)
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticket.id] })
      queryClient.invalidateQueries({ queryKey: ['support-tickets', ticket.projectId] })
      onRefresh()
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
    },
  })

  const closeTicketMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.patch(`/api/support-tickets/${ticket.id}/close`)
      return res.data as SupportTicket
    },
    onSuccess: () => {
      toast.success('Ticket closed successfully')
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticket.id] })
      queryClient.invalidateQueries({ queryKey: ['support-tickets', ticket.projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onRefresh()
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
    },
  })

  const deleteTicketMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.delete(`/api/support-tickets/${ticket.id}`)
    },
    onSuccess: () => {
      toast.success('Ticket deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['support-tickets', ticket.projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onClose()
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
    },
  })

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activityNote.trim()) {
      toast.error('Note is required')
      return
    }

    addActivityMutation.mutate({
      note: activityNote.trim(),
      followUpDate: followUpDate || undefined,
    })
  }

  const handleCloseTicket = () => {
    setConfirmAction('close')
  }

  const handleDeleteTicket = () => {
    setConfirmAction('delete')
  }

  const runConfirmAction = () => {
    if (confirmAction === 'close') {
      closeTicketMutation.mutate()
    } else if (confirmAction === 'delete') {
      deleteTicketMutation.mutate()
    }
    setConfirmAction(null)
  }

  const displayTicket = fullTicket || ticket

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--bg-overlay)] p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-ticket-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="zenith-root flex max-h-[min(92vh,880px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-modal)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 border-l-4 border-l-[color:var(--accent-gold)] pl-3">
            <h2 id="view-ticket-title" className="text-lg font-bold text-[color:var(--text-primary)] sm:text-xl">
              Support Ticket Details
            </h2>
            <p className="mt-1 text-sm font-medium text-[color:var(--accent-gold)]">#{displayTicket.ticketNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--border-strong)]">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-[color:var(--text-muted)]">Loading ticket details…</div>
          ) : (
            <div className="space-y-6">
              <div className="border-b border-[color:var(--border-default)] pb-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className={stFieldMetaLabelCls}>Status</p>
                    <div className="mt-1.5">
                      <span className={supportTicketStatusPillClass(displayTicket.status)}>
                        {supportTicketStatusLabel(displayTicket.status)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className={stFieldMetaLabelCls}>Created By</p>
                    <p className="mt-1.5 text-sm font-medium text-[color:var(--text-primary)]">{displayTicket.createdBy.name}</p>
                  </div>
                  <div>
                    <p className={stFieldMetaLabelCls}>Created Date</p>
                    <p className="mt-1.5 text-sm text-[color:var(--text-secondary)]">
                      {format(new Date(displayTicket.createdAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  {displayTicket.closedAt && (
                    <div>
                      <p className={stFieldMetaLabelCls}>Closed Date</p>
                      <p className="mt-1.5 text-sm text-[color:var(--text-secondary)]">
                        {format(new Date(displayTicket.closedAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className={stFieldMetaLabelCls}>Title</p>
                <p className="mt-1.5 text-sm font-medium text-[color:var(--text-primary)]">{displayTicket.title}</p>
              </div>

              {displayTicket.description && (
                <div>
                  <p className={stFieldMetaLabelCls}>Description</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--text-secondary)]">{displayTicket.description}</p>
                </div>
              )}

              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className={stFieldMetaLabelCls}>
                    Follow-ups / Activity Log
                  </p>
                  {canManageTickets && displayTicket.status !== SupportTicketStatus.CLOSED && (
                    <button
                      type="button"
                      onClick={() => setShowAddActivity(!showAddActivity)}
                      className="text-sm font-semibold text-[color:var(--accent-gold)] hover:opacity-90 hover:underline"
                    >
                      {showAddActivity ? 'Cancel add' : '+ Add follow-up'}
                    </button>
                  )}
                </div>

                {showAddActivity && (
                  <form
                    onSubmit={handleAddActivity}
                    className="mb-4 space-y-3 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] p-4 ring-1 ring-[color:var(--border-default)]"
                  >
                    <div>
                      <label className={stLabelCls}>
                        Note <span className="text-[color:var(--accent-red)]">*</span>
                      </label>
                      <textarea
                        value={activityNote}
                        onChange={(e) => setActivityNote(e.target.value)}
                        rows={3}
                        className={`mt-1.5 ${stInputCls}`}
                        placeholder="Enter follow-up notes…"
                        required
                      />
                    </div>
                    <div>
                      <label className={stLabelCls}>Follow-up Date (Optional)</label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className={`mt-1.5 ${stSelectCls}`}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddActivity(false)
                          setActivityNote('')
                          setFollowUpDate('')
                        }}
                        className={stGhostBtn}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={stPrimaryBtn}
                        disabled={addActivityMutation.isPending || !activityNote.trim()}
                      >
                        {addActivityMutation.isPending ? 'Adding…' : 'Add follow-up'}
                      </button>
                    </div>
                  </form>
                )}

                {!displayTicket.activities || displayTicket.activities.length === 0 ? (
                  <p className={`${stMutedCls} italic`}>No follow-ups yet</p>
                ) : (
                  <div className="space-y-3">
                    {displayTicket.activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="rounded-xl border border-[color:var(--border-default)] border-l-4 border-l-[color:var(--accent-gold)] bg-[color:var(--bg-input)] py-3 pl-4 pr-3 shadow-inner"
                      >
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[color:var(--text-primary)]">{activity.createdBy?.name ?? '—'}</span>
                          <span className={stTimestampCls}>
                            {format(new Date(activity.createdAt), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--text-secondary)]">{activity.note}</p>
                        {activity.followUpDate && (
                          <p className="mt-2 text-xs font-medium text-[color:var(--accent-gold)]">
                            Follow-up: {format(new Date(activity.followUpDate), 'MMM dd, yyyy')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-[color:var(--border-default)] pt-5">
                {canManageTickets && displayTicket.status !== SupportTicketStatus.CLOSED && (
                  <button
                    type="button"
                    onClick={handleCloseTicket}
                    className="rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-primary)] transition-colors hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={closeTicketMutation.isPending}
                  >
                    {closeTicketMutation.isPending ? 'Closing…' : 'Close ticket'}
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleDeleteTicket}
                    className="rounded-xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-red)] transition-colors hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={deleteTicketMutation.isPending}
                  >
                    {deleteTicketMutation.isPending ? 'Deleting…' : 'Delete ticket'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ErrorModal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        type="warning"
        message={
          confirmAction === 'close'
            ? `Are you sure you want to close ticket ${ticket.ticketNumber}?`
            : confirmAction === 'delete'
              ? `Are you sure you want to permanently delete ticket ${ticket.ticketNumber}? This action cannot be undone and will delete all associated activities.`
              : ''
        }
        actions={[
          { label: 'Cancel', variant: 'ghost', onClick: () => setConfirmAction(null) },
          { label: 'Confirm', variant: 'primary', onClick: runConfirmAction },
        ]}
      />
    </div>
  )
}

export default ViewTicketModal
