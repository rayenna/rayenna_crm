import { useState } from 'react'
// Payment Status: Shows N/A in red for projects without Order Value or in early/lost stages
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Project, UserRole, ProjectStatus } from '../types'
import RemarksSection from '../components/remarks/RemarksSection'
import SupportTicketsSection from '../components/supportTickets/SupportTicketsSection'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import ProposalPreview from '../components/proposal/ProposalPreview'

const ProjectDetail = () => {
  const { id } = useParams()
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showProposal, setShowProposal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/projects/${id}`)
      return res.data as Project
    },
    retry: 1,
  })

  // Projects in Lost status cannot be edited (only Admin can delete)
  const isLost = project?.projectStatus === ProjectStatus.LOST
  const canEdit = !isLost && (hasRole([UserRole.ADMIN]) || 
    (hasRole([UserRole.SALES]) && project?.salespersonId === user?.id) ||
    hasRole([UserRole.OPERATIONS, UserRole.FINANCE]))
  const canDelete = hasRole([UserRole.ADMIN])

  // Fetch support tickets count for delete confirmation
  const { data: supportTickets } = useQuery({
    queryKey: ['supportTickets', 'project', id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/support-tickets/project/${id}`)
      return res.data
    },
    enabled: !!id && canDelete, // Only fetch if admin and project ID exists
    retry: 1,
  })

  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.delete(`/api/projects/${id}`)
      return res.data
    },
    onSuccess: (data) => {
      toast.success('Project deleted successfully')
      if (data.deleted?.supportTickets?.count > 0) {
        toast.success(`Project and ${data.deleted.supportTickets.count} support ticket(s) deleted`)
      }
      // Invalidate projects list and navigate back
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate('/projects')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete project')
    },
  })

  if (isLoading) return <div className="p-6 text-center">Loading project details...</div>
  if (error) return <div className="p-6 text-center text-red-600">Error loading project: {(error as any).response?.data?.error || (error as any).message}</div>
  if (!project) return <div className="p-6 text-center">Project not found</div>

  // Stage pill classes (match Projects list for consistency)
  const getStagePillClasses = (status: string): string => {
    switch (status) {
      case ProjectStatus.LEAD:
      case ProjectStatus.SITE_SURVEY:
      case ProjectStatus.PROPOSAL:
        return 'bg-amber-100 text-amber-800 border border-amber-300'
      case ProjectStatus.CONFIRMED:
      case ProjectStatus.UNDER_INSTALLATION:
        return 'bg-primary-100 text-primary-800 border border-primary-300'
      case ProjectStatus.SUBMITTED_FOR_SUBSIDY:
        return 'bg-violet-100 text-violet-800 border border-violet-300'
      case ProjectStatus.COMPLETED:
      case ProjectStatus.COMPLETED_SUBSIDY_CREDITED:
        return 'bg-emerald-100 text-emerald-800 border border-emerald-300'
      case ProjectStatus.LOST:
        return 'bg-red-100 text-red-800 border border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300'
    }
  }
  // Segment pill classes (match Projects list)
  const getSegmentPillClasses = (type: string): string => {
    switch (type) {
      case 'RESIDENTIAL_SUBSIDY':
        return 'bg-red-100 text-red-800 border border-red-300'
      case 'RESIDENTIAL_NON_SUBSIDY':
        return 'bg-sky-100 text-sky-800 border border-sky-300'
      case 'COMMERCIAL_INDUSTRIAL':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-300'
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300'
    }
  }

  return (
    <>
      {showProposal && id && (
        <ProposalPreview projectId={id} onClose={() => setShowProposal(false)} />
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Project</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this project? This action cannot be undone.
            </p>
            {supportTickets && Array.isArray(supportTickets) && supportTickets.length > 0 && (
              <p className="text-sm text-red-600 mb-4">
                <strong>Warning:</strong> This will also delete {supportTickets.length} support ticket(s) associated with this project.
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate()
                  setShowDeleteConfirm(false)
                }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    <div className="px-4 py-6 sm:px-0 min-h-screen bg-gray-50/80">
      {/* Header: Project name, customer, stage + status pills, key financials */}
      <div className="bg-gradient-to-br from-white to-amber-50/40 rounded-xl border-l-4 border-l-amber-500 border border-amber-100/60 shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Project #{project.slNo}
            </h1>
            <p className="text-base sm:text-lg font-semibold text-gray-900 mt-0.5">
              {project.customer?.customerName || 'Unknown Customer'}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Created {format(new Date(project.createdAt), 'MMM dd, yyyy')}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getStagePillClasses(project.projectStatus)}`}>
                {project.projectStatus.replace(/_/g, ' ')}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getSegmentPillClasses(project.type)}`}>
                {project.type.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
          {/* Key financials - compact highlights */}
          <div className="flex flex-wrap gap-6 sm:gap-8">
            {project.projectCost != null && project.projectCost > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Order Value</p>
                <p className="text-sm font-bold text-green-800">₹{project.projectCost.toLocaleString('en-IN')}</p>
              </div>
            )}
            {project.totalProjectCost != null && project.totalProjectCost > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Cost</p>
                <p className="text-sm font-semibold text-gray-900">₹{project.totalProjectCost.toLocaleString('en-IN')}</p>
              </div>
            )}
            {project.grossProfit != null && project.grossProfit !== undefined && (
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Gross Profit</p>
                <p className={`text-sm font-semibold ${project.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ₹{project.grossProfit.toLocaleString('en-IN')}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-gray-100">
          {/* Proposal button - Only for SALES and OPERATIONS users, for projects in Lead, Site Survey, or Proposal stages */}
          {(hasRole([UserRole.SALES]) || 
            hasRole([UserRole.OPERATIONS])) && 
            (project.projectStatus === ProjectStatus.LEAD ||
             project.projectStatus === ProjectStatus.SITE_SURVEY || 
             project.projectStatus === ProjectStatus.PROPOSAL) && (
            <button
              onClick={() => setShowProposal(true)}
              className="px-4 py-2 bg-amber-100 text-amber-800 border border-amber-200 rounded-lg hover:bg-amber-200 font-medium text-sm transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Proposal
            </button>
          )}
          {canEdit && (
            <Link
              to={`/projects/${id}/edit`}
              className="bg-gradient-to-r from-amber-600 to-primary-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:from-amber-700 hover:to-primary-700 font-medium shadow-md hover:shadow-lg transition-all text-sm sm:text-base text-center"
            >
              Edit
            </Link>
          )}
          {canDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-red-700 font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden sm:inline">Delete Project</span>
              <span className="sm:hidden">Delete</span>
            </button>
          )}
          <Link
            to="/projects"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back
          </Link>
        </div>
      </div>

      {/* Content: Info cards (Customer Module style – bg-gray-50/60, section icon + title) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Details */}
        <div className="bg-gradient-to-br from-teal-50/50 to-gray-50/60 rounded-xl p-5 space-y-4 border-l-4 border-l-teal-400">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Customer Details</h3>
          </div>
          {project.customer ? (
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Customer ID</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">{project.customer.customerId}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Customer Name</dt>
                <dd className="text-base sm:text-lg font-semibold text-gray-900 mt-0.5">{project.customer.customerName}</dd>
              </div>
              {(project.customer.addressLine1 || project.customer.city) && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Address</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-0.5">
                    {[
                      project.customer.addressLine1,
                      project.customer.addressLine2,
                      project.customer.city,
                      project.customer.state,
                      project.customer.pinCode
                    ].filter(Boolean).join(', ')}
                  </dd>
                </div>
              )}
              {project.customer.contactNumbers && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Contact Numbers</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-0.5">
                    {(() => {
                      try {
                        const parsed = JSON.parse(project.customer.contactNumbers || '');
                        return Array.isArray(parsed) ? parsed.join(', ') : project.customer.contactNumbers;
                      } catch {
                        return project.customer.contactNumbers;
                      }
                    })()}
                  </dd>
                </div>
              )}
              {project.customer.consumerNumber && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Consumer Number</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-0.5">{project.customer.consumerNumber}</dd>
                </div>
              )}
              {project.leadSource && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">Lead Source</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-0.5">
                    {project.leadSource === 'WEBSITE' && 'Website'}
                    {project.leadSource === 'REFERRAL' && 'Referral'}
                    {project.leadSource === 'GOOGLE' && 'Google'}
                    {project.leadSource === 'CHANNEL_PARTNER' && 'Channel Partner'}
                    {project.leadSource === 'DIGITAL_MARKETING' && 'Digital Marketing'}
                    {project.leadSource === 'SALES' && 'Sales'}
                    {project.leadSource === 'MANAGEMENT_CONNECT' && 'Management Connect'}
                    {project.leadSource === 'OTHER' && 'Other'}
                    {project.leadSourceDetails && (
                      <span className="ml-2 text-gray-600">
                        ({project.leadSource === 'CHANNEL_PARTNER' && project.leadSourceDetails}
                        {project.leadSource === 'REFERRAL' && project.leadSourceDetails}
                        {project.leadSource === 'OTHER' && project.leadSourceDetails})
                      </span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-gray-500">Customer information not available</p>
          )}
        </div>

        {/* Project Details */}
        <div className="bg-gradient-to-br from-amber-50/50 to-gray-50/60 rounded-xl p-5 space-y-4 border-l-4 border-l-amber-400">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Project Details</h3>
          </div>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide">Segment</dt>
              <dd className="text-sm font-medium text-gray-900 mt-0.5">{project.type.replace(/_/g, ' ')}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide">Project Type</dt>
              <dd className="text-sm font-medium text-gray-900 mt-0.5">
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
                  return typeMap[project.projectServiceType] || project.projectServiceType.replace(/_/g, ' ');
                })()}
              </dd>
            </div>
            {project.salesperson && (
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Salesperson</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">{project.salesperson.name}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Sales & Commercial */}
        <div className="bg-gradient-to-br from-emerald-50/50 to-white rounded-xl border-l-4 border-l-emerald-400 border border-emerald-100/60 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-emerald-800 uppercase tracking-wide mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Sales & Commercial
          </h2>
          <dl className="space-y-3">
            {project.systemCapacity && (
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">System Capacity</dt>
                <dd className="text-sm font-bold text-orange-800 mt-0.5">{project.systemCapacity} kW</dd>
              </div>
            )}
            {project.projectCost && (
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Order Value</dt>
                <dd className="text-sm font-bold text-green-800 mt-0.5">
                  ₹{project.projectCost.toLocaleString('en-IN')}
                </dd>
              </div>
            )}
            {project.confirmationDate && (
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Confirmation Date</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">
                  {format(new Date(project.confirmationDate), 'MMM dd, yyyy')}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide">Gross Profit</dt>
              <dd className={`text-sm font-medium mt-0.5 ${
                project.grossProfit !== null && project.grossProfit !== undefined
                  ? (project.grossProfit >= 0 ? 'text-yellow-600' : 'text-red-600')
                  : 'text-gray-400'
              }`}>
                {project.grossProfit !== null && project.grossProfit !== undefined
                  ? `₹${project.grossProfit.toLocaleString('en-IN')}`
                  : 'Not calculated'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide">Profitability</dt>
              <dd className={`text-sm font-medium ${
                project.profitability !== null && project.profitability !== undefined
                  ? (project.profitability > 10 
                      ? 'text-yellow-600' 
                      : project.profitability > 0 
                        ? 'text-orange-600' 
                        : 'text-red-600')
                  : 'text-gray-400'
              }`}>
                {project.profitability !== null && project.profitability !== undefined
                  ? `${project.profitability.toFixed(2)}%`
                  : 'Not calculated'}
              </dd>
            </div>
            {project.finalProfit && (
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Final Profit</dt>
                <dd className="text-sm font-medium text-yellow-600 mt-0.5">
                  ₹{project.finalProfit.toLocaleString('en-IN')}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Project Lifecycle */}
        <div className="bg-gradient-to-br from-violet-50/50 to-gray-50/60 rounded-xl p-5 space-y-4 border-l-4 border-l-violet-400">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Project Lifecycle</h3>
          </div>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide">Project Stage</dt>
              <dd className="text-sm font-medium">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                  {(() => {
                    const stageMap: Record<string, string> = {
                      'LEAD': 'Lead',
                      'SITE_SURVEY': 'Site Survey',
                      'PROPOSAL': 'Proposal',
                      'CONFIRMED': 'Confirmed Order',
                      'UNDER_INSTALLATION': 'Installation',
                      'COMPLETED': 'Completed',
                      'COMPLETED_SUBSIDY_CREDITED': 'Completed - Subsidy Credited',
                    };
                    return stageMap[project.projectStatus] || project.projectStatus.replace(/_/g, ' ');
                  })()}
                </span>
              </dd>
            </div>
            {project.mnrePortalRegistrationDate && (
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">MNRE Portal Registration</dt>
                <dd className="text-sm font-medium">
                  {format(new Date(project.mnrePortalRegistrationDate), 'MMM dd, yyyy')}
                </dd>
              </div>
            )}
            {project.feasibilityDate && (
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Feasibility Date (DISCOM)</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">
                  {format(new Date(project.feasibilityDate), 'MMM dd, yyyy')}
                </dd>
              </div>
            )}
            {project.registrationDate && (
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Registration Date (DISCOM)</dt>
                <dd className="text-sm font-medium">
                  {format(new Date(project.registrationDate), 'MMM dd, yyyy')}
                </dd>
              </div>
            )}
            {project.installationCompletionDate && (
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Installation Completion</dt>
                <dd className="text-sm font-medium">
                  {format(new Date(project.installationCompletionDate), 'MMM dd, yyyy')}
                </dd>
              </div>
            )}
            {project.completionReportSubmissionDate && (
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Completion Report Submission</dt>
                <dd className="text-sm font-medium">
                  {format(new Date(project.completionReportSubmissionDate), 'MMM dd, yyyy')}
                </dd>
              </div>
            )}
            {project.mnreInstallationDetails && (
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">MNRE Installation Details</dt>
                <dd className="text-sm font-medium whitespace-pre-line">
                  {project.mnreInstallationDetails}
                </dd>
              </div>
            )}
            {project.subsidyRequestDate && (
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Net Meter Installation Date</dt>
                <dd className="text-sm font-medium">
                  {format(new Date(project.subsidyRequestDate), 'MMM dd, yyyy')}
                </dd>
              </div>
            )}
            {project.subsidyCreditedDate && (
              <div>
                <dt className="text-sm text-gray-500">Subsidy Credited Date</dt>
                <dd className="text-sm font-medium text-yellow-600">
                  {format(new Date(project.subsidyCreditedDate), 'MMM dd, yyyy')}
                </dd>
              </div>
            )}
            {project.totalProjectCost && (
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Total Project Cost</dt>
                <dd className="text-sm font-medium">
                  ₹{project.totalProjectCost.toLocaleString('en-IN')}
                </dd>
              </div>
            )}
            {project.panelBrand && (
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Panel Brand</dt>
                <dd className="text-sm font-medium">{project.panelBrand}</dd>
              </div>
            )}
            {project.inverterBrand && (
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Inverter Brand</dt>
                <dd className="text-sm font-medium">{project.inverterBrand}</dd>
              </div>
            )}
            {project.panelType && (
              <div>
                <dt className="text-sm text-gray-500">Panel Type</dt>
                <dd className="text-sm font-medium">{project.panelType}</dd>
              </div>
            )}
            {/* Lost Stage Information */}
            {project.projectStatus === ProjectStatus.LOST && (
              <>
                {project.lostDate && (
                  <div>
                    <dt className="text-xs text-gray-500 uppercase tracking-wide">Lost Date</dt>
                    <dd className="text-sm font-medium text-red-600">
                      {format(new Date(project.lostDate), 'MMM dd, yyyy')}
                    </dd>
                  </div>
                )}
                {project.lostReason && (
                  <div>
                    <dt className="text-xs text-gray-500 uppercase tracking-wide">Reason for Loss</dt>
                    <dd className="text-sm font-medium">
                      {(() => {
                        const reasonMap: Record<string, string> = {
                          'LOST_TO_COMPETITION': 'Lost to Competition',
                          'NO_BUDGET': 'No Budget',
                          'INDEFINITELY_DELAYED': 'Indefinitely Delayed',
                          'OTHER': 'Other',
                        };
                        return reasonMap[project.lostReason!] || project.lostReason;
                      })()}
                    </dd>
                  </div>
                )}
                {project.lostReason === 'LOST_TO_COMPETITION' && project.lostToCompetitionReason && (
                  <div>
                    <dt className="text-xs text-gray-500 uppercase tracking-wide">Why lost to competition</dt>
                    <dd className="text-sm font-medium">
                      {(() => {
                        const compReasonMap: Record<string, string> = {
                          'LOST_DUE_TO_PRICE': 'Lost due to Price',
                          'LOST_DUE_TO_FEATURES': 'Lost due to Features',
                          'LOST_DUE_TO_RELATIONSHIP_OTHER': 'Lost due to Relationship/Other factors',
                        };
                        return compReasonMap[project.lostToCompetitionReason!] || project.lostToCompetitionReason;
                      })()}
                    </dd>
                  </div>
                )}
                {project.lostOtherReason && (
                  <div>
                    <dt className="text-xs text-gray-500 uppercase tracking-wide">Other Reason Details</dt>
                    <dd className="text-sm font-medium">{project.lostOtherReason}</dd>
                  </div>
                )}
                {isLost && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">
                      <strong>Note:</strong> This project is in Lost stage and cannot be edited. Only Admin can delete it.
                    </p>
                  </div>
                )}
              </>
            )}
          </dl>
        </div>

        {/* Payment Tracking */}
        <div className="bg-gradient-to-br from-emerald-50/50 to-gray-50/60 rounded-xl p-5 space-y-4 border-l-4 border-l-emerald-400">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Payment Tracking</h3>
          </div>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide">Payment Status</dt>
              <dd className="text-sm font-medium">
                {(() => {
                  // Check if project has no order value (null, undefined, 0, or falsy)
                  const projectCost = project?.projectCost
                  const hasNoOrderValue = !projectCost || projectCost === 0 || projectCost === null || projectCost === undefined || Number(projectCost) <= 0
                  
                  // Check if project is in early stages or lost
                  const currentStatus = project?.projectStatus
                  const isEarlyOrLostStage = 
                    currentStatus === ProjectStatus.LEAD ||
                    currentStatus === ProjectStatus.SITE_SURVEY ||
                    currentStatus === ProjectStatus.PROPOSAL ||
                    currentStatus === ProjectStatus.LOST
                  
                  // Show N/A if no order value OR if in early/lost stage
                  if (hasNoOrderValue || isEarlyOrLostStage) {
                    return (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        N/A
                      </span>
                    )
                  }
                  
                  // Otherwise show actual payment status
                  const paymentStatus = project?.paymentStatus || 'PENDING'
                  return (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        paymentStatus === 'FULLY_PAID'
                          ? 'bg-green-100 text-green-800'
                          : paymentStatus === 'PARTIAL'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {String(paymentStatus).replace(/_/g, ' ')}
                    </span>
                  )
                })()}
              </dd>
            </div>
            {project.projectCost && (() => {
              const totalReceived =
                (Number(project.advanceReceived) || 0) +
                (Number(project.payment1) || 0) +
                (Number(project.payment2) || 0) +
                (Number(project.payment3) || 0) +
                (Number(project.lastPayment) || 0);
              const balance = Math.max(0, Number(project.projectCost) - totalReceived);
              return (
                <>
                  <div>
                    <dt className="text-xs text-gray-500 uppercase tracking-wide">Total Amount Received</dt>
                    <dd className="text-sm font-medium text-yellow-600">
                      ₹{totalReceived.toLocaleString('en-IN')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 uppercase tracking-wide">Balance Amount</dt>
                    <dd className="text-sm font-medium text-red-600">
                      ₹{balance.toLocaleString('en-IN')}
                    </dd>
                  </div>
                </>
              );
            })()}
            {project.advanceReceived && (
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Advance Received</dt>
                <dd className="text-sm font-medium">
                  ₹{project.advanceReceived.toLocaleString('en-IN')}
                  {project.advanceReceivedDate &&
                    ` (${format(new Date(project.advanceReceivedDate), 'MMM dd, yyyy')})`}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Remarks - View Only */}
      <RemarksSection projectId={project.id} isEditMode={false} />

      {/* Support / Service Tickets */}
      <div className="mt-6">
        <SupportTicketsSection projectId={project.id} projectStatus={project.projectStatus} />
      </div>

      {/* Key Artifacts - View Only (Customer Module style) */}
      <div className="mt-6 bg-gradient-to-br from-sky-50/50 to-gray-50/60 rounded-xl p-5 space-y-4 border-l-4 border-l-sky-400">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Key Artifacts</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          To upload new artifacts, please click the <strong>Edit</strong> button above.
        </p>

        {/* Documents List - View Only */}
        {project.documents && project.documents.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Uploaded Documents</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-white">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 border-l-4 border-l-sky-400">Sl No.</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">View/Download</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
              {project.documents.map((doc, index) => {
                // Admin can delete any document
                // Uploader can delete their own documents (except Proposal PDFs which only admin can delete)
                const isProposalPDF = doc.description === 'AI Generated Proposal PDF'
                const isAdmin = hasRole([UserRole.ADMIN])
                const isManagement = hasRole([UserRole.MANAGEMENT])
                const isSales = hasRole([UserRole.SALES])
                const isOperations = hasRole([UserRole.OPERATIONS])
                const isFinance = hasRole([UserRole.FINANCE])
                const isUploader = doc.uploadedById === user?.id
                // Sales users can only view/download documents from their own projects
                const salesHasProjectAccess = isSales && project.salespersonId === user?.id
                const canDelete = isAdmin || (isUploader && !isProposalPDF)
                // View/Download: Admin, Management, Operations, Finance, or Sales (only their projects), or uploader
                const canView = isAdmin || isManagement || isOperations || isFinance || salesHasProjectAccess || isUploader

                return (
                  <tr key={doc.id} className="group bg-white hover:bg-sky-50/50 transition-colors">
                    <td className="px-3 py-2 text-gray-700 align-middle">{index + 1}</td>
                    <td className="px-3 py-2 align-middle">
                      <div className="font-medium text-gray-900 truncate max-w-xs">
                        {doc.fileName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {doc.category === 'photos_videos' ? 'Photos / Videos' :
                         doc.category === 'documents' ? 'Documents' :
                         doc.category === 'sheets' ? 'Sheets' : doc.category}
                        {doc.uploadedBy && <> • Uploaded by {doc.uploadedBy.name}</>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-700 align-middle max-w-xs">
                      <span className="block truncate" title={doc.description || ''}>
                        {doc.description || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center align-middle">
                      {canView && (
                        <DocumentDownloadButton documentId={doc.id} />
                      )}
                    </td>
                    <td className="px-3 py-2 text-center align-middle">
                      {canDelete && (
                        <DocumentDeleteButton documentId={doc.id} projectId={project.id} />
                      )}
                    </td>
                  </tr>
                )
              })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Show message if no documents */}
        {(!project.documents || project.documents.length === 0) && (
          <p className="text-sm text-gray-500">No artifacts uploaded yet. Click <strong>Edit</strong> to upload documents.</p>
        )}
      </div>
    </div>
    </>
  )
}

// Document Download Button Component (View/Download - opens download with correct filename)
const DocumentDownloadButton = ({ documentId }: { documentId: string }) => {
  const { token } = useAuth()
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!token) {
      toast.error('Authentication required')
      return
    }

    setDownloading(true)
    try {
      const response = await axiosInstance.get<{ url: string }>(
        `/api/documents/${documentId}/signed-url`,
        {
          params: { download: true },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const url = response.data?.url
      if (!url) {
        toast.error('Failed to generate download link')
        setDownloading(false)
        return
      }

      window.open(url, '_blank')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to download file')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="text-primary-600 hover:text-primary-800 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      title="View/Download file"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
    </button>
  )
}

// Document Delete Button Component
const DocumentDeleteButton = ({ documentId, projectId }: { documentId: string; projectId: string }) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const queryClient = useQueryClient()

  const handleDelete = async () => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    setIsDeleting(true)
    try {
      await axiosInstance.delete(`/api/documents/${documentId}`)
      toast.success('Document deleted successfully')
      setShowConfirm(false)
      // Refresh project data
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete document')
      setShowConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2 ml-2">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isDeleting ? 'Deleting...' : 'Confirm'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
          className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleDelete}
      className="ml-2 text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity"
      title="Delete document"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    </button>
  )
}

export default ProjectDetail
