import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Project, UserRole } from '../types'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const ProjectDetail = () => {
  const { id } = useParams()
  const { user, hasRole } = useAuth()

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await axios.get(`/api/projects/${id}`)
      return res.data as Project
    },
    retry: 1,
  })

  const canEdit = hasRole([UserRole.ADMIN]) || 
    (hasRole([UserRole.SALES]) && project?.salespersonId === user?.id) ||
    hasRole([UserRole.OPERATIONS, UserRole.FINANCE])

  if (isLoading) return <div className="p-6 text-center">Loading project details...</div>
  if (error) return <div className="p-6 text-center text-red-600">Error loading project: {(error as any).response?.data?.error || (error as any).message}</div>
  if (!project) return <div className="p-6 text-center">Project not found</div>

  return (
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
              {project.customer.address && (
                <div>
                  <dt className="text-sm text-gray-500">Address</dt>
                  <dd className="text-sm font-medium">{project.customer.address}</dd>
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
              {project.customer.leadSource && (
                <div>
                  <dt className="text-sm text-gray-500">Lead Source</dt>
                  <dd className="text-sm font-medium">{project.customer.leadSource}</dd>
                </div>
              )}
              {project.customer.leadBroughtBy && (
                <div>
                  <dt className="text-sm text-gray-500">Lead Brought By</dt>
                  <dd className="text-sm font-medium">{project.customer.leadBroughtBy}</dd>
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

      {/* Key Artifacts */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Key Artifacts</h2>
        
        {/* File Upload Section - Only for Sales and Operations */}
        {(hasRole([UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS])) && (
          <FileUploadSection projectId={project.id} />
        )}

        {/* Documents List */}
        {project.documents && project.documents.length > 0 && (
          <div className={hasRole([UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS]) ? "mt-6" : ""}>
            <h3 className="text-md font-semibold mb-4">Uploaded Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.documents.map((doc) => {
                const canDelete = hasRole([UserRole.ADMIN]) || doc.uploadedById === user?.id
                const canView = hasRole([UserRole.ADMIN, UserRole.MANAGEMENT]) || doc.uploadedById === user?.id
                
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
        
        {/* Show message if no documents and user can't upload */}
        {(!project.documents || project.documents.length === 0) && 
         !hasRole([UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS]) && (
          <p className="text-sm text-gray-500">No artifacts uploaded yet.</p>
        )}
      </div>
    </div>
  )
}

// File Upload Component
const FileUploadSection = ({ projectId }: { projectId: string }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [category, setCategory] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const queryClient = useQueryClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
      const blockedExtensions = [
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
        '.msi', '.dll', '.app', '.deb', '.rpm', '.dmg', '.pkg',
        '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso',
        '.docm', '.xlsm', '.pptm',
      ]
      
      if (blockedExtensions.includes(ext)) {
        toast.error(`File type not allowed: ${ext}. Executables, macros, and archive files are not permitted.`)
        e.target.value = ''
        return
      }

      // Check file size (25MB)
      if (file.size > 25 * 1024 * 1024) {
        toast.error('File size exceeds 25MB limit')
        e.target.value = ''
        return
      }

      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    if (!category) {
      toast.error('Please select a category')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('category', category)
    if (description) {
      formData.append('description', description)
    }

    try {
      await axios.post(`/api/documents/project/${projectId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      toast.success('File uploaded successfully')
      setSelectedFile(null)
      setCategory('')
      setDescription('')
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
      // Refresh project data
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <h3 className="text-md font-semibold mb-4">Upload File</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File
          </label>
          <input
            id="file-input"
            type="file"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            Allowed: Documents, Images, Videos, Spreadsheets. Max size: 25MB. Not allowed: Executables, Macros, Archives
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="">Select category</option>
            <option value="photos_videos">Photos / Videos</option>
            <option value="documents">Documents</option>
            <option value="sheets">Sheets</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Add a description for this file..."
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={!selectedFile || !category || uploading}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      </div>
    </div>
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
      const response = await axios.get(`/api/documents/${documentId}/download`, {
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
      const response = await axios.get(`/api/documents/${documentId}/download?download=true`, {
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
      await axios.delete(`/api/documents/${documentId}`)
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
