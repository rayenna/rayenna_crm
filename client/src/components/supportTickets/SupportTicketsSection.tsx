import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { SupportTicket, SupportTicketStatus, UserRole } from '../../types'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import CreateTicketModal from './CreateTicketModal'
import ViewTicketModal from './ViewTicketModal'

interface SupportTicketsSectionProps {
  projectId: string
}

const SupportTicketsSection = ({ projectId }: SupportTicketsSectionProps) => {
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)

  const canManageTickets = hasRole([UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS])

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
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to close ticket')
    },
  })

  const getStatusColor = (status: SupportTicketStatus) => {
    switch (status) {
      case SupportTicketStatus.OPEN:
        return 'bg-blue-100 text-blue-800'
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

  return (
    <>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Support / Service Tickets</h2>
          {canManageTickets && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm flex items-center gap-2"
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
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
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
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
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
