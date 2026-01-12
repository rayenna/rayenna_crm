import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Project, ProjectStatus, ProjectType, ProjectServiceType } from '../types'
import { format } from 'date-fns'

const Projects = () => {
  const { user } = useAuth()
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    projectServiceType: '',
    search: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.type) params.append('type', filters.type)
      if (filters.projectServiceType) params.append('projectServiceType', filters.projectServiceType)
      if (filters.search) params.append('search', filters.search)
      const res = await axios.get(`/api/projects?${params.toString()}`)
      return res.data
    },
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        {(user?.role === 'ADMIN' || user?.role === 'SALES') && (
          <Link
            to="/projects/new"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium shadow-md hover:shadow-lg transition-all"
          >
            New Project
          </Link>
        )}
      </div>

      <div className="bg-white shadow rounded-lg mb-4 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search..."
            className="border border-gray-300 rounded-md px-3 py-2"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            className="border border-gray-300 rounded-md px-3 py-2"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            {Object.values(ProjectStatus).map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-md px-3 py-2"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">All Segments</option>
            {Object.values(ProjectType).map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-md px-3 py-2"
            value={filters.projectServiceType}
            onChange={(e) => setFilters({ ...filters, projectServiceType: e.target.value })}
          >
            <option value="">All Project Types</option>
            {Object.values(ProjectServiceType).map((serviceType) => (
              <option key={serviceType} value={serviceType}>
                {(() => {
                  const typeMap: Record<string, string> = {
                    'EPC_PROJECT': 'EPC Project',
                    'PANEL_CLEANING': 'Panel Cleaning',
                    'MAINTENANCE': 'Maintenance',
                    'REPAIR': 'Repair',
                    'CONSULTING': 'Consulting',
                    'RESALE': 'Resale',
                    'OTHER_SERVICES': 'Other Services',
                  };
                  return typeMap[serviceType] || serviceType.replace(/_/g, ' ');
                })()}
              </option>
            ))}
          </select>
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
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
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
        <div className="mt-4 text-sm text-gray-500">
          Showing {data.pagination.page} of {data.pagination.pages} pages ({data.pagination.total}{' '}
          total)
        </div>
      )}
    </div>
  )
}

export default Projects
