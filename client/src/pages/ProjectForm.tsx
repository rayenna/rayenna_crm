import { useEffect, useState, useMemo, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Project, ProjectType, ProjectServiceType, UserRole, ProjectStatus, LostReason, LostToCompetitionReason, LeadSource } from '../types'
import toast from 'react-hot-toast'
import RemarksSection from '../components/remarks/RemarksSection'

// File Upload Component
const FileUploadSection = ({ projectId, existingCount = 0, maxFiles = 10 }: { projectId: string; existingCount?: number; maxFiles?: number }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [category, setCategory] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const queryClient = useQueryClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (existingCount >= maxFiles) {
      toast.error(`Maximum of ${maxFiles} files per project reached.`)
      return
    }
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload images, PDFs, or Office documents.')
        return
      }
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit.')
        return
      }
      setSelectedFile(file)
    }
  }

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Axios interceptor automatically handles FormData - removes Content-Type so browser sets it with boundary
      const res = await axiosInstance.post(
        `/api/documents/project/${projectId}`,
        formData
      )
      return res.data
    },
    onSuccess: () => {
      toast.success('File uploaded successfully!')
      setSelectedFile(null)
      setCategory('')
      setDescription('')
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to upload file')
      setUploading(false)
    },
  })

  const handleUpload = () => {
    if (existingCount >= maxFiles) {
      toast.error(`Maximum of ${maxFiles} files per project reached.`)
      return
    }
    if (!selectedFile || !category) {
      toast.error('Please select a file and category')
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('category', category)
    if (description) {
      formData.append('description', description)
    }
    uploadMutation.mutate(formData)
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-md font-semibold mb-4">Upload File</h3>
      <div className="space-y-4">
        <p className="text-xs text-gray-600">
          You can upload up to {maxFiles} files per project. Currently uploaded: {existingCount}.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            disabled={existingCount >= maxFiles}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
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
            className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="Add a brief description..."
          />
        </div>
        <button
          onClick={handleUpload}
          disabled={!selectedFile || !category || uploading || existingCount >= maxFiles}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      </div>
    </div>
  )
}

const ProjectForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasRole, user } = useAuth()
  const queryClient = useQueryClient()
  const isEdit = !!id
  const isFinanceOnly = user?.role === UserRole.FINANCE && isEdit

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/projects/${id}`)
      return res.data as Project
    },
    enabled: isEdit,
  })

  const { data: _salespersons } = useQuery({
    queryKey: ['salespersons'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/users/role/sales')
      return res.data
    },
  })

  const { data: customers, isLoading: customersLoading, error: customersError } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/api/customers?limit=10000') // Fetch all customers (up to 10000)
        console.log('Customers loaded:', res.data?.customers?.length || 0, 'customers')
        return res.data
      } catch (error: any) {
        console.error('Error fetching customers:', error)
        throw error
      }
    },
    enabled: true, // Always fetch customers
    retry: 2, // Retry on failure
  })

  // Function to calculate Financial Year from a date
  // FY runs from April 1 to March 31
  // e.g., April 1, 2024 to March 31, 2025 = FY 2024-25
  const calculateFY = (date: Date | string | null | undefined): string | null => {
    if (!date) return null;
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return null;
      
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth() + 1; // getMonth() returns 0-11
      
      // If month is April (4) or later, FY starts in current year
      // If month is Jan-Mar (1-3), FY started in previous year
      if (month >= 4) {
        // April 2024 to March 2025 = FY 2024-25
        return `${year}-${String(year + 1).slice(-2)}`;
      } else {
        // January 2025 to March 2025 = FY 2024-25 (started in 2024)
        return `${year - 1}-${String(year).slice(-2)}`;
      }
    } catch (error) {
      return null;
    }
  };

  const { register, handleSubmit, setValue, getValues, watch, control } = useForm()
  const selectedCustomerId = watch('customerId')
  const confirmationDate = watch('confirmationDate')
  const projectStatus = watch('projectStatus')
  const projectType = watch('type')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const customerDropdownRef = useRef<HTMLDivElement>(null)
  
  // Check if project is already in Lost status (prevents editing)
  // For new projects, project will be undefined, so isLost will be false
  const isLost = isEdit && project?.projectStatus === ProjectStatus.LOST
  const isProjectLost = isLost || projectStatus === ProjectStatus.LOST

  // Auto-calculate FY when confirmationDate changes
  useEffect(() => {
    if (confirmationDate) {
      const fy = calculateFY(confirmationDate);
      if (fy) {
        setValue('year', fy);
      }
    } else {
      // Clear year if confirmationDate is cleared
      setValue('year', '');
    }
  }, [confirmationDate, setValue])

  // For Lost: set lostDate to today if not set; do not zero projectCost (order value is required and stored as lost revenue)
  useEffect(() => {
    if (projectStatus === ProjectStatus.LOST && !watch('lostDate')) {
      const today = new Date().toISOString().split('T')[0];
      setValue('lostDate', today);
    }
    if (projectStatus === ProjectStatus.LOST) {
      setValue('totalProjectCost', 0);
    }
  }, [projectStatus, setValue, watch])

  // Clear leadSourceDetails when leadSource changes to a value that doesn't need details
  const leadSource = watch('leadSource')
  useEffect(() => {
    if (leadSource && 
        leadSource !== LeadSource.CHANNEL_PARTNER && 
        leadSource !== LeadSource.REFERRAL && 
        leadSource !== LeadSource.OTHER) {
      setValue('leadSourceDetails', '');
    }
  }, [leadSource, setValue])

  // Auto-select Panel Type based on Segment (only for new projects, not edits)
  useEffect(() => {
    if (!isEdit && projectType) {
      if (projectType === ProjectType.RESIDENTIAL_SUBSIDY) {
        setValue('panelType', 'DCR');
      } else if (projectType === ProjectType.RESIDENTIAL_NON_SUBSIDY || projectType === ProjectType.COMMERCIAL_INDUSTRIAL) {
        setValue('panelType', 'Non-DCR');
      }
    }
  }, [projectType, isEdit, setValue])

  // Filter customers based on search and user permissions
  const filteredCustomers = useMemo(() => {
    if (!customers?.customers) return []
    
    // For Sales users, only show customers they created or are tagged to
    let availableCustomers = customers.customers
    if (user?.role === UserRole.SALES && user?.id) {
      availableCustomers = customers.customers.filter((customer: any) => {
        const isCreator = customer.createdById === user.id
        const isTagged = customer.salespersonId === user.id
        // Backward compatibility: if customer has projects, check if any were created by this user
        const hasUserProjects = customer.projects && customer.projects.length > 0 && 
          customer.projects.some((project: any) => project.createdById === user.id)
        const matches = isCreator || isTagged || hasUserProjects
        return matches
      })
      console.log('Sales user filtering customers:', {
        userRole: user.role,
        userId: user.id,
        totalCustomers: customers.customers.length,
        filteredCustomers: availableCustomers.length,
        sampleCustomers: customers.customers.slice(0, 5).map((c: any) => ({
          id: c.id,
          name: c.customerName,
          createdById: c.createdById,
          salespersonId: c.salespersonId,
          hasProjects: c.projects?.length > 0,
          projectCreatedBy: c.projects?.[0]?.createdById,
          matches: c.createdById === user.id || c.salespersonId === user.id || (c.projects?.[0]?.createdById === user.id)
        })),
        filteredSample: availableCustomers.slice(0, 3).map((c: any) => ({
          id: c.id,
          name: c.customerName,
          createdById: c.createdById,
          salespersonId: c.salespersonId
        }))
      })
    } else {
      console.log('Not filtering - user role:', user?.role, 'userId:', user?.id)
    }
    
    // Apply search filter
    if (!customerSearch.trim()) return availableCustomers
    
    const searchLower = customerSearch.toLowerCase()
    return availableCustomers.filter((customer: any) => 
      customer.customerName?.toLowerCase().includes(searchLower) ||
      customer.customerId?.toLowerCase().includes(searchLower) ||
      (customer.consumerNumber && customer.consumerNumber.toLowerCase().includes(searchLower)) ||
      (customer.address && customer.address.toLowerCase().includes(searchLower))
    )
  }, [customers?.customers, customerSearch, user?.role, user?.id])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }

    if (showCustomerDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCustomerDropdown])

  useEffect(() => {
    if (project && isEdit) {
      const immutableFields = ['id', 'slNo', 'count', 'createdById', 'createdAt', 'updatedAt', 'totalAmountReceived', 'balanceAmount', 'paymentStatus', 'expectedProfit', 'customer'];
      // When editing a Lost project, show order value from lostRevenue (projectCost is stored as 0)
      if (project.projectStatus === ProjectStatus.LOST && (project.lostRevenue != null || project.projectCost != null)) {
        setValue('projectCost', project.lostRevenue ?? project.projectCost ?? 0);
      }
      Object.keys(project).forEach((key) => {
        // Skip immutable/system fields
        if (immutableFields.includes(key)) {
          return;
        }
        // For Lost projects, projectCost was already set from lostRevenue above; skip overwriting with 0
        if (key === 'projectCost' && project.projectStatus === ProjectStatus.LOST) {
          return;
        }
        // Set customerId from project
        if (key === 'customerId') {
          setValue('customerId', project.customerId);
          // Also set the search field if customer info is available
          if (project.customer) {
            setCustomerSearch(`${project.customer.customerId} - ${project.customer.customerName}`);
          }
        } else if (key === 'loanDetails' && project.loanDetails) {
          try {
            setValue(key, JSON.parse(project.loanDetails));
          } catch {
            setValue(key, project.loanDetails);
          }
        } else {
          // Handle date fields - convert ISO strings to YYYY-MM-DD for HTML date inputs
          if (key.includes('Date') && project[key as keyof Project]) {
            try {
              const dateValue = project[key as keyof Project] as string;
              if (dateValue) {
                const date = new Date(dateValue);
                if (!isNaN(date.getTime())) {
                  // Format as YYYY-MM-DD for HTML date input
                  const formatted = date.toISOString().split('T')[0];
                  setValue(key as any, formatted);
                } else {
                  setValue(key as any, project[key as keyof Project]);
                }
              }
            } catch {
              setValue(key as any, project[key as keyof Project]);
            }
          } else {
            setValue(key as any, project[key as keyof Project]);
          }
        }
      })
    }
  }, [project, isEdit, setValue])

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        return axiosInstance.put(`/api/projects/${id}`, data)
      } else {
        return axiosInstance.post('/api/projects', data)
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Project updated successfully' : 'Project created successfully')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate('/projects')
    },
    onError: (error: any) => {
      console.error('Project mutation error:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle validation errors (express-validator returns errors array)
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorMessages = error.response.data.errors.map((err: any) => 
          `${err.param || 'Field'}: ${err.msg || err.message || 'Invalid value'}`
        ).join('\n');
        toast.error(errorMessages, { duration: 6000 });
      } else {
        // Handle single error message
        const errorMessage = error.response?.data?.error || error.message || 'Operation failed';
        toast.error(errorMessage, { duration: 5000 });
      }
    },
  })

  const onSubmit = (data: any) => {
    console.log('[PROJECT FORM] onSubmit called with data:', data);
    // Get all form values including empty fields
    const allValues = getValues();
    
    // Define confirmed and later stages once for reuse
    const confirmedAndLaterStages = [
      ProjectStatus.CONFIRMED,
      ProjectStatus.UNDER_INSTALLATION,
      ProjectStatus.SUBMITTED_FOR_SUBSIDY,
      ProjectStatus.COMPLETED,
      ProjectStatus.COMPLETED_SUBSIDY_CREDITED
    ];
    
    // Remove immutable/system fields that shouldn't be sent to backend
    // Note: totalProjectCost is intentionally NOT treated as immutable so that
    // Operations/Admin users can update it from the Project Lifecycle section.
    const immutableFields = [
      'id', 'slNo', 'count', 'createdById', 'createdAt', 'updatedAt', 
      'totalAmountReceived', 'balanceAmount', 'paymentStatus', 'expectedProfit', 
      'customer', 'remarks', 'createdBy', 'salesperson', 'opsPerson', 
      'documents', 'auditLogs', 'grossProfit', 'profitability', 'finalProfit',
      'projectValue', 'marginEstimate'
    ];
    immutableFields.forEach((field) => {
      delete data[field];
    });
    
    // Convert numeric fields from strings to numbers (form inputs return strings)
    const numericFields = ['systemCapacity', 'projectCost', 'advanceReceived', 'payment1', 'payment2', 'payment3', 'lastPayment'];
    numericFields.forEach((field) => {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        const numValue = parseFloat(String(data[field]));
        data[field] = isNaN(numValue) ? null : numValue;
      } else {
        data[field] = null;
      }
    });
    
    // Remove customerId from update requests (customer cannot be changed after project creation)
    if (isEdit) {
      delete data.customerId;
    } else {
      // Ensure customerId is provided only when creating a new project
      if (!data.customerId) {
        toast.error('Please select a customer');
        return;
      }
      
      // Ensure required fields are present for new projects
      if (!data.confirmationDate) {
        toast.error('Confirmation Date is required for new projects');
        return;
      }
      
      if (!data.type) {
        toast.error('Segment (Project Type) is required');
        return;
      }
    }

    // Ensure projectServiceType has a default value if not provided
    if (!data.projectServiceType) {
      data.projectServiceType = ProjectServiceType.EPC_PROJECT;
    }

    // Date field names with user-friendly labels for validation
    const dateFields = [
      { field: 'confirmationDate', label: 'Confirmation Date' },
      { field: 'advanceReceivedDate', label: 'Advance Received Date' },
      { field: 'payment1Date', label: 'Payment 1 Date' },
      { field: 'payment2Date', label: 'Payment 2 Date' },
      { field: 'payment3Date', label: 'Payment 3 Date' },
      { field: 'lastPaymentDate', label: 'Last Payment Date' },
      { field: 'mnrePortalRegistrationDate', label: 'MNRE Portal Registration Date' },
      { field: 'feasibilityDate', label: 'Feasibility Date' },
      { field: 'registrationDate', label: 'Registration Date' },
      { field: 'installationCompletionDate', label: 'Installation Completion Date' },
      { field: 'completionReportSubmissionDate', label: 'Completion Report Submission Date' },
      { field: 'subsidyRequestDate', label: 'Subsidy Request Date' },
      { field: 'lostDate', label: 'Lost Date' },
    ];
    
    // Special validation for Lost status
    if (data.projectStatus === ProjectStatus.LOST) {
      if (!data.lostDate) {
        toast.error('Lost date is required when project stage is Lost');
        return;
      }
      const lostDate = new Date(data.lostDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (lostDate > today) {
        toast.error('Lost date cannot be a future date');
        return;
      }
      if (!data.lostReason) {
        toast.error('Please select a reason for loss');
        return;
      }
      if (data.lostReason === LostReason.OTHER && !data.lostOtherReason) {
        toast.error('Please enter the reason for loss');
        return;
      }
      if (data.lostReason === LostReason.LOST_TO_COMPETITION && !data.lostToCompetitionReason) {
        toast.error('Please select why the deal was lost to competition');
        return;
      }
      // Confirmation Date (order lost date) is required for Lost - current or past
      if (!data.confirmationDate) {
        toast.error('Confirmation Date (order lost date) is required for Lost projects');
        return;
      }
      const confDate = new Date(data.confirmationDate);
      if (confDate > today) {
        toast.error('Confirmation Date (order lost date) cannot be a future date');
        return;
      }
      // Order value is required for Lost (stored as lost revenue); project cost will be saved as 0 by backend
      const orderValue = allValues.projectCost !== undefined ? allValues.projectCost : data.projectCost;
      if (orderValue === undefined || orderValue === '' || orderValue === null || parseFloat(String(orderValue)) <= 0) {
        toast.error('Order Value is required and must be greater than 0 for Lost projects (stored as lost revenue for analysis)');
        return;
      }
      data.totalProjectCost = 0;
      // Keep data.projectCost as the order value; backend will set lostRevenue = projectCost, projectCost = 0
    }
    
    // Validate Order Value is required for CONFIRMED stage and onwards (and LOST handled above)
    if (confirmedAndLaterStages.includes(data.projectStatus) && data.projectStatus !== ProjectStatus.LOST) {
      const projectCostValue = allValues.projectCost !== undefined ? allValues.projectCost : data.projectCost;
      if (!projectCostValue || projectCostValue === '' || projectCostValue === null || parseFloat(String(projectCostValue)) <= 0) {
        toast.error('Order Value is required and must be greater than 0 for Confirmed Order stage and onwards');
        return;
      }
    }
    
    // Validate all dates before proceeding
    const dateErrors: string[] = [];
    
    dateFields.forEach(({ field, label }) => {
      const value = allValues[field] || data[field];
      
      // Skip validation for empty/null dates (they're valid)
      if (!value || value === '' || value === null) {
        data[field] = null;
        return;
      }
      
      try {
        const date = new Date(value);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
          dateErrors.push(`${label} is not a valid date. Please enter a valid date.`);
          return;
        }
        
        // Check if date is within reasonable range (1900-2100)
        const year = date.getFullYear();
        if (year < 1900 || year > 2100) {
          dateErrors.push(`${label} has an invalid year (${year}). Please enter a date between 1900 and 2100.`);
          return;
        }
        
        // Date is valid, format it
        data[field] = date.toISOString();
      } catch (error) {
        dateErrors.push(`${label} is not a valid date format. Please enter a valid date (YYYY-MM-DD).`);
      }
    });
    
    // If there are date validation errors, show them and prevent submission
    if (dateErrors.length > 0) {
      const errorMessage = dateErrors.length === 1 
        ? dateErrors[0]
        : `Multiple invalid dates found:\n${dateErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
      
      toast.error(errorMessage, { duration: 6000 });
      return; // Prevent form submission
    }
    
    // Payment field pairs - amount and date must both be provided or both be empty
    const paymentFieldPairs = [
      { amount: 'advanceReceived', date: 'advanceReceivedDate', label: 'Advance Received' },
      { amount: 'payment1', date: 'payment1Date', label: 'Payment 1' },
      { amount: 'payment2', date: 'payment2Date', label: 'Payment 2' },
      { amount: 'payment3', date: 'payment3Date', label: 'Payment 3' },
      { amount: 'lastPayment', date: 'lastPaymentDate', label: 'Last Payment' },
    ];
    
    // Validate that amount and date are both provided or both empty
    const paymentErrors: string[] = [];
    
    paymentFieldPairs.forEach(({ amount, date, label }) => {
      const amountValue = allValues[amount] !== undefined ? allValues[amount] : data[amount];
      const dateValue = allValues[date] !== undefined ? allValues[date] : data[date];
      
      // Check if amount is provided
      const hasAmount = amountValue !== undefined && amountValue !== null && amountValue !== '' && parseFloat(String(amountValue)) > 0;
      // Check if date is provided
      const hasDate = dateValue !== undefined && dateValue !== null && dateValue !== '';
      
      // If amount is provided but date is not, or vice versa, show error
      if (hasAmount && !hasDate) {
        paymentErrors.push(`${label}: Amount is entered but date is missing. Please enter both amount and date.`);
      } else if (hasDate && !hasAmount) {
        paymentErrors.push(`${label}: Date is entered but amount is missing. Please enter both amount and date.`);
      }
      
      // Process amount field
      if (amountValue === undefined || amountValue === null || amountValue === '') {
        data[amount] = 0; // Default to 0 if not provided
      } else {
        // Convert to number
        const numValue = parseFloat(String(amountValue));
        data[amount] = isNaN(numValue) ? 0 : numValue;
      }
    });
    
    // If there are payment validation errors, show them and prevent submission
    if (paymentErrors.length > 0) {
      const errorMessage = paymentErrors.length === 1 
        ? paymentErrors[0]
        : `Payment validation errors:\n${paymentErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
      
      toast.error(errorMessage, { duration: 6000 });
      return; // Prevent form submission
    }

    // Format arrays/objects
    if (data.loanDetails && typeof data.loanDetails === 'object') {
      // Keep as object, will be stringified on backend
    }

    // Clean up any remaining nested objects or arrays that shouldn't be sent
    Object.keys(data).forEach((key) => {
      const value = data[key];
      // Remove nested objects (these come from API responses, not form inputs)
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Check if it's a plain object (not Date, not null)
        if (value.constructor === Object) {
          delete data[key];
        }
      }
      // Remove arrays (documents, auditLogs, etc.)
      if (Array.isArray(value)) {
        delete data[key];
      }
    });
    
    // For new project creation, only send fields that backend expects
    if (!isEdit) {
      // Backend only accepts these fields for creation:
      const allowedFields = [
        'customerId', 'type', 'projectServiceType', 'salespersonId', 'year',
        'systemCapacity', 'projectCost', 'confirmationDate', 'loanDetails',
        'incentiveEligible', 'leadSource', 'leadSourceDetails',
        'roofType', 'systemType', 'projectStatus', 'lostDate', 'lostReason', 'lostToCompetitionReason', 'lostOtherReason',
        'leadId', 'assignedOpsId', 'panelBrand', 'inverterBrand',
        'siteAddress', 'expectedCommissioningDate', 'internalNotes',
        // Payment fields (optional for new projects)
        'advanceReceived', 'advanceReceivedDate', 'payment1', 'payment1Date',
        'payment2', 'payment2Date', 'payment3', 'payment3Date',
        'lastPayment', 'lastPaymentDate',
        // Execution fields (optional for new projects)
        'mnrePortalRegistrationDate', 'feasibilityDate', 'registrationDate',
        'installationCompletionDate', 'completionReportSubmissionDate', 'subsidyRequestDate', 'subsidyCreditedDate',
        'mnreInstallationDetails',
        // Execution cost field (used later for gross profit / profitability)
        'totalProjectCost',
      ];
      
      // Remove any fields not in the allowed list
      Object.keys(data).forEach((key) => {
        if (!allowedFields.includes(key)) {
          delete data[key];
        }
      });
    }
    
    // Ensure empty strings for numeric fields are converted to null
    if (data.systemCapacity === '' || data.systemCapacity === undefined) {
      data.systemCapacity = null;
    }
    // Only convert projectCost to null if not in CONFIRMED or later stages (LOST sends order value; backend zeros it)
    if (!confirmedAndLaterStages.includes(data.projectStatus) && data.projectStatus !== ProjectStatus.LOST) {
      if (data.projectCost === '' || data.projectCost === undefined) {
        data.projectCost = null;
      }
    }
    
    console.log('Submitting data:', data); // Debug log
    // Debug: Log full data object
    console.log('Submitting data (full):', JSON.stringify(data, null, 2));
    console.log('Payment fields:', {
      advanceReceived: data.advanceReceived,
      advanceReceivedDate: data.advanceReceivedDate,
      payment1: data.payment1,
      payment1Date: data.payment1Date,
      payment2: data.payment2,
      payment2Date: data.payment2Date,
      payment3: data.payment3,
      payment3Date: data.payment3Date,
      lastPayment: data.lastPayment,
      lastPaymentDate: data.lastPaymentDate,
    });
    
    mutation.mutate(data)
  }

  const canEditPayments = hasRole([UserRole.ADMIN, UserRole.FINANCE])
  const canEditExecution = hasRole([UserRole.ADMIN, UserRole.OPERATIONS])
  const canEditSales = hasRole([UserRole.ADMIN, UserRole.SALES])
  
  // Finance users can only edit payment tracking section
  // Projects in Lost status cannot be edited (except Admin can delete)
  // However, Sales (for their projects) and Operations can edit Lost status fields
  const canEditOtherSections = !isFinanceOnly && !isLost
  const canEditLostFields = isEdit && projectStatus === ProjectStatus.LOST && !isLost && 
    (hasRole([UserRole.ADMIN]) || 
     (hasRole([UserRole.SALES]) && project?.salespersonId === user?.id) ||
     hasRole([UserRole.OPERATIONS]))

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-4xl font-extrabold text-primary-800 mb-6">
        {isEdit ? 'Edit Project' : 'New Project'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit, (errors) => {
        console.error('[PROJECT FORM] Form validation errors:', errors);
        console.error('[PROJECT FORM] Current form values:', getValues());
        console.error('[PROJECT FORM] customerId value:', getValues('customerId'));
        const errorMessages = Object.entries(errors).map(([field, error]: [string, any]) => {
          const message = error?.message || error?.type || 'Invalid value';
          console.error(`[PROJECT FORM] Error for ${field}:`, message, error);
          return `${field}: ${message}`;
        });
        if (errorMessages.length > 0) {
          toast.error(`Please fix the following errors:\n${errorMessages.join('\n')}`, { duration: 6000 });
        }
      })} className="space-y-6">
        {/* Customer Selection - Hidden for Finance users in edit mode */}
        {canEditOtherSections && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Customer & Project Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer * {isEdit && <span className="text-xs text-gray-500 font-normal">(Cannot be changed - create a new project to change customer)</span>}
              </label>
              {customersLoading ? (
                <div className="mt-1 text-sm text-gray-500">Loading customers...</div>
              ) : customersError ? (
                <div className="mt-1 text-sm text-red-500">
                  Error loading customers: {customersError?.message || 'Unknown error'}. Please try again or{' '}
                  <Link to="/customers" className="text-primary-600 hover:text-primary-800 underline">
                    create a new customer
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <div className="flex-1 relative" ref={customerDropdownRef}>
                      <input
                        type="text"
                        placeholder="Search customer by name, ID, or consumer number..."
                        value={customerSearch}
                        onChange={(e) => {
                          if (!isEdit) {
                            setCustomerSearch(e.target.value)
                            setShowCustomerDropdown(true)
                          }
                        }}
                        onFocus={() => {
                          if (!isEdit) {
                            setShowCustomerDropdown(true)
                          }
                        }}
                        disabled={isEdit}
                        readOnly={isEdit}
                        className={`w-full border border-gray-300 rounded-md px-3 py-2 pr-10 ${
                          isEdit ? 'bg-gray-100 cursor-not-allowed text-gray-600' : ''
                        }`}
                      />
                      {customerSearch && !isEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerSearch('')
                            setShowCustomerDropdown(false)
                            setValue('customerId', '')
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      )}
                      {!isEdit && showCustomerDropdown && filteredCustomers.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                          {filteredCustomers.map((customer: any) => (
                            <div
                              key={customer.id}
                              onMouseDown={(e) => {
                                e.preventDefault() // Prevent input blur
                                setValue('customerId', customer.id, { shouldValidate: true, shouldDirty: true })
                                setCustomerSearch(`${customer.customerId} - ${customer.customerName}`)
                                setShowCustomerDropdown(false)
                              }}
                              className="px-4 py-2 hover:bg-primary-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-sm text-gray-900">
                                {customer.customerId} - {customer.customerName}
                              </div>
                              {customer.consumerNumber && (
                                <div className="text-xs text-gray-500">Consumer: {customer.consumerNumber}</div>
                              )}
                              {customer.address && (
                                <div className="text-xs text-gray-500 truncate">{customer.address}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {!isEdit && showCustomerDropdown && customerSearch && filteredCustomers.length === 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-sm text-gray-500">
                          No customers found matching "{customerSearch}"
                        </div>
                      )}
                    </div>
                    <Controller
                      name="customerId"
                      control={control}
                      rules={{ required: !isEdit ? 'Please select a customer' : false }}
                      render={({ field }) => (
                        <select
                          {...field}
                          onChange={(e) => {
                            field.onChange(e); // Update form state
                            if (!isEdit) {
                              const selectedId = e.target.value
                              if (selectedId) {
                                const customer = filteredCustomers?.find((c: any) => c.id === selectedId)
                                if (customer) {
                                  setCustomerSearch(`${customer.customerId} - ${customer.customerName}`)
                                }
                              } else {
                                setCustomerSearch('')
                              }
                            }
                          }}
                          disabled={isEdit}
                          className={`w-48 border border-gray-300 rounded-md px-3 py-2 ${
                            isEdit ? 'bg-gray-100 cursor-not-allowed text-gray-600' : ''
                          }`}
                        >
                          <option value="">Or select from list</option>
                          {filteredCustomers && filteredCustomers.length > 0 ? (
                            filteredCustomers.map((customer: any) => (
                              <option key={customer.id} value={customer.id}>
                                {customer.customerId} - {customer.customerName}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>No customers found</option>
                          )}
                        </select>
                      )}
                    />
                  </div>
                  {customers?.customers && customers.customers.length === 0 && (
                    <p className="mt-2 text-xs text-yellow-600">
                      No customers found. Please{' '}
                      <Link to="/customers" className="text-primary-600 hover:text-primary-800 underline">
                        create a customer
                      </Link>{' '}
                      first.
                    </p>
                  )}
                  {/* Hidden input removed - customerId is already registered on the select dropdown above */}
                </>
              )}
              {selectedCustomerId && filteredCustomers && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
                  {(() => {
                    const customer = filteredCustomers.find((c: any) => c.id === selectedCustomerId);
                    if (customer) {
                      return (
                        <div>
                          <p className="font-medium text-gray-900 mb-2">Selected Customer Details:</p>
                          <p><strong>Customer ID:</strong> {customer.customerId}</p>
                          <p><strong>Name:</strong> {customer.customerName}</p>
                          {customer.address && (
                            <p><strong>Address:</strong> {customer.address}</p>
                          )}
                          {customer.contactNumbers && (
                            <p><strong>Contact:</strong> {(() => {
                              try {
                                const contacts = JSON.parse(customer.contactNumbers);
                                return Array.isArray(contacts) ? contacts.join(', ') : customer.contactNumbers;
                              } catch {
                                return customer.contactNumbers;
                              }
                            })()}</p>
                          )}
                          {customer.consumerNumber && (
                            <p><strong>Consumer Number:</strong> {customer.consumerNumber}</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
              {!isEdit && (
                <p className="mt-2 text-xs text-gray-500">
                  Don't see the customer? <Link to="/customers" className="text-primary-600 hover:text-primary-800">Create a new customer</Link>
                </p>
              )}
              {isEdit && (
                <p className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  <strong>Note:</strong> Customer cannot be changed for existing projects. To assign a different customer, please create a new project.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Segment *</label>
              <select
                {...register('type', { required: true })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              >
                {Object.values(ProjectType).map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Project Type *</label>
              <select
                {...register('projectServiceType', { required: true })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                defaultValue={ProjectServiceType.EPC_PROJECT}
              >
                <option value={ProjectServiceType.EPC_PROJECT}>EPC Project</option>
                <option value={ProjectServiceType.PANEL_CLEANING}>Panel Cleaning</option>
                <option value={ProjectServiceType.MAINTENANCE}>Maintenance</option>
                <option value={ProjectServiceType.REPAIR}>Repair</option>
                <option value={ProjectServiceType.CONSULTING}>Consulting</option>
                <option value={ProjectServiceType.RESALE}>Resale</option>
                <option value={ProjectServiceType.OTHER_SERVICES}>Other Services</option>
              </select>
            </div>
            {/* Sales Person is now managed at Customer level, not Project level */}
          </div>
        </div>
        )}

        {/* Sales & Commercial - Visible for Sales/Admin users or when editing (except Lost projects and Finance-only mode)
            Also allows Operations and Sales (for their projects) to edit Lost stage fields */}
        {((canEditSales || isEdit || canEditLostFields) && (canEditOtherSections || canEditLostFields)) && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Sales & Commercial</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Lead Source
                </label>
                <select
                  {...register('leadSource')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select Lead Source</option>
                  <option value={LeadSource.WEBSITE}>Website</option>
                  <option value={LeadSource.REFERRAL}>Referral</option>
                  <option value={LeadSource.GOOGLE}>Google</option>
                  <option value={LeadSource.CHANNEL_PARTNER}>Channel Partner</option>
                  <option value={LeadSource.DIGITAL_MARKETING}>Digital Marketing</option>
                  <option value={LeadSource.SALES}>Sales</option>
                  <option value={LeadSource.MANAGEMENT_CONNECT}>Management Connect</option>
                  <option value={LeadSource.OTHER}>Other</option>
                </select>
              </div>
              {/* Conditional text input for Channel Partner, Referral, or Other */}
              {(watch('leadSource') === LeadSource.CHANNEL_PARTNER || 
                watch('leadSource') === LeadSource.REFERRAL || 
                watch('leadSource') === LeadSource.OTHER) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {watch('leadSource') === LeadSource.CHANNEL_PARTNER && 'Channel Partner Name'}
                    {watch('leadSource') === LeadSource.REFERRAL && 'Referral Name'}
                    {watch('leadSource') === LeadSource.OTHER && 'Other Details'}
                  </label>
                  <input
                    type="text"
                    {...register('leadSourceDetails')}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder={
                      watch('leadSource') === LeadSource.CHANNEL_PARTNER ? 'Enter channel partner name' :
                      watch('leadSource') === LeadSource.REFERRAL ? 'Enter referral name' :
                      'Enter details'
                    }
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  System Capacity (kW)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('systemCapacity')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Order Value (₹)
                  {(projectStatus === ProjectStatus.CONFIRMED ||
                    projectStatus === ProjectStatus.UNDER_INSTALLATION ||
                    projectStatus === ProjectStatus.SUBMITTED_FOR_SUBSIDY ||
                    projectStatus === ProjectStatus.COMPLETED ||
                    projectStatus === ProjectStatus.COMPLETED_SUBSIDY_CREDITED ||
                    projectStatus === ProjectStatus.LOST) && ' *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('projectCost', {
                    required: (projectStatus === ProjectStatus.CONFIRMED ||
                      projectStatus === ProjectStatus.UNDER_INSTALLATION ||
                      projectStatus === ProjectStatus.SUBMITTED_FOR_SUBSIDY ||
                      projectStatus === ProjectStatus.COMPLETED ||
                      projectStatus === ProjectStatus.COMPLETED_SUBSIDY_CREDITED ||
                      projectStatus === ProjectStatus.LOST)
                      ? (projectStatus === ProjectStatus.LOST ? 'Order Value is required for Lost projects (stored as lost revenue)' : 'Order Value is required for Confirmed Order stage and onwards')
                      : false,
                    validate: (value) => {
                      if (projectStatus === ProjectStatus.CONFIRMED ||
                          projectStatus === ProjectStatus.UNDER_INSTALLATION ||
                          projectStatus === ProjectStatus.SUBMITTED_FOR_SUBSIDY ||
                          projectStatus === ProjectStatus.COMPLETED ||
                          projectStatus === ProjectStatus.COMPLETED_SUBSIDY_CREDITED ||
                          projectStatus === ProjectStatus.LOST) {
                        if (!value || value === '' || parseFloat(value) <= 0) {
                          return projectStatus === ProjectStatus.LOST
                            ? 'Order Value must be greater than 0 for Lost projects (stored as lost revenue)'
                            : 'Order Value must be greater than 0 for Confirmed Order stage and onwards';
                        }
                      }
                      return true;
                    }
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  readOnly={isLost}
                />
                {projectStatus === ProjectStatus.LOST && (
                  <p className="mt-1 text-xs text-gray-500">Order value (stored as lost revenue for analysis). Project cost will be saved as 0.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirmation Date (order lost date when status is Lost) *
                </label>
                <input
                  type="date"
                  {...register('confirmationDate', { required: true })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  disabled={isLost}
                  style={isLost ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                  max={projectStatus === ProjectStatus.LOST ? new Date().toISOString().split('T')[0] : undefined}
                />
                {projectStatus === ProjectStatus.LOST && (
                  <p className="mt-1 text-xs text-gray-500">Confirmation Date is the order lost date (current or past only).</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Year (FY) *</label>
                <input
                  type="text"
                  {...register('year', { required: true })}
                  placeholder="2024-25"
                  readOnly
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 cursor-not-allowed"
                  title="Automatically calculated from Confirmation Date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Status</label>
                <select
                  {...register('projectStatus')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  disabled={isProjectLost}
                >
                  <option value="LEAD">Lead</option>
                  <option value="SITE_SURVEY">Site Survey</option>
                  <option value="PROPOSAL">Proposal</option>
                  <option value="CONFIRMED">Confirmed Order</option>
                  <option value="UNDER_INSTALLATION">Installation</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="COMPLETED_SUBSIDY_CREDITED">Completed - Subsidy Credited</option>
                  <option value={ProjectStatus.LOST}>Lost</option>
                </select>
                {isLost && (
                  <p className="mt-1 text-sm text-red-600">This project is in Lost status and cannot be edited. Only Admin can delete it.</p>
                )}
              </div>
              {/* Lost Status Fields - Show when Lost is selected */}
              {projectStatus === ProjectStatus.LOST && (canEditLostFields || canEditSales || hasRole([UserRole.OPERATIONS])) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Lost Date *
                    </label>
                    <input
                      type="date"
                      {...register('lostDate', { 
                        required: projectStatus === ProjectStatus.LOST ? 'Lost date is required' : false,
                        validate: (value) => {
                          if (projectStatus === ProjectStatus.LOST && value) {
                            const lostDate = new Date(value);
                            const today = new Date();
                            today.setHours(23, 59, 59, 999); // Set to end of today
                            if (lostDate > today) {
                              return 'Lost date cannot be a future date';
                            }
                          }
                          return true;
                        }
                      })}
                      max={new Date().toISOString().split('T')[0]} // Max date is today
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Reason for Loss *
                    </label>
                    <select
                      {...register('lostReason', { 
                        required: projectStatus === ProjectStatus.LOST ? 'Please select a reason' : false 
                      })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Select reason</option>
                      <option value={LostReason.LOST_TO_COMPETITION}>Lost to Competition</option>
                      <option value={LostReason.NO_BUDGET}>No Budget</option>
                      <option value={LostReason.INDEFINITELY_DELAYED}>Indefinitely Delayed</option>
                      <option value={LostReason.OTHER}>Other</option>
                    </select>
                  </div>
                  {watch('lostReason') === LostReason.LOST_TO_COMPETITION && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Why lost to competition *
                      </label>
                      <select
                        {...register('lostToCompetitionReason', { 
                          required: watch('lostReason') === LostReason.LOST_TO_COMPETITION ? 'Please select why the deal was lost to competition' : false 
                        })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">Select option</option>
                        <option value={LostToCompetitionReason.LOST_DUE_TO_PRICE}>Lost due to Price</option>
                        <option value={LostToCompetitionReason.LOST_DUE_TO_FEATURES}>Lost due to Features</option>
                        <option value={LostToCompetitionReason.LOST_DUE_TO_RELATIONSHIP_OTHER}>Lost due to Relationship/Other factors</option>
                      </select>
                    </div>
                  )}
                  {watch('lostReason') === LostReason.OTHER && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Other Reason *
                      </label>
                      <textarea
                        {...register('lostOtherReason', { 
                          required: watch('lostReason') === LostReason.OTHER ? 'Please enter the reason' : false 
                        })}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Please specify the reason for loss..."
                      />
                    </div>
                  )}
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Roof Type</label>
                <select
                  {...register('roofType')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select Roof Type</option>
                  <option value="Concrete-Flat">Concrete-Flat</option>
                  <option value="Concrete-Sloped">Concrete-Sloped</option>
                  <option value="Tile">Tile</option>
                  <option value="Thatched">Thatched</option>
                  <option value="Asbestos">Asbestos</option>
                  <option value="Metal">Metal</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">System Type</label>
                <div className="flex gap-4 mt-1">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      {...register('systemType')}
                      value="OFF_GRID"
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Off-Grid</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      {...register('systemType')}
                      value="ON_GRID"
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">On-Grid</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      {...register('systemType')}
                      value="HYBRID"
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Hybrid</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Tracking */}
        {canEditPayments && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Payment Tracking</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Advance Received (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('advanceReceived')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Advance Received Date
                </label>
                <input
                  type="date"
                  {...register('advanceReceivedDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment 1 (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('payment1')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment 1 Date</label>
                <input
                  type="date"
                  {...register('payment1Date')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment 2 (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('payment2')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment 2 Date</label>
                <input
                  type="date"
                  {...register('payment2Date')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment 3 (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('payment3')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment 3 Date</label>
                <input
                  type="date"
                  {...register('payment3Date')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Payment (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('lastPayment')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Payment Date</label>
                <input
                  type="date"
                  {...register('lastPaymentDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
          </div>
        )}

        {/* Project Lifecycle - Hidden for Finance users in edit mode */}
        {canEditExecution && canEditOtherSections && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Project Lifecycle</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  MNRE Portal Registration Date
                </label>
                <input
                  type="date"
                  {...register('mnrePortalRegistrationDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Feasibility Date (DISCOM)
                </label>
                <input
                  type="date"
                  {...register('feasibilityDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Registration Date (DISCOM)
                </label>
                <input
                  type="date"
                  {...register('registrationDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Installation Completion Date
                </label>
                <input
                  type="date"
                  {...register('installationCompletionDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Completion Report Submission Date
                </label>
                <input
                  type="date"
                  {...register('completionReportSubmissionDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Net Meter Installation Date
                </label>
                <input
                  type="date"
                  {...register('subsidyRequestDate')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total Project Cost (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('totalProjectCost')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Overall cost incurred in the project"
                  disabled={projectStatus === ProjectStatus.LOST}
                  readOnly={projectStatus === ProjectStatus.LOST}
                />
                {projectStatus === ProjectStatus.LOST && (
                  <p className="mt-1 text-xs text-gray-500">Total Project Cost is set to 0 for Lost projects</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Panel Brand</label>
                <input
                  type="text"
                  {...register('panelBrand')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter panel brand name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Panel Type</label>
                <div className="flex gap-4 mt-1">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      {...register('panelType')}
                      value="DCR"
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">DCR</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      {...register('panelType')}
                      value="Non-DCR"
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Non-DCR</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Inverter Brand</label>
                <input
                  type="text"
                  {...register('inverterBrand')}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter inverter brand name"
                />
              </div>
            </div>
          </div>
        )}

        {/* Remarks Section - Versioned remarks for all users */}
        {isEdit && id && (
          <RemarksSection projectId={id} isEditMode={true} />
        )}

        {/* File Upload Section - Hidden for Finance users */}
        {isEdit && id && hasRole([UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS]) && canEditOtherSections && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">File Uploads</h2>
            <FileUploadSection 
              projectId={id} 
              existingCount={project?.documents?.length || 0}
              maxFiles={10}
            />
          </div>
        )}

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="px-4 py-2 border border-secondary-300 rounded-lg text-secondary-700 hover:bg-secondary-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || isLost}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium shadow-md hover:shadow-lg transition-all"
          >
            {mutation.isPending ? 'Saving...' : isEdit ? (isLost ? 'Cannot Edit Lost Project' : 'Update') : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProjectForm
