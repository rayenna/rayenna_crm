import { useEffect, useState, useMemo, useRef, type ReactNode } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Project, ProjectType, ProjectServiceType, UserRole, ProjectStatus, LostReason, LostToCompetitionReason, LeadSource } from '../types'
import toast from 'react-hot-toast'
import { fireVictoryToast } from '../hooks/useVictoryToast'
import RemarksSection from '../components/remarks/RemarksSection'
import { FaEdit } from 'react-icons/fa'
import { ErrorModal } from '@/components/common/ErrorModal'
import { INVERTER_BRAND_OPTIONS } from '../constants/inverterBrands'
import { PANEL_BRAND_OPTIONS } from '../constants/panelBrands'
import { FINANCING_BANK_FORM_OPTIONS } from '../utils/financingBankDisplay'
import { ZenithSingleSelect } from '../components/zenith/ZenithSingleSelect'

const ZENITH_FIELD_LABEL_CLS =
  'mb-1.5 block text-sm font-semibold leading-snug tracking-tight text-[color:var(--text-primary)]'
const ZENITH_SUBLABEL_UPPER_CLS =
  'mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--text-secondary)]'
const ZENITH_AUX_LABEL_CLS = 'block text-xs font-semibold text-[color:var(--text-secondary)]'
const ZENITH_FIELD_HINT_CLS = 'mt-1 text-xs leading-relaxed text-[color:var(--text-muted)]'

// File Upload Component
const FileUploadSection = ({
  projectId,
  existingCount = 0,
  maxFiles = 10,
  onShowError,
}: {
  projectId: string
  existingCount?: number
  maxFiles?: number
  onShowError?: (messages: string[]) => void
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [category, setCategory] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const queryClient = useQueryClient()

  const showError = (msg: string) => {
    if (onShowError) onShowError([msg])
    else toast.error(msg)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (existingCount >= maxFiles) {
      showError(`Maximum of ${maxFiles} files per project reached.`)
      return
    }
    const file = e.target.files?.[0]
    if (file) {
      const validTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
      if (!validTypes.includes(file.type)) {
        showError('Invalid file type. Please upload images, PDFs, or Office documents.')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        showError('File size exceeds 10MB limit.')
        return
      }
      setSelectedFile(file)
    }
  }

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
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
    onError: (error: unknown) => {
      const msg = getFriendlyApiErrorMessage(error)
      showError(msg)
      setUploading(false)
    },
  })

  const handleUpload = () => {
    if (existingCount >= maxFiles) {
      showError(`Maximum of ${maxFiles} files per project reached.`)
      return
    }
    if (!selectedFile || !category) {
      showError('Please select a file and category')
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

  const uploadTextFieldCls =
    'zenith-native-filter-input mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm placeholder:text-[color:var(--text-placeholder)] focus:border-[color:var(--accent-gold-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)]'
  const uploadSelectCls =
    'zenith-native-select mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm focus:border-[color:var(--accent-gold-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)]'
  const uploadFileCls =
    'block w-full cursor-pointer text-sm text-[color:var(--text-secondary)] file:mr-4 file:cursor-pointer file:rounded-xl file:border file:border-[color:var(--border-strong)] file:bg-[color:var(--bg-input)] file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-[color:var(--text-primary)] file:shadow-inner file:transition-colors hover:file:border-[color:var(--accent-gold-border)] hover:file:bg-[color:var(--bg-card-hover)] disabled:opacity-50'

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-[color:var(--text-muted)]">
        You can upload up to {maxFiles} files per project. Currently uploaded: {existingCount}.
      </p>
      <div className="space-y-4">
        <div>
          <label className={ZENITH_FIELD_LABEL_CLS}>File</label>
          <input
            type="file"
            onChange={handleFileChange}
            disabled={existingCount >= maxFiles}
            className={`mt-1.5 ${uploadFileCls}`}
          />
        </div>
        <div>
          <label className={ZENITH_FIELD_LABEL_CLS}>Category *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={uploadSelectCls}
          >
            <option value="">Select category</option>
            <option value="photos_videos">Photos / Videos</option>
            <option value="documents">Documents</option>
            <option value="sheets">Sheets</option>
          </select>
        </div>
        <div>
          <label className={ZENITH_FIELD_LABEL_CLS}>Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={`${uploadTextFieldCls} min-h-[4.5rem] resize-y`}
            placeholder="Add a brief description..."
          />
        </div>
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || !category || uploading || existingCount >= maxFiles}
          className="rounded-xl bg-[color:var(--accent-gold)] px-4 py-2.5 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-md transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      </div>
    </div>
  )
}

const ProjectForm = () => {
  const shell = (children: ReactNode) => (
    <div className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] min-h-[calc(100vh-5rem)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(0.35rem,env(safe-area-inset-top,0px))] [-webkit-tap-highlight-color:transparent]">
      <div className="zenith-exec-main mx-auto w-full max-w-full min-w-0 px-3 sm:px-5 pb-10">{children}</div>
    </div>
  )

  const { id } = useParams()
  const navigate = useNavigate()
  const { hasRole, user } = useAuth()
  const queryClient = useQueryClient()
  const isEdit = !!id
  const isFinanceOnly = user?.role === UserRole.FINANCE && isEdit
  /** Edit flow: return to project detail. New project: return to list. (ErrorModal uses capture-phase Esc first.) */
  const exitPath = isEdit && id ? `/projects/${id}` : '/projects'

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(exitPath)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, exitPath])

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

  // Sales users fetch only their currently-assigned customers (server enforces salespersonId = user.id).
  // Admin/Management/Operations fetch all customers.
  // This ensures re-allocated customers disappear from the Sales user's dropdown immediately.
  const isSalesUser = user?.role === UserRole.SALES
  const customersUrl = isSalesUser
    ? '/api/customers?limit=10000&myCustomers=true'
    : '/api/customers?limit=10000'

  const { data: customers, isLoading: customersLoading, error: customersError } = useQuery({
    queryKey: ['customers', isSalesUser ? 'mine' : 'all'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get(customersUrl)
        return res.data
      } catch (error: unknown) {
        if (import.meta.env.DEV) console.error('Error fetching customers:', error)
        throw error
      }
    },
    enabled: !!user, // Wait until user is known so the correct URL is used
    retry: 2,
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

  const { register, handleSubmit, setValue, getValues, watch, control } = useForm({
    shouldFocusError: false, // keep focus on validation ErrorModal instead of first error field
  })
  const selectedCustomerId = watch('customerId')
  const confirmationDate = watch('confirmationDate')
  const projectStatus = watch('projectStatus')
  const inverterBrandSelection = watch('inverterBrand')
  const panelBrandSelection = watch('panelBrand')
  const availingLoan = watch('availingLoan')
  const financingBank = watch('financingBank')
  const projectType = watch('type')
  const systemCapacityWatched = watch('systemCapacity')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null)
  const [validationErrorSource, setValidationErrorSource] = useState<'file' | 'form' | null>(null)
  const customerDropdownRef = useRef<HTMLDivElement>(null)
  /** When false, Inverter capacity (kW) tracks System Capacity; set true after user edits that field. */
  const inverterCapacityKwUserEditedRef = useRef(false)

  const clearValidationErrors = () => {
    setValidationErrors(null)
    setValidationErrorSource(null)
  }
  
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

  // New project: allow inverter kW to track system capacity until user edits it.
  // Edit: if DB already has inverterCapacityKw, never auto-overwrite; if null, keep tracking system capacity.
  useEffect(() => {
    if (!isEdit || !project) {
      inverterCapacityKwUserEditedRef.current = false
      return
    }
    inverterCapacityKwUserEditedRef.current =
      project.inverterCapacityKw !== null && project.inverterCapacityKw !== undefined
  }, [isEdit, project])

  // Mirror System capacity (kW) → Inverter capacity (kW), integer kW, until user changes inverter field.
  useEffect(() => {
    if (inverterCapacityKwUserEditedRef.current) return
    const raw = systemCapacityWatched
    if (raw === '' || raw === undefined || raw === null) {
      setValue('inverterCapacityKw', undefined, { shouldValidate: false, shouldDirty: false })
      return
    }
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) return
    const kw = Number.isInteger(n) ? n : Math.round(n)
    setValue('inverterCapacityKw', kw, { shouldValidate: false, shouldDirty: false })
  }, [systemCapacityWatched, setValue])

  const inverterCapacityKwRegister = register('inverterCapacityKw', {
    setValueAs: (v) => {
      if (v === '' || v == null) return undefined
      const n = parseInt(String(v), 10)
      return Number.isNaN(n) ? undefined : n
    },
    validate: (v) =>
      v === undefined || v === null || (Number.isInteger(v) && v >= 0) || 'Whole number ≥ 0',
  })

  // Filter customers based on search.
  // For Sales users the API already returns only their currently-assigned customers
  // (myCustomers=true → WHERE salespersonId = user.id), so no extra client-side
  // role filter is needed here. Re-allocated customers are excluded server-side.
  const filteredCustomers = useMemo(() => {
    if (!customers?.customers) return []

    const availableCustomers = customers.customers

    if (!customerSearch.trim()) return availableCustomers

    const searchLower = customerSearch.toLowerCase()
    return availableCustomers.filter((customer: any) =>
      customer.customerName?.toLowerCase().includes(searchLower) ||
      customer.customerId?.toLowerCase().includes(searchLower) ||
      (customer.consumerNumber && customer.consumerNumber.toLowerCase().includes(searchLower)) ||
      (customer.address && customer.address.toLowerCase().includes(searchLower))
    )
  }, [customers?.customers, customerSearch])

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
        } else if (key === 'inverterBrand') {
          // Normalized in dedicated effect (dropdown + Others text)
          return
        } else if (key === 'panelBrand') {
          // Normalized in dedicated effect (dropdown + Others text)
          return
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

  useEffect(() => {
    if (!isEdit || !project) return
    const raw = project.inverterBrand?.trim() ?? ''
    if (!raw) {
      setValue('inverterBrand', '')
      setValue('inverterBrandOther', '')
      return
    }
    if (raw === 'Others') {
      setValue('inverterBrand', 'Others')
      setValue('inverterBrandOther', '')
      return
    }
    const isListed =
      (INVERTER_BRAND_OPTIONS as readonly string[]).includes(raw) && raw !== 'Others'
    if (isListed) {
      setValue('inverterBrand', raw)
      setValue('inverterBrandOther', '')
    } else {
      setValue('inverterBrand', 'Others')
      setValue('inverterBrandOther', raw)
    }
  }, [project, isEdit, setValue])

  useEffect(() => {
    if (!isEdit || !project) return
    const raw = project.panelBrand?.trim() ?? ''
    if (!raw) {
      setValue('panelBrand', '')
      setValue('panelBrandOther', '')
      return
    }
    if (raw === 'Others') {
      setValue('panelBrand', 'Others')
      setValue('panelBrandOther', '')
      return
    }
    const isListed =
      (PANEL_BRAND_OPTIONS as readonly string[]).includes(raw) && raw !== 'Others'
    if (isListed) {
      setValue('panelBrand', raw)
      setValue('panelBrandOther', '')
    } else {
      setValue('panelBrand', 'Others')
      setValue('panelBrandOther', raw)
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
    onSuccess: (_data, variables: Record<string, unknown>) => {
      toast.success(isEdit ? 'Project updated successfully' : 'Project created successfully')
      if (isEdit && project && id && variables?.projectStatus != null) {
        fireVictoryToast(
          {
            id,
            projectStatus: variables.projectStatus as ProjectStatus,
            customer: project.customer,
            projectCost:
              variables.projectCost !== undefined
                ? (variables.projectCost as number | null)
                : project.projectCost,
            salesperson: project.salesperson,
          },
          project.projectStatus,
        )
      }
      // Refresh projects list
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      // Invalidate dashboard so Quick Access tiles (e.g. Availing Loan) and charts stay in sync
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      // Clear any cached detail view so next open always fetches fresh data
      if (isEdit && id) {
        queryClient.removeQueries({ queryKey: ['project', id] })
      }
      navigate(exitPath)
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { errors?: Array<{ param?: string; msg?: string; message?: string }>; error?: string }; status?: number }; message?: string }
      if (import.meta.env.DEV) {
        console.error('Project mutation error:', error)
        console.error('Error response:', err?.response?.data)
      }
      
      // Handle validation errors (express-validator returns errors array)
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorMessages = err.response.data.errors.map((e: { param?: string; msg?: string; message?: string }) => 
          `${e.param || 'Field'}: ${e.msg || e.message || 'Invalid value'}`
        ).join('\n');
        toast.error(errorMessages, { duration: 6000 });
      } else {
        // Handle single error message
        const errorMessage = err.response?.data?.error || err.message || 'Operation failed';
        toast.error(errorMessage, { duration: 5000 });
      }
    },
  })

  const onSubmit = (data: any) => {
    if (import.meta.env.DEV) console.log('[PROJECT FORM] onSubmit called');
    // Get all form values including empty fields
    const allValues = getValues();
    
    // Define proposal and later stages (Order Value, System Capacity required from Proposal onwards)
    const proposalAndLaterStages = [
      ProjectStatus.PROPOSAL,
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
    const numericFields = ['projectCost', 'advanceReceived', 'payment1', 'payment2', 'payment3', 'lastPayment'];
    numericFields.forEach((field) => {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        const numValue = parseFloat(String(data[field]));
        data[field] = isNaN(numValue) ? null : numValue;
      } else {
        data[field] = null;
      }
    });
    // Integer field: System Capacity (kW)
    if (data.systemCapacity !== undefined && data.systemCapacity !== null && data.systemCapacity !== '') {
      const capKw = parseInt(String(data.systemCapacity), 10);
      data.systemCapacity = Number.isInteger(capKw) && capKw >= 0 ? capKw : null;
    } else {
      data.systemCapacity = null;
    }
    // Integer field: Panel Capacity (W)
    if (data.panelCapacityW !== undefined && data.panelCapacityW !== null && data.panelCapacityW !== '') {
      const intVal = parseInt(String(data.panelCapacityW), 10);
      data.panelCapacityW = Number.isInteger(intVal) && intVal >= 0 ? intVal : null;
    } else {
      data.panelCapacityW = null;
    }
    // Integer field: Inverter Capacity (kW)
    if (data.inverterCapacityKw !== undefined && data.inverterCapacityKw !== null && data.inverterCapacityKw !== '') {
      const invKw = parseInt(String(data.inverterCapacityKw), 10);
      data.inverterCapacityKw = Number.isInteger(invKw) && invKw >= 0 ? invKw : null;
    } else {
      data.inverterCapacityKw = null;
    }
    
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

    // Lead Source is mandatory
    if (!data.leadSource || data.leadSource.trim() === '') {
      toast.error('Please select a lead source');
      return;
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
    
    // Validate Order Value is required for PROPOSAL stage and onwards (LOST handled separately above)
    if (proposalAndLaterStages.includes(data.projectStatus)) {
      const projectCostValue = allValues.projectCost !== undefined ? allValues.projectCost : data.projectCost;
      if (!projectCostValue || projectCostValue === '' || projectCostValue === null || parseFloat(String(projectCostValue)) <= 0) {
        toast.error('Order Value is required and must be greater than 0 from Proposal stage onwards');
        return;
      }
    }

    // Validate System Capacity is required for PROPOSAL stage and onwards (including LOST)
    const statusesRequiringCapacity = [...proposalAndLaterStages, ProjectStatus.LOST];
    if (statusesRequiringCapacity.includes(data.projectStatus)) {
      const capacityValue = allValues.systemCapacity !== undefined ? allValues.systemCapacity : data.systemCapacity;
      const capKw =
        typeof capacityValue === 'number' && Number.isInteger(capacityValue)
          ? capacityValue
          : parseInt(String(capacityValue ?? ''), 10);
      if (
        capacityValue === undefined ||
        capacityValue === null ||
        capacityValue === '' ||
        !Number.isInteger(capKw) ||
        capKw <= 0
      ) {
        toast.error('System Capacity is required and must be a whole number greater than 0 from Proposal stage onwards');
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
    
    // If there are date validation errors, show them in modal and prevent submission
    if (dateErrors.length > 0) {
      setValidationErrors(dateErrors);
      setValidationErrorSource('form');
      return;
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
    
    // If there are payment validation errors, show them in modal and prevent submission
    if (paymentErrors.length > 0) {
      setValidationErrors(paymentErrors);
      setValidationErrorSource('form');
      return;
    }

    // Inverter brand: list choice or mandatory custom name when "Others"
    const invSel = data.inverterBrand
    if (invSel === 'Others') {
      const custom = String(data.inverterBrandOther ?? '').trim()
      if (!custom) {
        toast.error('Please enter the inverter brand name when "Others" is selected.')
        return
      }
      data.inverterBrand = custom
    } else if (invSel === '' || invSel == null || invSel === undefined) {
      data.inverterBrand = null
    }
    delete data.inverterBrandOther

    // Panel brand: list choice or mandatory custom name when "Others"
    const panelSel = data.panelBrand
    if (panelSel === 'Others') {
      const custom = String(data.panelBrandOther ?? '').trim()
      if (!custom) {
        toast.error('Please enter the panel brand name when "Others" is selected.')
        return
      }
      data.panelBrand = custom
    } else if (panelSel === '' || panelSel == null || panelSel === undefined) {
      data.panelBrand = null
    }
    delete data.panelBrandOther

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
        'availingLoan', 'financingBank', 'financingBankOther',
        'incentiveEligible', 'leadSource', 'leadSourceDetails',
        'roofType', 'systemType', 'projectStatus', 'lostDate', 'lostReason', 'lostToCompetitionReason', 'lostOtherReason',
        'leadId', 'assignedOpsId', 'panelBrand', 'inverterBrand', 'inverterCapacityKw',
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
    // Only convert projectCost to null if not in PROPOSAL or later stages (LOST sends order value; backend zeros it)
    if (!proposalAndLaterStages.includes(data.projectStatus) && data.projectStatus !== ProjectStatus.LOST) {
      if (data.projectCost === '' || data.projectCost === undefined) {
        data.projectCost = null;
      }
    }
    
    mutation.mutate(data)
  }

  const canEditPayments = hasRole([UserRole.ADMIN, UserRole.FINANCE])
  const canEditExecution = hasRole([UserRole.ADMIN, UserRole.OPERATIONS])
  const canEditSales = hasRole([UserRole.ADMIN, UserRole.SALES])
  // Financing / Sales & Commercial: Admin, Sales, and Operations users
  const canEditFinancing = hasRole([UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS])
  
  // Finance users can only edit payment tracking section
  // Projects in Lost status cannot be edited (except Admin can delete)
  // However, Sales (for their projects) and Operations can edit Lost status fields
  const canEditOtherSections = !isFinanceOnly && !isLost
  const canEditLostFields = isEdit && projectStatus === ProjectStatus.LOST && !isLost && 
    (hasRole([UserRole.ADMIN]) || 
     (hasRole([UserRole.SALES]) && project?.salespersonId === user?.id) ||
     hasRole([UserRole.OPERATIONS]))

  const labelCls = ZENITH_FIELD_LABEL_CLS
  const inputCls =
    'zenith-native-filter-input w-full rounded-xl px-3 py-2.5 text-sm placeholder:text-[color:var(--text-placeholder)] focus:border-[color:var(--accent-gold-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)]'
  const selectCls =
    'w-full rounded-xl px-3 py-2.5 text-sm focus:border-[color:var(--accent-gold-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)]'
  /** Native selects + read-only/disabled fields on Zenith (replaces old bg-gray-100 / bg-white). */
  const disabledControlCls =
    'cursor-not-allowed border-[color:var(--border-default)] bg-[color:var(--bg-badge)] text-[color:var(--text-muted)]'
  const sublabelUpperCls = ZENITH_SUBLABEL_UPPER_CLS
  // Sales & Commercial section: Admin, Sales, and Operations can edit
  const canEditSalesCommercial =
    hasRole([UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS]) && canEditOtherSections

  return shell(
    <>
      <header className="sticky top-0 z-30 mb-4 border-b border-[color:var(--border-default)] bg-[color:color-mix(in srgb,var(--bg-surface) 94%, transparent)] pb-3 pt-1 backdrop-blur-xl sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] shadow-inner">
              <FaEdit className="h-5 w-5 text-[color:var(--accent-gold)]" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="zenith-display text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">
                {isEdit ? 'Edit Project' : 'New Project'}
              </h1>
              <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">
                {isEdit ? 'Update project details below.' : 'Create a new project and link it to a customer.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Link
              to={exitPath}
              className="inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2.5 text-sm font-bold text-[color:var(--text-primary)] shadow-sm transition-all hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)]"
            >
              Close
            </Link>
          </div>
        </div>
      </header>

      <div className="px-0 pb-4 sm:pb-6">
      <form onSubmit={handleSubmit(onSubmit, (errors) => {
        if (import.meta.env.DEV) {
          console.error('[PROJECT FORM] Form validation errors:', errors)
          console.error('[PROJECT FORM] Current form values:', getValues())
          console.error('[PROJECT FORM] customerId value:', getValues('customerId'))
        }
        const errorMessages = Object.entries(errors).map(([field, error]: [string, unknown]) => {
          const e = error as { message?: string; type?: string }
          const message = e?.message || e?.type || 'Invalid value';
          if (import.meta.env.DEV) console.error(`[PROJECT FORM] Error for ${field}:`, message, error);
          const friendlyName = field === 'customerId' ? 'Customer' : field === 'leadSource' ? 'Lead source' : field === 'confirmationDate' ? 'Confirmation date' : field === 'year' ? 'Financial year' : field === 'financingBank' ? 'Financing bank' : field === 'financingBankOther' ? 'Other bank name' : field;
          return `${friendlyName}: ${message}`;
        });
        if (errorMessages.length > 0) {
          setValidationErrors(errorMessages);
          setValidationErrorSource('form');
        }
      })} className="space-y-8">
        <div className="relative">
        {/* Customer & Project Details - Same style as Basic Info / other section cards */}
        {canEditOtherSections && (
        <div className="space-y-4 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] border-l-[3px] border-l-[color:var(--accent-teal)]">
          <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-[color:var(--accent-teal)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-[color:var(--text-primary)]">
              Customer & Project Details
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className={labelCls}>
                Customer * {isEdit && <span className="text-xs font-normal text-[color:var(--text-muted)]">(Cannot be changed)</span>}
              </label>
              {customersLoading ? (
                <div className="mt-1 text-sm text-[color:var(--text-muted)]">Loading customers...</div>
              ) : customersError ? (
                <div className="mt-1 text-sm text-red-500">
                  Error loading customers: {customersError?.message || 'Unknown error'}. Please try again or{' '}
                  <Link to="/customers" className="text-[color:var(--accent-gold)] underline hover:opacity-90">
                    create a new customer
                  </Link>
                </div>
              ) : (
                <>
                  {/* Stack search + select vertically on mobile/iPad portrait so both are full width and easy to use */}
                  <div className="flex flex-col lg:flex-row gap-2">
                    <div className="w-full min-w-0 relative" ref={customerDropdownRef}>
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
                        className={`${inputCls} pr-10 ${isEdit ? 'cursor-not-allowed bg-[color:var(--bg-badge)] text-[color:var(--text-muted)]' : ''}`}
                      />
                      {customerSearch && !isEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerSearch('')
                            setShowCustomerDropdown(false)
                            setValue('customerId', '')
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 transform text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                        >
                          ✕
                        </button>
                      )}
                      {!isEdit && showCustomerDropdown && filteredCustomers.length > 0 && (
                        <div className="absolute left-0 right-0 z-10 mt-1 max-h-[70vh] w-full overflow-auto rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-dropdown)] shadow-2xl shadow-black/40 backdrop-blur-xl sm:max-h-60">
                          {filteredCustomers.map((customer: any) => (
                            <div
                              key={customer.id}
                              onMouseDown={(e) => {
                                e.preventDefault() // Prevent input blur
                                setValue('customerId', customer.id, { shouldValidate: true, shouldDirty: true })
                                setCustomerSearch(`${customer.customerId} - ${customer.customerName}`)
                                setShowCustomerDropdown(false)
                              }}
                              className="cursor-pointer border-b border-[color:var(--border-default)] px-4 py-3 last:border-b-0 hover:bg-[color:var(--bg-table-hover)] sm:py-2 touch-manipulation"
                            >
                              <div className="text-sm font-medium text-[color:var(--text-primary)]">
                                {customer.customerId} - {customer.customerName}
                              </div>
                              {customer.consumerNumber && (
                                <div className="text-xs text-[color:var(--text-muted)]">Consumer: {customer.consumerNumber}</div>
                              )}
                              {customer.address && (
                                <div className="truncate text-xs text-[color:var(--text-muted)]">{customer.address}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {!isEdit && showCustomerDropdown && customerSearch && filteredCustomers.length === 0 && (
                        <div className="absolute left-0 right-0 z-10 mt-1 w-full rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-dropdown)] p-4 text-sm text-[color:var(--text-secondary)] shadow-2xl backdrop-blur-xl">
                          No customers found matching "{customerSearch}"
                        </div>
                      )}
                    </div>
                    <div className="w-full min-w-0">
                      <span className="sr-only">Or select customer from list</span>
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
                            className={`zenith-native-select w-full min-w-0 ${selectCls} ${isEdit ? disabledControlCls : ''}`}
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
                  </div>
                  {customers?.customers && customers.customers.length === 0 && (
                    <p className="mt-2 text-xs text-yellow-600">
                      No customers found. Please{' '}
                      <Link to="/customers" className="text-[color:var(--accent-gold)] underline hover:opacity-90">
                        create a customer
                      </Link>{' '}
                      first.
                    </p>
                  )}
                  {/* Hidden input removed - customerId is already registered on the select dropdown above */}
                </>
              )}
              {selectedCustomerId && filteredCustomers && (
                <div className="mt-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] p-3 text-sm text-[color:var(--text-secondary)] shadow-inner ring-1 ring-[color:var(--border-default)] sm:p-3.5">
                  {(() => {
                    const customer = filteredCustomers.find((c: any) => c.id === selectedCustomerId);
                    if (customer) {
                      return (
                        <div className="space-y-1.5">
                          <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-[color:var(--accent-gold)]">Selected customer</p>
                          <p>
                            <span className="text-[color:var(--text-secondary)]">Customer ID:</span>{' '}
                            <span className="font-semibold text-[color:var(--text-primary)]">{customer.customerId}</span>
                          </p>
                          <p>
                            <span className="text-[color:var(--text-secondary)]">Name:</span>{' '}
                            <span className="text-base font-semibold text-[color:var(--text-primary)] sm:text-lg">{customer.customerName}</span>
                          </p>
                          {customer.address && (
                            <p>
                              <span className="text-[color:var(--text-secondary)]">Address:</span> <span className="text-[color:var(--text-primary)]">{customer.address}</span>
                            </p>
                          )}
                          {customer.contactNumbers && (
                            <p>
                              <span className="text-[color:var(--text-secondary)]">Contact:</span>{' '}
                              <span className="text-[color:var(--text-primary)]">
                                {(() => {
                                  try {
                                    const contacts = JSON.parse(customer.contactNumbers);
                                    return Array.isArray(contacts) ? contacts.join(', ') : customer.contactNumbers;
                                  } catch {
                                    return customer.contactNumbers;
                                  }
                                })()}
                              </span>
                            </p>
                          )}
                          {customer.consumerNumber && (
                            <p>
                              <span className="text-[color:var(--text-secondary)]">Consumer number:</span>{' '}
                              <span className="text-[color:var(--text-primary)]">{customer.consumerNumber}</span>
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
              {!isEdit && (
                <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                  Don&apos;t see the customer?{' '}
                  <Link to="/customers" className="font-semibold text-[color:var(--accent-gold)] underline hover:opacity-90">
                    Create a new customer
                  </Link>
                </p>
              )}
              {isEdit && (
                <div
                  className="mt-2 rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-3 py-2.5 text-xs leading-relaxed text-[color:var(--text-secondary)] ring-1 ring-[color:var(--accent-gold-border)]"
                  role="note"
                >
                  <span className="font-extrabold text-[#f5d78a]">Note:</span> Customer cannot be changed for an existing project. To use a different customer, create a new project.
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Segment *</label>
              <select
                {...register('type', { required: true })}
                className={`zenith-native-select mt-1.5 ${selectCls}`}
              >
                {Object.values(ProjectType).map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Project Type *</label>
              <select
                {...register('projectServiceType', { required: true })}
                className={`zenith-native-select ${selectCls}`}
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
          <div className="space-y-4 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] border-l-[3px] border-l-[color:var(--accent-green)]">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-[color:var(--accent-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-[color:var(--text-primary)]">
                Sales & Commercial
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Lead Source *</label>
                <select
                  {...register('leadSource', { required: 'Please select a lead source' })}
                  disabled={!canEditSalesCommercial}
                  className={`zenith-native-select ${selectCls} ${!canEditSalesCommercial ? disabledControlCls : ''}`}
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
                  <label className={labelCls}>
                    {watch('leadSource') === LeadSource.CHANNEL_PARTNER && 'Channel Partner Name'}
                    {watch('leadSource') === LeadSource.REFERRAL && 'Referral Name'}
                    {watch('leadSource') === LeadSource.OTHER && 'Other Details'}
                  </label>
                  <input
                    type="text"
                    {...register('leadSourceDetails')}
                    disabled={!canEditSalesCommercial}
                    className={`${inputCls} ${!canEditSalesCommercial ? disabledControlCls : ''}`}
                    placeholder={
                      watch('leadSource') === LeadSource.CHANNEL_PARTNER ? 'Enter channel partner name' :
                      watch('leadSource') === LeadSource.REFERRAL ? 'Enter referral name' :
                      'Enter details'
                    }
                  />
                </div>
              )}
              <div>
                <label className={labelCls}>
                  System Capacity (kW)
                  {(projectStatus === ProjectStatus.PROPOSAL ||
                    projectStatus === ProjectStatus.CONFIRMED ||
                    projectStatus === ProjectStatus.UNDER_INSTALLATION ||
                    projectStatus === ProjectStatus.SUBMITTED_FOR_SUBSIDY ||
                    projectStatus === ProjectStatus.COMPLETED ||
                    projectStatus === ProjectStatus.COMPLETED_SUBSIDY_CREDITED ||
                    projectStatus === ProjectStatus.LOST) && ' *'}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min={0}
                  {...register('systemCapacity', {
                    setValueAs: (v) => {
                      if (v === '' || v == null) return undefined;
                      const n = parseInt(String(v), 10);
                      return Number.isNaN(n) ? undefined : n;
                    },
                    required: (projectStatus === ProjectStatus.PROPOSAL ||
                      projectStatus === ProjectStatus.CONFIRMED ||
                      projectStatus === ProjectStatus.UNDER_INSTALLATION ||
                      projectStatus === ProjectStatus.SUBMITTED_FOR_SUBSIDY ||
                      projectStatus === ProjectStatus.COMPLETED ||
                      projectStatus === ProjectStatus.COMPLETED_SUBSIDY_CREDITED ||
                      projectStatus === ProjectStatus.LOST)
                      ? 'System Capacity is required from Proposal stage onwards'
                      : false,
                    validate: (value) => {
                      const statuses = [ProjectStatus.PROPOSAL, ProjectStatus.CONFIRMED, ProjectStatus.UNDER_INSTALLATION,
                        ProjectStatus.SUBMITTED_FOR_SUBSIDY, ProjectStatus.COMPLETED, ProjectStatus.COMPLETED_SUBSIDY_CREDITED, ProjectStatus.LOST];
                      if (value !== undefined && value !== null && value !== '') {
                        if (!Number.isInteger(value) || value < 0) {
                          return 'System Capacity must be a whole number (kW)';
                        }
                      }
                      if (statuses.includes(projectStatus) && (value === '' || value == null || !Number.isInteger(value) || value <= 0)) {
                        return 'System Capacity must be a whole number greater than 0 from Proposal stage onwards';
                      }
                      return true;
                    },
                  })}
                  disabled={!canEditSalesCommercial}
                  className={`${inputCls} ${!canEditSalesCommercial ? disabledControlCls : ''}`}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Order Value (₹)
                  {(projectStatus === ProjectStatus.PROPOSAL ||
                    projectStatus === ProjectStatus.CONFIRMED ||
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
                    required: (projectStatus === ProjectStatus.PROPOSAL ||
                      projectStatus === ProjectStatus.CONFIRMED ||
                      projectStatus === ProjectStatus.UNDER_INSTALLATION ||
                      projectStatus === ProjectStatus.SUBMITTED_FOR_SUBSIDY ||
                      projectStatus === ProjectStatus.COMPLETED ||
                      projectStatus === ProjectStatus.COMPLETED_SUBSIDY_CREDITED ||
                      projectStatus === ProjectStatus.LOST)
                      ? (projectStatus === ProjectStatus.LOST ? 'Order Value is required for Lost projects (stored as lost revenue)' : 'Order Value is required from Proposal stage onwards')
                      : false,
                    validate: (value) => {
                      if (projectStatus === ProjectStatus.PROPOSAL ||
                          projectStatus === ProjectStatus.CONFIRMED ||
                          projectStatus === ProjectStatus.UNDER_INSTALLATION ||
                          projectStatus === ProjectStatus.SUBMITTED_FOR_SUBSIDY ||
                          projectStatus === ProjectStatus.COMPLETED ||
                          projectStatus === ProjectStatus.COMPLETED_SUBSIDY_CREDITED ||
                          projectStatus === ProjectStatus.LOST) {
                        if (!value || value === '' || parseFloat(value) <= 0) {
                          return projectStatus === ProjectStatus.LOST
                            ? 'Order Value must be greater than 0 for Lost projects (stored as lost revenue)'
                            : 'Order Value must be greater than 0 from Proposal stage onwards';
                        }
                      }
                      return true;
                    }
                  })}
                  className={`${inputCls} ${isLost || !canEditSalesCommercial ? disabledControlCls : ''}`}
                  readOnly={isLost || !canEditSalesCommercial}
                  disabled={!canEditSalesCommercial}
                />
                {projectStatus === ProjectStatus.LOST && (
                  <p className={ZENITH_FIELD_HINT_CLS}>Order value (stored as lost revenue for analysis). Project cost will be saved as 0.</p>
                )}
              </div>
              <div>
                <label className={labelCls}>Confirmation Date (order lost date when status is Lost) *</label>
                <input
                  type="date"
                  {...register('confirmationDate', { required: true })}
                  className={`${inputCls} ${(isLost || !canEditSalesCommercial) ? disabledControlCls : ''}`}
                  disabled={isLost || !canEditSalesCommercial}
                  max={projectStatus === ProjectStatus.LOST ? new Date().toISOString().split('T')[0] : undefined}
                />
                {projectStatus === ProjectStatus.LOST && (
                  <p className={ZENITH_FIELD_HINT_CLS}>Confirmation Date is the order lost date (current or past only).</p>
                )}
              </div>
              <div>
                <label className={labelCls}>Year (FY) *</label>
                <input
                  type="text"
                  {...register('year', { required: true })}
                  placeholder="2024-25"
                  readOnly
                  className={`${inputCls} ${disabledControlCls}`}
                  title="Automatically calculated from Confirmation Date"
                />
              </div>
              <div>
                <label className={labelCls}>Project Status</label>
                <select
                  {...register('projectStatus')}
                  className={`zenith-native-select ${selectCls} ${(isProjectLost || !canEditSalesCommercial) ? disabledControlCls : ''}`}
                  disabled={isProjectLost || !canEditSalesCommercial}
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
                  <p className="mt-1 text-sm text-red-400/95">This project is in Lost status and cannot be edited. Only Admin can delete it.</p>
                )}
              </div>
              {/* Lost Status Fields - Show when Lost is selected */}
              {projectStatus === ProjectStatus.LOST && (canEditLostFields || canEditSales || hasRole([UserRole.OPERATIONS])) && (
                <>
                  <div>
                    <label className={labelCls}>
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
                      className={`mt-1.5 ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>
                      Reason for Loss *
                    </label>
                    <select
                      {...register('lostReason', { 
                        required: projectStatus === ProjectStatus.LOST ? 'Please select a reason' : false 
                      })}
                      className={`zenith-native-select mt-1.5 ${selectCls}`}
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
                      <label className={labelCls}>
                        Why lost to competition *
                      </label>
                      <select
                        {...register('lostToCompetitionReason', { 
                          required: watch('lostReason') === LostReason.LOST_TO_COMPETITION ? 'Please select why the deal was lost to competition' : false 
                        })}
                        className={`zenith-native-select mt-1.5 ${selectCls}`}
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
                      <label className={labelCls}>
                        Other Reason *
                      </label>
                      <textarea
                        {...register('lostOtherReason', { 
                          required: watch('lostReason') === LostReason.OTHER ? 'Please enter the reason' : false 
                        })}
                        rows={3}
                        className={`mt-1.5 ${inputCls}`}
                        placeholder="Please specify the reason for loss..."
                      />
                    </div>
                  )}
                </>
              )}
              <div>
                <label className={labelCls}>Roof Type</label>
                <select
                  {...register('roofType')}
                  className={`zenith-native-select mt-1.5 ${selectCls}`}
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
                <label className={`${labelCls} mb-2`}>System Type</label>
                <div className="flex flex-wrap gap-4 mt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      {...register('systemType')}
                      value="OFF_GRID"
                      className="h-4 w-4 border-[color:var(--border-input)] bg-[color:var(--bg-input)] text-[color:var(--accent-gold)] focus:ring-[color:var(--accent-gold-muted)]"
                    />
                    <span className="text-sm font-medium text-[color:var(--text-primary)]">Off-Grid</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      {...register('systemType')}
                      value="ON_GRID"
                      className="h-4 w-4 border-[color:var(--border-input)] bg-[color:var(--bg-input)] text-[color:var(--accent-gold)] focus:ring-[color:var(--accent-gold-muted)]"
                    />
                    <span className="text-sm font-medium text-[color:var(--text-primary)]">On-Grid</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      {...register('systemType')}
                      value="HYBRID"
                      className="h-4 w-4 border-[color:var(--border-input)] bg-[color:var(--bg-input)] text-[color:var(--accent-gold)] focus:ring-[color:var(--accent-gold-muted)]"
                    />
                    <span className="text-sm font-medium text-[color:var(--text-primary)]">Hybrid</span>
                  </label>
                </div>
              {/* Financing / Loan details */}
              <div className="md:col-span-2 border-t border-[color:var(--border-default)] pt-3 mt-1">
                <label className={`${labelCls} mb-2`}>
                  Availing Loan/Financing?
                </label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--text-primary)]">
                    <input
                      type="checkbox"
                      {...register('availingLoan')}
                      disabled={!canEditFinancing}
                      className="h-4 w-4 rounded border-[color:var(--border-input)] bg-[color:var(--bg-input)] text-[color:var(--accent-gold)] focus:ring-[color:var(--accent-gold-muted)] disabled:opacity-50"
                    />
                    <span>Yes (leave unchecked for No)</span>
                  </label>
                </div>
                {availingLoan && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>
                        Financing Bank *
                      </label>
                      <Controller
                        name="financingBank"
                        control={control}
                        rules={{
                          validate: (value) => {
                            if (!availingLoan) return true
                            if (!value || String(value).trim() === '') {
                              return 'Please select a financing bank'
                            }
                            return true
                          },
                        }}
                        render={({ field, fieldState }) => (
                          <ZenithSingleSelect
                            ref={field.ref}
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            disabled={!canEditFinancing}
                            options={FINANCING_BANK_FORM_OPTIONS}
                            placeholder="Select Bank"
                            allowEmpty
                            aria-invalid={!!fieldState.error}
                          />
                        )}
                      />
                    </div>
                    {financingBank === 'OTHER' && (
                      <div>
                        <label className={labelCls}>
                          Other Bank Name *
                        </label>
                        <input
                          type="text"
                          {...register('financingBankOther', {
                            validate: (value) => {
                              if (availingLoan && financingBank === 'OTHER') {
                                if (!value || value.trim() === '') {
                                  return 'Please enter the bank name'
                                }
                                if (!/^[a-zA-Z0-9\s\-&()./]+$/.test(value)) {
                                  return 'Bank name should be alphanumeric (you can use spaces and basic punctuation)'
                                }
                              }
                              return true
                            },
                          })}
                          disabled={!canEditFinancing}
                          className={inputCls}
                          placeholder="Enter bank name"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        )}

        </div>

        {/* Payment Tracking */}
        {canEditPayments ? (
          <div className="relative">
            <div className="space-y-4 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] border-l-[3px] border-l-[color:var(--accent-blue)]">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[color:var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-[color:var(--text-primary)]">
                  Payment Tracking
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>
                    Advance Received (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('advanceReceived')}
                    className={`mt-1.5 ${inputCls}`}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Advance Received Date
                  </label>
                  <input
                    type="date"
                    {...register('advanceReceivedDate')}
                    className={`mt-1.5 ${inputCls}`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Payment 1 (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('payment1')}
                    className={`mt-1.5 ${inputCls}`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Payment 1 Date</label>
                  <input
                    type="date"
                    {...register('payment1Date')}
                    className={`mt-1.5 ${inputCls}`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Payment 2 (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('payment2')}
                    className={`mt-1.5 ${inputCls}`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Payment 2 Date</label>
                  <input
                    type="date"
                    {...register('payment2Date')}
                    className={`mt-1.5 ${inputCls}`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Payment 3 (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('payment3')}
                    className={`mt-1.5 ${inputCls}`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Payment 3 Date</label>
                  <input
                    type="date"
                    {...register('payment3Date')}
                    className={`mt-1.5 ${inputCls}`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Last Payment (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('lastPayment')}
                    className={`mt-1.5 ${inputCls}`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Last Payment Date</label>
                  <input
                    type="date"
                    {...register('lastPaymentDate')}
                    className={`mt-1.5 ${inputCls}`}
                  />
                </div>
              </div>
            </div>
            <ErrorModal
              open={!!validationErrors?.length && validationErrorSource !== 'file'}
              onClose={clearValidationErrors}
              type="warning"
              anchor="parent"
              message={
                validationErrors?.length && validationErrorSource !== 'file'
                  ? 'Please fix the following:\n\n' + validationErrors.map((m) => '• ' + m).join('\n')
                  : ''
              }
              actions={[{ label: 'Dismiss', variant: 'ghost', onClick: clearValidationErrors }]}
            />
          </div>
        ) : (
          <div className="relative">
            <ErrorModal
              open={!!validationErrors?.length && validationErrorSource !== 'file'}
              onClose={clearValidationErrors}
              type="warning"
              anchor="parent"
              message={
                validationErrors?.length && validationErrorSource !== 'file'
                  ? 'Please fix the following:\n\n' + validationErrors.map((m) => '• ' + m).join('\n')
                  : ''
              }
              actions={[{ label: 'Dismiss', variant: 'ghost', onClick: clearValidationErrors }]}
            />
          </div>
        )}

        {/* Project Lifecycle - Hidden for Finance users in edit mode */}
        {canEditExecution && canEditOtherSections && (
          <div className="space-y-4 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] border-l-[3px] border-l-[color:var(--accent-purple)]">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-[color:var(--accent-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-[color:var(--text-primary)]">
                Project Lifecycle
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  MNRE Portal Registration Date
                </label>
                <input
                  type="date"
                  {...register('mnrePortalRegistrationDate')}
                  className={`mt-1.5 ${inputCls}`}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Feasibility Date (DISCOM)
                </label>
                <input
                  type="date"
                  {...register('feasibilityDate')}
                  className={`mt-1.5 ${inputCls}`}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Registration Date (DISCOM)
                </label>
                <input
                  type="date"
                  {...register('registrationDate')}
                  className={`mt-1.5 ${inputCls}`}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Expected commissioning date
                </label>
                <input
                  type="date"
                  {...register('expectedCommissioningDate')}
                  className={`mt-1.5 ${inputCls}`}
                />
                <p className={ZENITH_FIELD_HINT_CLS}>
                  Target date for go-live; used in Zenith Installation pulse. If left empty, installation completion date is used
                  there as a fallback.
                </p>
              </div>
              <div>
                <label className={labelCls}>
                  Installation Completion Date
                </label>
                <input
                  type="date"
                  {...register('installationCompletionDate')}
                  className={`mt-1.5 ${inputCls}`}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Completion Report Submission Date
                </label>
                <input
                  type="date"
                  {...register('completionReportSubmissionDate')}
                  className={`mt-1.5 ${inputCls}`}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Net Meter Installation Date
                </label>
                <input
                  type="date"
                  {...register('subsidyRequestDate')}
                  className={`mt-1.5 ${inputCls}`}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Total Project Cost (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('totalProjectCost')}
                  className={`mt-1.5 ${inputCls} ${projectStatus === ProjectStatus.LOST ? disabledControlCls : ''}`}
                  placeholder="Overall cost incurred in the project"
                  disabled={projectStatus === ProjectStatus.LOST}
                  readOnly={projectStatus === ProjectStatus.LOST}
                />
                {projectStatus === ProjectStatus.LOST && (
                  <p className={ZENITH_FIELD_HINT_CLS}>Total Project Cost is set to 0 for Lost projects</p>
                )}
              </div>
              <div className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 items-start">
                  <div className="min-w-0 w-full space-y-1">
                    <label className={sublabelUpperCls}>
                      Panel brand
                    </label>
                    <select
                      {...register('panelBrand')}
                      className={`zenith-native-select ${selectCls} text-sm`}
                    >
                      <option value="">Select…</option>
                      {PANEL_BRAND_OPTIONS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                    {panelBrandSelection === 'Others' ? (
                      <div className="pt-2 space-y-1">
                        <label className={ZENITH_AUX_LABEL_CLS}>
                          Specify brand <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          {...register('panelBrandOther', {
                            validate: (v) =>
                              panelBrandSelection !== 'Others' ||
                              (typeof v === 'string' && v.trim().length > 0) ||
                              'Enter the panel brand name',
                          })}
                          className={inputCls}
                          placeholder="Brand name"
                          autoComplete="off"
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="min-w-0 w-full space-y-1">
                    <label className={sublabelUpperCls}>
                      Panel capacity (W)
                    </label>
                    <input
                      type="number"
                      step={1}
                      min={0}
                      placeholder="e.g. 550"
                      {...register('panelCapacityW', {
                        setValueAs: (v) => {
                          if (v === '' || v == null) return undefined;
                          const n = parseInt(String(v), 10);
                          return Number.isNaN(n) ? undefined : n;
                        },
                        validate: (v) =>
                          v === undefined || v === null || (Number.isInteger(v) && v >= 0) || 'Must be a whole number ≥ 0',
                      })}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 items-start border-t border-[color:var(--border-default)] pt-4">
                  <div className="min-w-0 w-full space-y-1">
                    <label className={sublabelUpperCls}>
                      Inverter brand
                    </label>
                    <select
                      {...register('inverterBrand')}
                      className={`zenith-native-select ${selectCls} text-sm`}
                    >
                      <option value="">Select…</option>
                      {INVERTER_BRAND_OPTIONS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                    {inverterBrandSelection === 'Others' ? (
                      <div className="pt-2 space-y-1">
                        <label className={ZENITH_AUX_LABEL_CLS}>
                          Specify brand <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          {...register('inverterBrandOther', {
                            validate: (v) =>
                              inverterBrandSelection !== 'Others' ||
                              (typeof v === 'string' && v.trim().length > 0) ||
                              'Enter the inverter brand name',
                          })}
                          className={inputCls}
                          placeholder="Brand name"
                          autoComplete="off"
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="min-w-0 w-full space-y-1">
                    <label className={sublabelUpperCls}>
                      Inverter capacity (kW)
                    </label>
                    <input
                      type="number"
                      step={1}
                      min={0}
                      inputMode="numeric"
                      placeholder="Matches system capacity"
                      {...inverterCapacityKwRegister}
                      onChange={(e) => {
                        inverterCapacityKwUserEditedRef.current = true
                        inverterCapacityKwRegister.onChange(e)
                      }}
                      className={inputCls}
                    />
                    <p className="text-[11px] leading-snug text-[color:var(--text-muted)]">
                      Defaults to <span className="font-medium text-[color:var(--text-secondary)]">System capacity (kW)</span> (rounded). Edit here if the inverter rating differs.
                    </p>
                  </div>
                  <div className="min-w-0 sm:col-span-2 space-y-1.5 border-t border-[color:var(--border-default)] pt-3 sm:border-0 sm:pt-0">
                    <span className={sublabelUpperCls}>
                      Panel type
                    </span>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-0.5">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          {...register('panelType')}
                          value="DCR"
                          className="h-3.5 w-3.5 border-[color:var(--border-input)] bg-[color:var(--bg-input)] text-[color:var(--accent-gold)] focus:ring-[color:var(--accent-gold-muted)]"
                        />
                        <span className="text-sm font-medium text-[color:var(--text-primary)]">DCR</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          {...register('panelType')}
                          value="Non-DCR"
                          className="h-3.5 w-3.5 border-[color:var(--border-input)] bg-[color:var(--bg-input)] text-[color:var(--accent-gold)] focus:ring-[color:var(--accent-gold-muted)]"
                        />
                        <span className="text-sm font-medium text-[color:var(--text-primary)]">Non-DCR</span>
                      </label>
                    </div>
                  </div>
                </div>
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
          <div className="relative">
            <div className="space-y-4 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] border-l-[3px] border-l-[color:var(--accent-purple)]">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[color:var(--accent-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-[color:var(--text-primary)]">
                  File Uploads
                </h3>
              </div>
              <FileUploadSection
                projectId={id}
                existingCount={project?.documents?.length || 0}
                maxFiles={10}
                onShowError={(messages) => {
                  setValidationErrors(messages)
                  setValidationErrorSource('file')
                }}
              />
            </div>
            <ErrorModal
              open={!!validationErrors?.length && validationErrorSource === 'file'}
              onClose={clearValidationErrors}
              type="warning"
              anchor="parent"
              message={
                validationErrors?.length && validationErrorSource === 'file'
                  ? 'Please fix the following:\n\n' + validationErrors.map((m) => '• ' + m).join('\n')
                  : ''
              }
              actions={[{ label: 'Dismiss', variant: 'ghost', onClick: clearValidationErrors }]}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-[color:var(--border-default)] pt-6">
          <button
            type="button"
            onClick={() => navigate(exitPath)}
            className="rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-input)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-primary)] transition-colors hover:border-[color:var(--accent-gold-border)] hover:bg-[color:var(--bg-card-hover)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || isLost}
            className="rounded-xl bg-[color:var(--accent-gold)] px-5 py-2.5 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-md transition-all hover:opacity-95 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : isEdit ? (isLost ? 'Cannot Edit Lost Project' : 'Update') : 'Create'}
          </button>
        </div>
      </form>
      </div>
    </>
  )
}

export default ProjectForm
