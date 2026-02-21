import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../utils/axios'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Project, ProjectStatus, ProjectType, ProjectServiceType, UserRole, LeadSource } from '../types'
import { format } from 'date-fns'
import MultiSelect from '../components/MultiSelect'
import { useDebounce } from '../hooks/useDebounce'
import toast from 'react-hot-toast'
import { getSalesTeamColor } from '../components/dashboard/salesTeamColors'
import DashboardFilters from '../components/dashboard/DashboardFilters'
import { FiPaperclip } from 'react-icons/fi'
import { FaUniversity, FaTicketAlt, FaBriefcase } from 'react-icons/fa'
import PageCard from '../components/PageCard'

const PROJECTS_FILTERS_STORAGE_KEY = 'rayenna_projects_filters'

/** Valid paymentStatus URL params (matches paymentStatusOptions values) */
const VALID_PAYMENT_STATUS_VALUES = ['FULLY_PAID', 'PARTIAL', 'PENDING', 'NA'] as const

/** Read initial filters from URL (for tile links). Runs synchronously on mount so first request uses correct filters. */
function getInitialFiltersFromUrl(): {
  status: string[]
  paymentStatus: string[]
  availingLoan: boolean
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
} | null {
  const p = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const status = p.getAll('status')
  const paymentStatus = p.getAll('paymentStatus')
  const availingLoan = p.get('availingLoan') === 'true'
  const fy = p.getAll('fy')
  const quarter = p.getAll('quarter')
  const month = p.getAll('month')
  const hasAny = status.length > 0 || paymentStatus.length > 0 || availingLoan || fy.length > 0 || quarter.length > 0 || month.length > 0
  if (!hasAny) return null
  const validStatus = status.filter((s) => Object.values(ProjectStatus).includes(s as ProjectStatus))
  const validPayment = paymentStatus.filter((v) => (VALID_PAYMENT_STATUS_VALUES as readonly string[]).includes(v))
  return {
    status: validStatus,
    paymentStatus: validPayment,
    availingLoan,
    selectedFYs: fy,
    selectedQuarters: quarter,
    selectedMonths: month,
  }
}

// Payment status badge with tooltip - hover (desktop) and tap-to-toggle (mobile)
const PaymentStatusBadge = ({ project }: { project: Project }) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const badgeRef = useRef<HTMLSpanElement>(null)

  const projectCost = project?.projectCost
  const hasNoOrderValue = !projectCost || projectCost === 0 || projectCost === null || projectCost === undefined || Number(projectCost) <= 0

  const isEarlyOrLostStage =
    project.projectStatus === ProjectStatus.LEAD ||
    project.projectStatus === ProjectStatus.SITE_SURVEY ||
    project.projectStatus === ProjectStatus.PROPOSAL ||
    project.projectStatus === ProjectStatus.LOST

  const paymentStatus = project.paymentStatus || 'PENDING'
  const balanceAmount = project.balanceAmount ?? 0
  const hasBalanceTooltip = (paymentStatus === 'PENDING' || paymentStatus === 'PARTIAL') && balanceAmount > 0

  useEffect(() => {
    if (!hasBalanceTooltip) return
    const handleClickOutside = (e: MouseEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
        setShowTooltip(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [hasBalanceTooltip])

  if (hasNoOrderValue || isEarlyOrLostStage) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
        N/A
      </span>
    )
  }

  const balanceFormatted = balanceAmount.toLocaleString('en-IN')

  return (
    <span
      ref={badgeRef}
      className="relative inline-flex"
      onMouseEnter={() => hasBalanceTooltip && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => {
        if (hasBalanceTooltip) {
          e.stopPropagation()
          setShowTooltip((prev) => !prev)
        }
      }}
    >
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
          paymentStatus === 'FULLY_PAID'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : paymentStatus === 'PARTIAL'
            ? 'bg-amber-50 text-amber-800 border border-amber-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        } ${hasBalanceTooltip ? 'cursor-help' : ''}`}
      >
        {String(paymentStatus).replace(/_/g, ' ')}
      </span>
      {hasBalanceTooltip && showTooltip && (
        <span
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 rounded-lg bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl shadow-slate-900/40 ring-2 ring-blue-400/60 z-[100] pointer-events-none"
          role="tooltip"
        >
          <span className="text-blue-300 font-medium mr-1.5">Balance:</span>
          <span className="text-emerald-400 font-bold drop-shadow-sm">₹{balanceFormatted}</span>
        </span>
      )}
    </span>
  )
}

// Stage pill: clear color coding for quick scanning
const getStagePillClasses = (status: ProjectStatus): string => {
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

// Segment pill: distinct color per segment for quick recognition
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

const Projects = () => {
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlInit = getInitialFiltersFromUrl()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 500) // 500ms debounce
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [pendingExportType, setPendingExportType] = useState<'excel' | 'csv' | null>(null)
  const [showMoreFilters, setShowMoreFilters] = useState(!!urlInit)

  // Dashboard-style date filters (FY / Quarter / Month)
  const [selectedFYs, setSelectedFYs] = useState<string[]>(() => urlInit?.selectedFYs ?? [])
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>(() => urlInit?.selectedQuarters ?? [])
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => urlInit?.selectedMonths ?? [])
  
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

  const [filters, setFilters] = useState(() => ({
    status: (urlInit?.status ?? []) as string[],
    type: [] as string[],
    projectServiceType: [] as string[],
    salespersonId: [] as string[],
    leadSource: [] as string[],
    supportTicketStatus: [] as string[],
    paymentStatus: (urlInit?.paymentStatus ?? []) as string[],
    hasDocuments: false,
    availingLoan: urlInit?.availingLoan ?? false,
    search: '',
    sortBy: '',
    sortOrder: 'desc',
  }))

  // Defer projects query until URL/sessionStorage hydration completes (avoids double fetch on dashboard→projects)
  const [filtersReady, setFiltersReady] = useState(!!urlInit)
  const appliedFromUrlRef = useRef(!!urlInit)

  // Apply URL params (from Dashboard tile click) or restore from sessionStorage
  useLayoutEffect(() => {
    const statusFromUrl = searchParams.getAll('status')
    const paymentStatusFromUrl = searchParams.getAll('paymentStatus')
    const availingLoanFromUrl = searchParams.get('availingLoan') === 'true'
    const fyFromUrl = searchParams.getAll('fy')
    const quarterFromUrl = searchParams.getAll('quarter')
    const monthFromUrl = searchParams.getAll('month')
    const hasStatusParams = statusFromUrl.length > 0
    const hasPaymentParams = paymentStatusFromUrl.length > 0
    const hasDateParams = fyFromUrl.length > 0 || quarterFromUrl.length > 0 || monthFromUrl.length > 0
    // Wait for statusOptions when we have status in URL (needed to validate status values)
    const canResolveStatus = !hasStatusParams || statusOptions.length > 0
    const validStatus = hasStatusParams && canResolveStatus
      ? statusFromUrl.filter((v) => statusOptions.some((opt) => opt.value === v))
      : []
    const validPayment = hasPaymentParams ? paymentStatusFromUrl.filter((v) => (VALID_PAYMENT_STATUS_VALUES as readonly string[]).includes(v)) : []
    if (canResolveStatus && (validStatus.length > 0 || validPayment.length > 0 || availingLoanFromUrl || hasDateParams)) {
      appliedFromUrlRef.current = true
      setFilters((prev) => ({
        ...prev,
        ...(validStatus.length > 0 && { status: validStatus }),
        ...(validPayment.length > 0 && { paymentStatus: validPayment }),
        ...(availingLoanFromUrl && { availingLoan: true }),
      }))
      if (fyFromUrl.length > 0) setSelectedFYs(fyFromUrl)
      if (quarterFromUrl.length > 0) setSelectedQuarters(quarterFromUrl)
      if (monthFromUrl.length > 0) setSelectedMonths(monthFromUrl)
      setShowMoreFilters(true)
      setPage(1)
      setFiltersReady(true)
      return
    }
    try {
      const raw = sessionStorage.getItem(PROJECTS_FILTERS_STORAGE_KEY)
      if (!raw) {
        setFiltersReady(true)
        return
      }
      const saved = JSON.parse(raw) as {
        filters?: typeof filters
        page?: number
        searchInput?: string
        selectedFYs?: string[]
        selectedQuarters?: string[]
        selectedMonths?: string[]
      }
      if (saved.filters) setFilters((prev) => ({ ...prev, ...saved.filters, leadSource: (saved.filters as any)?.leadSource ?? [] }))
      if (saved.page != null && saved.page >= 1) setPage(saved.page)
      if (saved.searchInput != null) setSearchInput(saved.searchInput)
      if (saved.selectedFYs) setSelectedFYs(saved.selectedFYs)
      if (saved.selectedQuarters) setSelectedQuarters(saved.selectedQuarters)
      if (saved.selectedMonths) setSelectedMonths(saved.selectedMonths)
    } catch {
      // ignore invalid or missing stored data
    }
    setFiltersReady(true)
  }, [searchParams, statusOptions])

  // Skip first persist so we don't overwrite sessionStorage with initial state before restore runs
  const isFirstMount = useRef(true)
  // Skip first reset-page so we don't overwrite restored page on mount
  const isFirstPageReset = useRef(true)

  // Initialize default status filter (all active statuses except LOST) when ready
  // Skip when we applied status from URL (prevents overwriting tile-filtered status)
  useEffect(() => {
    if (appliedFromUrlRef.current) return
    if (defaultStatusValues.length > 0 && filters.status.length === 0) {
      setFilters(prev => {
        if (prev.status.length === 0) {
          return { ...prev, status: [...defaultStatusValues] }
        }
        return prev
      })
    }
  }, [defaultStatusValues, filters.status.length])
  
  // Persist filters to sessionStorage so they survive navigation (view/edit → back)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    try {
      sessionStorage.setItem(PROJECTS_FILTERS_STORAGE_KEY, JSON.stringify({
        filters,
        page,
        searchInput,
        selectedFYs,
        selectedQuarters,
        selectedMonths,
      }))
    } catch {
      // ignore quota or other storage errors
    }
  }, [filters, page, searchInput, selectedFYs, selectedQuarters, selectedMonths])

  // Track when user manually changes status filter
  const handleStatusChange = (values: string[]) => {
    setFilters(prev => ({ ...prev, status: values }))
  }

  // Update filters when debounced search changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch }))
    setPage(1) // Reset to first page when search changes
  }, [debouncedSearch])

  // Reset page when other filters change (skip first run to avoid overwriting restored page)
  useEffect(() => {
    if (isFirstPageReset.current) {
      isFirstPageReset.current = false
      return
    }
    setPage(1)
  }, [
    filters.status,
    filters.type,
    filters.projectServiceType,
    filters.salespersonId,
    filters.leadSource,
    filters.supportTicketStatus,
    filters.paymentStatus,
    filters.hasDocuments,
    filters.availingLoan,
    filters.sortBy,
    selectedFYs,
    selectedQuarters,
    selectedMonths,
  ])

  const clearAllFilters = () => {
    try {
      sessionStorage.removeItem(PROJECTS_FILTERS_STORAGE_KEY)
    } catch {
      // ignore
    }
    // Reset search input (drives debounced search → filters.search)
    setSearchInput('')

    // Reset dashboard-style date filters
    setSelectedFYs([])
    setSelectedQuarters([])
    setSelectedMonths([])

    // Reset all other filters; keep default status set (active statuses except LOST)
    setFilters((prev) => ({
      ...prev,
      status: [...defaultStatusValues],
      type: [],
      projectServiceType: [],
      salespersonId: [],
      leadSource: [],
      supportTicketStatus: [],
      paymentStatus: [],
      hasDocuments: false,
      availingLoan: false,
      search: '',
      sortBy: '',
      sortOrder: 'desc',
    }))

    setPage(1)

    // When arriving from a dashboard tile, URL has filter params and is the source of truth.
    // Clear the URL so the query uses the reset state instead of stale URL params.
    if (urlHasFilterParams) {
      navigate({ pathname: '/projects', search: '' }, { replace: true })
    }
  }

  const moreFiltersActiveCount = useMemo(() => {
    const normalize = (arr: string[]) => [...arr].sort().join('|')
    const statusIsDefault =
      filters.status.length === defaultStatusValues.length &&
      normalize(filters.status) === normalize(defaultStatusValues)

    return (
      (statusIsDefault ? 0 : 1) +
      (filters.type.length > 0 ? 1 : 0) +
      (filters.projectServiceType.length > 0 ? 1 : 0) +
      (filters.supportTicketStatus.length > 0 ? 1 : 0) +
      (filters.paymentStatus.length > 0 ? 1 : 0) +
      (user?.role !== UserRole.SALES && filters.salespersonId.length > 0 ? 1 : 0) +
      (filters.leadSource.length > 0 ? 1 : 0) +
      (filters.hasDocuments ? 1 : 0) +
      (filters.availingLoan ? 1 : 0)
    )
  }, [
    filters.status,
    filters.type,
    filters.projectServiceType,
    filters.supportTicketStatus,
    filters.paymentStatus,
    filters.salespersonId,
    filters.leadSource,
    filters.hasDocuments,
    filters.availingLoan,
    defaultStatusValues,
    user?.role,
  ])

  // Fetch sales users for the filter dropdown (only for non-SALES users)
  const { data: salesUsers } = useQuery({
    queryKey: ['salesUsers'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/users/role/sales')
      return res.data
    },
    enabled: user?.role !== UserRole.SALES, // Only fetch if user is not SALES
  })

  // URL has tile params when arriving from a dashboard tile – used for initial hydration only.
  // API request always uses React state (filters, selectedFYs, etc.) as source of truth so that
  // when the user changes the Project Stage filter or other filters, the change is reflected.
  const urlHasFilterParams =
    searchParams.getAll('status').length > 0 ||
    searchParams.getAll('paymentStatus').length > 0 ||
    searchParams.has('fy') ||
    searchParams.has('quarter') ||
    searchParams.has('month')

  const { data, isLoading } = useQuery({
    queryKey: [
      'projects',
      filters,
      page,
      selectedFYs,
      selectedQuarters,
      selectedMonths,
    ],
    enabled: filtersReady,
    queryFn: async () => {
      const params = new URLSearchParams()
      // Always use React state as source of truth – URL only hydrates initial state.
      // This ensures Project Stage filter (and all filters) work when page was opened via a tile.
      filters.status.forEach((v) => params.append('status', v))
      filters.type.forEach((v) => params.append('type', v))
      filters.projectServiceType.forEach((v) => params.append('projectServiceType', v))
      filters.salespersonId.forEach((v) => params.append('salespersonId', v))
      filters.leadSource.forEach((v) => params.append('leadSource', v))
      filters.supportTicketStatus.forEach((v) => params.append('supportTicketStatus', v))
      filters.paymentStatus.forEach((v) => params.append('paymentStatus', v))
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedQuarters.forEach((q) => params.append('quarter', q))
      selectedMonths.forEach((m) => params.append('month', m))
      if (filters.search) params.append('search', filters.search)
      if (filters.hasDocuments) params.append('hasDocuments', 'true')
      if (filters.availingLoan) params.append('availingLoan', 'true')
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

  // Lead Source filter options - labels match ProjectDetail display
  const leadSourceOptions = [
    { value: LeadSource.WEBSITE, label: 'Website' },
    { value: LeadSource.REFERRAL, label: 'Referral' },
    { value: LeadSource.GOOGLE, label: 'Google' },
    { value: LeadSource.CHANNEL_PARTNER, label: 'Channel Partner' },
    { value: LeadSource.DIGITAL_MARKETING, label: 'Digital Marketing' },
    { value: LeadSource.SALES, label: 'Sales' },
    { value: LeadSource.MANAGEMENT_CONNECT, label: 'Management Connect' },
    { value: LeadSource.OTHER, label: 'Other' },
  ]

  // Support Ticket Status filter options
  const supportTicketStatusOptions = [
    { value: 'HAS_TICKETS', label: 'Has Tickets (Any Status)' },
    { value: 'OPEN', label: 'Has Open Tickets' },
    { value: 'IN_PROGRESS', label: 'Has In-Progress Tickets' },
    { value: 'CLOSED', label: 'Has Closed Tickets' },
    { value: 'NO_TICKETS', label: 'No Tickets' },
  ]

  // Payment Status filter options - only show for Finance, Sales, Management, Admin
  const paymentStatusOptions = useMemo(() => {
    const canSeePaymentFilter = hasRole([UserRole.FINANCE, UserRole.MANAGEMENT, UserRole.ADMIN, UserRole.OPERATIONS]) || 
                                 (hasRole([UserRole.SALES]) && user?.id) // Sales can filter their own projects
    if (!canSeePaymentFilter) return []
    
    return [
      { value: 'FULLY_PAID', label: 'Fully Paid' },
      { value: 'PARTIAL', label: 'Partial' },
      { value: 'PENDING', label: 'Pending' },
      { value: 'NA', label: 'N/A' }, // For projects without order value or in early/lost stages
    ]
  }, [user?.role, user?.id, hasRole])

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
      filters.leadSource.forEach((value) => params.append('leadSource', value))
      filters.paymentStatus.forEach((value) => params.append('paymentStatus', value))
      if (filters.search) params.append('search', filters.search)
      if (filters.hasDocuments) params.append('hasDocuments', 'true')
      if (filters.availingLoan) params.append('availingLoan', 'true')
      if (filters.sortBy) {
        params.append('sortBy', filters.sortBy)
        params.append('sortOrder', filters.sortOrder)
      }
      selectedFYs.forEach((fy) => params.append('fy', fy))
      selectedQuarters.forEach((q) => params.append('quarter', q))
      selectedMonths.forEach((m) => params.append('month', m))
      
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

  if (!filtersReady || isLoading) {
    return (
      <div className="px-4 py-6 sm:px-0 max-w-full min-w-0 overflow-x-hidden">
        <div className="h-8 w-48 bg-gradient-to-r from-amber-200 to-gray-200 rounded animate-pulse mb-4" />
        <div className="h-64 bg-gradient-to-r from-amber-100/50 to-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0 max-w-full min-w-0 overflow-x-hidden mobile-paint-fix">
      <PageCard
        title="Projects"
        subtitle="Manage and track all your solar projects"
        icon={<FaBriefcase className="w-5 h-5 text-white" />}
        headerAction={(user?.role === 'ADMIN' || user?.role === 'SALES') ? (
          <Link
            to="/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 border border-white/40 text-white rounded-xl hover:bg-white/30 font-medium text-sm shadow-md transition-all"
          >
            + New Project
          </Link>
        ) : undefined}
        className="max-w-full"
      >
      <div className="bg-gradient-to-br from-white via-primary-50/30 to-white rounded-xl border border-primary-100 mb-4 p-4 sm:p-5 shadow-sm">
        <div className="space-y-2 sm:space-y-3">
          {/* Row 1: Search Bar + Show/Hide Filters toggle (and Clear All on larger screens) */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="text"
              placeholder="Search across all projects..."
              className="w-full sm:flex-1 min-h-[40px] border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
            />
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowMoreFilters((v) => !v)}
                className="flex-1 min-h-[40px] px-3 py-2 rounded-lg border border-primary-200 bg-white hover:bg-primary-50/80 text-gray-700 font-medium transition-colors flex items-center justify-center gap-2"
                aria-expanded={showMoreFilters}
                aria-controls="projects-more-filters"
                title="Show or hide additional filters"
              >
                <span className="truncate">
                  {showMoreFilters ? 'Hide Filters' : 'Show Filters'}
                  {!showMoreFilters && moreFiltersActiveCount > 0 ? ` (${moreFiltersActiveCount})` : ''}
                </span>
                <svg
                  className={`h-4 w-4 text-gray-500 transition-transform ${showMoreFilters ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {/* Clear All next to toggle - visible on all screen sizes so it can reset Sort/filters even when filters are hidden */}
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex-1 sm:flex-none inline-flex justify-center items-center min-h-[40px] px-4 py-2 rounded-lg border border-primary-200 bg-white hover:bg-primary-50/80 text-gray-700 font-medium text-sm transition-colors"
                title="Clear search and all filters"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Row 2: Sort controls - always visible */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">Sort By</label>
              <select
                className="w-full min-h-[40px] border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 text-sm"
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              >
                <option value="">Default (Confirmation Date)</option>
                <option value="systemCapacity">System Capacity</option>
                <option value="projectCost">Order Value</option>
                <option value="confirmationDate">Confirmation Date</option>
                <option value="creationDate">Creation Date</option>
                <option value="profitability">Profitability</option>
                <option value="customerName">Customer Name</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <select
                className="w-full min-h-[40px] border-2 border-primary-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:border-primary-500 bg-gradient-to-r from-white to-primary-50 shadow-md text-gray-700 font-medium text-[13px] disabled:opacity-60 disabled:cursor-not-allowed"
                value={filters.sortOrder}
                onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}
                disabled={!filters.sortBy}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          {/* Additional filters - hidden by default, shown when "Show Filters" is active */}
          <div
            id="projects-more-filters"
            className={`${showMoreFilters ? 'overflow-visible' : 'overflow-hidden'} transition-all duration-300 ease-in-out ${
              showMoreFilters ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className={`${showMoreFilters ? 'pointer-events-auto' : 'pointer-events-none'} pt-2 space-y-2 sm:space-y-3`}>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1.5">Filter By</label>
              {/* Row 1: FY, Quarter, Month (2/3 width), Sales User (1/3 width = same as Project Types) */}
              <div className="pt-1 flex flex-col lg:flex-row lg:items-start gap-2 sm:gap-3">
                <div className="w-full lg:w-2/3">
                  <DashboardFilters
                    availableFYs={data?.availableFYs ?? []}
                    selectedFYs={selectedFYs}
                    selectedQuarters={selectedQuarters}
                    selectedMonths={selectedMonths}
                    onFYChange={setSelectedFYs}
                    onQuarterChange={setSelectedQuarters}
                    onMonthChange={setSelectedMonths}
                    compact
                  />
                </div>
                {user?.role !== UserRole.SALES && (
                  <div className="w-full lg:w-1/3">
                    <MultiSelect
                      options={salesUserOptions}
                      selectedValues={filters.salespersonId}
                      onChange={(values) => setFilters({ ...filters, salespersonId: values })}
                      placeholder="Sales Users"
                      compact
                    />
                  </div>
                )}
              </div>

              {/* Filters: 2 cols on mobile landscape (sm), 3 cols on laptop (lg) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                <MultiSelect
                  options={statusOptions}
                  selectedValues={filters.status}
                  onChange={handleStatusChange}
                  placeholder="Pipeline"
                  multiSelectedLabel={user?.role === UserRole.OPERATIONS ? 'Confirmed Pipeline' : 'Active Pipeline'}
                  compact
                />
                <MultiSelect
                  options={typeOptions}
                  selectedValues={filters.type}
                  onChange={(values) => setFilters({ ...filters, type: values })}
                  placeholder="Segments"
                  compact
                />
                <MultiSelect
                  options={projectServiceTypeOptions}
                  selectedValues={filters.projectServiceType}
                  onChange={(values) => setFilters({ ...filters, projectServiceType: values })}
                  placeholder="Project Types"
                  compact
                />
                <MultiSelect
                  options={supportTicketStatusOptions}
                  selectedValues={filters.supportTicketStatus}
                  onChange={(values) => setFilters({ ...filters, supportTicketStatus: values })}
                  placeholder="Ticket Statuses"
                  compact
                />
                {paymentStatusOptions.length > 0 && (
                  <MultiSelect
                    options={paymentStatusOptions}
                    selectedValues={filters.paymentStatus}
                    onChange={(values) => setFilters({ ...filters, paymentStatus: values })}
                    placeholder="Payment Statuses"
                    compact
                  />
                )}
                <MultiSelect
                  options={leadSourceOptions}
                  selectedValues={filters.leadSource}
                  onChange={(values) => setFilters({ ...filters, leadSource: values })}
                  placeholder="Lead Sources"
                  compact
                />
              </div>

              {/* Has Artifacts checkbox */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.hasDocuments}
                    onChange={(e) => setFilters(prev => ({ ...prev, hasDocuments: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500/20"
                  />
                  <span className="text-sm text-gray-600">Has Artifacts</span>
                </label>
                <span className="text-xs text-gray-500">(only projects with at least one attachment)</span>
              </div>

              {/* Availing Loan checkbox */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.availingLoan}
                    onChange={(e) => setFilters(prev => ({ ...prev, availingLoan: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500/20"
                  />
                  <span className="text-sm text-gray-600">Availing Loan</span>
                </label>
                <span className="text-xs text-gray-500">(only projects where Availing Loan/Financing is Yes)</span>
              </div>

              {/* Export buttons - Only visible to Admin users */}
              {hasRole([UserRole.ADMIN]) && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExportClick('excel')}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export to Excel
                  </button>
                  <button
                    onClick={() => handleExportClick('csv')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export to CSV
                  </button>
                </div>
              )}

              {/* Clear all (search + filters) - bottom placement on mobile for easy access */}
              <div className="flex justify-end pt-1 sm:hidden">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="min-h-[40px] px-4 py-2 rounded-lg border border-primary-200 bg-white hover:bg-primary-50/80 text-gray-700 font-medium text-sm transition-colors w-full"
                  title="Clear search and all filters"
                >
                  Clear All
                </button>
              </div>

            </div>
          </div>
        </div>
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

      {/* Projects table - scannable, status-driven, enterprise tone */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              {/* Subtotals row - aligned above Capacity and Order Value columns */}
              <tr className="border-b border-gray-100 bg-primary-50/30">
                <th className="px-4 py-2" scope="col" />
                <th className="px-4 py-2 hidden lg:table-cell" scope="col" />
                <th className="px-4 py-2" scope="col" />
                <th className="px-4 py-2 text-right align-bottom min-w-0" scope="col">
                  <div className="inline-block px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-gradient-to-br from-orange-100 to-amber-200 border-2 border-orange-400 text-xs font-bold text-orange-900 tabular-nums whitespace-nowrap shadow-md shadow-orange-300/40 ring-1 ring-orange-300/50">
                    {(data?.totals?.capacitySum ?? 0) / 1000 > 0
                      ? `${((data?.totals?.capacitySum ?? 0) / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} MW`
                      : '—'}
                  </div>
                </th>
                <th className="px-4 py-2 text-right align-bottom min-w-0" scope="col">
                  <div className="inline-block px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-gradient-to-br from-emerald-100 to-green-200 border-2 border-emerald-500 text-xs font-bold text-emerald-900 tabular-nums whitespace-nowrap shadow-md shadow-emerald-400/40 ring-1 ring-emerald-400/50">
                    {(data?.totals?.costSum ?? 0) > 0
                      ? `₹${((data?.totals?.costSum ?? 0) / 1_000_000).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} M`
                      : '—'}
                  </div>
                </th>
                <th className="px-4 py-2 text-center align-bottom min-w-0" scope="col">
                  <div className="inline-block px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-gradient-to-br from-blue-100 to-sky-200 border-2 border-blue-500 text-xs font-bold text-blue-900 tabular-nums whitespace-nowrap shadow-md shadow-blue-400/40 ring-1 ring-blue-400/50">
                    {(data?.totals?.balanceSum ?? 0) > 0
                      ? `₹${((data?.totals?.balanceSum ?? 0) / 1_000_000).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} M`
                      : '—'}
                  </div>
                </th>
                <th className="px-4 py-2 hidden md:table-cell" scope="col" />
                <th className="px-4 py-2 hidden sm:table-cell" scope="col" />
              </tr>
              <tr className="border-b border-gray-200 bg-gradient-to-r from-amber-50 to-amber-100/80">
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider border-l-4 border-l-amber-400">Project</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">Segment</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Stage</th>
                <th className="pl-2 pr-4 py-3 text-right text-sm font-bold text-gray-700 uppercase tracking-wider">Capacity</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 uppercase tracking-wider">Order Value</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">Payment</th>
                <th className="pl-6 pr-4 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">Lead Source</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">Confirmation Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.projects?.map((project: Project) => (
                <tr
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="group transition-colors cursor-pointer bg-white hover:bg-primary-50/50"
                >
                  <td className="px-4 py-3 min-w-0">
                    <p className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                      #{project.slNo} · {project.customer?.customerName || 'Unknown Customer'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px] sm:max-w-none">
                      {project.salesperson && (
                        <span style={{ color: getSalesTeamColor(project.salesperson.name, 0) }}>
                          {project.salesperson.name}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 ml-1.5">
                        {project._count && project._count.documents > 0 && (
                          <span className="text-primary-600" title={`${project._count.documents} document(s)`}>
                            <FiPaperclip className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                          </span>
                        )}
                        {project.availingLoan === true && (
                          <span className="text-emerald-700" title="Availing Loan / Financing">
                            <FaUniversity className="w-3.5 h-3.5 shrink-0" />
                          </span>
                        )}
                        {project.supportTickets && project.supportTickets.length > 0 && (
                          <span className="text-amber-600" title="Open or In Progress ticket(s)">
                            <FaTicketAlt className="w-3.5 h-3.5 shrink-0" />
                          </span>
                        )}
                      </span>
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getSegmentPillClasses(project.type)}`}>
                      {project.type === 'RESIDENTIAL_SUBSIDY'
                        ? 'Residential Subsidy'
                        : project.type === 'RESIDENTIAL_NON_SUBSIDY'
                          ? 'Residential - Non Subsidy'
                          : project.type === 'COMMERCIAL_INDUSTRIAL'
                            ? 'Commercial Industrial'
                            : String(project.type).replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getStagePillClasses(project.projectStatus)}`}>
                      {project.projectStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="pl-2 pr-4 py-3 text-right">
                    <span className="text-sm font-bold text-orange-800 tabular-nums">
                      {project.systemCapacity ? `${project.systemCapacity} kW` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-bold text-green-800 tabular-nums">
                      {project.projectCost ? `₹${project.projectCost.toLocaleString('en-IN')}` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PaymentStatusBadge project={project} />
                  </td>
                  <td className="pl-6 pr-4 py-3 text-left hidden md:table-cell">
                    {project.leadSource === 'WEBSITE' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">Website</span>
                    )}
                    {project.leadSource === 'REFERRAL' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">Referral</span>
                    )}
                    {project.leadSource === 'GOOGLE' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">Google</span>
                    )}
                    {project.leadSource === 'CHANNEL_PARTNER' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-800 border border-red-300">Channel Partner</span>
                    )}
                    {project.leadSource === 'DIGITAL_MARKETING' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-violet-100 text-violet-800 border border-violet-300">Digital Mktg</span>
                    )}
                    {project.leadSource === 'SALES' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-pink-100 text-pink-800 border border-pink-300">Sales</span>
                    )}
                    {project.leadSource === 'MANAGEMENT_CONNECT' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-cyan-100 text-cyan-800 border border-cyan-300">Mgmt Connect</span>
                    )}
                    {project.leadSource === 'OTHER' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-lime-100 text-lime-800 border border-lime-300">Other</span>
                    )}
                    {!project.leadSource && <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className="text-xs text-gray-500">
                      {project.confirmationDate ? format(new Date(project.confirmationDate), 'MMM dd, yyyy') : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                className="px-4 py-2 border border-primary-200 rounded-lg text-sm font-medium text-primary-800 bg-primary-50/80 hover:bg-primary-100/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
                disabled={page >= data.pagination.pages}
                className="px-4 py-2 border border-primary-200 rounded-lg text-sm font-medium text-primary-800 bg-primary-50/80 hover:bg-primary-100/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Legend: 3 icons + 3 subtotals — single row on laptop, wrap neatly on smaller */}
      <div className="mt-6 pt-4 border-t border-primary-100">
        <p className="text-[11px] sm:text-xs font-semibold text-gray-600 mb-2">Legend</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-2 sm:gap-y-1.5 text-[11px] sm:text-xs text-gray-500 leading-relaxed items-center">
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span className="text-primary-600">
              <FiPaperclip className="w-3.5 h-3.5" strokeWidth={2} />
            </span>
            Has attachment(s)
          </span>
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span className="text-emerald-700">
              <FaUniversity className="w-3.5 h-3.5" />
            </span>
            Availing Loan
          </span>
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span className="text-amber-600">
              <FaTicketAlt className="w-3.5 h-3.5" />
            </span>
            Open/In progress ticket(s)
          </span>
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span className="inline-block w-3 h-3 rounded bg-gradient-to-br from-orange-100 to-amber-200 border border-orange-400 shadow-sm" />
            Capacity subtotal
          </span>
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span className="inline-block w-3 h-3 rounded bg-gradient-to-br from-emerald-100 to-green-200 border border-emerald-500 shadow-sm" />
            Order value subtotal
          </span>
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span className="inline-block w-3 h-3 rounded bg-gradient-to-br from-blue-100 to-sky-200 border border-blue-500 shadow-sm" />
            Balance subtotal
          </span>
        </div>
      </div>
      </PageCard>
    </div>
  )
}

export default Projects
