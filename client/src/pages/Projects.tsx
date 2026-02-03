import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Project, ProjectStatus, ProjectType, ProjectServiceType, UserRole } from '../types'
import { format } from 'date-fns'
import MultiSelect from '../components/MultiSelect'
import { useDebounce } from '../hooks/useDebounce'
import toast from 'react-hot-toast'
import { getSegmentColor } from '../components/dashboard/segmentColors'
import { getSalesTeamColor } from '../components/dashboard/salesTeamColors'
import DashboardFilters from '../components/dashboard/DashboardFilters'
import { FiPaperclip } from 'react-icons/fi'

// Helper function to get payment status badge with color coding
const getPaymentStatusBadge = (project: Project) => {
  // Check if project has no order value (null, undefined, 0, or falsy)
  const projectCost = project?.projectCost
  const hasNoOrderValue = !projectCost || projectCost === 0 || projectCost === null || projectCost === undefined || Number(projectCost) <= 0
  
  // Check if project is in early stages or lost
  const isEarlyOrLostStage = 
    project.projectStatus === ProjectStatus.LEAD ||
    project.projectStatus === ProjectStatus.SITE_SURVEY ||
    project.projectStatus === ProjectStatus.PROPOSAL ||
    project.projectStatus === ProjectStatus.LOST
  
  // Show N/A if no order value OR if in early/lost stage
  if (hasNoOrderValue || isEarlyOrLostStage) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        N/A
      </span>
    )
  }
  
  // Otherwise show actual payment status with brighter colour coding
  const paymentStatus = project.paymentStatus || 'PENDING'
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shadow-sm ${
        paymentStatus === 'FULLY_PAID'
          ? 'bg-emerald-500 text-white'
          : paymentStatus === 'PARTIAL'
          ? 'bg-amber-400 text-amber-900'
          : 'bg-red-500 text-white'
      }`}
    >
      {String(paymentStatus).replace(/_/g, ' ')}
    </span>
  )
}

// Helper function to get status badge color classes (Confirmed & Under Installation use bright colours)
const getStatusColorClasses = (status: ProjectStatus): string => {
  switch (status) {
    case ProjectStatus.LEAD:
    case ProjectStatus.SITE_SURVEY:
    case ProjectStatus.PROPOSAL:
      return 'bg-amber-100 text-amber-800 border border-amber-300'
    case ProjectStatus.CONFIRMED:
      // Bright blue – active order, stands out
      return 'bg-sky-400 text-white border border-sky-500 shadow-sm'
    case ProjectStatus.UNDER_INSTALLATION:
      // Bright cyan – in progress, very visible
      return 'bg-cyan-400 text-white border border-cyan-500 shadow-sm'
    case ProjectStatus.SUBMITTED_FOR_SUBSIDY:
      return 'bg-violet-200 text-violet-800 border border-violet-300'
    case ProjectStatus.COMPLETED:
    case ProjectStatus.COMPLETED_SUBSIDY_CREDITED:
      return 'bg-emerald-500 text-white border border-emerald-600 shadow-sm'
    case ProjectStatus.LOST:
      return 'bg-red-500 text-white border border-red-600 shadow-sm'
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-300'
  }
}

const Projects = () => {
  const { user, hasRole } = useAuth()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 500) // 500ms debounce
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [pendingExportType, setPendingExportType] = useState<'excel' | 'csv' | null>(null)
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  // Dashboard-style date filters (FY / Quarter / Month)
  const [selectedFYs, setSelectedFYs] = useState<string[]>([])
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  
  // Prepare options for multi-selects - matching exactly the Project Status dropdown in Sales & Commercial section
  // Operations users can only see: CONFIRMED, UNDER_INSTALLATION, COMPLETED, COMPLETED_SUBSIDY_CREDITED
  const allStatusOptions = useMemo(() => [
    { value: ProjectStatus.LEAD, label: 'Lead' },
    { value: ProjectStatus.SITE_SURVEY, label: 'Site Survey' },
    { value: ProjectStatus.PROPOSAL, label: 'Proposal' },
    { value: ProjectStatus.CONFIRMED, label: 'Confirmed Order' },
    { value: ProjectStatus.UNDER_INSTALLATION, label: 'Installation' },
    { value: ProjectStatus.COMPLETED, label: 'Completed' },
    { value: ProjectStatus.COMPLETED_SUBSIDY_CREDITED, label: 'Completed - Subsidy Credited' },
    { value: ProjectStatus.LOST, label: 'Lost' },
  ], [])

  // Filter status options based on user role
  const statusOptions = useMemo(() => {
    return user?.role === UserRole.OPERATIONS
      ? allStatusOptions.filter(option => 
          option.value === ProjectStatus.CONFIRMED ||
          option.value === ProjectStatus.UNDER_INSTALLATION ||
          option.value === ProjectStatus.COMPLETED ||
          option.value === ProjectStatus.COMPLETED_SUBSIDY_CREDITED
        )
      : allStatusOptions
  }, [user?.role, allStatusOptions])

  // Default status filter: All active statuses (all statuses except LOST)
  const defaultStatusValues = useMemo(() => {
    return statusOptions
      .filter(option => option.value !== ProjectStatus.LOST)
      .map(option => option.value)
  }, [statusOptions])

  const [filters, setFilters] = useState({
    status: [] as string[],
    type: [] as string[],
    projectServiceType: [] as string[],
    salespersonId: [] as string[],
    supportTicketStatus: [] as string[],
    paymentStatus: [] as string[],
    hasDocuments: false,
    search: '',
    sortBy: '',
    sortOrder: 'desc',
  })

  // Initialize default status filter (all active statuses except LOST) when ready
  useEffect(() => {
    // Set default status filter when defaultStatusValues is ready and filter is empty
    if (defaultStatusValues.length > 0 && filters.status.length === 0) {
      setFilters(prev => {
        // Only update if still empty (prevent race conditions)
        if (prev.status.length === 0) {
          return { ...prev, status: [...defaultStatusValues] }
        }
        return prev
      })
    }
  }, [defaultStatusValues, filters.status.length])
  
  // Track when user manually changes status filter
  const handleStatusChange = (values: string[]) => {
    setFilters(prev => ({ ...prev, status: values }))
  }

  // Update filters when debounced search changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch }))
    setPage(1) // Reset to first page when search changes
  }, [debouncedSearch])

  // Reset page when other filters change
  useEffect(() => {
    setPage(1)
  }, [
    filters.status,
    filters.type,
    filters.projectServiceType,
    filters.salespersonId,
    filters.supportTicketStatus,
    filters.paymentStatus,
    filters.hasDocuments,
    filters.sortBy,
    selectedFYs,
    selectedQuarters,
    selectedMonths,
  ])

  const clearAllFilters = () => {
    // Reset search input (drives debounced search → filters.search)
    setSearchInput('')

    // Reset dashboard-style date filters
    setSelectedFYs([])
    setSelectedQuarters([])
    setSelectedMonths([])

    // Reset all other filters; keep default status set (active statuses except LOST)
    setFilters((prev) => ({
      ...prev,
      status: [...defaultStatusValues],
      type: [],
      projectServiceType: [],
      salespersonId: [],
      supportTicketStatus: [],
      paymentStatus: [],
      search: '',
      sortBy: '',
      sortOrder: 'desc',
    }))

    setPage(1)
  }

  const moreFiltersActiveCount = useMemo(() => {
    const normalize = (arr: string[]) => [...arr].sort().join('|')
    const statusIsDefault =
      filters.status.length === defaultStatusValues.length &&
      normalize(filters.status) === normalize(defaultStatusValues)

    return (
      (statusIsDefault ? 0 : 1) +
      (filters.type.length > 0 ? 1 : 0) +
      (filters.projectServiceType.length > 0 ? 1 : 0) +
      (filters.supportTicketStatus.length > 0 ? 1 : 0) +
      (filters.paymentStatus.length > 0 ? 1 : 0) +
      (user?.role !== UserRole.SALES && filters.salespersonId.length > 0 ? 1 : 0) +
      (filters.hasDocuments ? 1 : 0) +
      (filters.sortBy ? 1 : 0)
    )
  }, [
    filters.status,
    filters.type,
    filters.projectServiceType,
    filters.supportTicketStatus,
    filters.paymentStatus,
    filters.salespersonId,
    filters.hasDocuments,
    filters.sortBy,
    defaultStatusValues,
    user?.role,
  ])

  // Fetch sales users for the filter dropdown (only for non-SALES users)
  const { data: salesUsers } = useQuery({
    queryKey: ['salesUsers'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/users/role/sales')
      return res.data
    },
    enabled: user?.role !== UserRole.SALES, // Only fetch if user is not SALES
  })

  const { data, isLoading } = useQuery({
    queryKey: ['projects', filters, page, selectedFYs, selectedQuarters, selectedMonths],
    queryFn: async () => {
      const params = new URLSearchParams()
      // Append array values - each value gets its own parameter (status[]=value1&status[]=value2)
      filters.status.forEach((value) => params.append('status', value))
      filters.type.forEach((value) => params.append('type', value))
      filters.projectServiceType.forEach((value) => params.append('projectServiceType', value))
      filters.salespersonId.forEach((value) => params.append('salespersonId', value))
      filters.supportTicketStatus.forEach((value) => params.append('supportTicketStatus', value))
      filters.paymentStatus.forEach((value) => params.append('paymentStatus', value))
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedQuarters.forEach((q) => params.append('quarter', q))
      selectedMonths.forEach((m) => params.append('month', m))
      if (filters.search) params.append('search', filters.search)
      if (filters.hasDocuments) params.append('hasDocuments', 'true')
      if (filters.sortBy) {
        params.append('sortBy', filters.sortBy)
        params.append('sortOrder', filters.sortOrder)
      }
      params.append('page', page.toString())
      params.append('limit', '25')
      const res = await axiosInstance.get(`/api/projects?${params.toString()}`)
      return res.data
    },
  })

  const typeOptions = Object.values(ProjectType).map(type => ({
    value: type,
    label: type.replace(/_/g, ' '),
  }))

  const projectServiceTypeOptions = Object.values(ProjectServiceType).map(serviceType => ({
    value: serviceType,
    label: (() => {
      const typeMap: Record<string, string> = {
        'EPC_PROJECT': 'EPC Project',
        'PANEL_CLEANING': 'Panel Cleaning',
        'MAINTENANCE': 'Maintenance',
        'REPAIR': 'Repair',
        'CONSULTING': 'Consulting',
        'RESALE': 'Resale',
        'OTHER_SERVICES': 'Other Services',
      }
      return typeMap[serviceType] || serviceType.replace(/_/g, ' ')
    })(),
  }))

  const salesUserOptions = salesUsers?.map((salesUser: { id: string; name: string; email: string }) => ({
    value: salesUser.id,
    label: salesUser.name,
  })) || []

  // Support Ticket Status filter options
  const supportTicketStatusOptions = [
    { value: 'HAS_TICKETS', label: 'Has Tickets (Any Status)' },
    { value: 'OPEN', label: 'Has Open Tickets' },
    { value: 'IN_PROGRESS', label: 'Has In-Progress Tickets' },
    { value: 'CLOSED', label: 'Has Closed Tickets' },
    { value: 'NO_TICKETS', label: 'No Tickets' },
  ]

  // Payment Status filter options - only show for Finance, Sales, Management, Admin
  const paymentStatusOptions = useMemo(() => {
    const canSeePaymentFilter = hasRole([UserRole.FINANCE, UserRole.MANAGEMENT, UserRole.ADMIN]) || 
                                 (hasRole([UserRole.SALES]) && user?.id) // Sales can filter their own projects
    if (!canSeePaymentFilter) return []
    
    return [
      { value: 'FULLY_PAID', label: 'Fully Paid' },
      { value: 'PARTIAL', label: 'Partial' },
      { value: 'PENDING', label: 'Pending' },
      { value: 'NA', label: 'N/A' }, // For projects without order value or in early/lost stages
    ]
  }, [user?.role, user?.id, hasRole])

  const handleExportClick = (type: 'excel' | 'csv') => {
    setPendingExportType(type)
    setShowExportConfirm(true)
  }

  const confirmExport = async () => {
    if (!pendingExportType) return

    try {
      const params = new URLSearchParams()
      
      // Add all current filters
      filters.status.forEach((value) => params.append('status', value))
      filters.type.forEach((value) => params.append('type', value))
      filters.projectServiceType.forEach((value) => params.append('projectServiceType', value))
      filters.salespersonId.forEach((value) => params.append('salespersonId', value))
      filters.paymentStatus.forEach((value) => params.append('paymentStatus', value))
      if (filters.search) params.append('search', filters.search)
      if (filters.hasDocuments) params.append('hasDocuments', 'true')
      if (filters.sortBy) {
        params.append('sortBy', filters.sortBy)
        params.append('sortOrder', filters.sortOrder)
      }
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedQuarters.forEach((q) => params.append('quarter', q))
      selectedMonths.forEach((m) => params.append('month', m))
      
      const endpoint = pendingExportType === 'excel' 
        ? `/api/projects/export/excel` 
        : `/api/projects/export/csv`
      const fileExtension = pendingExportType === 'excel' ? 'xlsx' : 'csv'
      
      const response = await axiosInstance.get(`${endpoint}?${params.toString()}`, {
        responseType: 'blob',
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `projects-export-${Date.now()}.${fileExtension}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success(`Projects exported to ${pendingExportType.toUpperCase()} successfully`)
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error(error.response?.data?.error || `Failed to export projects to ${pendingExportType.toUpperCase()}`)
    } finally {
      setShowExportConfirm(false)
      setPendingExportType(null)
    }
  }

  const cancelExport = () => {
    setShowExportConfirm(false)
    setPendingExportType(null)
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="px-4 py-6 sm:px-0 min-h-screen bg-gray-50/80">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-primary-700 to-primary-600 bg-clip-text text-transparent mb-2">
            Projects
          </h1>
          <p className="text-gray-600 font-medium">Manage and track all your solar projects</p>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'SALES') && (
          <Link
            to="/projects/new"
            className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-xl hover:from-primary-700 hover:to-primary-800 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
          >
            + New Project
          </Link>
        )}
      </div>

      <div className="bg-white shadow-md rounded-xl border border-gray-100 mb-4 p-3 sm:p-4 border-t-4 border-t-primary-500">
        <div className="space-y-2 sm:space-y-3">
        {/* Row 1: Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            type="text"
            placeholder="Search across all projects..."
            className="w-full sm:flex-1 min-h-[40px] border-2 border-primary-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:border-primary-500 transition-all bg-gradient-to-r from-white to-primary-50 shadow-md"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={clearAllFilters}
              className="min-h-[40px] px-3 py-2 rounded-xl border-2 border-primary-300 bg-white hover:bg-primary-50 text-primary-700 font-semibold shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.99]"
              title="Clear search and all filters"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={() => setShowMoreFilters((v) => !v)}
              className="min-h-[40px] px-3 py-2 rounded-xl border-2 border-primary-300 bg-gradient-to-r from-white to-primary-50 hover:from-primary-50 hover:to-primary-100 text-gray-700 font-semibold shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2"
              aria-expanded={showMoreFilters}
              aria-controls="projects-more-filters"
              title="Show or hide more filters"
            >
              <span className="truncate">
                {showMoreFilters ? 'Hide Filters' : 'More Filters'}
                {!showMoreFilters && moreFiltersActiveCount > 0 ? ` (${moreFiltersActiveCount})` : ''}
              </span>
              <svg
                className={`h-4 w-4 text-gray-500 transition-transform ${showMoreFilters ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Row 1b: FY / Quarter / Month Filters (same as Dashboard) */}
        <div className="pt-1">
          <DashboardFilters
            availableFYs={data?.availableFYs ?? []}
            selectedFYs={selectedFYs}
            selectedQuarters={selectedQuarters}
            selectedMonths={selectedMonths}
            onFYChange={setSelectedFYs}
            onQuarterChange={setSelectedQuarters}
            onMonthChange={setSelectedMonths}
            compact
          />
        </div>

        <div
          id="projects-more-filters"
          className={`${showMoreFilters ? 'overflow-visible' : 'overflow-hidden'} transition-all duration-300 ease-in-out ${
            showMoreFilters ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className={`${showMoreFilters ? 'pointer-events-auto' : 'pointer-events-none'} pt-2 space-y-2 sm:space-y-3`}>
        {/* Row 2: Primary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          <MultiSelect
            options={statusOptions}
            selectedValues={filters.status}
            onChange={handleStatusChange}
            placeholder="All Statuses"
            compact
          />
          <MultiSelect
            options={typeOptions}
            selectedValues={filters.type}
            onChange={(values) => setFilters({ ...filters, type: values })}
            placeholder="All Segments"
            compact
          />
          <MultiSelect
            options={projectServiceTypeOptions}
            selectedValues={filters.projectServiceType}
            onChange={(values) => setFilters({ ...filters, projectServiceType: values })}
            placeholder="All Project Types"
            compact
          />
        </div>

        {/* Row 3: Secondary Filters */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${user?.role !== UserRole.SALES ? (paymentStatusOptions.length > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-2') : (paymentStatusOptions.length > 0 ? 'lg:grid-cols-2' : 'lg:grid-cols-1')} gap-2 sm:gap-3`}>
          <MultiSelect
            options={supportTicketStatusOptions}
            selectedValues={filters.supportTicketStatus}
            onChange={(values) => setFilters({ ...filters, supportTicketStatus: values })}
            placeholder="All Ticket Statuses"
            compact
          />
          {paymentStatusOptions.length > 0 && (
            <MultiSelect
              options={paymentStatusOptions}
              selectedValues={filters.paymentStatus}
              onChange={(values) => setFilters({ ...filters, paymentStatus: values })}
              placeholder="All Payment Statuses"
              compact
            />
          )}
          {user?.role !== UserRole.SALES && (
            <MultiSelect
              options={salesUserOptions}
              selectedValues={filters.salespersonId}
              onChange={(values) => setFilters({ ...filters, salespersonId: values })}
              placeholder="All Sales Users"
              compact
            />
          )}
        </div>

        {/* Has documents filter */}
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.hasDocuments}
              onChange={(e) => setFilters(prev => ({ ...prev, hasDocuments: e.target.checked }))}
              className="w-4 h-4 rounded border-2 border-primary-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            />
            <span className="text-sm font-medium text-gray-700">Has documents</span>
          </label>
          <span className="text-xs text-gray-500">(only projects with at least one attachment)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              className="w-full min-h-[40px] border-2 border-primary-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:border-primary-500 bg-gradient-to-r from-white to-primary-50 shadow-md text-gray-700 font-medium text-[13px]"
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            >
              <option value="">Default (Confirmation Date)</option>
              <option value="systemCapacity">System Capacity</option>
              <option value="projectCost">Order Value</option>
              <option value="confirmationDate">Confirmation Date</option>
              <option value="profitability">Profitability</option>
              <option value="customerName">Customer Name</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
            <select
              className="w-full min-h-[40px] border-2 border-primary-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:border-primary-500 bg-gradient-to-r from-white to-primary-50 shadow-md text-gray-700 font-medium text-[13px] disabled:opacity-60 disabled:cursor-not-allowed"
              value={filters.sortOrder}
              onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}
              disabled={!filters.sortBy}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        {/* Export buttons - Only visible to Admin users */}
        {hasRole([UserRole.ADMIN]) && (
          <div className="flex gap-2">
            <button
              onClick={() => handleExportClick('excel')}
              className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to Excel
            </button>
            <button
              onClick={() => handleExportClick('csv')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to CSV
            </button>
          </div>
        )}
          </div>
        </div>
        </div>
      </div>

      {/* Export Confirmation Modal */}
      {showExportConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold text-red-600 mb-4">WARNING</h3>
              <div className="border-t border-b border-gray-300 my-4 py-4">
                <p className="text-gray-700 mb-4 leading-relaxed">
                  The Data that is present in the CRM System is the exclusive property of Rayenna Energy Private Limited. Unauthorised Export of any data is prohibited and will be subject to disciplinary measures including and not limited to termination and legal procedures.
                </p>
                <p className="text-gray-700 mb-4 leading-relaxed font-medium">
                  By exporting this data, you are confirming that you are authorised to access this data/info and have written approvals from the management.
                </p>
              </div>
              <p className="text-gray-600 mb-6 font-medium">
                Do you want to continue?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelExport}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmExport}
                  className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
                >
                  YES
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-lg rounded-xl border border-gray-100 overflow-hidden">
        <ul className="divide-y divide-gray-200 [&>li:nth-child(even)]:bg-gray-50/60">
          {data?.projects?.map((project: Project) => (
            <li key={project.id} className="transition-colors">
              <Link
                to={`/projects/${project.id}`}
                className="block hover:bg-sky-50/70 px-4 py-4 sm:px-6 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <p className="text-sm font-medium">
                        <span className="text-black">#{project.slNo}</span>
                        <span className="text-primary-600 font-bold"> - {project.customer?.customerName || 'Unknown Customer'}</span>
                      </p>
                      <span
                        className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: getSegmentColor(project.type, 0) }}
                      >
                        {project.type === 'RESIDENTIAL_SUBSIDY'
                          ? 'Residential Subsidy'
                          : project.type === 'RESIDENTIAL_NON_SUBSIDY'
                            ? 'Residential - Non Subsidy'
                            : project.type === 'COMMERCIAL_INDUSTRIAL'
                              ? 'Commercial Industrial'
                              : String(project.type).replace(/_/g, ' ')}
                      </span>
                      <span className={`ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColorClasses(project.projectStatus)}`}>
                        <span className="text-[8px] leading-none">●</span>
                        {project.projectStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center text-sm">
                      <span className="text-orange-800 font-medium">
                        {project.systemCapacity ? `${project.systemCapacity} kW` : 'N/A'}
                      </span>
                      <span className="text-gray-500 mx-1"> • </span>
                      <span className="text-green-800 font-bold">
                        {project.projectCost
                          ? `₹${project.projectCost.toLocaleString('en-IN')}`
                          : 'N/A'}
                      </span>
                      {project.salesperson && (
                        <span className="ml-4 inline-flex items-center gap-1.5 font-medium" style={{ color: getSalesTeamColor(project.salesperson.name, 0) }}>
                          Sales: {project.salesperson.name}
                          {project._count && project._count.documents > 0 && (
                            <span
                              className="inline-flex items-center justify-center text-primary-600 opacity-90 hover:opacity-100"
                              title={`${project._count.documents} document(s) uploaded`}
                              aria-label="Has attachments"
                            >
                              <FiPaperclip className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                            </span>
                          )}
                        </span>
                      )}
                      {!project.salesperson && project._count && project._count.documents > 0 && (
                        <span
                          className="ml-4 inline-flex items-center justify-center text-primary-600 opacity-90"
                          title={`${project._count.documents} document(s) uploaded`}
                          aria-label="Has attachments"
                        >
                          <FiPaperclip className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {format(new Date(project.createdAt), 'MMM dd, yyyy')}
                    </p>
                    <div className="mt-1">
                      {getPaymentStatusBadge(project)}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {data?.pagination && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
            Showing page {data.pagination.page} of {data.pagination.pages} ({data.pagination.total} total)
          </div>
          {data.pagination.pages > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
                disabled={page >= data.pagination.pages}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Projects
