import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Project, ProjectStatus, ProjectType, ProjectServiceType, UserRole } from '../types'
import { format } from 'date-fns'
import MultiSelect from '../components/MultiSelect'
import { useDebounce } from '../hooks/useDebounce'

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
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 500) // 500ms debounce
  
  const [filters, setFilters] = useState({
    status: [] as string[],
    type: [] as string[],
    projectServiceType: [] as string[],
    salespersonId: [] as string[],
    search: '',
    sortBy: '',
    sortOrder: 'desc',
  })

  // Update filters when debounced search changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch }))
    setPage(1) // Reset to first page when search changes
  }, [debouncedSearch])

  // Reset page when other filters change
  useEffect(() => {
    setPage(1)
  }, [filters.status, filters.type, filters.projectServiceType, filters.salespersonId, filters.sortBy])

  // Fetch sales users for the filter dropdown (only for non-SALES users)
  const { data: salesUsers } = useQuery({
    queryKey: ['salesUsers'],
    queryFn: async () => {
      const res = await axios.get('/api/users/role/sales')
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
      if (filters.search) params.append('search', filters.search)
      if (filters.sortBy) {
        params.append('sortBy', filters.sortBy)
        params.append('sortOrder', filters.sortOrder)
      }
      params.append('page', page.toString())
      params.append('limit', '25')
      const res = await axios.get(`/api/projects?${params.toString()}`)
      return res.data
    },
  })

  // Prepare options for multi-selects - matching exactly the Project Status dropdown in Sales & Commercial section
  const statusOptions = [
    { value: ProjectStatus.LEAD, label: 'Lead' },
    { value: ProjectStatus.SITE_SURVEY, label: 'Site Survey' },
    { value: ProjectStatus.PROPOSAL, label: 'Proposal' },
    { value: ProjectStatus.CONFIRMED, label: 'Confirmed Order' },
    { value: ProjectStatus.UNDER_INSTALLATION, label: 'Installation' },
    { value: ProjectStatus.COMPLETED, label: 'Completed' },
    { value: ProjectStatus.COMPLETED_SUBSIDY_CREDITED, label: 'Completed - Subsidy Credited' },
    { value: ProjectStatus.LOST, label: 'Lost' },
  ]

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
        <div className={`grid grid-cols-1 gap-4 mb-4 ${user?.role === UserRole.SALES ? 'md:grid-cols-4' : 'md:grid-cols-5'}`}>
          <input
            type="text"
            placeholder="Search..."
            className="border border-gray-300 rounded-md px-3 py-2"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search across all projects..."
          />
          <MultiSelect
            options={statusOptions}
            selectedValues={filters.status}
            onChange={(values) => setFilters({ ...filters, status: values })}
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
      </div>

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
