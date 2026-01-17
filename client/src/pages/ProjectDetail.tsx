import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Project, UserRole, ProjectStatus, LostReason } from '../types'
import RemarksSection from '../components/remarks/RemarksSection'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import ProposalPreview from '../components/proposal/ProposalPreview'

// Project Lifecycle Card Component - DEPRECATED: Project Stage removed, keeping for backward compatibility but not used
const ProjectLifecycleCard_DEPRECATED = ({ project }: { project: Project }) => {
  const [showDelayPrediction, setShowDelayPrediction] = useState(false)
  const [delayPrediction, setDelayPrediction] = useState<any>(null)
  const [loadingPrediction, setLoadingPrediction] = useState(false)

  // Calculate days in stage
  const daysInStage = project.stageEnteredAt
    ? Math.floor((Date.now() - new Date(project.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const slaDays = project.slaDays || 0
  const daysRemaining = Math.max(0, slaDays - daysInStage)
  const slaPercentage = slaDays > 0 ? (daysInStage / slaDays) * 100 : 0

  // Determine owner based on stage
  const getOwner = (stage: ProjectStage | undefined): 'SALES' | 'OPS' => {
    if (!stage) return 'SALES'
    const salesStages: ProjectStage[] = [ProjectStage.SURVEY, ProjectStage.PROPOSAL, ProjectStage.APPROVED]
    return salesStages.includes(stage) ? 'SALES' : 'OPS'
  }

  const owner = getOwner(project.projectStage)
  const ownerName = owner === 'SALES' 
    ? (project.salesperson?.name || 'Unassigned')
    : (project.opsPerson?.name || 'Unassigned')

  // Get status indicator color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'GREEN':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'AMBER':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'RED':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  // Get stage display name
  const getStageDisplayName = (stage: ProjectStage) => {
    const stageNames: Record<ProjectStage, string> = {
      [ProjectStage.SURVEY]: 'Survey',
      [ProjectStage.PROPOSAL]: 'Proposal',
      [ProjectStage.APPROVED]: 'Approved',
      [ProjectStage.INSTALLATION]: 'Installation',
      [ProjectStage.BILLING]: 'Billing',
      [ProjectStage.LIVE]: 'Live',
      [ProjectStage.AMC]: 'AMC',
      [ProjectStage.LOST]: 'Lost',
    }
    return stageNames[stage] || stage
  }

  const handlePredictDelay = async () => {
    if (showDelayPrediction && delayPrediction) {
      setShowDelayPrediction(false)
      return
    }

    setLoadingPrediction(true)
    try {
      const res = await axiosInstance.get(`/api/projects/${project.id}/delay-prediction`)
      setDelayPrediction(res.data)
      setShowDelayPrediction(true)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to predict delay')
    } finally {
      setLoadingPrediction(false)
    }
  }

  return (
    <div className="mb-6 bg-white shadow rounded-lg p-6 border-l-4 border-primary-500">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Project Lifecycle</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <span className="text-sm text-gray-500">Stage:</span>
              <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                {project.projectStage ? getStageDisplayName(project.projectStage) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Owner:</span>
              <span className={`ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                owner === 'SALES' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
              }`}>
                {owner} - {ownerName}
              </span>
            </div>
            <div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 ${getStatusColor(project.statusIndicator)}`}>
                {project.statusIndicator || 'UNKNOWN'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handlePredictDelay}
          disabled={loadingPrediction}
          className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loadingPrediction ? 'Analyzing...' : showDelayPrediction ? 'Hide Prediction' : 'AI: Predict Delay'}
        </button>
      </div>

      {/* SLA Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">SLA Progress</span>
          <span className="text-sm text-gray-500">
            {daysInStage} / {slaDays} days ({slaPercentage.toFixed(1)}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${
              project.statusIndicator === 'RED'
                ? 'bg-red-500'
                : project.statusIndicator === 'AMBER'
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, slaPercentage)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>{daysRemaining > 0 ? `${daysRemaining} days remaining` : `${Math.abs(daysRemaining)} days overdue`}</span>
          {project.stageEnteredAt && (
            <span>Entered: {format(new Date(project.stageEnteredAt), 'MMM dd, yyyy')}</span>
          )}
        </div>
      </div>

      {/* AI Delay Prediction */}
      {showDelayPrediction && delayPrediction && (
        <div className={`mt-4 p-4 rounded-lg border-2 ${
          delayPrediction.riskLevel === 'HIGH'
            ? 'bg-red-50 border-red-200'
            : delayPrediction.riskLevel === 'MEDIUM'
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">AI Delay Prediction</h3>
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              delayPrediction.riskLevel === 'HIGH'
                ? 'bg-red-100 text-red-800'
                : delayPrediction.riskLevel === 'MEDIUM'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {delayPrediction.riskLevel} RISK
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Predicted Delay:</strong> {delayPrediction.predictedDelay} days
          </p>
          {delayPrediction.reasons && delayPrediction.reasons.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Key Reasons:</p>
              <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                {delayPrediction.reasons.map((reason: string, idx: number) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const ProjectDetail = () => {
  const { id } = useParams()
  const { user, hasRole } = useAuth()
  const [showProposal, setShowProposal] = useState(false)

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

  if (isLoading) return <div className="p-6 text-center">Loading project details...</div>
  if (error) return <div className="p-6 text-center text-red-600">Error loading project: {(error as any).response?.data?.error || (error as any).message}</div>
  if (!project) return <div className="p-6 text-center">Project not found</div>

  return (
    <>
      {showProposal && id && (
        <ProposalPreview projectId={id} onClose={() => setShowProposal(false)} />
      )}
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Project #{project.slNo} - {project.customer?.customerName || 'Unknown Customer'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Created: {format(new Date(project.createdAt), 'MMM dd, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Generate AI Proposal button - Only for SALES and OPERATIONS users, for projects in Lead, Site Survey, or Proposal stages */}
          {(hasRole([UserRole.SALES]) || 
            hasRole([UserRole.OPERATIONS])) && 
            (project.projectStatus === ProjectStatus.LEAD ||
             project.projectStatus === ProjectStatus.SITE_SURVEY || 
             project.projectStatus === ProjectStatus.PROPOSAL) && (
            <button
              onClick={() => setShowProposal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate AI Proposal
            </button>
          )}
          {canEdit && (
            <Link
              to={`/projects/${id}/edit`}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium shadow-md hover:shadow-lg transition-all"
            >
              Edit
            </Link>
          )}
          <Link
            to="/projects"
            className="bg-secondary-200 text-secondary-700 px-4 py-2 rounded-lg hover:bg-secondary-300 font-medium transition-colors"
          >
            Back
          </Link>
        </div>
      </div>

      {/* Project Lifecycle Card - Removed: Project Stage field is no longer used */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Details */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Customer Details</h2>
          {project.customer ? (
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Customer ID</dt>
                <dd className="text-sm font-medium">{project.customer.customerId}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Customer Name</dt>
                <dd className="text-sm font-medium">{project.customer.customerName}</dd>
              </div>
              {(project.customer.addressLine1 || project.customer.city) && (
                <div>
                  <dt className="text-sm text-gray-500">Address</dt>
                  <dd className="text-sm font-medium">
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
                  <dt className="text-sm text-gray-500">Contact Numbers</dt>
                  <dd className="text-sm font-medium">
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
                  <dt className="text-sm text-gray-500">Consumer Number</dt>
                  <dd className="text-sm font-medium">{project.customer.consumerNumber}</dd>
                </div>
              )}
              {project.leadSource && (
                <div>
                  <dt className="text-sm text-gray-500">Lead Source</dt>
                  <dd className="text-sm font-medium">
                    {project.leadSource === 'WEBSITE' && 'Website'}
                    {project.leadSource === 'REFERRAL' && 'Referral'}
                    {project.leadSource === 'GOOGLE' && 'Google'}
                    {project.leadSource === 'CHANNEL_PARTNER' && 'Channel Partner'}
                    {project.leadSource === 'DIGITAL_MARKETING' && 'Digital Marketing'}
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
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Project Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Segment</dt>
              <dd className="text-sm font-medium">{project.type.replace(/_/g, ' ')}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Project Type</dt>
              <dd className="text-sm font-medium">
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
                <dt className="text-sm text-gray-500">Salesperson</dt>
                <dd className="text-sm font-medium">{project.salesperson.name}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Sales & Commercial */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Sales & Commercial</h2>
          <dl className="space-y-3">
            {project.systemCapacity && (
              <div>
                <dt className="text-sm text-gray-500">System Capacity</dt>
                <dd className="text-sm font-medium">{project.systemCapacity} kW</dd>
              </div>
            )}
            {project.projectCost && (
              <div>
                <dt className="text-sm text-gray-500">Order Value</dt>
                <dd className="text-sm font-medium">
                  ₹{project.projectCost.toLocaleString('en-IN')}
                </dd>
              </div>
            )}
            {project.confirmationDate && (
              <div>
                <dt className="text-sm text-gray-500">Confirmation Date</dt>
                <dd className="text-sm font-medium">
                  {format(new Date(project.confirmationDate), 'MMM dd, yyyy')}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-500">Gross Profit</dt>
              <dd className={`text-sm font-medium ${
                project.grossProfit !== null && project.grossProfit !== undefined
                  ? (project.grossProfit >= 0 ? 'text-green-600' : 'text-red-600')
                  : 'text-gray-400'
              }`}>
                {project.grossProfit !== null && project.grossProfit !== undefined
                  ? `₹${project.grossProfit.toLocaleString('en-IN')}`
                  : 'Not calculated'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Profitability</dt>
              <dd className={`text-sm font-medium ${
                project.profitability !== null && project.profitability !== undefined
                  ? (project.profitability > 10 
                      ? 'text-green-600' 
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
                <dt className="text-sm text-gray-500">Final Profit</dt>
                <dd className="text-sm font-medium text-green-600">
                  ₹{project.finalProfit.toLocaleString('en-IN')}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Project Lifecycle */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Project Lifecycle</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Project Stage</dt>
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
                <dt className="text-sm text-gray-500">MNRE Portal Registration</dt>
                <dd className="text-sm font-medium">
                  {format(new Date(project.mnrePortalRegistrationDate), 'MMM dd, yyyy')}
                </dd>
              </div>
            )}
            {project.feasibilityDate && (
              <div>
                <dt className="text-sm text-gray-500">Feasibility Date (DISCOM)</dt>
                <dd className="text-sm font-medium">
                  {format(new Date(project.feasibilityDate), 'MMM dd, yyyy')}
                </dd>
              </div>
            )}
            {project.registrationDate && (
              <div>
                <dt className="text-sm text-gray-500">Registration Date (DISCOM)</dt>
                <dd className="text-sm font-medium">
                  {format(new Date(project.registrationDate), 'MMM dd, yyyy')}
                </dd>
              </div>
            )}
            {project.installationCompletionDate && (
              <div>
                <dt className="text-sm text-gray-500">Installation Completion</dt>
                <dd className="text-sm font-medium">
                  {format(new Date(project.installationCompletionDate), 'MMM dd, yyyy')}
                </dd>
              </div>
            )}
            {project.subsidyRequestDate && (
              <div>
                <dt className="text-sm text-gray-500">Net Meter Installation Date</dt>
                <dd className="text-sm font-medium">
                  {format(new Date(project.subsidyRequestDate), 'MMM dd, yyyy')}
                </dd>
              </div>
            )}
            {project.subsidyCreditedDate && (
              <div>
                <dt className="text-sm text-gray-500">Subsidy Credited Date</dt>
                <dd className="text-sm font-medium text-green-600">
                  {format(new Date(project.subsidyCreditedDate), 'MMM dd, yyyy')}
                </dd>
              </div>
            )}
            {project.totalProjectCost && (
              <div>
                <dt className="text-sm text-gray-500">Total Project Cost</dt>
                <dd className="text-sm font-medium">
                  ₹{project.totalProjectCost.toLocaleString('en-IN')}
                </dd>
              </div>
            )}
            {/* Lost Stage Information */}
            {project.projectStatus === ProjectStatus.LOST && (
              <>
                {project.lostDate && (
                  <div>
                    <dt className="text-sm text-gray-500">Lost Date</dt>
                    <dd className="text-sm font-medium text-red-600">
                      {format(new Date(project.lostDate), 'MMM dd, yyyy')}
                    </dd>
                  </div>
                )}
                {project.lostReason && (
                  <div>
                    <dt className="text-sm text-gray-500">Reason for Loss</dt>
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
                {project.lostOtherReason && (
                  <div>
                    <dt className="text-sm text-gray-500">Other Reason Details</dt>
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
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Payment Tracking</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Payment Status</dt>
              <dd className="text-sm font-medium">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.paymentStatus === 'FULLY_PAID'
                      ? 'bg-green-100 text-green-800'
                      : project.paymentStatus === 'PARTIAL'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {project.paymentStatus.replace(/_/g, ' ')}
                </span>
              </dd>
            </div>
            {project.projectCost && (
              <>
                <div>
                  <dt className="text-sm text-gray-500">Total Amount Received</dt>
                  <dd className="text-sm font-medium text-green-600">
                    ₹{project.totalAmountReceived.toLocaleString('en-IN')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Balance Amount</dt>
                  <dd className="text-sm font-medium text-red-600">
                    ₹{project.balanceAmount.toLocaleString('en-IN')}
                  </dd>
                </div>
              </>
            )}
            {project.advanceReceived && (
              <div>
                <dt className="text-sm text-gray-500">Advance Received</dt>
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

      {/* Key Artifacts - View Only */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Key Artifacts</h2>
        <p className="text-sm text-gray-500 mb-4">
          To upload new artifacts, please click the <strong>Edit</strong> button above.
        </p>

        {/* Documents List - View Only */}
        {project.documents && project.documents.length > 0 && (
          <div>
            <h3 className="text-md font-semibold mb-4">Uploaded Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.documents.map((doc) => {
                // For AI Generated Proposal PDFs, only admin can delete even in view mode
                // For other documents, delete is disabled in view mode
                const isProposalPDF = doc.description === 'AI Generated Proposal PDF'
                const canDelete = isProposalPDF && hasRole([UserRole.ADMIN])
                const canView = hasRole([UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE]) || doc.uploadedById === user?.id
                
                return (
                  <div
                    key={doc.id}
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 group"
                  >
                    <div className="flex-1 flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {doc.category === 'photos_videos' ? 'Photos / Videos' :
                           doc.category === 'documents' ? 'Documents' :
                           doc.category === 'sheets' ? 'Sheets' : doc.category}
                          {doc.uploadedBy && ` • Uploaded by ${doc.uploadedBy.name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {canView && (
                        <>
                          <DocumentViewButton documentId={doc.id} fileName={doc.fileName} />
                          <DocumentDownloadButton documentId={doc.id} fileName={doc.fileName} />
                        </>
                      )}
                      {canDelete && (
                        <DocumentDeleteButton documentId={doc.id} projectId={project.id} />
                      )}
                    </div>
                  </div>
                )
              })}
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

// Document View Button Component
const DocumentViewButton = ({ documentId, fileName }: { documentId: string; fileName: string }) => {
  const { token } = useAuth()
  const [viewing, setViewing] = useState(false)

  const handleView = async () => {
    if (!token) {
      toast.error('Authentication required')
      return
    }

    setViewing(true)
    try {
      const response = await axiosInstance.get(`/api/documents/${documentId}/download`, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      // Get content type from response headers
      // Axios normalizes headers to lowercase, so check both variations
      const contentType = response.headers['content-type'] || 
                          response.headers['Content-Type'] || 
                          getContentTypeFromFileName(fileName)
      
      // Create blob with proper MIME type - this is crucial for proper viewing
      const blob = new Blob([response.data], { type: contentType })
      const blobUrl = window.URL.createObjectURL(blob)
      
      // For certain file types (PDFs, images), we want to open them inline
      // For others, we may need to download
      const isViewableInline = contentType.startsWith('image/') || 
                                contentType === 'application/pdf' ||
                                contentType.startsWith('text/') ||
                                contentType.includes('video/')
      
      if (isViewableInline) {
        // Open in new tab with the blob URL
        const newWindow = window.open(blobUrl, '_blank')
        
        if (!newWindow) {
          toast.error('Please allow popups to view files')
          window.URL.revokeObjectURL(blobUrl)
          return
        }
        
        // Clean up blob URL after the window loads
        // For blob URLs, browsers will keep them active as long as the window is open
        // We'll clean up after a reasonable delay (5 minutes) or when window closes
        const cleanup = () => {
          try {
            if (newWindow.closed) {
              window.URL.revokeObjectURL(blobUrl)
            } else {
              // Check again after delay
              setTimeout(cleanup, 60000) // Check every minute
            }
          } catch (e) {
            // Cross-origin restriction - can't check, cleanup after delay
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 300000) // 5 minutes
          }
        }
        
        // Start cleanup checking after a short delay
        setTimeout(cleanup, 5000)
      } else {
        // For non-viewable types, prompt download instead
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(blobUrl)
        toast.success('File opened')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to open file')
    } finally {
      setViewing(false)
    }
  }

  // Helper function to determine content type from file extension
  const getContentTypeFromFileName = (filename: string): string => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.mp4': 'video/mp4',
      '.mpeg': 'video/mpeg',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
    }
    return contentTypes[ext] || 'application/octet-stream'
  }

  return (
    <button
      onClick={handleView}
      disabled={viewing}
      className="text-primary-600 hover:text-primary-800 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      title="View file"
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
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    </button>
  )
}

// Document Download Button Component
const DocumentDownloadButton = ({ documentId, fileName }: { documentId: string; fileName: string }) => {
  const { token } = useAuth()
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!token) {
      toast.error('Authentication required')
      return
    }

    setDownloading(true)
    try {
      const response = await axiosInstance.get(`/api/documents/${documentId}/download?download=true`, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      // Create blob and trigger download
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('File downloaded successfully')
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
      title="Download file"
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
