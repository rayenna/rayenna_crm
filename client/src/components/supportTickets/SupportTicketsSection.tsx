import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { SupportTicket, SupportTicketStatus, UserRole, ProjectStatus } from '../../types'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import CreateTicketModal from './CreateTicketModal'
import ViewTicketModal from './ViewTicketModal'
import { ErrorModal } from '@/components/common/ErrorModal'
import {
  stPrimaryBtn,
  stTableThCls,
  stLinkAccent,
  supportTicketStatusLabel,
  supportTicketStatusPillClass,
} from './supportTicketsZenith'

interface SupportTicketsSectionProps {
  projectId: string
  projectStatus?: ProjectStatus
}

const SupportTicketsSection = ({ projectId, projectStatus }: SupportTicketsSectionProps) => {
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [confirmState, setConfirmState] = useState<{ action: 'close' | 'delete'; ticket: SupportTicket } | null>(null)

  const canManageTickets = hasRole([UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS])
  const isAdmin = hasRole([UserRole.ADMIN])
  const isProjectLost = projectStatus === ProjectStatus.LOST

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-tickets', projectId],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/support-tickets/project/${projectId}`)
      return res.data as SupportTicket[]
    },
  })

  const closeTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await axiosInstance.patch(`/api/support-tickets/${ticketId}/close`)
      return res.data as SupportTicket
    },
    onSuccess: () => {
      toast.success('Ticket closed successfully')
      queryClient.invalidateQueries({ queryKey: ['support-tickets', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
    },
  })

  const deleteTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      await axiosInstance.delete(`/api/support-tickets/${ticketId}`)
    },
    onSuccess: () => {
      toast.success('Ticket deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['support-tickets', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyApiErrorMessage(error))
    },
  })

  const handleCloseTicket = (ticket: SupportTicket) => {
    setConfirmState({ action: 'close', ticket })
  }

  const handleDeleteTicket = (ticket: SupportTicket) => {
    setConfirmState({ action: 'delete', ticket })
  }

  const runConfirmAction = () => {
    if (!confirmState) return
    if (confirmState.action === 'close') {
      closeTicketMutation.mutate(confirmState.ticket.id)
    } else {
      deleteTicketMutation.mutate(confirmState.ticket.id)
    }
    setConfirmState(null)
  }

  return (
    <div className="relative">
      <section className="space-y-4 overflow-hidden rounded-xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] border-l-4 border-l-[color:var(--accent-gold)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <svg
              className="h-5 w-5 shrink-0 text-[color:var(--accent-gold)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h2 className="truncate text-xs font-bold uppercase tracking-wider text-[color:var(--text-primary)]">
              Support / Service Tickets
            </h2>
          </div>
          {canManageTickets && (
            <button
              type="button"
              onClick={() => !isProjectLost && setShowCreateModal(true)}
              disabled={isProjectLost}
              className={
                isProjectLost
                  ? 'cursor-not-allowed rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2 text-sm font-semibold text-[color:var(--text-muted)]'
                  : stPrimaryBtn
              }
              title={isProjectLost ? 'Cannot create tickets for projects in Lost stage' : 'Create Ticket'}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Ticket
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-[color:var(--text-muted)]">Loading tickets…</div>
        ) : !tickets || tickets.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-[color:var(--text-secondary)]">No support tickets found for this project.</p>
            {canManageTickets && (
              <button
                type="button"
                onClick={() => !isProjectLost && setShowCreateModal(true)}
                disabled={isProjectLost}
                className={`mt-4 text-sm ${isProjectLost ? 'cursor-not-allowed text-[color:var(--text-muted)]' : stLinkAccent}`}
                title={isProjectLost ? 'Cannot create tickets for projects in Lost stage' : 'Create the first ticket'}
              >
                Create the first ticket
              </button>
            )}
          </div>
        ) : (
          <div className="zenith-scroll-x -mx-1 overflow-x-auto rounded-xl border border-[color:var(--border-default)] ring-1 ring-[color:var(--border-default)]">
            <table className="min-w-full divide-y divide-[color:var(--border-default)]">
              <thead className="bg-[color:var(--zenith-table-header-bg)]">
                <tr>
                  <th className={stTableThCls}>
                    Ticket Number
                  </th>
                  <th className={stTableThCls}>
                    Title
                  </th>
                  <th className={stTableThCls}>
                    Status
                  </th>
                  <th className={stTableThCls}>
                    Created Date
                  </th>
                  <th className={stTableThCls}>
                    Closed Date
                  </th>
                  <th className={stTableThCls}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border-default)]">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="transition-colors hover:bg-[color:var(--bg-table-hover)]">
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="text-sm font-semibold text-[color:var(--text-primary)]">{ticket.ticketNumber}</span>
                    </td>
                    <td className="max-w-[14rem] px-4 py-3.5 sm:max-w-xs">
                      <div className="truncate text-sm text-[color:var(--text-secondary)]" title={ticket.title}>
                        {ticket.title}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className={supportTicketStatusPillClass(ticket.status)}>
                        {supportTicketStatusLabel(ticket.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-sm text-[color:var(--text-muted)]">
                      {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-sm text-[color:var(--text-muted)]">
                      {ticket.closedAt ? format(new Date(ticket.closedAt), 'MMM dd, yyyy') : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(ticket)}
                          className="text-[color:var(--accent-gold)] hover:opacity-90 hover:underline"
                          title="View ticket"
                        >
                          View
                        </button>
                        {canManageTickets && ticket.status !== SupportTicketStatus.CLOSED && (
                          <button
                            type="button"
                            onClick={() => handleCloseTicket(ticket)}
                            className="text-[color:var(--accent-gold)] hover:underline"
                            title="Close ticket"
                            disabled={closeTicketMutation.isPending}
                          >
                            Close
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTicket(ticket)}
                            className="text-[color:var(--accent-red)] hover:opacity-90 hover:underline"
                            title="Delete ticket (Admin only)"
                            disabled={deleteTicketMutation.isPending}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showCreateModal && (
        <CreateTicketModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            queryClient.invalidateQueries({ queryKey: ['support-tickets', projectId] })
          }}
        />
      )}

      {selectedTicket && (
        <ViewTicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ['support-tickets', projectId] })
          }}
        />
      )}

      <ErrorModal
        open={!!confirmState}
        onClose={() => setConfirmState(null)}
        type="warning"
        anchor="parent"
        message={
          confirmState
            ? confirmState.action === 'close'
              ? `Are you sure you want to close ticket ${confirmState.ticket.ticketNumber}?`
              : `Are you sure you want to permanently delete ticket ${confirmState.ticket.ticketNumber}? This action cannot be undone.`
            : ''
        }
        actions={[
          { label: 'Cancel', variant: 'ghost', onClick: () => setConfirmState(null) },
          { label: 'Confirm', variant: 'primary', onClick: runConfirmAction },
        ]}
      />
    </div>
  )
}

export default SupportTicketsSection
