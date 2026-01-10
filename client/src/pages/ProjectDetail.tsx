import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Project, UserRole } from '../types'
import { format } from 'date-fns'

const ProjectDetail = () => {
  const { id } = useParams()
  const { user, hasRole } = useAuth()

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await axios.get(`/api/projects/${id}`)
      return res.data as Project
    },
  })

  const canEdit = hasRole([UserRole.ADMIN]) || 
    (hasRole([UserRole.SALES]) && project?.salespersonId === user?.id) ||
    hasRole([UserRole.OPERATIONS, UserRole.FINANCE])

  if (isLoading) return <div>Loading...</div>
  if (!project) return <div>Project not found</div>

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Project #{project.slNo} - {project.customerName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Created: {format(new Date(project.createdAt), 'MMM dd, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Details */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Customer Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Customer Name</dt>
              <dd className="text-sm font-medium">{project.customerName}</dd>
            </div>
            {project.address && (
              <div>
                <dt className="text-sm text-gray-500">Address</dt>
                <dd className="text-sm font-medium">{project.address}</dd>
              </div>
            )}
            {project.contactNumbers && (
              <div>
                <dt className="text-sm text-gray-500">Contact Numbers</dt>
                <dd className="text-sm font-medium">
                  {JSON.parse(project.contactNumbers).join(', ')}
                </dd>
              </div>
            )}
            {project.consumerNumber && (
              <div>
                <dt className="text-sm text-gray-500">Consumer Number</dt>
                <dd className="text-sm font-medium">{project.consumerNumber}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-500">Type</dt>
              <dd className="text-sm font-medium">{project.type.replace(/_/g, ' ')}</dd>
            </div>
            {project.leadSource && (
              <div>
                <dt className="text-sm text-gray-500">Lead Source</dt>
                <dd className="text-sm font-medium">{project.leadSource}</dd>
              </div>
            )}
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
                <dt className="text-sm text-gray-500">Project Cost</dt>
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
              <dt className="text-sm text-gray-500">Incentive Eligible</dt>
              <dd className="text-sm font-medium">
                {project.incentiveEligible ? 'Yes' : 'No'}
              </dd>
            </div>
            {project.expectedProfit && (
              <div>
                <dt className="text-sm text-gray-500">Expected Profit</dt>
                <dd className="text-sm font-medium text-green-600">
                  ₹{project.expectedProfit.toLocaleString('en-IN')}
                </dd>
              </div>
            )}
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

        {/* Project Execution */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Project Execution</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Status</dt>
              <dd className="text-sm font-medium">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                  {project.projectStatus.replace(/_/g, ' ')}
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
                <dt className="text-sm text-gray-500">Feasibility Date (KSEB)</dt>
                <dd className="text-sm font-medium">
                  {format(new Date(project.feasibilityDate), 'MMM dd, yyyy')}
                </dd>
              </div>
            )}
            {project.registrationDate && (
              <div>
                <dt className="text-sm text-gray-500">Registration Date (KSEB)</dt>
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
                <dt className="text-sm text-gray-500">Subsidy Request Date</dt>
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

      {/* Remarks */}
      {project.remarks && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Remarks</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.remarks}</p>
        </div>
      )}

      {/* Documents */}
      {project.documents && project.documents.length > 0 && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Documents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.documents.map((doc) => (
              <a
                key={doc.id}
                href={`/api${doc.filePath.replace(/^\./, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                  <p className="text-xs text-gray-500">{doc.category}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectDetail
