import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Project, ProjectStatus, ProjectType, ProjectServiceType, UserRole } from '../types'
import { format } from 'date-fns'
import MultiSelect from '../components/MultiSelect'
import { useDebounce } from '../hooks/useDebounce'
import toast from 'react-hot-toast'

// Helper function to get status badge color classes
const getStatusColorClasses = (status: ProjectStatus): string => {
  switch (status) {
    case ProjectStatus.LEAD:
    case ProjectStatus.SITE_SURVEY:
    case ProjectStatus.PROPOSAL:
      // Orange
      return 'bg-orange-100 text-orange-800 border-orange-300'
    case ProjectStatus.CONFIRMED:
    case ProjectStatus.UNDER_INSTALLATION:
      // Blue
      return 'bg-blue-100 text-blue-800 border-blue-300'
    case ProjectStatus.SUBMITTED_FOR_SUBSIDY:
      // Dark Purple
      return 'bg-purple-100 text-purple-800 border-purple-300'
    case ProjectStatus.COMPLETED:
    case ProjectStatus.COMPLETED_SUBSIDY_CREDITED:
      // Green
      return 'bg-green-100 text-green-800 border-green-300'
    case ProjectStatus.LOST:
      // Red
      return 'bg-red-100 text-red-800 border-red-300'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

const Projects = () => {
  const { user, hasRole } = useAuth()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 500) // 500ms debounce
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [pendingExportType, setPendingExportType] = useState<'excel' | 'csv' | null>(null)
  
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
    search: '',
    sortBy: '',
    sortOrder: 'desc',
  })

  // Track if status filter has been manually changed by user
  const statusFilterManuallyChanged = useRef(false)
  const hasInitialized = useRef(false)
  
  // Initialize default status filter (all active statuses except LOST) when statusOptions are ready
  useEffect(() => {
    // Only set default once on initial load, if filter hasn't been manually changed and is currently empty
    if (defaultStatusValues.length > 0 && !hasInitialized.current && !statusFilterManuallyChanged.current) {
      setFilters(prev => {
        // Only update if status filter is empty
        if (prev.status.length === 0) {
          hasInitialized.current = true
          return { ...prev, status: defaultStatusValues }
        }
        return prev
      })
    }
  }, [defaultStatusValues])
  
  // Track when user manually changes status filter
  const handleStatusChange = (values: string[]) => {
    statusFilterManuallyChanged.current = true
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
  }, [filters.status, filters.type, filters.projectServiceType, filters.salespersonId, filters.supportTicketStatus, filters.sortBy])

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
    queryKey: ['projects', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      // Append array values - each value gets its own parameter (status[]=value1&status[]=value2)
      filters.status.forEach((value) => params.append('status', value))
      filters.type.forEach((value) => params.append('type', value))
      filters.projectServiceType.forEach((value) => params.append('projectServiceType', value))
      filters.salespersonId.forEach((value) => params.append('salespersonId', value))
      filters.supportTicketStatus.forEach((value) => params.append('supportTicketStatus', value))
      if (filters.search) params.append('search', filters.search)
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
      if (filters.search) params.append('search', filters.search)
      if (filters.sortBy) {
        params.append('sortBy', filters.sortBy)
        params.append('sortOrder', filters.sortOrder)
      }
      
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
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-primary-600 via-primary-500 via-green-500 to-primary-600 bg-clip-text text-transparent mb-3 drop-shadow-lg">
            Projects
          </h1>
          <p className="text-gray-600">Manage and track all your solar projects</p>
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

      <div className="bg-white shadow rounded-lg mb-4 p-4">
        {/* Row 1: Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search across all projects..."
            className="w-full border border-gray-300 rounded-md px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Row 2: Primary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <MultiSelect
            options={statusOptions}
            selectedValues={filters.status}
            onChange={handleStatusChange}
            placeholder="All Statuses"
          />
          <MultiSelect
            options={typeOptions}
            selectedValues={filters.type}
            onChange={(values) => setFilters({ ...filters, type: values })}
            placeholder="All Segments"
          />
          <MultiSelect
            options={projectServiceTypeOptions}
            selectedValues={filters.projectServiceType}
            onChange={(values) => setFilters({ ...filters, projectServiceType: values })}
            placeholder="All Project Types"
          />
        </div>

        {/* Row 3: Secondary Filters */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${user?.role !== UserRole.SALES ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-4 mb-4`}>
          <MultiSelect
            options={supportTicketStatusOptions}
            selectedValues={filters.supportTicketStatus}
            onChange={(values) => setFilters({ ...filters, supportTicketStatus: values })}
            placeholder="All Ticket Statuses"
          />
          {user?.role !== UserRole.SALES && (
            <MultiSelect
              options={salesUserOptions}
              selectedValues={filters.salespersonId}
              onChange={(values) => setFilters({ ...filters, salespersonId: values })}
              placeholder="All Sales Users"
            />
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            >
              <option value="">Default (Confirmation Date)</option>
              <option value="systemCapacity">System Capacity</option>
              <option value="projectCost">Order Value</option>
              <option value="confirmationDate">Date of Confirmation</option>
              <option value="profitability">Profitability</option>
              <option value="customerName">Customer Name</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
            <select
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
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
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleExportClick('excel')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to Excel
            </button>
            <button
              onClick={() => handleExportClick('csv')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to CSV
            </button>
          </div>
        )}
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

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {data?.projects?.map((project: Project) => (
            <li key={project.id}>
              <Link
                to={`/projects/${project.id}`}
                className="block hover:bg-gray-50 px-4 py-4 sm:px-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-primary-600">
                        #{project.slNo} - {project.customer?.customerName || 'Unknown Customer'}
                      </p>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-700">
                        {project.type.replace(/_/g, ' ')}
                      </span>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColorClasses(project.projectStatus)}`}>
                        {project.projectStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <span>
                        {project.systemCapacity ? `${project.systemCapacity} kW` : 'N/A'} •{' '}
                        {project.projectCost
                          ? `₹${project.projectCost.toLocaleString('en-IN')}`
                          : 'N/A'}
                      </span>
                      {project.salesperson && (
                        <span className="ml-4">Sales: {project.salesperson.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {format(new Date(project.createdAt), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {project.paymentStatus.replace(/_/g, ' ')}
                    </p>
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
