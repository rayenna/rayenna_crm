import { useState } from 'react'
import { useModalEscape } from '@/contexts/ModalEscapeContext'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import { SupportTicket, SupportTicketStatus } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { ErrorModal } from '@/components/common/ErrorModal'
import { canDeleteSupportTickets, canManageSupportTickets } from '../../utils/supportTicketPermissions'
import {
  stFieldMetaLabelCls,
  stInputCls,
  stLabelCls,
  stMutedCls,
  stPrimaryBtn,
  stSectionInner,
  stSelectCls,
  stTimestampCls,
  supportTicketStatusLabel,
  supportTicketStatusPillClass,
} from './supportTicketsZenith'

interface TicketDetailDrawerProps {
  ticket: SupportTicket | null
  isOpen: boolean
  onClose: () => void
  onRefresh: () => void
  /** When opened from a project, invalidate that project's ticket list. */
  projectId?: string
}

type ConfirmAction = 'close' | 'delete' | null

const TicketDetailDrawer = ({ ticket, isOpen, onClose, onRefresh, projectId }: TicketDetailDrawerProps) => {
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)

  useModalEscape(!!ticket && isOpen, onClose)

  const canManageTickets = canManageSupportTickets(hasRole)
  const isAdmin = canDeleteSupportTickets(hasRole)

  const ticketId = ticket?.id

  const { data: fullTicket, isLoading: isLoadingDetails, isError: isDetailsError, error: detailsError, refetch: refetchDetails } = useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/support-tickets/${ticketId}`)
      return res.data as SupportTicket
    },
    enabled: !!ticketId && isOpen,
  })

  const invalidateTicketQueries = () => {
    if (ticketId) {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] })
    }
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['support-tickets', projectId] })
    }
    queryClient.invalidateQueries({ queryKey: ['support-tickets-dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['projects'] })
  }

  const addActivityMutation = useMutation({
    mutationFn: async (data: { note: string; followUpDate?: string }) => {
      const res = await axiosInstance.post(`/api/support-tickets/${ticketId!}/activity`, data)
      return res.data
    },
    onSuccess: () => {
      toast.success('Follow-up added successfully')
      setNote('')
      setFollowUpDate('')
      onRefresh()
      invalidateTicketQueries()
      void refetchDetails()
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
    },
    onSettled: () => {
      setIsSubmitting(false)
    },
  })

  const closeTicketMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.patch(`/api/support-tickets/${ticketId!}/close`)
      return res.data
    },
    onSuccess: () => {
      toast.success('Ticket closed successfully')
      onRefresh()
      invalidateTicketQueries()
      void refetchDetails()
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
    },
  })

  const deleteTicketMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.delete(`/api/support-tickets/${ticketId!}`)
    },
    onSuccess: () => {
      toast.success('Ticket deleted successfully')
      invalidateTicketQueries()
      onClose()
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
    },
  })

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) {
      toast.error('Please enter a note')
      return
    }
    setIsSubmitting(true)
    addActivityMutation.mutate({
      note: note.trim(),
      followUpDate: followUpDate || undefined,
    })
  }

  const runConfirmAction = () => {
    if (confirmAction === 'close') {
      closeTicketMutation.mutate()
    } else if (confirmAction === 'delete') {
      deleteTicketMutation.mutate()
    }
    setConfirmAction(null)
  }

  const displayTicket = fullTicket ?? ticket

  const getCustomerName = () => {
    if (!displayTicket?.project?.customer) return 'N/A'
    const customer = displayTicket.project.customer
    const parts = [customer.prefix, customer.firstName, customer.middleName, customer.lastName].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : customer.customerName || 'N/A'
  }

  if (!ticket) return null

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[color:var(--bg-overlay)] backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden
        />
      )}

      <div
        className={`zenith-root fixed top-0 right-0 z-50 h-full w-full max-w-2xl transform border-l border-[color:var(--border-strong)] bg-[color:var(--bg-drawer)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-5 py-4 backdrop-blur-xl sm:px-6">
            <div className="min-w-0 border-l-4 border-l-[color:var(--accent-gold)] pl-3">
              <h2 className="text-xl font-bold text-[color:var(--text-primary)]">Ticket Details</h2>
              <p className="mt-0.5 text-sm font-medium text-[color:var(--accent-gold)]">#{displayTicket?.ticketNumber ?? ticket.ticketNumber}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl p-2 text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)]"
              aria-label="Close drawer"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--border-strong)]">
            {isLoadingDetails && !fullTicket ? (
              <div className="py-12 text-center text-sm text-[color:var(--text-muted)]">Loading ticket details…</div>
            ) : isDetailsError ? (
              <div
                className="rounded-xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] px-4 py-6 text-center"
                role="alert"
              >
                <p className="text-sm font-semibold text-[color:var(--accent-red)]">Could not load ticket</p>
                <p className="mt-2 text-xs text-[color:var(--text-secondary)]">{getFriendlyApiErrorMessage(detailsError)}</p>
                <button
                  type="button"
                  onClick={() => void refetchDetails()}
                  className="mt-4 rounded-xl bg-[color:var(--accent-gold)] px-4 py-2 text-sm font-bold text-[color:var(--text-inverse)]"
                >
                  Try again
                </button>
              </div>
            ) : displayTicket ? (
              <>
                <div className={stSectionInner}>
                  <div className="mb-4 flex items-center gap-2 border-b border-[color:var(--border-default)] pb-3">
                    <svg className="h-5 w-5 text-[color:var(--accent-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                      />
                    </svg>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-primary)]">Ticket Info</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className={stFieldMetaLabelCls}>Status</p>
                      <div className="mt-1.5">
                        <span className={supportTicketStatusPillClass(displayTicket.status)}>
                          {supportTicketStatusLabel(displayTicket.status)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className={stFieldMetaLabelCls}>Title</p>
                      <p className="mt-1.5 text-sm font-semibold text-[color:var(--text-primary)]">{displayTicket.title}</p>
                    </div>

                    {displayTicket.description && (
                      <div>
                        <p className={stFieldMetaLabelCls}>Description</p>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-[color:var(--text-secondary)]">{displayTicket.description}</p>
                      </div>
                    )}

                    <div>
                      <p className={stFieldMetaLabelCls}>Project</p>
                      <p className="mt-1.5 text-sm text-[color:var(--text-secondary)]">
                        {displayTicket.project
                          ? `#${displayTicket.project.slNo} - ${displayTicket.project.customer?.customerName || 'Unknown Customer'}`
                          : 'N/A'}
                      </p>
                    </div>

                    <div>
                      <p className={stFieldMetaLabelCls}>Customer</p>
                      <p className="mt-1.5 text-sm text-[color:var(--text-secondary)]">{getCustomerName()}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                    <div>
                      <p className={stFieldMetaLabelCls}>Created By</p>
                      <p className="mt-1.5 text-sm font-medium text-[color:var(--text-primary)]">{displayTicket.createdBy?.name || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] border-l-4 border-l-[color:var(--accent-gold)]">
                  <div className="mb-4 flex items-center gap-2 border-b border-[color:var(--border-default)] pb-3">
                    <svg className="h-5 w-5 text-[color:var(--accent-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-primary)]">Follow-up Timeline</h3>
                  </div>
                  {displayTicket.activities && displayTicket.activities.length > 0 ? (
                    <div className="space-y-3">
                      {displayTicket.activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="rounded-lg border border-[color:var(--border-default)] border-l-4 border-l-[color:var(--accent-gold)] bg-[color:var(--bg-input)] py-3 pl-3 pr-3"
                        >
                          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-[color:var(--text-primary)]">{activity.createdBy?.name || 'N/A'}</p>
                              <p className={stTimestampCls}>{format(new Date(activity.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                            </div>
                            {activity.followUpDate && (
                              <span className="rounded-full bg-[color:var(--accent-gold-muted)] px-2 py-1 text-xs font-semibold text-[color:var(--text-primary)] ring-1 ring-[color:var(--accent-gold-border)]">
                                Follow-up: {format(new Date(activity.followUpDate), 'MMM dd, yyyy')}
                              </span>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--text-secondary)]">{activity.note}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`${stMutedCls} italic`}>No follow-ups yet</p>
                  )}
                </div>

                {canManageTickets && displayTicket.status !== SupportTicketStatus.CLOSED && (
                  <div className="rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-input)] p-5 ring-1 ring-[color:var(--border-default)] border-l-4 border-l-[color:var(--accent-blue)]">
                    <div className="mb-4 flex items-center gap-2 border-b border-[color:var(--border-default)] pb-3">
                      <svg className="h-5 w-5 text-[color:var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-primary)]">Add Follow-up</h3>
                    </div>
                    <form onSubmit={handleAddFollowUp} className="space-y-4">
                      <div>
                        <label htmlFor="st-drawer-note" className={stLabelCls}>
                          Note *
                        </label>
                        <textarea
                          id="st-drawer-note"
                          rows={4}
                          className={`mt-1.5 ${stInputCls}`}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="st-drawer-follow-up" className={stLabelCls}>
                          Follow-up Date (Optional)
                        </label>
                        <input
                          type="date"
                          id="st-drawer-follow-up"
                          className={`mt-1.5 ${stSelectCls}`}
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                        />
                      </div>
                      <button type="submit" disabled={isSubmitting} className={`w-full ${stPrimaryBtn}`}>
                        {isSubmitting ? 'Adding…' : 'Add follow-up'}
                      </button>
                    </form>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {displayTicket && (canManageTickets || isAdmin) && (
            <div className="shrink-0 space-y-2 border-t border-[color:var(--border-default)] bg-[color:var(--bg-surface)] p-5 sm:p-6">
              {canManageTickets && displayTicket.status !== SupportTicketStatus.CLOSED && (
                <button
                  type="button"
                  onClick={() => setConfirmAction('close')}
                  disabled={closeTicketMutation.isPending}
                  className="w-full rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] py-3 text-sm font-semibold text-[color:var(--text-primary)] transition-colors hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {closeTicketMutation.isPending ? 'Closing…' : 'Close ticket'}
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setConfirmAction('delete')}
                  disabled={deleteTicketMutation.isPending}
                  className="w-full rounded-xl border border-[color:var(--accent-red-border)] bg-[color:var(--accent-red-muted)] py-3 text-sm font-semibold text-[color:var(--accent-red)] transition-colors hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleteTicketMutation.isPending ? 'Deleting…' : 'Delete ticket'}
                </button>
              )}
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
            ? `Are you sure you want to close ticket ${displayTicket?.ticketNumber ?? ticket.ticketNumber}?`
            : confirmAction === 'delete'
              ? `Are you sure you want to permanently delete ticket ${displayTicket?.ticketNumber ?? ticket.ticketNumber}? This cannot be undone.`
              : ''
        }
        actions={[
          { label: 'Cancel', variant: 'ghost', onClick: () => setConfirmAction(null) },
          { label: 'Confirm', variant: 'primary', onClick: runConfirmAction },
        ]}
      />
    </>
  )
}

export default TicketDetailDrawer
