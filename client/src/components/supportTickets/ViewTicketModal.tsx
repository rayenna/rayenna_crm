import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../../utils/axios'
import { useAuth } from '../../contexts/AuthContext'
import { SupportTicket, SupportTicketStatus, UserRole } from '../../types'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface ViewTicketModalProps {
  ticket: SupportTicket
  onClose: () => void
  onRefresh: () => void
}

const ViewTicketModal = ({ ticket, onClose, onRefresh }: ViewTicketModalProps) => {
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [activityNote, setActivityNote] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')

  const canManageTickets = hasRole([UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS])

  // Fetch full ticket details with activities
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
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add follow-up')
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
      onRefresh()
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
    if (window.confirm(`Are you sure you want to close ticket ${ticket.ticketNumber}?`)) {
      closeTicketMutation.mutate()
    }
  }

  const displayTicket = fullTicket || ticket

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Support Ticket Details</h2>
              <p className="text-sm text-gray-500 mt-1">Ticket #{displayTicket.ticketNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading ticket details...</div>
          ) : (
            <div className="space-y-6">
              {/* Ticket Info */}
              <div className="border-b pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(displayTicket.status)}`}>
                        {getStatusLabel(displayTicket.status)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created By</label>
                    <p className="mt-1 text-sm text-gray-900">{displayTicket.createdBy.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created Date</label>
                    <p className="mt-1 text-sm text-gray-900">{format(new Date(displayTicket.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                  {displayTicket.closedAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Closed Date</label>
                      <p className="mt-1 text-sm text-gray-900">{format(new Date(displayTicket.closedAt), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title and Description */}
              <div>
                <label className="text-sm font-medium text-gray-500">Title</label>
                <p className="mt-1 text-sm text-gray-900">{displayTicket.title}</p>
              </div>

              {displayTicket.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{displayTicket.description}</p>
                </div>
              )}

              {/* Activities/Follow-ups */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-gray-500">Follow-ups / Activity Log</label>
                  {canManageTickets && displayTicket.status !== SupportTicketStatus.CLOSED && (
                    <button
                      onClick={() => setShowAddActivity(!showAddActivity)}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Follow-up
                    </button>
                  )}
                </div>

                {showAddActivity && (
                  <form onSubmit={handleAddActivity} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Note <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={activityNote}
                        onChange={(e) => setActivityNote(e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Enter follow-up notes..."
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Follow-up Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddActivity(false)
                          setActivityNote('')
                          setFollowUpDate('')
                        }}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-300"
                        disabled={addActivityMutation.isPending || !activityNote.trim()}
                      >
                        {addActivityMutation.isPending ? 'Adding...' : 'Add Follow-up'}
                      </button>
                    </div>
                  </form>
                )}

                {!displayTicket.activities || displayTicket.activities.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No follow-ups yet</p>
                ) : (
                  <div className="space-y-3">
                    {displayTicket.activities.map((activity) => (
                      <div key={activity.id} className="border-l-4 border-primary-500 pl-4 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{activity.createdBy.name}</span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(activity.createdAt), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{activity.note}</p>
                        {activity.followUpDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            Follow-up: {format(new Date(activity.followUpDate), 'MMM dd, yyyy')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              {canManageTickets && displayTicket.status !== SupportTicketStatus.CLOSED && (
                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={handleCloseTicket}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    disabled={closeTicketMutation.isPending}
                  >
                    {closeTicketMutation.isPending ? 'Closing...' : '✅ Close Ticket'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ViewTicketModal
