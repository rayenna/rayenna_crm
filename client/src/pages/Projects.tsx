import { useState, useEffect, useLayoutEffect, useRef, useMemo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Project, ProjectStatus, ProjectType, ProjectServiceType, UserRole, LeadSource } from '../types'
import { format } from 'date-fns'
import MultiSelect from '../components/MultiSelect'
import { useDebounce } from '../hooks/useDebounce'
import { useHoverCapableForTooltip } from '../hooks/useHoverCapableForTooltip'
import { ZENITH_FLOATING_DISMISS_EVENT } from '../utils/zenithEvents'
import toast from 'react-hot-toast'
import { setSessionStorageItem } from '../lib/safeLocalStorage'
import { getSalesTeamColor } from '../components/dashboard/salesTeamColors'
import DashboardFilters from '../components/dashboard/DashboardFilters'
import HealthBadge from '../components/zenith/HealthBadge'
import FinancingBankPopoverIcon from '../components/projects/FinancingBankPopoverIcon'
import { getFinancingBankDisplayName } from '../utils/financingBankDisplay'
import { FiPaperclip } from 'react-icons/fi'
import { FaUniversity, FaTicketAlt, FaBriefcase } from 'react-icons/fa'
import { ErrorModal } from '@/components/common/ErrorModal'
import { projectStatusStagePillClass } from '../components/zenith/zenithDealCardUi'
import { ZenithSingleSelect } from '../components/zenith/ZenithSingleSelect'

const PROJECTS_FILTERS_STORAGE_KEY = 'rayenna_projects_filters'

function defaultOrderForProjectsSortKey(key: string): 'asc' | 'desc' {
  const descFirst = new Set([
    'systemCapacity',
    'projectCost',
    'confirmationDate',
    'dealHealthScore',
    'profitability',
    'creationDate',
    'slNo',
  ])
  return descFirst.has(key) ? 'desc' : 'asc'
}

/** Valid paymentStatus URL params (matches paymentStatusOptions values) */
const VALID_PAYMENT_STATUS_VALUES = ['FULLY_PAID', 'PARTIAL', 'PENDING', 'NA'] as const

const VALID_PE_BUCKET_VALUES = ['proposal-ready', 'draft', 'not-started', 'rest'] as const
type PeBucketParam = (typeof VALID_PE_BUCKET_VALUES)[number]

function parsePeBucketFromSearch(search: string): PeBucketParam | null {
  const p = new URLSearchParams(search)
  const raw = p.get('peBucket')
  return raw && (VALID_PE_BUCKET_VALUES as readonly string[]).includes(raw) ? (raw as PeBucketParam) : null
}

/** Read initial filters from URL (for tile links). Runs synchronously on mount so first request uses correct filters. */
function getInitialFiltersFromUrl(): {
  status: string[]
  paymentStatus: string[]
  availingLoan: boolean
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
  peBucket: PeBucketParam | null
  type: string[]
  leadSource: string[]
  salespersonId: string[]
  financingBank: string[]
  zenithClosedFrom: string | null
  zenithClosedTo: string | null
  salespersonUnassigned: boolean
  leadSourceIsNull: boolean
  zenithSlice: 'revenue' | 'pipeline' | null
  zenithFyProfit: boolean
  panelBrand: string
  inverterBrand: string
  lifecycleSpecsComplete: boolean
} | null {
  const p = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const status = p.getAll('status')
  const paymentStatus = p.getAll('paymentStatus')
  const availingLoan = p.get('availingLoan') === 'true'
  const fy = p.getAll('fy')
  const quarter = p.getAll('quarter')
  const month = p.getAll('month')
  const peBucket = parsePeBucketFromSearch(typeof window !== 'undefined' ? window.location.search : '')
  const type = p.getAll('type')
  const leadSource = p.getAll('leadSource')
  const salespersonId = p.getAll('salespersonId')
  const financingBank = p.getAll('financingBank')
  const zenithClosedFrom = p.get('zenithClosedFrom')
  const zenithClosedTo = p.get('zenithClosedTo')
  const salespersonUnassigned = p.get('salespersonUnassigned') === 'true'
  const leadSourceIsNull = p.get('leadSourceIsNull') === 'true'
  const rawZenithSlice = p.get('zenithSlice')
  const zenithSlice =
    rawZenithSlice === 'revenue' || rawZenithSlice === 'pipeline' ? rawZenithSlice : null
  const zenithFyProfit = p.get('zenithFyProfit') === 'true'
  const panelBrand = p.get('panelBrand')?.trim() ?? ''
  const inverterBrand = p.get('inverterBrand')?.trim() ?? ''
  const lifecycleSpecsComplete =
    p.get('lifecycleSpecsComplete') === 'true' || panelBrand !== '' || inverterBrand !== ''
  const hasAny =
    status.length > 0 ||
    paymentStatus.length > 0 ||
    availingLoan ||
    fy.length > 0 ||
    quarter.length > 0 ||
    month.length > 0 ||
    peBucket != null ||
    type.length > 0 ||
    leadSource.length > 0 ||
    salespersonId.length > 0 ||
    financingBank.length > 0 ||
    (zenithClosedFrom != null && zenithClosedFrom !== '') ||
    (zenithClosedTo != null && zenithClosedTo !== '') ||
    salespersonUnassigned ||
    leadSourceIsNull ||
    zenithSlice != null ||
    zenithFyProfit ||
    panelBrand !== '' ||
    inverterBrand !== '' ||
    p.get('lifecycleSpecsComplete') === 'true'
  if (!hasAny) return null
  const validStatus = status.filter((s) => Object.values(ProjectStatus).includes(s as ProjectStatus))
  const validPayment = paymentStatus.filter((v) => (VALID_PAYMENT_STATUS_VALUES as readonly string[]).includes(v))
  const validType = type.filter((t) => Object.values(ProjectType).includes(t as ProjectType))
  const validLead = leadSource.filter((ls) => Object.values(LeadSource).includes(ls as LeadSource))
  const validFinancingBank = financingBank.map((b) => b.trim()).filter(Boolean)
  return {
    status: validStatus,
    paymentStatus: validPayment,
    availingLoan,
    selectedFYs: fy,
    selectedQuarters: quarter,
    selectedMonths: month,
    peBucket,
    type: validType,
    leadSource: leadSourceIsNull ? [] : validLead,
    salespersonId: salespersonUnassigned ? [] : salespersonId.map((id) => id.trim()).filter(Boolean),
    financingBank: validFinancingBank,
    zenithClosedFrom: zenithClosedFrom?.trim() || null,
    zenithClosedTo: zenithClosedTo?.trim() || null,
    salespersonUnassigned,
    leadSourceIsNull,
    zenithSlice,
    zenithFyProfit,
    panelBrand,
    inverterBrand,
    lifecycleSpecsComplete,
  }
}

function getInitialSearchFromUrl(): string {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('search')?.trim() ?? ''
}

// Payment status badge — balance popover matches Deal Health / Financing Bank (portal + tap handling).
const PaymentStatusBadge = ({ project, compact = false }: { project: Project; compact?: boolean }) => {
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

  const hoverCapable = useHoverCapableForTooltip()
  const [mouseInside, setMouseInside] = useState(false)
  const [tapOpen, setTapOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; place: 'above' | 'below' } | null>(null)

  const tooltipW = 240
  const tooltipHApprox = 130
  const gutter = 12
  const showCard = hoverCapable ? mouseInside : tapOpen

  useEffect(() => {
    const dismissFloating = () => {
      setTapOpen(false)
      setMouseInside(false)
    }
    window.addEventListener(ZENITH_FLOATING_DISMISS_EVENT, dismissFloating)
    return () => window.removeEventListener(ZENITH_FLOATING_DISMISS_EVENT, dismissFloating)
  }, [])

  useEffect(() => {
    if (hoverCapable || !tapOpen) return
    const close = (e: Event) => {
      const el = anchorRef.current
      const t = e.target
      if (el && t instanceof Node && el.contains(t)) return
      setTapOpen(false)
    }
    document.addEventListener('touchstart', close, { capture: true })
    document.addEventListener('mousedown', close, { capture: true })
    return () => {
      document.removeEventListener('touchstart', close, { capture: true })
      document.removeEventListener('mousedown', close, { capture: true })
    }
  }, [hoverCapable, tapOpen])

  const balanceFormatted = balanceAmount.toLocaleString('en-IN')

  const pillSize = compact
    ? 'px-1.5 py-0.5 text-[10px] lg:text-[11px]'
    : 'px-2 py-0.5 text-xs'
  const pillClassName = `inline-flex items-center rounded-md font-medium ${pillSize} ${
    paymentStatus === 'FULLY_PAID'
      ? 'border border-emerald-400/35 bg-[color:color-mix(in srgb,var(--accent-teal) 12%, var(--bg-card))] text-[color:var(--text-primary)]'
      : paymentStatus === 'PARTIAL'
        ? 'border border-[color:var(--accent-gold-border)] bg-[color:color-mix(in srgb,var(--accent-gold) 14%, var(--bg-card))] text-[color:var(--text-primary)]'
        : 'border border-[color:var(--accent-red-border)] bg-[color:color-mix(in srgb,var(--accent-red) 12%, var(--bg-card))] text-[color:var(--text-primary)]'
  }`

  const tooltipNode = useMemo(() => {
    if (!hasBalanceTooltip || !showCard || !pos) return null
    return (
      <div
        role="tooltip"
        style={{
          position: 'fixed',
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          transform: 'translateX(-50%)',
          background: 'var(--bg-tooltip)',
          border: '1px solid var(--border-card)',
          borderRadius: '10px',
          padding: '12px 14px',
          width: `${tooltipW}px`,
          zIndex: 3000,
          pointerEvents: 'none',
          fontFamily: 'DM Sans, sans-serif',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Balance</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-teal)' }}>₹{balanceFormatted}</span>
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}
        >
          Outstanding amount from payment tracking.
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            width: '8px',
            height: '8px',
            background: 'var(--bg-tooltip)',
            border: '1px solid var(--border-card)',
            transform: 'translateX(-50%) rotate(45deg)',
            ...(pos.place === 'above'
              ? { bottom: '-5px', borderTop: 'none', borderLeft: 'none' }
              : { top: '-5px', borderBottom: 'none', borderRight: 'none' }),
          }}
          aria-hidden
        />
      </div>
    )
  }, [hasBalanceTooltip, showCard, pos, balanceFormatted])

  useEffect(() => {
    if (!hasBalanceTooltip || !showCard) {
      setPos(null)
      return
    }

    const compute = () => {
      const el = anchorRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      let left = r.left + r.width / 2
      const half = tooltipW / 2
      left = Math.max(gutter + half, Math.min(window.innerWidth - gutter - half, left))
      const place: 'above' | 'below' = r.top >= tooltipHApprox + 16 ? 'above' : 'below'
      const top =
        place === 'above'
          ? Math.max(gutter, r.top - 8 - tooltipHApprox)
          : Math.min(window.innerHeight - gutter - tooltipHApprox, r.bottom + 8)
      setPos({ left, top, place })
    }

    compute()
    let raf = 0
    const scheduleReposition = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        compute()
      })
    }
    window.addEventListener('scroll', scheduleReposition, { capture: true, passive: true })
    window.addEventListener('resize', scheduleReposition)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', scheduleReposition, true)
      window.removeEventListener('resize', scheduleReposition)
    }
  }, [hasBalanceTooltip, showCard, paymentStatus, balanceAmount])

  if (hasNoOrderValue || isEarlyOrLostStage) {
    return (
      <span
        className={`inline-flex items-center rounded-md font-medium border border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-muted)] ${
          compact ? 'px-1.5 py-0.5 text-[10px] lg:text-[11px]' : 'px-2 py-0.5 text-xs'
        }`}
      >
        N/A
      </span>
    )
  }

  if (!hasBalanceTooltip) {
    return <span className={`${pillClassName}`}>{String(paymentStatus).replace(/_/g, ' ')}</span>
  }

  return (
    <>
      <button
        type="button"
        ref={anchorRef}
        style={{
          position: 'relative',
          display: 'inline-flex',
          touchAction: 'manipulation',
          cursor: hoverCapable ? 'default' : 'pointer',
          border: 'none',
          margin: 0,
          padding: 0,
          background: 'transparent',
          font: 'inherit',
          textAlign: 'inherit',
          WebkitTapHighlightColor: 'transparent',
        }}
        onMouseEnter={() => hoverCapable && setMouseInside(true)}
        onMouseLeave={() => hoverCapable && setMouseInside(false)}
        onTouchStart={(e) => {
          if (!hoverCapable) e.stopPropagation()
        }}
        onClick={
          hoverCapable
            ? undefined
            : (e) => {
                e.preventDefault()
                e.stopPropagation()
                setTapOpen((v) => !v)
              }
        }
        aria-expanded={hoverCapable ? undefined : tapOpen}
        aria-label={hoverCapable ? 'Payment status, hover for balance' : 'Payment status, tap for balance'}
      >
        <span className={pillClassName}>{String(paymentStatus).replace(/_/g, ' ')}</span>
      </button>
      {tooltipNode ? createPortal(tooltipNode, document.body) : null}
    </>
  )
}

// Segment pill: distinct color per segment for quick recognition
const getSegmentPillClasses = (type: string): string => {
  switch (type) {
    case 'RESIDENTIAL_SUBSIDY':
      return 'border border-red-400/35 bg-[color:color-mix(in srgb,var(--accent-red) 12%, var(--bg-card))] text-[color:var(--text-primary)]'
    case 'RESIDENTIAL_NON_SUBSIDY':
      return 'border border-sky-400/35 bg-[color:color-mix(in srgb,var(--accent-blue) 12%, var(--bg-card))] text-[color:var(--text-primary)]'
    case 'COMMERCIAL_INDUSTRIAL':
      return 'border border-emerald-400/35 bg-[color:color-mix(in srgb,var(--accent-green) 12%, var(--bg-card))] text-[color:var(--text-primary)]'
    default:
      return 'border border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)]'
  }
}

/** Full label + short label for laptop-width tables (tooltip keeps full text). */
function projectSegmentLabels(type: string): { full: string; compact: string } {
  let full: string
  switch (type) {
    case 'RESIDENTIAL_SUBSIDY':
      full = 'Residential Subsidy'
      break
    case 'RESIDENTIAL_NON_SUBSIDY':
      full = 'Residential - Non Subsidy'
      break
    case 'COMMERCIAL_INDUSTRIAL':
      full = 'Commercial Industrial'
      break
    default:
      full = String(type).replace(/_/g, ' ')
  }
  const compact =
    type === 'RESIDENTIAL_SUBSIDY'
      ? 'Res. subsidy'
      : type === 'RESIDENTIAL_NON_SUBSIDY'
        ? 'Res. non-subs.'
        : type === 'COMMERCIAL_INDUSTRIAL'
          ? 'Commercial'
          : full
  return { full, compact }
}

/** Visible data columns for thead/tbody (matches Tailwind lg/md/sm on table cells). Used for empty-state colspan below lg. */
function getProjectsTableVisibleColumnCount(viewportWidth: number): number {
  if (viewportWidth >= 1024) return 9
  if (viewportWidth >= 768) return 8
  if (viewportWidth >= 640) return 7
  return 6
}

const Projects = () => {
  const shell = (children: ReactNode) => (
    <div className="zenith-root zenith-animated-bg w-full max-w-full min-w-0 min-h-[calc(100dvh-5rem)] min-h-[calc(100vh-5rem)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(0.35rem,env(safe-area-inset-top,0px))] [-webkit-tap-highlight-color:transparent]">
      <div className="zenith-exec-main mx-auto w-full max-w-full min-w-0 px-3 sm:px-5 pb-10">{children}</div>
    </div>
  )

  const { user, hasRole } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlInit = getInitialFiltersFromUrl()
  const initialSearchFromUrl = getInitialSearchFromUrl()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState(initialSearchFromUrl)
  const debouncedSearch = useDebounce(searchInput, 500) // 500ms debounce
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [pendingExportType, setPendingExportType] = useState<'excel' | 'csv' | null>(null)
  // Always start collapsed (including dashboard tile links with URL params) so mobile users see results first; use "Show Filters" to expand.
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  const [projectsTableVisibleCols, setProjectsTableVisibleCols] = useState(() =>
    typeof window !== 'undefined' ? getProjectsTableVisibleColumnCount(window.innerWidth) : 9,
  )
  useEffect(() => {
    const update = () => setProjectsTableVisibleCols(getProjectsTableVisibleColumnCount(window.innerWidth))
    update()
    window.addEventListener('resize', update)
    const mq640 = window.matchMedia('(min-width: 640px)')
    const mq768 = window.matchMedia('(min-width: 768px)')
    const mq1024 = window.matchMedia('(min-width: 1024px)')
    mq640.addEventListener('change', update)
    mq768.addEventListener('change', update)
    mq1024.addEventListener('change', update)
    return () => {
      window.removeEventListener('resize', update)
      mq640.removeEventListener('change', update)
      mq768.removeEventListener('change', update)
      mq1024.removeEventListener('change', update)
    }
  }, [])

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
    type: (urlInit?.type ?? []) as string[],
    projectServiceType: [] as string[],
    salespersonId: (urlInit?.salespersonId ?? []) as string[],
    leadSource: (urlInit?.leadSource ?? []) as string[],
    supportTicketStatus: [] as string[],
    paymentStatus: (urlInit?.paymentStatus ?? []) as string[],
    hasDocuments: false,
    availingLoan: urlInit?.availingLoan ?? false,
    peBucket: (urlInit?.peBucket ?? null) as PeBucketParam | null,
    financingBank: (urlInit?.financingBank ?? []) as string[],
    zenithClosedFrom: urlInit?.zenithClosedFrom ?? null,
    zenithClosedTo: urlInit?.zenithClosedTo ?? null,
    salespersonUnassigned: urlInit?.salespersonUnassigned ?? false,
    leadSourceIsNull: urlInit?.leadSourceIsNull ?? false,
    zenithSlice: urlInit?.zenithSlice ?? null,
    zenithFyProfit: urlInit?.zenithFyProfit ?? false,
    panelBrand: urlInit?.panelBrand ?? '',
    inverterBrand: urlInit?.inverterBrand ?? '',
    lifecycleSpecsComplete: urlInit?.lifecycleSpecsComplete ?? false,
    search: '',
    sortBy: '',
    sortOrder: 'desc',
  }))

  // Defer projects query until URL/sessionStorage hydration completes (avoids double fetch on dashboard→projects)
  const [filtersReady, setFiltersReady] = useState(!!urlInit || initialSearchFromUrl !== '')
  const appliedFromUrlRef = useRef(!!urlInit || initialSearchFromUrl !== '')

  // Apply URL params (from Dashboard tile click) or restore from sessionStorage
  useLayoutEffect(() => {
    const statusFromUrl = searchParams.getAll('status')
    const paymentStatusFromUrl = searchParams.getAll('paymentStatus')
    const availingLoanFromUrl = searchParams.get('availingLoan') === 'true'
    const fyFromUrl = searchParams.getAll('fy')
    const quarterFromUrl = searchParams.getAll('quarter')
    const monthFromUrl = searchParams.getAll('month')
    const typeFromUrl = searchParams.getAll('type')
    const leadSourceFromUrl = searchParams.getAll('leadSource')
    const salespersonIdFromUrl = searchParams.getAll('salespersonId')
    const financingBankFromUrl = searchParams.getAll('financingBank')
    const zenithClosedFromUrl = searchParams.get('zenithClosedFrom')
    const zenithClosedToUrl = searchParams.get('zenithClosedTo')
    const salespersonUnassignedFromUrl = searchParams.get('salespersonUnassigned') === 'true'
    const leadSourceIsNullFromUrl = searchParams.get('leadSourceIsNull') === 'true'
    const rawZenithSliceUrl = searchParams.get('zenithSlice')
    const zenithSliceFromUrl =
      rawZenithSliceUrl === 'revenue' || rawZenithSliceUrl === 'pipeline' ? rawZenithSliceUrl : null
    const zenithFyProfitFromUrl = searchParams.get('zenithFyProfit') === 'true'
    const panelBrandFromUrl = searchParams.get('panelBrand')?.trim() ?? ''
    const inverterBrandFromUrl = searchParams.get('inverterBrand')?.trim() ?? ''
    const lifecycleSpecsFromUrl = searchParams.get('lifecycleSpecsComplete') === 'true'
    const lifecycleSpecsActiveFromUrl =
      lifecycleSpecsFromUrl || panelBrandFromUrl !== '' || inverterBrandFromUrl !== ''
    const searchFromUrlTrimmed = searchParams.get('search')?.trim() ?? ''
    const hasSearchParam = searchFromUrlTrimmed.length > 0
    const hasStatusParams = statusFromUrl.length > 0
    const hasPaymentParams = paymentStatusFromUrl.length > 0
    const hasDateParams = fyFromUrl.length > 0 || quarterFromUrl.length > 0 || monthFromUrl.length > 0
    const peBucketValid = parsePeBucketFromSearch(searchParams.toString())
    const validTypeFromUrl = typeFromUrl.filter((t) => Object.values(ProjectType).includes(t as ProjectType))
    const validLeadFromUrl = leadSourceFromUrl.filter((ls) => Object.values(LeadSource).includes(ls as LeadSource))
    const validFinancingFromUrl = financingBankFromUrl.map((b) => b.trim()).filter(Boolean)
    const hasZenithClosedParams =
      (zenithClosedFromUrl != null && zenithClosedFromUrl.trim() !== '') ||
      (zenithClosedToUrl != null && zenithClosedToUrl.trim() !== '')
    const hasExtendedTileParams =
      validTypeFromUrl.length > 0 ||
      validLeadFromUrl.length > 0 ||
      salespersonIdFromUrl.length > 0 ||
      validFinancingFromUrl.length > 0 ||
      hasZenithClosedParams ||
      salespersonUnassignedFromUrl ||
      leadSourceIsNullFromUrl ||
      zenithSliceFromUrl != null ||
      zenithFyProfitFromUrl ||
      panelBrandFromUrl !== '' ||
      inverterBrandFromUrl !== '' ||
      lifecycleSpecsFromUrl
    // Wait for statusOptions when we have status in URL (needed to validate status values)
    const canResolveStatus = !hasStatusParams || statusOptions.length > 0
    const validStatus = hasStatusParams && canResolveStatus
      ? statusFromUrl.filter((v) => statusOptions.some((opt) => opt.value === v))
      : []
    const validPayment = hasPaymentParams ? paymentStatusFromUrl.filter((v) => (VALID_PAYMENT_STATUS_VALUES as readonly string[]).includes(v)) : []
    if (
      canResolveStatus &&
      (peBucketValid != null ||
        validStatus.length > 0 ||
        validPayment.length > 0 ||
        availingLoanFromUrl ||
        hasDateParams ||
        hasExtendedTileParams ||
        hasSearchParam)
    ) {
      appliedFromUrlRef.current = true
      setFilters((prev) => ({
        ...prev,
        peBucket: peBucketValid,
        ...(validStatus.length > 0
          ? { status: validStatus }
          : peBucketValid != null
            ? { status: [] as string[] }
            : {}),
        ...(validPayment.length > 0 && { paymentStatus: validPayment }),
        ...(availingLoanFromUrl && { availingLoan: true }),
        ...(validTypeFromUrl.length > 0 && { type: validTypeFromUrl }),
        ...(leadSourceIsNullFromUrl
          ? { leadSourceIsNull: true, leadSource: [] as string[] }
          : validLeadFromUrl.length > 0
            ? { leadSource: validLeadFromUrl, leadSourceIsNull: false }
            : {}),
        ...(salespersonUnassignedFromUrl
          ? { salespersonUnassigned: true, salespersonId: [] as string[] }
          : salespersonIdFromUrl.length > 0
            ? {
                salespersonId: salespersonIdFromUrl.map((id) => id.trim()).filter(Boolean),
                salespersonUnassigned: false,
              }
            : {}),
        ...(validFinancingFromUrl.length > 0 && { financingBank: validFinancingFromUrl }),
        ...(zenithClosedFromUrl?.trim() && { zenithClosedFrom: zenithClosedFromUrl.trim() }),
        ...(zenithClosedToUrl?.trim() && { zenithClosedTo: zenithClosedToUrl.trim() }),
        zenithSlice: zenithSliceFromUrl,
        zenithFyProfit: zenithFyProfitFromUrl,
        panelBrand: panelBrandFromUrl,
        inverterBrand: inverterBrandFromUrl,
        lifecycleSpecsComplete: lifecycleSpecsActiveFromUrl,
      }))
      if (fyFromUrl.length > 0) setSelectedFYs(fyFromUrl)
      if (quarterFromUrl.length > 0) setSelectedQuarters(quarterFromUrl)
      if (monthFromUrl.length > 0) setSelectedMonths(monthFromUrl)
      if (hasSearchParam) setSearchInput(searchFromUrlTrimmed)
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
  // Skip when viewing a Proposal Engine bucket list (API uses peBucket, not stage filter)
  useEffect(() => {
    if (appliedFromUrlRef.current) return
    if (filters.peBucket) return
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
    setSessionStorageItem(
      PROJECTS_FILTERS_STORAGE_KEY,
      JSON.stringify({
        filters,
        page,
        searchInput,
        selectedFYs,
        selectedQuarters,
        selectedMonths,
      }),
    )
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
    filters.peBucket,
    filters.financingBank,
    filters.zenithClosedFrom,
    filters.zenithClosedTo,
    filters.salespersonUnassigned,
    filters.leadSourceIsNull,
    filters.zenithSlice,
    filters.zenithFyProfit,
    filters.panelBrand,
    filters.inverterBrand,
    filters.lifecycleSpecsComplete,
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
      peBucket: null,
      financingBank: [],
      zenithClosedFrom: null,
      zenithClosedTo: null,
      salespersonUnassigned: false,
      leadSourceIsNull: false,
      zenithSlice: null,
      zenithFyProfit: false,
      panelBrand: '',
      inverterBrand: '',
      lifecycleSpecsComplete: false,
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
      (filters.availingLoan ? 1 : 0) +
      (filters.peBucket ? 1 : 0) +
      (filters.financingBank.length > 0 ? 1 : 0) +
      (filters.zenithClosedFrom || filters.zenithClosedTo ? 1 : 0) +
      (filters.salespersonUnassigned ? 1 : 0) +
      (filters.leadSourceIsNull ? 1 : 0) +
      (filters.zenithSlice ? 1 : 0) +
      (filters.zenithFyProfit ? 1 : 0) +
      (filters.panelBrand || filters.inverterBrand || filters.lifecycleSpecsComplete ? 1 : 0)
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
    filters.peBucket,
    filters.financingBank,
    filters.zenithClosedFrom,
    filters.zenithClosedTo,
    filters.salespersonUnassigned,
    filters.leadSourceIsNull,
    filters.zenithSlice,
    filters.zenithFyProfit,
    filters.panelBrand,
    filters.inverterBrand,
    filters.lifecycleSpecsComplete,
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
    searchParams.has('month') ||
    searchParams.has('peBucket') ||
    searchParams.getAll('type').length > 0 ||
    searchParams.getAll('leadSource').length > 0 ||
    searchParams.getAll('salespersonId').length > 0 ||
    searchParams.getAll('financingBank').length > 0 ||
    searchParams.has('zenithClosedFrom') ||
    searchParams.has('zenithClosedTo') ||
    searchParams.get('salespersonUnassigned') === 'true' ||
    searchParams.get('leadSourceIsNull') === 'true' ||
    searchParams.get('zenithSlice') === 'revenue' ||
    searchParams.get('zenithSlice') === 'pipeline' ||
    searchParams.get('zenithFyProfit') === 'true' ||
    searchParams.has('panelBrand') ||
    searchParams.has('inverterBrand') ||
    searchParams.get('lifecycleSpecsComplete') === 'true'

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
      if (filters.peBucket) params.append('peBucket', filters.peBucket)
      filters.financingBank.forEach((v) => params.append('financingBank', v))
      if (filters.zenithClosedFrom) params.append('zenithClosedFrom', filters.zenithClosedFrom)
      if (filters.zenithClosedTo) params.append('zenithClosedTo', filters.zenithClosedTo)
      if (filters.salespersonUnassigned) params.append('salespersonUnassigned', 'true')
      if (filters.leadSourceIsNull) params.append('leadSourceIsNull', 'true')
      if (filters.zenithSlice) params.append('zenithSlice', filters.zenithSlice)
      if (filters.zenithFyProfit) params.append('zenithFyProfit', 'true')
      if (filters.lifecycleSpecsComplete) params.append('lifecycleSpecsComplete', 'true')
      if (filters.panelBrand) params.append('panelBrand', filters.panelBrand)
      if (filters.inverterBrand) params.append('inverterBrand', filters.inverterBrand)
      // Deal Health Score sorts server-side (same /api/projects endpoint) so it works across the full dataset.
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

  // Proposal Engine status per project (Draft / Proposal Ready)
  const { data: proposalEngineProjects } = useQuery({
    queryKey: ['proposal-engine-projects'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/api/proposal-engine/projects?limit=500')
        return res.data as Array<{ id: string; peStatus?: string }>
      } catch (error) {
        if (import.meta.env.DEV) {
          // Non-fatal: lack of access or network issues just mean no PE status badges
          console.warn('Unable to load Proposal Engine project status', error)
        }
        return [] as Array<{ id: string; peStatus?: string }>
      }
    },
    enabled: !!user, // only when logged in
    staleTime: 60_000,
  })

  const peStatusByProjectId = useMemo(() => {
    const map = new Map<string, 'not-started' | 'draft' | 'proposal-ready'>()
    ;(proposalEngineProjects ?? []).forEach((p) => {
      if (!p || typeof p.id !== 'string') return
      if (
        p.peStatus === 'not-started' ||
        p.peStatus === 'draft' ||
        p.peStatus === 'proposal-ready'
      ) {
        map.set(p.id, p.peStatus)
      }
    })
    return map
  }, [proposalEngineProjects])

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
      filters.financingBank.forEach((v) => params.append('financingBank', v))
      if (filters.zenithClosedFrom) params.append('zenithClosedFrom', filters.zenithClosedFrom)
      if (filters.zenithClosedTo) params.append('zenithClosedTo', filters.zenithClosedTo)
      if (filters.salespersonUnassigned) params.append('salespersonUnassigned', 'true')
      if (filters.leadSourceIsNull) params.append('leadSourceIsNull', 'true')
      if (filters.zenithSlice) params.append('zenithSlice', filters.zenithSlice)
      if (filters.zenithFyProfit) params.append('zenithFyProfit', 'true')
      if (filters.lifecycleSpecsComplete) params.append('lifecycleSpecsComplete', 'true')
      if (filters.panelBrand) params.append('panelBrand', filters.panelBrand)
      if (filters.inverterBrand) params.append('inverterBrand', filters.inverterBrand)
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
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('Export error:', error)
      toast.error(getFriendlyApiErrorMessage(error))
    } finally {
      setShowExportConfirm(false)
      setPendingExportType(null)
    }
  }

  const cancelExport = () => {
    setShowExportConfirm(false)
    setPendingExportType(null)
  }

  const displayProjects = useMemo(() => {
    return (data?.projects ?? []) as Project[]
  }, [data?.projects])

  const handleProjectsColumnSort = (sortKey: string) => {
    setFilters((prev) => {
      if (prev.sortBy === sortKey) {
        return { ...prev, sortOrder: prev.sortOrder === 'desc' ? 'asc' : 'desc' }
      }
      return {
        ...prev,
        sortBy: sortKey,
        sortOrder: defaultOrderForProjectsSortKey(sortKey),
      }
    })
    setPage(1)
  }

  const projectHeaderAriaSort = (): 'ascending' | 'descending' | 'none' => {
    if (filters.sortBy === 'customerName') {
      return filters.sortOrder === 'asc' ? 'ascending' : 'descending'
    }
    return 'none'
  }

  const extraSortSelectValue = filters.sortBy || ''

  /** Same ⇕ icon in every column; reserved box size so narrow cols never clip or overlap the label. */
  function ProjectsSortGlyph({ sortKey }: { sortKey: string }) {
    const active = filters.sortBy === sortKey
    const box = active
      ? 'border-[color:var(--accent-gold-border)] bg-[color:color-mix(in srgb,var(--accent-gold) 18%, transparent)] text-[color:var(--accent-gold)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
      : 'border-[color:var(--border-default)] bg-[color:var(--bg-surface)] text-[color:var(--text-muted)] group-hover:border-[color:var(--accent-gold-border)] group-hover:bg-[color:var(--bg-card-hover)] group-hover:text-[color:var(--accent-gold)]'
    return (
      <span
        className={`projects-sort-glyph-box inline-flex size-6 shrink-0 select-none items-center justify-center rounded border transition-colors ${box}`}
        aria-hidden
      >
        <svg
          className="block size-[14px] shrink-0 text-current opacity-95"
          viewBox="0 0 24 24"
          width={14}
          height={14}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          stroke="currentColor"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          overflow="visible"
        >
          <path d="M8 10l4-4 4 4M8 14l4 4 4-4" />
        </svg>
      </span>
    )
  }

  /** No truncation on labels — wrap to extra lines if needed; glyph stays fixed at end of row. */
  const sortBtnHeader =
    'group flex min-h-[2rem] w-full min-w-0 flex-nowrap items-center gap-2 overflow-visible rounded-md px-1.5 py-1 text-left transition-colors hover:bg-[color:var(--bg-table-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold-border)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--bg-page)] sm:min-h-[2.5rem] sm:gap-2 sm:px-2 sm:py-1.5'
  const sortLabelLeft =
    'min-w-0 flex-1 basis-0 whitespace-normal break-words text-left text-[11px] font-bold uppercase leading-snug tracking-wide text-[color:var(--text-secondary)] sm:text-xs sm:leading-tight sm:tracking-wider'
  if (!filtersReady || isLoading) {
    return shell(
      <div className="max-w-full min-w-0 overflow-x-hidden px-0 py-4 sm:py-6">
        <div className="mb-4 h-8 w-48 animate-pulse rounded-lg bg-[color:var(--bg-ticker)]" />
        <div className="h-64 animate-pulse rounded-2xl bg-[color:var(--bg-card)] ring-1 ring-[color:var(--border-default)]" />
      </div>
    )
  }

  return shell(
    <>
      <header className="sticky top-0 z-30 mb-4 border-b border-[color:var(--border-default)] bg-[color:color-mix(in srgb,var(--bg-surface) 94%, transparent)] pb-3 pt-1 backdrop-blur-xl sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] shadow-inner">
              <FaBriefcase className="h-5 w-5 text-[color:var(--accent-gold)]" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="zenith-display text-xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-2xl">Projects</h1>
              <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">Manage and track all your solar projects</p>
            </div>
          </div>

          {(user?.role === 'ADMIN' || user?.role === 'SALES') ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Link
                to="/projects/new"
                className="inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-xl bg-[color:var(--accent-gold)] px-4 py-2.5 text-sm font-bold text-[color:var(--text-inverse)] shadow-lg transition-all hover:opacity-95"
              >
                + New Project
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      <div className="mobile-paint-fix max-w-full min-w-0 overflow-x-hidden px-0 pb-4 sm:pb-6">
      <div className="mb-3 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-4">
        <div className="space-y-2 sm:space-y-3">
          {/* Row 1: Search Bar + Show/Hide Filters toggle (and Clear All on larger screens) */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="text"
              placeholder="Search across all projects..."
              className="zenith-native-filter-input min-h-[40px] w-full rounded-xl px-3 py-2 text-sm placeholder:text-[color:var(--text-placeholder)] transition-all focus:border-[color:var(--accent-gold-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-gold-muted)] sm:flex-1"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
            />
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowMoreFilters((v) => !v)}
                className="flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-3 py-2 text-sm font-semibold text-[color:var(--text-primary)] shadow-sm transition-all hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)]"
                aria-expanded={showMoreFilters}
                aria-controls="projects-more-filters"
                title="Show or hide additional filters"
              >
                <span className="truncate">
                  {showMoreFilters ? 'Hide Filters' : 'Show Filters'}
                  {!showMoreFilters && moreFiltersActiveCount > 0 ? ` (${moreFiltersActiveCount})` : ''}
                </span>
                <svg
                  className={`h-4 w-4 text-[color:var(--text-muted)] transition-transform ${showMoreFilters ? 'rotate-180' : ''}`}
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
                className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2 text-sm font-semibold text-[color:var(--text-primary)] shadow-sm transition-all hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)] sm:flex-none"
                title="Clear search and all filters"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Filter By + Sort By + export — hidden until Show Filters */}
          <div
            id="projects-more-filters"
            className={`${showMoreFilters ? 'overflow-visible' : 'overflow-hidden'} transition-all duration-300 ease-in-out ${
              showMoreFilters ? 'max-h-[1400px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className={`${showMoreFilters ? 'pointer-events-auto' : 'pointer-events-none'} pt-2 space-y-2 sm:space-y-3`}>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Filter By</label>
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
                    variant="zenith"
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
                      variant="zenith"
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
                  variant="zenith"
                />
                <MultiSelect
                  options={typeOptions}
                  selectedValues={filters.type}
                  onChange={(values) => setFilters({ ...filters, type: values })}
                  placeholder="Segments"
                  compact
                  variant="zenith"
                />
                <MultiSelect
                  options={projectServiceTypeOptions}
                  selectedValues={filters.projectServiceType}
                  onChange={(values) => setFilters({ ...filters, projectServiceType: values })}
                  placeholder="Project Types"
                  compact
                  variant="zenith"
                />
                <MultiSelect
                  options={supportTicketStatusOptions}
                  selectedValues={filters.supportTicketStatus}
                  onChange={(values) => setFilters({ ...filters, supportTicketStatus: values })}
                  placeholder="Ticket Statuses"
                  compact
                  variant="zenith"
                />
                {paymentStatusOptions.length > 0 && (
                  <MultiSelect
                    options={paymentStatusOptions}
                    selectedValues={filters.paymentStatus}
                    onChange={(values) => setFilters({ ...filters, paymentStatus: values })}
                    placeholder="Payment Statuses"
                    compact
                    variant="zenith"
                  />
                )}
                <MultiSelect
                  options={leadSourceOptions}
                  selectedValues={filters.leadSource}
                  onChange={(values) => setFilters({ ...filters, leadSource: values })}
                  placeholder="Lead Sources"
                  compact
                  variant="zenith"
                />
              </div>

              {/* Has Artifacts checkbox */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.hasDocuments}
                    onChange={(e) => setFilters(prev => ({ ...prev, hasDocuments: e.target.checked }))}
                    className="h-4 w-4 rounded border-[color:var(--border-input)] bg-[color:var(--bg-input)] accent-[color:var(--accent-gold)] focus:ring-[color:var(--accent-gold-muted)]"
                  />
                  <span className="text-sm text-[color:var(--text-primary)]">Has Artifacts</span>
                </label>
                <span className="text-xs text-[color:var(--text-secondary)]">(only projects with at least one attachment)</span>
              </div>

              {/* Availing Loan checkbox */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.availingLoan}
                    onChange={(e) => setFilters(prev => ({ ...prev, availingLoan: e.target.checked }))}
                    className="h-4 w-4 rounded border-[color:var(--border-input)] bg-[color:var(--bg-input)] accent-[color:var(--accent-gold)] focus:ring-[color:var(--accent-gold-muted)]"
                  />
                  <span className="text-sm text-[color:var(--text-primary)]">Availing Loan</span>
                </label>
                <span className="text-xs text-[color:var(--text-secondary)]">(only projects where Availing Loan/Financing is Yes)</span>
              </div>

              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Sort By</label>
              <div className="max-w-2xl">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
                  <ZenithSingleSelect
                    value={extraSortSelectValue}
                    onChange={(v) => {
                      setPage(1)
                      if (!v) {
                        setFilters((prev) => ({ ...prev, sortBy: '', sortOrder: 'desc' }))
                        return
                      }
                      setFilters((prev) => ({
                        ...prev,
                        sortBy: v,
                        sortOrder: defaultOrderForProjectsSortKey(v),
                      }))
                    }}
                    placeholder="— Default (confirmation date, newest first) —"
                    options={[
                      { value: 'customerName', label: 'Project (customer name)' },
                      { value: 'dealHealthScore', label: 'Deal health score' },
                      { value: 'projectType', label: 'Segment' },
                      { value: 'projectStatus', label: 'Stage' },
                      { value: 'systemCapacity', label: 'Capacity' },
                      { value: 'projectCost', label: 'Order value' },
                      { value: 'paymentStatus', label: 'Payment status' },
                      { value: 'leadSource', label: 'Lead source' },
                      { value: 'confirmationDate', label: 'Confirmation date' },
                      { value: 'profitability', label: 'Profitability' },
                      { value: 'creationDate', label: 'Creation date' },
                      { value: 'slNo', label: 'Project number (#)' },
                    ]}
                    allowEmpty
                    className="w-full min-w-0 flex-1 sm:max-w-md"
                  />
                  <div
                    className="flex shrink-0 gap-1 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] p-0.5 shadow-inner ring-1 ring-[color:var(--border-default)]"
                    role="group"
                    aria-label="Sort direction"
                  >
                    <button
                      type="button"
                      title="Ascending: A→Z, low→high, oldest→newest (depends on column). With default sort, uses confirmation date."
                      onClick={() => {
                        setPage(1)
                        setFilters((prev) => {
                          const by = prev.sortBy || 'confirmationDate'
                          return { ...prev, sortBy: by, sortOrder: 'asc' }
                        })
                      }}
                      className={`rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
                        filters.sortBy && filters.sortOrder === 'asc'
                          ? 'bg-[color:var(--bg-card-hover)] text-[color:var(--text-primary)] shadow-sm ring-1 ring-[color:var(--accent-gold-border)]'
                          : 'text-[color:var(--text-muted)] hover:bg-[color:var(--bg-table-hover)] hover:text-[color:var(--text-primary)]'
                      }`}
                    >
                      Ascending
                    </button>
                    <button
                      type="button"
                      title="Descending: Z→A, high→low, newest→oldest (depends on column). With default sort, uses confirmation date."
                      onClick={() => {
                        setPage(1)
                        setFilters((prev) => {
                          const by = prev.sortBy || 'confirmationDate'
                          return { ...prev, sortBy: by, sortOrder: 'desc' }
                        })
                      }}
                      className={`rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
                        filters.sortBy && filters.sortOrder === 'desc'
                          ? 'bg-[color:var(--bg-card-hover)] text-[color:var(--text-primary)] shadow-sm ring-1 ring-[color:var(--accent-gold-border)]'
                          : 'text-[color:var(--text-muted)] hover:bg-[color:var(--bg-table-hover)] hover:text-[color:var(--text-primary)]'
                      }`}
                    >
                      Descending
                    </button>
                  </div>
                </div>
              </div>

              {/* Export buttons - Only visible to Admin users */}
              {hasRole([UserRole.ADMIN]) && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExportClick('excel')}
                    className="flex items-center gap-2 rounded-xl bg-[color:var(--accent-gold)] px-4 py-2 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-[var(--shadow-card)] transition-all hover:opacity-95 active:scale-[0.99]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export to Excel
                  </button>
                  <button
                    onClick={() => handleExportClick('csv')}
                    className="flex items-center gap-2 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-input)] px-4 py-2 text-sm font-extrabold text-[color:var(--text-primary)] shadow-md transition-all hover:bg-[color:var(--bg-card-hover)] hover:border-[color:var(--accent-gold-border)] active:scale-[0.99]"
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
                  className="min-h-[40px] w-full rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2 text-sm font-semibold text-[color:var(--text-primary)] transition-colors hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)]"
                  title="Clear search and all filters"
                >
                  Clear All
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Export Confirmation: unified ErrorModal */}
      <ErrorModal
        open={showExportConfirm}
        onClose={cancelExport}
        type="warning"
        message={`The Data that is present in the CRM System is the exclusive property of Rayenna Energy Private Limited. Unauthorised Export of any data is prohibited and will be subject to disciplinary measures including and not limited to termination and legal procedures.

By exporting this data, you are confirming that you are authorised to access this data/info and have written approvals from the management.

Do you want to continue?`}
        actions={[
          { label: 'CANCEL', variant: 'ghost', onClick: cancelExport },
          { label: 'YES', variant: 'primary', onClick: confirmExport },
        ]}
      />

      {/* Results summary */}
      <div className="mb-2 mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--text-secondary)]">
          <span className="font-semibold text-[color:var(--text-primary)]">
            Showing {displayProjects.length} of {data?.pagination?.total ?? displayProjects.length}
          </span>
          {(Boolean(filters.search) || moreFiltersActiveCount > 0) && (
            <span className="inline-flex items-center rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--text-secondary)]">
              {moreFiltersActiveCount + (filters.search ? 1 : 0)} active
            </span>
          )}
        </div>
        <div className="text-xs text-[color:var(--text-muted)]">
          <span className="hidden sm:inline">Tip: Shift + scroll to move horizontally</span>
          <span className="sm:hidden">Tip: swipe left/right on the table</span>
        </div>
      </div>

      {/* Projects table — DH = deal health badge column; uniform sort controls; fixed col widths (rem) + horizontal scroll when viewport is narrow. */}
      <div className="mobile-paint-anchor w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] [-webkit-overflow-scrolling:touch]">
        <style>
          {`
            /*
             * Chrome/Edge do not reliably honor visibility:collapse + width:0 on <col> when sibling cells are display:none.
             * Below lg: drop colgroup from layout (display:none on col) and use table-layout:auto + width:max-content so only
             * visible th/td define columns — no ghost horizontal scroll. Desktop keeps fixed colgroup + 95rem total.
             */
            .projects-table-fit {
              table-layout: auto;
              width: max-content;
              min-width: 0;
              max-width: none;
            }
            .projects-table-fit col {
              display: none !important;
            }

            @media (min-width: 1024px) {
              .projects-table-fit {
                table-layout: fixed;
                width: var(--projects-table-total-width);
                min-width: var(--projects-table-total-width);
                max-width: var(--projects-table-total-width);
                --projects-table-total-width: 95rem;
              }
              .projects-table-fit col {
                display: table-column !important;
              }
              .projects-col--project { width: 16rem; }
              .projects-col--dh { width: 6rem; }
              .projects-col--segment { width: 11rem; }
              .projects-col--stage { width: 11rem; }
              .projects-col--capacity { width: 9rem; }
              .projects-col--order { width: 11rem; }
              .projects-col--payment { width: 10rem; }
              .projects-col--lead { width: 9rem; }
              .projects-col--confirm { width: 12rem; }

              .projects-table-fit thead tr:nth-child(2) th {
                overflow: visible;
                vertical-align: middle;
              }
              .projects-table-fit thead tr:nth-child(2) th:nth-child(2) { min-width: 5.5rem; }
              .projects-table-fit thead tr:nth-child(2) th:nth-child(3) { min-width: 10.5rem; }
              .projects-table-fit thead tr:nth-child(2) th:nth-child(4) { min-width: 8rem; }
              .projects-table-fit thead tr:nth-child(2) th:nth-child(5) { min-width: 8.5rem; }
              .projects-table-fit thead tr:nth-child(2) th:nth-child(6) { min-width: 10.5rem; }
              .projects-table-fit thead tr:nth-child(2) th:nth-child(7) { min-width: 9.5rem; }
              .projects-table-fit thead tr:nth-child(2) th:nth-child(8) { min-width: 8.5rem; }
              .projects-table-fit thead tr:nth-child(2) th:nth-child(9) { min-width: 11rem; }
              .projects-table-fit th:nth-child(2),
              .projects-table-fit td:nth-child(2) {
                min-width: 5.75rem;
              }
              .projects-table-fit th:nth-child(9),
              .projects-table-fit td:nth-child(9) {
                min-width: 9rem;
              }
            }
          `}
        </style>
          <table className="projects-table-fit text-sm leading-snug">
            <colgroup>
              <col className="projects-col--project" />
              <col className="projects-col--dh" />
              <col className="projects-col--segment" />
              <col className="projects-col--stage" />
              <col className="projects-col--capacity" />
              <col className="projects-col--order" />
              <col className="projects-col--payment" />
              <col className="projects-col--lead" />
              <col className="projects-col--confirm" />
            </colgroup>
            <thead>
              {/* Subtotals row - aligned above Capacity and Order Value columns */}
              <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)]">
                <th className="px-2 py-1.5 sm:px-2.5" scope="col" />
                <th className="px-2 py-1.5 sm:px-2.5" scope="col" />
                <th className="px-2 py-1.5 sm:px-2.5 hidden lg:table-cell" scope="col" />
                <th className="px-2 py-1.5 sm:px-2.5" scope="col" />
                <th className="px-2 py-1.5 text-right align-bottom min-w-0 sm:px-2.5" scope="col">
                  <div className="inline-block rounded-md border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-1.5 py-0.5 text-[10px] font-bold text-[color:var(--text-primary)] tabular-nums shadow-sm sm:px-2 sm:text-xs">
                    {(data?.totals?.capacitySum ?? 0) / 1000 > 0
                      ? `${((data?.totals?.capacitySum ?? 0) / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} MW`
                      : '—'}
                  </div>
                </th>
                <th className="px-2 py-1.5 text-right align-bottom min-w-0 sm:px-2.5" scope="col">
                  <div className="inline-block rounded-md border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-[color:var(--text-primary)] tabular-nums shadow-sm sm:px-2 sm:text-xs">
                    {(data?.totals?.costSum ?? 0) > 0
                      ? `₹${((data?.totals?.costSum ?? 0) / 1_000_000).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} M`
                      : '—'}
                  </div>
                </th>
                <th className="px-2 py-1.5 text-center align-bottom min-w-0 sm:px-2.5" scope="col">
                  <div className="inline-block rounded-md border border-sky-400/40 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold text-[color:var(--text-primary)] tabular-nums shadow-sm sm:px-2 sm:text-xs">
                    {(data?.totals?.balanceSum ?? 0) > 0
                      ? `₹${((data?.totals?.balanceSum ?? 0) / 1_000_000).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} M`
                      : '—'}
                  </div>
                </th>
                <th className="px-2 py-1.5 hidden md:table-cell sm:px-2.5" scope="col" />
                <th className="px-2 py-1.5 hidden sm:table-cell sm:px-2.5" scope="col" />
              </tr>
              <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--bg-surface)] shadow-sm">
                <th
                  scope="col"
                  className="px-2.5 py-2 align-middle sm:px-3 sm:py-2"
                  aria-sort={projectHeaderAriaSort()}
                >
                  <button
                    type="button"
                    className={sortBtnHeader}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleProjectsColumnSort('customerName')
                    }}
                  >
                    <span className={sortLabelLeft}>Project</span>
                    <ProjectsSortGlyph sortKey="customerName" />
                  </button>
                </th>
                <th
                  scope="col"
                  className="px-2.5 py-2 align-middle sm:px-3 sm:py-2"
                  aria-sort={
                    filters.sortBy === 'dealHealthScore'
                      ? filters.sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <button
                    type="button"
                    className={sortBtnHeader}
                    title="Deal health — click to sort"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleProjectsColumnSort('dealHealthScore')
                    }}
                  >
                    <span className={sortLabelLeft}>DH</span>
                    <ProjectsSortGlyph sortKey="dealHealthScore" />
                  </button>
                </th>
                <th
                  scope="col"
                  className="hidden px-2.5 py-2 align-middle lg:table-cell lg:px-3 lg:py-2"
                  aria-sort={
                    filters.sortBy === 'projectType'
                      ? filters.sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <button
                    type="button"
                    className={sortBtnHeader}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleProjectsColumnSort('projectType')
                    }}
                  >
                    <span className={sortLabelLeft}>Segment</span>
                    <ProjectsSortGlyph sortKey="projectType" />
                  </button>
                </th>
                <th
                  scope="col"
                  className="px-2.5 py-2 align-middle sm:px-3 sm:py-2"
                  aria-sort={
                    filters.sortBy === 'projectStatus'
                      ? filters.sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <button
                    type="button"
                    className={sortBtnHeader}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleProjectsColumnSort('projectStatus')
                    }}
                  >
                    <span className={sortLabelLeft}>Stage</span>
                    <ProjectsSortGlyph sortKey="projectStatus" />
                  </button>
                </th>
                <th
                  scope="col"
                  className="px-2.5 py-2 align-middle sm:px-3 sm:py-2"
                  aria-sort={
                    filters.sortBy === 'systemCapacity'
                      ? filters.sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <button
                    type="button"
                    className={sortBtnHeader}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleProjectsColumnSort('systemCapacity')
                    }}
                  >
                    <span className={sortLabelLeft}>Capacity</span>
                    <ProjectsSortGlyph sortKey="systemCapacity" />
                  </button>
                </th>
                <th
                  scope="col"
                  className="px-2.5 py-2 align-middle sm:px-3 sm:py-2"
                  aria-sort={
                    filters.sortBy === 'projectCost'
                      ? filters.sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <button
                    type="button"
                    className={sortBtnHeader}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleProjectsColumnSort('projectCost')
                    }}
                  >
                    <span className={sortLabelLeft}>Order value</span>
                    <ProjectsSortGlyph sortKey="projectCost" />
                  </button>
                </th>
                <th
                  scope="col"
                  className="px-2.5 py-2 align-middle sm:px-3 sm:py-2"
                  aria-sort={
                    filters.sortBy === 'paymentStatus'
                      ? filters.sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <button
                    type="button"
                    className={sortBtnHeader}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleProjectsColumnSort('paymentStatus')
                    }}
                  >
                    <span className={sortLabelLeft}>Payment</span>
                    <ProjectsSortGlyph sortKey="paymentStatus" />
                  </button>
                </th>
                <th
                  scope="col"
                  className="hidden px-2.5 py-2 align-middle md:table-cell md:px-3 md:py-2"
                  aria-sort={
                    filters.sortBy === 'leadSource'
                      ? filters.sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <button
                    type="button"
                    className={sortBtnHeader}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleProjectsColumnSort('leadSource')
                    }}
                  >
                    <span className={sortLabelLeft}>Lead source</span>
                    <ProjectsSortGlyph sortKey="leadSource" />
                  </button>
                </th>
                <th
                  scope="col"
                  className="hidden px-2.5 py-2 align-middle sm:table-cell sm:px-3 sm:py-2"
                  aria-sort={
                    filters.sortBy === 'confirmationDate'
                      ? filters.sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <button
                    type="button"
                    className={sortBtnHeader}
                    title="Sort by confirmation date"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleProjectsColumnSort('confirmationDate')
                    }}
                  >
                    <span className={sortLabelLeft}>Confirmation date</span>
                    <ProjectsSortGlyph sortKey="confirmationDate" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border-default)]">
              {displayProjects.map((project: Project) => {
                const financingBankLabel = getFinancingBankDisplayName(
                  project.financingBank,
                  project.financingBankOther,
                )
                return (
                <tr
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="group cursor-pointer transition-colors duration-150 ease-out odd:bg-[color:var(--bg-table-alt)] even:bg-[color:var(--bg-card)] hover:bg-[color:var(--bg-table-hover)]"
                >
                  <td className="min-w-0 px-2 py-2 sm:px-2.5 lg:py-1.5 lg:pl-2 lg:pr-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-[color:var(--text-primary)] transition-colors group-hover:text-[color:var(--accent-gold)] lg:truncate-none lg:line-clamp-2 lg:leading-snug lg:break-words">
                      #{project.slNo} · {project.customer?.customerName || 'Unknown Customer'}
                    </p>
                    <p className="mt-0.5 max-w-full truncate text-[11px] text-[color:var(--text-muted)] lg:text-xs">
                      {project.salesperson && (
                        <span style={{ color: getSalesTeamColor(project.salesperson.name, 0) }}>
                          {project.salesperson.name}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 ml-1.5">
                        {project._count && project._count.documents > 0 && (
                          <span className="text-[color:var(--accent-teal)]" title={`${project._count.documents} document(s)`}>
                            <FiPaperclip className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                          </span>
                        )}
                        {project.availingLoan === true && financingBankLabel && (
                          <FinancingBankPopoverIcon bankDisplayName={financingBankLabel} />
                        )}
                        {project.supportTickets && project.supportTickets.length > 0 && (
                          <span className="text-[color:var(--accent-gold)]" title="Open or In Progress ticket(s)">
                            <FaTicketAlt className="w-3.5 h-3.5 shrink-0" />
                          </span>
                        )}
                      </span>
                    </p>
                  </td>
                  <td className="px-1 py-2 text-center align-middle sm:px-1.5 lg:py-1.5">
                    <div className="flex justify-center">
                      <HealthBadge
                        project={project as unknown as Record<string, unknown>}
                        size="sm"
                        showLabel={false}
                      />
                    </div>
                  </td>
                  <td className="hidden min-w-0 px-2 py-2 sm:px-2.5 lg:py-1.5 lg:pl-2 lg:pr-2 lg:table-cell">
                    {(() => {
                      const seg = projectSegmentLabels(project.type)
                      return (
                        <span
                          title={seg.full}
                          className={`inline-flex max-w-full items-center truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight lg:text-[11px] ${getSegmentPillClasses(project.type)}`}
                        >
                          <span className="lg:hidden">{seg.full}</span>
                          <span className="hidden lg:inline">{seg.compact}</span>
                        </span>
                      )
                    })()}
                  </td>
                  <td className="min-w-0 px-2 py-2 sm:px-2.5 lg:py-1.5 lg:pl-2 lg:pr-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <span
                        title={project.projectStatus.replace(/_/g, ' ')}
                        className={`inline-flex max-w-[10rem] items-center truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight lg:max-w-[11rem] lg:text-[11px] ${projectStatusStagePillClass(project.projectStatus)}`}
                      >
                        {project.projectStatus.replace(/_/g, ' ')}
                      </span>
                      {peStatusByProjectId.get(project.id) === 'not-started' && (
                        <span className="inline-flex items-center rounded border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-1.5 py-0.5 text-[9px] font-semibold text-[color:var(--text-secondary)] lg:text-[10px]">
                          <span className="lg:hidden">Not Yet Created</span>
                          <span className="hidden lg:inline">Not created</span>
                        </span>
                      )}
                      {peStatusByProjectId.get(project.id) === 'draft' && (
                        <span className="inline-flex items-center rounded border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-1.5 py-0.5 text-[9px] font-semibold text-[color:var(--accent-gold)] lg:text-[10px]">
                          PE Draft
                        </span>
                      )}
                      {peStatusByProjectId.get(project.id) === 'proposal-ready' && (
                        <span className="inline-flex items-center rounded border border-emerald-400/35 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-[color:var(--accent-teal)] lg:text-[10px]">
                          PE Ready
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="min-w-0 py-2 pl-1.5 pr-2 text-right tabular-nums sm:px-2 lg:py-1.5">
                    <span className="text-xs font-bold text-[color:var(--accent-gold)] transition-colors group-hover:opacity-90 lg:text-[13px]">
                      {project.systemCapacity ? `${project.systemCapacity} kW` : '—'}
                    </span>
                  </td>
                  <td className="min-w-0 px-2 py-2 text-right tabular-nums sm:px-2.5 lg:py-1.5 lg:pl-2 lg:pr-2">
                    <span className="text-xs font-bold text-[color:var(--accent-teal)] transition-colors group-hover:opacity-90 lg:text-[13px]">
                      {project.projectCost ? `₹${project.projectCost.toLocaleString('en-IN')}` : '—'}
                    </span>
                  </td>
                  <td className="min-w-0 px-2 py-2 text-center sm:px-2.5 lg:py-1.5 lg:px-2">
                    <PaymentStatusBadge project={project} compact />
                  </td>
                  <td className="hidden min-w-0 px-2 py-2 pl-2 pr-2 text-center md:table-cell lg:py-1.5 lg:pl-2 lg:pr-2">
                    {project.leadSource === 'WEBSITE' && (
                      <span className="inline-flex max-w-full items-center truncate rounded border border-blue-400/35 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--accent-blue)] lg:text-[11px]">
                        Website
                      </span>
                    )}
                    {project.leadSource === 'REFERRAL' && (
                      <span className="inline-flex max-w-full items-center truncate rounded border border-emerald-400/35 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--accent-teal)] lg:text-[11px]">
                        Referral
                      </span>
                    )}
                    {project.leadSource === 'GOOGLE' && (
                      <span className="inline-flex max-w-full items-center truncate rounded border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--accent-gold)] lg:text-[11px]">
                        Google
                      </span>
                    )}
                    {project.leadSource === 'CHANNEL_PARTNER' && (
                      <span className="inline-flex max-w-full items-center truncate rounded border border-red-400/35 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--accent-red)] lg:text-[11px]">
                        <span className="lg:hidden">Channel Partner</span>
                        <span className="hidden lg:inline">Channel</span>
                      </span>
                    )}
                    {project.leadSource === 'DIGITAL_MARKETING' && (
                      <span className="inline-flex max-w-full items-center truncate rounded border border-violet-400/35 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--accent-purple)] lg:text-[11px]">
                        Digital Mktg
                      </span>
                    )}
                    {project.leadSource === 'SALES' && (
                      <span className="inline-flex max-w-full items-center truncate rounded border border-pink-400/35 bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--text-primary)] lg:text-[11px]">
                        Sales
                      </span>
                    )}
                    {project.leadSource === 'MANAGEMENT_CONNECT' && (
                      <span className="inline-flex max-w-full items-center truncate rounded border border-cyan-400/35 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--accent-teal)] lg:text-[11px]">
                        <span className="lg:hidden">Mgmt Connect</span>
                        <span className="hidden lg:inline">Mgmt</span>
                      </span>
                    )}
                    {project.leadSource === 'OTHER' && (
                      <span className="inline-flex max-w-full items-center truncate rounded border border-lime-400/35 bg-lime-500/10 px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--text-primary)] lg:text-[11px]">
                        Other
                      </span>
                    )}
                    {!project.leadSource && (
                      <span className="inline-block text-[11px] text-[color:var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="hidden min-w-0 whitespace-nowrap px-1 py-2 text-center tabular-nums sm:table-cell sm:px-1.5 lg:py-1.5 lg:pl-1 lg:pr-1.5">
                    <span className="inline-block text-[11px] font-medium text-[color:var(--text-secondary)] lg:text-xs">
                      {project.confirmationDate ? format(new Date(project.confirmationDate), 'dd MMM yy') : '—'}
                    </span>
                  </td>
                </tr>
                )
              })}
              {displayProjects.length === 0 && (
                <tr>
                  <td
                    colSpan={projectsTableVisibleCols}
                    className="px-6 py-14 text-center text-sm text-[color:var(--text-muted)]"
                  >
                    <div className="mx-auto flex max-w-md flex-col items-center">
                      <div className="mb-3 inline-flex size-11 items-center justify-center rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] text-[color:var(--text-secondary)] shadow-sm">
                        <FaBriefcase className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <p className="font-semibold text-[color:var(--text-primary)]">
                        No projects match your search and filters.
                      </p>
                      <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                        Try clearing filters, widening the date range, or changing the search text.
                      </p>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            clearAllFilters()
                          }}
                          className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2 text-sm font-bold text-[color:var(--text-primary)] shadow-sm transition-all hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)]"
                        >
                          Clear filters
                        </button>
                        {(user?.role === 'ADMIN' || user?.role === 'SALES') && (
                          <Link
                            to="/projects/new"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold)] px-4 py-2 text-sm font-bold text-[color:var(--text-inverse)] shadow-md transition-all hover:brightness-105"
                          >
                            + New Project
                          </Link>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>

      {data?.pagination && (
        <div className="mt-5 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] px-4 py-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:flex-row sm:px-5">
          <div className="text-sm text-[color:var(--text-secondary)]">
            Showing page {data.pagination.page} of {data.pagination.pages} ({data.pagination.total} total)
          </div>
          {data.pagination.pages > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2 text-sm font-extrabold text-[color:var(--text-primary)] shadow-sm transition-all hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
                disabled={page >= data.pagination.pages}
                className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2 text-sm font-extrabold text-[color:var(--text-primary)] shadow-sm transition-all hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-card-hover)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Legend: 3 icons + 3 subtotals — single row on laptop, wrap neatly on smaller */}
      <div className="mt-6 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)] sm:p-5">
        <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-secondary)] sm:text-xs">
          <span className="h-1 w-6 rounded-full bg-gradient-to-r from-[color:var(--accent-gold)] to-[color:var(--accent-teal)]" aria-hidden />
          Legend
        </p>
        <div className="grid grid-cols-2 items-center gap-x-4 gap-y-2 text-[11px] leading-relaxed text-[color:var(--text-secondary)] sm:grid-cols-3 sm:gap-y-1.5 sm:text-xs lg:grid-cols-6">
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span className="text-[color:var(--accent-teal)]">
              <FiPaperclip className="w-3.5 h-3.5" strokeWidth={2} />
            </span>
            Has attachment(s)
          </span>
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span className="text-emerald-300">
              <FaUniversity className="w-3.5 h-3.5" />
            </span>
            Availing Loan + bank (hover or tap for bank name)
          </span>
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span className="text-[color:var(--accent-gold)]">
              <FaTicketAlt className="w-3.5 h-3.5" />
            </span>
            Open/In progress ticket(s)
          </span>
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span className="inline-block h-3 w-3 rounded border border-[color:var(--accent-gold-border)] bg-[color:var(--accent-gold-muted)] shadow-sm" />
            Capacity subtotal
          </span>
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span className="inline-block h-3 w-3 rounded border border-emerald-400/50 bg-emerald-500/25 shadow-sm" />
            Order value subtotal
          </span>
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span className="inline-block h-3 w-3 rounded border border-sky-400/50 bg-sky-500/25 shadow-sm" />
            Balance subtotal
          </span>
        </div>
      </div>
      </div>
    </>
  )
}

export default Projects
