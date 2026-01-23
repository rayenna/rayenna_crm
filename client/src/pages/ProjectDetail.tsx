import { useState } from 'react'
// Payment Status: Shows N/A in red for projects without Order Value or in early/lost stages
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import { useParams, Link } from 'react-router-dom'
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
            {project.completionReportSubmissionDate && (
              <div>
                <dt className="text-sm text-gray-500">Completion Report Submission</dt>
                <dd className="text-sm font-medium">
                  {format(new Date(project.completionReportSubmissionDate), 'MMM dd, yyyy')}
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

      {/* Support / Service Tickets */}
      <div className="mt-6">
        <SupportTicketsSection projectId={project.id} projectStatus={project.projectStatus} />
      </div>

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
                // Admin can delete any document
                // Uploader can delete their own documents (except Proposal PDFs which only admin can delete)
                const isProposalPDF = doc.description === 'AI Generated Proposal PDF'
                const isAdmin = hasRole([UserRole.ADMIN])
                const isUploader = doc.uploadedById === user?.id
                const canDelete = isAdmin || (isUploader && !isProposalPDF)
                const canView = hasRole([UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE]) || isUploader
                
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
