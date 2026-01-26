import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import { SupportTicket, SupportTicketStatus } from '../types'
import { format } from 'date-fns'
import MetricCard from '../components/dashboard/MetricCard'
import TicketStatusDonutChart from '../components/supportTickets/TicketStatusDonutChart'
import TicketDetailDrawer from '../components/supportTickets/TicketDetailDrawer'
import { FaTicketAlt, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'

const SupportTicketsDashboard = () => {
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState<SupportTicketStatus | null>(null)
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Build query params - fetch all tickets for stats, filter in frontend for table
  const params = new URLSearchParams()
  // Don't filter by status in API - we'll filter in frontend for table display
  // But we still need stats, so fetch all

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['support-tickets-dashboard'],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/support-tickets?${params.toString()}`)
      return res.data as {
        tickets: SupportTicket[]
        statistics: {
          open: number
          inProgress: number
          closed: number
          overdue: number
          total: number
        }
      }
    },
  })

  const allTickets = data?.tickets || []
  const stats = data?.statistics || { open: 0, inProgress: 0, closed: 0, overdue: 0, total: 0 }

  // Filter tickets for the table
  // Table shows only OPEN and IN_PROGRESS tickets (not CLOSED)
  let filteredTickets = allTickets.filter(
    (t) => t.status === SupportTicketStatus.OPEN || t.status === SupportTicketStatus.IN_PROGRESS
  )

  // Apply status filter if selected (but only if it's OPEN or IN_PROGRESS)
  if (selectedStatus && (selectedStatus === SupportTicketStatus.OPEN || selectedStatus === SupportTicketStatus.IN_PROGRESS)) {
    filteredTickets = filteredTickets.filter((t) => t.status === selectedStatus)
  }
  // If CLOSED is selected, show empty table (since table is for open tickets only)
  if (selectedStatus === SupportTicketStatus.CLOSED) {
    filteredTickets = []
  }

  // Apply overdue filter if enabled
  if (showOverdueOnly) {
    const now = new Date()
    filteredTickets = filteredTickets.filter((ticket) => {
      // Check if ticket has any activity with follow-up date in the past
      if (!ticket.activities || ticket.activities.length === 0) return false
      return ticket.activities.some((activity) => {
        if (!activity.followUpDate) return false
        return new Date(activity.followUpDate) < now
      })
    })
  }

  const openTickets = filteredTickets

  // Prepare chart data
  const chartData = [
    {
      status: SupportTicketStatus.OPEN,
      label: 'Open',
      value: stats.open,
      color: '#3b82f6', // blue
    },
    {
      status: SupportTicketStatus.IN_PROGRESS,
      label: 'In Progress',
      value: stats.inProgress,
      color: '#f59e0b', // yellow
    },
    {
      status: SupportTicketStatus.CLOSED,
      label: 'Closed',
      value: stats.closed,
      color: '#6b7280', // gray
    },
  ]

  const handleKPIClick = (status: SupportTicketStatus | null, isOverdue: boolean = false) => {
    if (isOverdue) {
      setShowOverdueOnly(!showOverdueOnly)
      setSelectedStatus(null) // Clear status filter when showing overdue
    } else {
      setShowOverdueOnly(false) // Clear overdue filter when selecting status
      // Toggle: if already selected, deselect
      setSelectedStatus(selectedStatus === status ? null : status)
    }
  }

  const handleChartSliceClick = (status: SupportTicketStatus | null) => {
    setShowOverdueOnly(false) // Clear overdue filter when selecting from chart
    // Toggle: if already selected, deselect
    setSelectedStatus(selectedStatus === status ? null : status)
  }

  const handleTicketClick = async (ticket: SupportTicket) => {
    // Fetch full ticket details with all activities
    try {
      const res = await axiosInstance.get(`/api/support-tickets/${ticket.id}`)
      setSelectedTicket(res.data)
      setIsDrawerOpen(true)
    } catch (error: any) {
      console.error('Error fetching ticket details:', error)
    }
  }

  const handleRefresh = () => {
    refetch()
    queryClient.invalidateQueries({ queryKey: ['support-tickets-dashboard'] })
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

  const getLastFollowUpDate = (ticket: SupportTicket) => {
    if (!ticket.activities || ticket.activities.length === 0) return '-'
    const latestActivity = ticket.activities[0]
    return format(new Date(latestActivity.createdAt), 'MMM dd, yyyy')
  }

  const handleClearFilters = () => {
    setSelectedStatus(null)
    setShowOverdueOnly(false)
  }

  const hasActiveFilters = selectedStatus !== null || showOverdueOnly

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-primary-800">Support Tickets Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitor and manage all support tickets across projects
          </p>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear Filters
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => handleKPIClick(SupportTicketStatus.OPEN)}
          className={`text-left transition-transform hover:scale-105 ${selectedStatus === SupportTicketStatus.OPEN ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}
        >
          <MetricCard
            title="Open"
            value={stats.open}
            icon={<FaTicketAlt />}
            gradient="from-blue-500 to-cyan-500"
          />
        </button>
        <button
          onClick={() => handleKPIClick(SupportTicketStatus.IN_PROGRESS)}
          className={`text-left transition-transform hover:scale-105 ${selectedStatus === SupportTicketStatus.IN_PROGRESS ? 'ring-2 ring-yellow-500 rounded-lg' : ''}`}
        >
          <MetricCard
            title="In Progress"
            value={stats.inProgress}
            icon={<FaSpinner />}
            gradient="from-yellow-500 to-orange-500"
          />
        </button>
        <button
          onClick={() => handleKPIClick(SupportTicketStatus.CLOSED)}
          className={`text-left transition-transform hover:scale-105 ${selectedStatus === SupportTicketStatus.CLOSED ? 'ring-2 ring-gray-500 rounded-lg' : ''}`}
        >
          <MetricCard
            title="Closed"
            value={stats.closed}
            icon={<FaCheckCircle />}
            gradient="from-gray-500 to-gray-600"
          />
        </button>
        <button
          onClick={() => handleKPIClick(null, true)}
          className={`text-left transition-transform hover:scale-105 ${showOverdueOnly ? 'ring-2 ring-red-500 rounded-lg' : ''}`}
        >
          <MetricCard
            title="Overdue"
            value={stats.overdue}
            icon={<FaExclamationTriangle />}
            gradient="from-red-500 to-rose-500"
          />
        </button>
      </div>

      {/* Middle Section - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Donut Chart */}
        <div>
          {isLoading ? (
            <div className="bg-white shadow rounded-lg p-6 flex items-center justify-center h-[450px]">
              <div className="text-gray-500">Loading chart...</div>
            </div>
          ) : (
            <TicketStatusDonutChart
              data={chartData}
              onSliceClick={handleChartSliceClick}
              selectedStatus={selectedStatus}
            />
          )}
        </div>

        {/* Right Column - Open Tickets Table */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Open Support Tickets</h3>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading tickets...</div>
          ) : openTickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No open tickets found</p>
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
                      Project Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Follow-up
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {openTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleTicketClick(ticket)}
                          className="text-sm font-medium text-primary-600 hover:text-primary-900"
                        >
                          {ticket.ticketNumber}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={ticket.project ? `#${ticket.project.slNo} - ${ticket.project.customer?.customerName || 'Unknown Customer'}` : 'N/A'}>
                          {ticket.project ? `#${ticket.project.slNo} - ${ticket.project.customer?.customerName || 'Unknown Customer'}` : 'N/A'}
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
                        {getLastFollowUpDate(ticket)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleTicketClick(ticket)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Detail Drawer */}
      <TicketDetailDrawer
        ticket={selectedTicket}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false)
          setSelectedTicket(null)
        }}
        onRefresh={handleRefresh}
      />
    </div>
  )
}

export default SupportTicketsDashboard
