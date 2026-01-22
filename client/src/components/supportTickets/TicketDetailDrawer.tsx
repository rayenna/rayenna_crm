import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { SupportTicket, SupportTicketStatus, UserRole } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface TicketDetailDrawerProps {
  ticket: SupportTicket | null
  isOpen: boolean
  onClose: () => void
  onRefresh: () => void
}

const TicketDetailDrawer = ({ ticket, isOpen, onClose, onRefresh }: TicketDetailDrawerProps) => {
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canManageTickets = hasRole([UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS])

  const addActivityMutation = useMutation({
    mutationFn: async (data: { note: string; followUpDate?: string }) => {
      const res = await axiosInstance.post(`/api/support-tickets/${ticket!.id}/activity`, data)
      return res.data
    },
    onSuccess: () => {
      toast.success('Follow-up added successfully')
      setNote('')
      setFollowUpDate('')
      onRefresh()
      // Refresh the ticket data
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticket!.id] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add follow-up')
    },
    onSettled: () => {
      setIsSubmitting(false)
    },
  })

  const closeTicketMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.patch(`/api/support-tickets/${ticket!.id}/close`)
      return res.data
    },
    onSuccess: () => {
      toast.success('Ticket closed successfully')
      onRefresh()
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticket!.id] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to close ticket')
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

  const handleCloseTicket = () => {
    if (window.confirm(`Are you sure you want to close ticket ${ticket?.ticketNumber}?`)) {
      closeTicketMutation.mutate()
    }
  }

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

  const getCustomerName = () => {
    if (!ticket?.project?.customer) return 'N/A'
    const customer = ticket.project.customer
    const parts = [customer.prefix, customer.firstName, customer.middleName, customer.lastName].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : customer.customerName || 'N/A'
  }

  if (!ticket) return null

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Ticket Details</h2>
              <p className="text-sm text-gray-500 mt-1">#{ticket.ticketNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close drawer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Ticket Info */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                    {getStatusLabel(ticket.status)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Title</label>
                <p className="mt-1 text-gray-900 font-medium">{ticket.title}</p>
              </div>

              {ticket.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap">{ticket.description}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">Project</label>
                <p className="mt-1 text-gray-900">
                  {ticket.project ? `#${ticket.project.slNo} - ${ticket.project.customer?.customerName || 'Unknown Customer'}` : 'N/A'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Customer</label>
                <p className="mt-1 text-gray-900">{getCustomerName()}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created Date</label>
                  <p className="mt-1 text-gray-900">{format(new Date(ticket.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                {ticket.closedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Closed Date</label>
                    <p className="mt-1 text-gray-900">{format(new Date(ticket.closedAt), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Created By</label>
                <p className="mt-1 text-gray-900">{ticket.createdBy?.name || 'N/A'}</p>
              </div>
            </div>

            {/* Follow-up Timeline */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow-up Timeline</h3>
              {ticket.activities && ticket.activities.length > 0 ? (
                <div className="space-y-4">
                  {ticket.activities.map((activity) => (
                    <div key={activity.id} className="border-l-2 border-primary-500 pl-4 pb-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activity.createdBy?.name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(activity.createdAt), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                        {activity.followUpDate && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            Follow-up: {format(new Date(activity.followUpDate), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{activity.note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No follow-ups yet</p>
              )}
            </div>

            {/* Add Follow-up Form */}
            {canManageTickets && ticket.status !== SupportTicketStatus.CLOSED && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Follow-up</h3>
                <form onSubmit={handleAddFollowUp} className="space-y-4">
                  <div>
                    <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                      Note *
                    </label>
                    <textarea
                      id="note"
                      rows={4}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="followUpDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Follow-up Date (Optional)
                    </label>
                    <input
                      type="date"
                      id="followUpDate"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Follow-up'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {canManageTickets && ticket.status !== SupportTicketStatus.CLOSED && (
            <div className="border-t border-gray-200 p-6">
              <button
                onClick={handleCloseTicket}
                disabled={closeTicketMutation.isPending}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {closeTicketMutation.isPending ? 'Closing...' : 'Close Ticket'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default TicketDetailDrawer
