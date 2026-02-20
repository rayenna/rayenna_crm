import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { SupportTicket, SupportTicketStatus, UserRole, ProjectStatus } from '../../types'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import CreateTicketModal from './CreateTicketModal'
import ViewTicketModal from './ViewTicketModal'

interface SupportTicketsSectionProps {
  projectId: string
  projectStatus?: ProjectStatus
}

const SupportTicketsSection = ({ projectId, projectStatus }: SupportTicketsSectionProps) => {
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)

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
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to close ticket')
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
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete ticket')
    },
  })

  const getStatusColor = (status: SupportTicketStatus) => {
    switch (status) {
      case SupportTicketStatus.OPEN:
        return 'bg-indigo-100 text-indigo-800'
      case SupportTicketStatus.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800'
      case SupportTicketStatus.CLOSED:
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: SupportTicketStatus) => {
    switch (status) {
      case SupportTicketStatus.OPEN:
        return 'Open'
      case SupportTicketStatus.IN_PROGRESS:
        return 'In Progress'
      case SupportTicketStatus.CLOSED:
        return 'Closed'
      default:
        return status
    }
  }

  const handleCloseTicket = (ticket: SupportTicket) => {
    if (window.confirm(`Are you sure you want to close ticket ${ticket.ticketNumber}?`)) {
      closeTicketMutation.mutate(ticket.id)
    }
  }

  const handleDeleteTicket = (ticket: SupportTicket) => {
    if (window.confirm(`Are you sure you want to permanently delete ticket ${ticket.ticketNumber}? This action cannot be undone.`)) {
      deleteTicketMutation.mutate(ticket.id)
    }
  }

  return (
    <>
      <div className="bg-gradient-to-br from-orange-50/50 to-gray-50/60 rounded-xl p-5 space-y-4 border-l-4 border-l-orange-400 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Support / Service Tickets</h2>
          </div>
          {canManageTickets && (
            <button
              onClick={() => !isProjectLost && setShowCreateModal(true)}
              disabled={isProjectLost}
              className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
                isProjectLost
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-600 to-primary-600 text-white hover:from-orange-700 hover:to-primary-700 shadow-md'
              }`}
              title={isProjectLost ? 'Cannot create tickets for projects in Lost stage' : 'Create Ticket'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Ticket
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading tickets...</div>
        ) : !tickets || tickets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No support tickets found for this project.</p>
            {canManageTickets && (
              <button
                onClick={() => !isProjectLost && setShowCreateModal(true)}
                disabled={isProjectLost}
                className={`mt-4 font-medium ${
                  isProjectLost
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-primary-600 hover:text-primary-700'
                }`}
                title={isProjectLost ? 'Cannot create tickets for projects in Lost stage' : 'Create the first ticket'}
              >
                Create the first ticket
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Closed Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="bg-white hover:bg-orange-50/50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{ticket.ticketNumber}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={ticket.title}>
                        {ticket.title}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.closedAt ? format(new Date(ticket.closedAt), 'MMM dd, yyyy') : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="text-primary-600 hover:text-primary-900"
                          title="View Ticket"
                        >
                          👁️ View
                        </button>
                        {canManageTickets && ticket.status !== SupportTicketStatus.CLOSED && (
                          <button
                            onClick={() => handleCloseTicket(ticket)}
                            className="text-green-600 hover:text-green-900"
                            title="Close Ticket"
                            disabled={closeTicketMutation.isPending}
                          >
                            ✅ Close
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteTicket(ticket)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Ticket (Admin Only)"
                            disabled={deleteTicketMutation.isPending}
                          >
                            🗑️ Delete
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
      </div>

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
    </>
  )
}

export default SupportTicketsSection
