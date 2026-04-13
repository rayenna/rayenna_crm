import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import { SupportTicket, SupportTicketStatus } from '../types'
import { format } from 'date-fns'
import MetricCard from '../components/dashboard/MetricCard'
import TicketStatusDonutChart from '../components/supportTickets/TicketStatusDonutChart'
import TicketDetailDrawer from '../components/supportTickets/TicketDetailDrawer'
import { FaTicketAlt, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'
import PageCard from '../components/PageCard'

type SupportTicketsTableSortKey =
  | 'ticketNumber'
  | 'projectName'
  | 'status'
  | 'createdAt'
  | 'lastFollowUp'
  | 'updatedAt'

function defaultOrderForSupportTicketsSortKey(key: SupportTicketsTableSortKey): 'asc' | 'desc' {
  const descFirst = new Set<SupportTicketsTableSortKey>(['createdAt', 'lastFollowUp', 'updatedAt'])
  return descFirst.has(key) ? 'desc' : 'asc'
}

function projectDisplayLine(ticket: SupportTicket): string {
  if (!ticket.project) return 'N/A'
  return `#${ticket.project.slNo} - ${ticket.project.customer?.customerName || 'Unknown Customer'}`
}

function lastFollowUpActivityTime(ticket: SupportTicket): number {
  if (!ticket.activities?.length) return Number.NEGATIVE_INFINITY
  let latest = 0
  for (const a of ticket.activities) {
    const t = new Date(a.createdAt).getTime()
    if (t > latest) latest = t
  }
  return latest
}

const STATUS_SORT_RANK: Record<SupportTicketStatus, number> = {
  [SupportTicketStatus.OPEN]: 0,
  [SupportTicketStatus.IN_PROGRESS]: 1,
  [SupportTicketStatus.CLOSED]: 2,
}

const SupportTicketsDashboard = () => {
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState<SupportTicketStatus | null>(null)
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [tableSortBy, setTableSortBy] = useState<SupportTicketsTableSortKey>('createdAt')
  const [tableSortOrder, setTableSortOrder] = useState<'asc' | 'desc'>('desc')

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

  const filteredTickets = useMemo(() => {
    let list = [...allTickets]
    if (selectedStatus) {
      list = list.filter((t) => t.status === selectedStatus)
    }
    if (showOverdueOnly) {
      const now = new Date()
      list = list.filter((ticket) => {
        if (ticket.status === SupportTicketStatus.CLOSED) return false
        if (!ticket.activities || ticket.activities.length === 0) return false
        return ticket.activities.some((activity) => {
          if (!activity.followUpDate) return false
          return new Date(activity.followUpDate) < now
        })
      })
    }
    return list
  }, [allTickets, selectedStatus, showOverdueOnly])

  const handleSupportTicketsColumnSort = (sortKey: SupportTicketsTableSortKey) => {
    setTableSortBy((prevKey) => {
      if (prevKey === sortKey) {
        setTableSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
        return prevKey
      }
      setTableSortOrder(defaultOrderForSupportTicketsSortKey(sortKey))
      return sortKey
    })
  }

  const tableTickets = useMemo(() => {
    const list = [...filteredTickets]
    const mul = tableSortOrder === 'asc' ? 1 : -1
    list.sort((a, b) => {
      let cmp = 0
      switch (tableSortBy) {
        case 'ticketNumber':
          cmp = a.ticketNumber.localeCompare(b.ticketNumber, undefined, { numeric: true })
          break
        case 'projectName':
          cmp = projectDisplayLine(a).localeCompare(projectDisplayLine(b), undefined, { sensitivity: 'base' })
          break
        case 'status':
          cmp = STATUS_SORT_RANK[a.status] - STATUS_SORT_RANK[b.status]
          break
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'lastFollowUp':
          cmp = lastFollowUpActivityTime(a) - lastFollowUpActivityTime(b)
          break
        case 'updatedAt':
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
        default:
          cmp = 0
      }
      return cmp * mul
    })
    return list
  }, [filteredTickets, tableSortBy, tableSortOrder])

  /** Same ⇕ icon as Projects table; reserved box size so labels never clip. */
  function SupportTicketsSortGlyph({ sortKey }: { sortKey: SupportTicketsTableSortKey }) {
    const active = tableSortBy === sortKey
    const box = active
      ? 'border-amber-400/90 bg-amber-400/15 text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
      : 'border-white/20 bg-black/15 text-slate-300/90 group-hover:border-amber-300/45 group-hover:bg-white/10 group-hover:text-amber-100'
    return (
      <span
        className={`inline-flex size-6 shrink-0 select-none items-center justify-center rounded border transition-colors ${box}`}
        aria-hidden
      >
        <svg
          className="block size-[14px] shrink-0 text-current opacity-95"
          viewBox="0 0 24 24"
          width={14}
          height={14}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          stroke="currentColor"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          overflow="visible"
        >
          <path d="M8 10l4-4 4 4M8 14l4 4 4-4" />
        </svg>
      </span>
    )
  }

  const sortBtnHeader =
    'group flex min-h-[2rem] w-full min-w-0 flex-nowrap items-center gap-2 overflow-visible rounded-md px-1.5 py-1 text-left transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/65 focus-visible:ring-offset-1 focus-visible:ring-offset-primary-800 sm:min-h-[2.5rem] sm:gap-2 sm:px-2 sm:py-1.5'
  const sortLabelLeft =
    'min-w-0 flex-1 basis-0 whitespace-normal break-words text-left text-[11px] font-bold uppercase leading-snug tracking-wide text-slate-100 sm:text-xs sm:leading-tight sm:tracking-wider'

  const ariaSortFor = (key: SupportTicketsTableSortKey): 'ascending' | 'descending' | 'none' =>
    tableSortBy === key ? (tableSortOrder === 'asc' ? 'ascending' : 'descending') : 'none'

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
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('Error fetching ticket details:', error)
    }
  }

  const handleRefresh = () => {
    refetch()
    queryClient.invalidateQueries({ queryKey: ['support-tickets-dashboard'] })
  }

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
    <div className="px-0 py-6 sm:px-0">
      <PageCard
        title="Support Tickets Dashboard"
        subtitle="Monitor and manage all support tickets across projects"
        icon={<FaTicketAlt className="w-5 h-5 text-white" />}
        headerAction={hasActiveFilters ? (
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 bg-white/20 border border-white/40 text-white px-4 py-2 rounded-xl hover:bg-white/30 font-medium transition-colors shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear Filters
          </button>
        ) : undefined}
        className="max-w-full"
      >
      <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => handleKPIClick(SupportTicketStatus.OPEN)}
          className={`text-left transition-transform hover:scale-105 ${selectedStatus === SupportTicketStatus.OPEN ? 'ring-2 ring-indigo-500 rounded-lg' : ''}`}
        >
          <MetricCard
            title="Open"
            value={stats.open}
            icon={<FaTicketAlt />}
            gradient="from-indigo-500 to-cyan-500"
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
            <div className="bg-gradient-to-br from-white to-orange-50/20 shadow rounded-xl border border-orange-100/60 p-6 flex items-center justify-center h-[450px]">
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

        {/* Right Column - All Support Tickets Table (header row matches Projects table) */}
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">All Support Tickets</h3>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading tickets...</div>
          ) : tableTickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No support tickets found</p>
            </div>
          ) : (
            <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-gray-200/90 bg-white shadow-lg shadow-gray-900/5 ring-1 ring-gray-100 [-webkit-overflow-scrolling:touch]">
              {/* w-max: scroll width matches column content — avoids min-w-full stretching past the last column */}
              <table className="w-max max-w-none text-sm leading-snug">
                <thead>
                  <tr className="border-b border-primary-900/25 bg-gradient-to-r from-primary-800 via-slate-700 to-primary-900 shadow-sm shadow-black/10">
                    <th scope="col" className="px-2.5 py-2 align-middle sm:px-3 sm:py-2" aria-sort={ariaSortFor('ticketNumber')}>
                      <button
                        type="button"
                        className={sortBtnHeader}
                        title="Sort by ticket number"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSupportTicketsColumnSort('ticketNumber')
                        }}
                      >
                        <span className={sortLabelLeft}>Ticket number</span>
                        <SupportTicketsSortGlyph sortKey="ticketNumber" />
                      </button>
                    </th>
                    <th scope="col" className="px-2.5 py-2 align-middle sm:px-3 sm:py-2" aria-sort={ariaSortFor('projectName')}>
                      <button
                        type="button"
                        className={sortBtnHeader}
                        title="Sort by project name"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSupportTicketsColumnSort('projectName')
                        }}
                      >
                        <span className={sortLabelLeft}>Project name</span>
                        <SupportTicketsSortGlyph sortKey="projectName" />
                      </button>
                    </th>
                    <th scope="col" className="px-2.5 py-2 align-middle sm:px-3 sm:py-2" aria-sort={ariaSortFor('status')}>
                      <button
                        type="button"
                        className={sortBtnHeader}
                        title="Sort by status"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSupportTicketsColumnSort('status')
                        }}
                      >
                        <span className={sortLabelLeft}>Status</span>
                        <SupportTicketsSortGlyph sortKey="status" />
                      </button>
                    </th>
                    <th scope="col" className="px-2.5 py-2 align-middle sm:px-3 sm:py-2" aria-sort={ariaSortFor('createdAt')}>
                      <button
                        type="button"
                        className={sortBtnHeader}
                        title="Sort by created date"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSupportTicketsColumnSort('createdAt')
                        }}
                      >
                        <span className={sortLabelLeft}>Created date</span>
                        <SupportTicketsSortGlyph sortKey="createdAt" />
                      </button>
                    </th>
                    <th scope="col" className="px-2.5 py-2 align-middle sm:px-3 sm:py-2" aria-sort={ariaSortFor('lastFollowUp')}>
                      <button
                        type="button"
                        className={sortBtnHeader}
                        title="Sort by last follow-up activity date"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSupportTicketsColumnSort('lastFollowUp')
                        }}
                      >
                        <span className={sortLabelLeft}>Last follow-up</span>
                        <SupportTicketsSortGlyph sortKey="lastFollowUp" />
                      </button>
                    </th>
                    <th scope="col" className="px-2.5 py-2 align-middle sm:px-3 sm:py-2" aria-sort={ariaSortFor('updatedAt')}>
                      <button
                        type="button"
                        className={sortBtnHeader}
                        title="Sort by last updated (reflects follow-ups and changes)"
                        aria-label="Sort by last updated"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSupportTicketsColumnSort('updatedAt')
                        }}
                      >
                        <span className={sortLabelLeft}>Action</span>
                        <SupportTicketsSortGlyph sortKey="updatedAt" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/90">
                  {tableTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="bg-white transition-colors duration-150 ease-out odd:bg-white even:bg-slate-50/45 hover:bg-primary-50/70"
                    >
                      <td className="min-w-0 whitespace-nowrap px-2 py-2 sm:px-2.5 lg:py-1.5">
                        <button
                          type="button"
                          onClick={() => handleTicketClick(ticket)}
                          className="text-sm font-semibold text-primary-600 hover:text-primary-900"
                        >
                          {ticket.ticketNumber}
                        </button>
                      </td>
                      <td className="min-w-0 px-2 py-2 sm:px-2.5 lg:py-1.5">
                        <div
                          className="max-w-[14rem] truncate text-sm text-gray-900 sm:max-w-xs lg:max-w-[16rem]"
                          title={projectDisplayLine(ticket)}
                        >
                          {projectDisplayLine(ticket)}
                        </div>
                      </td>
                      <td className="min-w-0 whitespace-nowrap px-2 py-2 sm:px-2.5 lg:py-1.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(ticket.status)}`}
                        >
                          {getStatusLabel(ticket.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-sm text-gray-600 tabular-nums sm:px-2.5 lg:py-1.5">
                        {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-sm text-gray-600 tabular-nums sm:px-2.5 lg:py-1.5">
                        {getLastFollowUpDate(ticket)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-sm font-medium sm:px-2.5 lg:py-1.5">
                        <button
                          type="button"
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
      </div>
      </PageCard>

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
