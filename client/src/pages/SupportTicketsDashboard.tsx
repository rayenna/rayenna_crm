import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import { SupportTicket, SupportTicketStatus } from '../types'
import { format } from 'date-fns'
import MetricCard from '../components/dashboard/MetricCard'
import TicketStatusDonutChart from '../components/supportTickets/TicketStatusDonutChart'
import TicketDetailDrawer from '../components/supportTickets/TicketDetailDrawer'
import { Ticket, Sparkles } from 'lucide-react'
import { FaTicketAlt, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'

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
      ? 'border-[color:var(--accent-gold-border)] bg-[color:color-mix(in srgb,var(--accent-gold) 18%, transparent)] text-[color:var(--accent-gold)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
      : 'border-[color:var(--border-default)] bg-[color:var(--bg-surface)] text-[color:var(--text-muted)] group-hover:border-[color:var(--accent-gold-border)] group-hover:bg-[color:var(--bg-card-hover)] group-hover:text-[color:var(--accent-gold)]'
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

  /** Narrow columns + flex-1/basis-0/break-words on labels caused one-letter-per-line headers with table-fixed */
  const sortBtnHeader =
    'group flex min-h-[2rem] w-full min-w-0 flex-nowrap items-center gap-2 overflow-hidden rounded-md px-1.5 py-1 text-left transition-colors hover:bg-[color:var(--bg-table-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--bg-page)] sm:min-h-[2.5rem] sm:gap-2 sm:px-2 sm:py-1.5'
  const sortLabelLeft =
    'min-w-0 flex-1 truncate whitespace-nowrap text-left text-[11px] font-bold uppercase leading-snug tracking-wide text-[color:var(--text-secondary)] sm:text-xs sm:leading-tight sm:tracking-wider'

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

  const shell = (children: React.ReactNode) => (
    <div className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] min-h-[calc(100vh-5rem)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(0.35rem,env(safe-area-inset-top,0px))] [-webkit-tap-highlight-color:transparent]">
      <div className="zenith-exec-main mx-auto w-full max-w-full min-w-0 px-3 sm:px-5 pb-10">{children}</div>
    </div>
  )

  const statusChipClass = (status: SupportTicketStatus) => {
    if (status === SupportTicketStatus.OPEN)
      return 'bg-[color:var(--accent-blue-muted)] text-[color:var(--accent-blue)] border border-[color:var(--accent-blue-border)]'
    if (status === SupportTicketStatus.IN_PROGRESS)
      return 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)] border border-[color:var(--accent-gold-border)]'
    return 'bg-[color:var(--bg-input)] text-[color:var(--text-secondary)] border border-[color:var(--border-default)]'
  }

  return shell(
    <>
      <header className="sticky top-0 z-30 mb-4 border-b border-[color:var(--border-default)] bg-[color:color-mix(in srgb,var(--bg-surface) 94%, transparent)] pb-3 pt-1 backdrop-blur-xl sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] shadow-inner">
              <Ticket className="h-5 w-5 text-[color:var(--accent-gold)]" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="zenith-display text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">Support Tickets</h1>
              <p className="mt-0.5 text-sm text-[color:var(--text-muted)]">Monitor and manage support tickets across projects</p>
            </div>
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--bg-card-hover)] sm:w-auto"
            >
              <span className="text-[color:var(--text-muted)]" aria-hidden>×</span>
              Clear filters
            </button>
          ) : null}
        </div>
      </header>

      <div className="min-w-0 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button type="button" onClick={() => handleKPIClick(SupportTicketStatus.OPEN)} className="text-left">
            <MetricCard variant="zenith" title="Open" value={stats.open} icon={<FaTicketAlt />} gradient="from-[color:var(--accent-blue)] to-[color:var(--accent-teal)]" />
          </button>
          <button type="button" onClick={() => handleKPIClick(SupportTicketStatus.IN_PROGRESS)} className="text-left">
            <MetricCard variant="zenith" title="In Progress" value={stats.inProgress} icon={<FaSpinner />} gradient="from-[color:var(--accent-gold)] to-[color:var(--accent-amber)]" />
          </button>
          <button type="button" onClick={() => handleKPIClick(SupportTicketStatus.CLOSED)} className="text-left">
            <MetricCard variant="zenith" title="Closed" value={stats.closed} icon={<FaCheckCircle />} gradient="from-[#94a3b8] to-[#64748b]" />
          </button>
          <button type="button" onClick={() => handleKPIClick(null, true)} className="text-left">
            <MetricCard
              variant="zenith"
              title="Overdue"
              value={stats.overdue}
              icon={<FaExclamationTriangle />}
              gradient="from-[color:var(--accent-red)] to-[color:var(--accent-amber)]"
            />
          </button>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
          <div className="min-w-0 lg:self-start">
            {isLoading ? (
              <div className="flex h-[420px] items-center justify-center rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-6 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
                <div className="text-[color:var(--text-muted)]">Loading chart…</div>
              </div>
            ) : (
              <TicketStatusDonutChart data={chartData} onSliceClick={handleChartSliceClick} selectedStatus={selectedStatus} />
            )}
          </div>

          <div className="flex min-h-[22rem] min-w-0 flex-col lg:h-full lg:min-h-0">
            {isLoading ? (
              <div className="flex min-h-[22rem] flex-1 flex-col overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-6 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] lg:h-full lg:min-h-0">
                <h3 className="zenith-display mb-4 shrink-0 text-lg font-semibold text-[color:var(--text-primary)]">All Support Tickets</h3>
                <div className="flex flex-1 items-center justify-center text-[color:var(--text-muted)]">Loading tickets…</div>
              </div>
            ) : tableTickets.length === 0 ? (
              <div className="flex min-h-[22rem] flex-1 flex-col overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-6 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] lg:h-full lg:min-h-0">
                <h3 className="zenith-display mb-4 shrink-0 text-lg font-semibold text-[color:var(--text-primary)]">All Support Tickets</h3>
                <div className="flex flex-1 flex-col items-center justify-center text-center text-[color:var(--text-muted)]">
                  <p>No support tickets found</p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-6 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] lg:h-full">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="zenith-display shrink-0 text-lg font-semibold text-[color:var(--text-primary)]">All Support Tickets</h3>
                  <div className="hidden items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)] lg:flex">
                    <Sparkles className="h-4 w-4 text-[color:var(--accent-gold)]" aria-hidden />
                    Live list
                  </div>
                </div>

                <ul className="space-y-3 md:hidden" aria-label="Support tickets list">
                  {tableTickets.map((ticket) => (
                    <li key={ticket.id} className="rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => handleTicketClick(ticket)}
                          className="text-left font-semibold text-[color:var(--accent-teal)] hover:opacity-90"
                          title={ticket.ticketNumber}
                        >
                          {ticket.ticketNumber}
                        </button>
                        <span className={`inline-flex max-w-[55%] items-center truncate rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${statusChipClass(ticket.status)}`}>
                          {getStatusLabel(ticket.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[color:var(--text-primary)]" title={projectDisplayLine(ticket)}>
                        {projectDisplayLine(ticket)}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[color:var(--text-secondary)]">
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Created</span>
                          <span className="tabular-nums">{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Last follow-up</span>
                          <span className="tabular-nums">{getLastFollowUpDate(ticket)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTicketClick(ticket)}
                        className="mt-4 inline-flex min-h-[44px] w-full touch-manipulation items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-gold)] hover:opacity-95"
                      >
                        View
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="hidden min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-x-contain overscroll-y-contain touch-pan-x touch-pan-y rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] shadow-inner [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] md:block">
                  <table className="w-max min-w-full table-auto border-collapse text-sm leading-snug text-[color:var(--text-primary)]">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--bg-card)] shadow-sm">
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
                    <tbody className="divide-y divide-[color:var(--border-default)]">
                      {tableTickets.map((ticket) => (
                        <tr key={ticket.id} className="bg-[color:var(--bg-card)] transition-colors duration-150 ease-out hover:bg-[color:var(--bg-table-hover)]">
                          <td className="max-w-[9rem] min-w-0 px-2 py-2 sm:max-w-[11rem] sm:px-2.5 lg:py-1.5">
                            <button
                              type="button"
                              onClick={() => handleTicketClick(ticket)}
                              className="block w-full truncate whitespace-nowrap text-left text-sm font-semibold text-[color:var(--accent-teal)] hover:opacity-90"
                              title={ticket.ticketNumber}
                            >
                              {ticket.ticketNumber}
                            </button>
                          </td>
                          <td className="min-w-0 px-2 py-2 sm:px-2.5 lg:py-1.5">
                            <div className="truncate text-sm text-[color:var(--text-primary)]" title={projectDisplayLine(ticket)}>
                              {projectDisplayLine(ticket)}
                            </div>
                          </td>
                          <td className="min-w-0 px-2 py-2 sm:px-2.5 lg:py-1.5">
                            <span className={`inline-flex min-w-0 max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide sm:px-2.5 ${statusChipClass(ticket.status)}`}>
                              {getStatusLabel(ticket.status)}
                            </span>
                          </td>
                          <td className="min-w-0 truncate px-2 py-2 text-sm tabular-nums text-[color:var(--text-secondary)] sm:px-2.5 lg:py-1.5" title={format(new Date(ticket.createdAt), 'MMM dd, yyyy')}>
                            {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
                          </td>
                          <td className="min-w-0 truncate px-2 py-2 text-sm tabular-nums text-[color:var(--text-secondary)] sm:px-2.5 lg:py-1.5" title={getLastFollowUpDate(ticket)}>
                            {getLastFollowUpDate(ticket)}
                          </td>
                          <td className="min-w-0 px-2 py-2 text-sm font-medium sm:px-2.5 lg:py-1.5">
                            <button type="button" onClick={() => handleTicketClick(ticket)} className="whitespace-nowrap font-semibold text-[color:var(--accent-gold)] hover:opacity-90">
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <TicketDetailDrawer
        ticket={selectedTicket}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false)
          setSelectedTicket(null)
        }}
        onRefresh={handleRefresh}
      />
    </>,
  )
}

export default SupportTicketsDashboard
