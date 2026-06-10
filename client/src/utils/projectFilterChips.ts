import { LeadSource, UserRole } from '../types'
import type { PeBucketParam } from './projectListQuery'
import { getProjectSegmentLabel } from './projectSegment'
import { getCustomerTypeLegendLabel } from './customerTypeStyles'
import type { CustomerType } from './customerRecord'

const MONTH_LABELS: Record<string, string> = {
  '01': 'January',
  '02': 'February',
  '03': 'March',
  '04': 'April',
  '05': 'May',
  '06': 'June',
  '07': 'July',
  '08': 'August',
  '09': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December',
}

const QUARTER_LABELS: Record<string, string> = {
  Q1: 'Q1 (Apr–Jun)',
  Q2: 'Q2 (Jul–Sep)',
  Q3: 'Q3 (Oct–Dec)',
  Q4: 'Q4 (Jan–Mar)',
}

const PE_BUCKET_LABELS: Record<PeBucketParam, string> = {
  'proposal-ready': 'PE: Proposal ready',
  draft: 'PE: Draft',
  'not-started': 'PE: Not started',
  rest: 'PE: No PE activity',
}

const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  [LeadSource.WEBSITE]: 'Website',
  [LeadSource.REFERRAL]: 'Referral',
  [LeadSource.GOOGLE]: 'Google',
  [LeadSource.CHANNEL_PARTNER]: 'Channel Partner',
  [LeadSource.DIGITAL_MARKETING]: 'Digital Marketing',
  [LeadSource.SALES]: 'Sales',
  [LeadSource.MANAGEMENT_CONNECT]: 'Management Connect',
  [LeadSource.OTHER]: 'Other',
}

const TICKET_FILTER_LABELS: Record<string, string> = {
  HAS_TICKETS: 'Tickets: any',
  OPEN: 'Tickets: open',
  IN_PROGRESS: 'Tickets: in progress',
  CLOSED: 'Tickets: closed',
  NO_TICKETS: 'Tickets: none',
}

const PAYMENT_FILTER_LABELS: Record<string, string> = {
  FULLY_PAID: 'Payment: fully paid',
  PARTIAL: 'Payment: partial',
  PENDING: 'Payment: pending',
  NA: 'Payment: N/A',
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  EPC_PROJECT: 'EPC Project',
  PANEL_CLEANING: 'Panel Cleaning',
  MAINTENANCE: 'Maintenance',
  REPAIR: 'Repair',
  CONSULTING: 'Consulting',
  RESALE: 'Resale',
  OTHER_SERVICES: 'Other Services',
}

const SORT_LABELS: Record<string, string> = {
  customerName: 'Sort: customer name',
  dealHealthScore: 'Sort: deal health',
  projectType: 'Sort: segment',
  projectStatus: 'Sort: stage',
  systemCapacity: 'Sort: capacity',
  projectCost: 'Sort: order value',
  confirmationDate: 'Sort: confirmation date',
  creationDate: 'Sort: created date',
  profitability: 'Sort: profitability',
  slNo: 'Sort: SL no.',
  leadSource: 'Sort: lead source',
  paymentStatus: 'Sort: payment status',
}

export type ProjectFilterChip = {
  id: string
  label: string
  onRemove: () => void
}

type ChipOption = { value: string; label: string }

export type BuildProjectFilterChipsInput = {
  filters: {
    status: string[]
    type: string[]
    customerType: string[]
    projectServiceType: string[]
    salespersonId: string[]
    leadSource: string[]
    supportTicketStatus: string[]
    paymentStatus: string[]
    hasDocuments: boolean
    availingLoan: boolean
    peBucket: PeBucketParam | null
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
    lifecycleSpecsIncomplete: boolean
    search?: string
    sortBy?: string
    sortOrder?: string
  }
  searchInput: string
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
  defaultStatusValues: string[]
  statusOptions: ChipOption[]
  salesUserOptions: ChipOption[]
  userRole?: UserRole
  pipelineLabel: string
  onPatchFilters: (patch: Partial<BuildProjectFilterChipsInput['filters']>) => void
  onClearSearch: () => void
  onSetSelectedFYs: (fys: string[]) => void
  onSetSelectedQuarters: (quarters: string[]) => void
  onSetSelectedMonths: (months: string[]) => void
}

function statusIsDefault(status: string[], defaultStatusValues: string[]): boolean {
  if (status.length !== defaultStatusValues.length) return false
  const norm = (arr: string[]) => [...arr].sort().join('|')
  return norm(status) === norm(defaultStatusValues)
}

function labelForOption(options: ChipOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value.replace(/_/g, ' ')
}

/** Build removable filter chips for the Projects list (search, dates, dropdowns, checkboxes, sort). */
export function buildProjectFilterChips(input: BuildProjectFilterChipsInput): ProjectFilterChip[] {
  const chips: ProjectFilterChip[] = []
  const {
    filters,
    searchInput,
    selectedFYs,
    selectedQuarters,
    selectedMonths,
    defaultStatusValues,
    statusOptions,
    salesUserOptions,
    userRole,
    pipelineLabel,
    onPatchFilters,
    onClearSearch,
    onSetSelectedFYs,
    onSetSelectedQuarters,
    onSetSelectedMonths,
  } = input

  const search = (filters.search ?? searchInput).trim()
  if (search) {
    chips.push({
      id: 'search',
      label: `Search: ${search.length > 28 ? `${search.slice(0, 28)}…` : search}`,
      onRemove: () => {
        onClearSearch()
        onPatchFilters({ search: '' })
      },
    })
  }

  selectedFYs.forEach((fy) => {
    chips.push({
      id: `fy-${fy}`,
      label: `FY: ${fy}`,
      onRemove: () => {
        const next = selectedFYs.filter((f) => f !== fy)
        onSetSelectedFYs(next)
        if (next.length !== 1) {
          onSetSelectedQuarters([])
          onSetSelectedMonths([])
        }
      },
    })
  })

  selectedQuarters.forEach((q) => {
    chips.push({
      id: `quarter-${q}`,
      label: QUARTER_LABELS[q] ?? q,
      onRemove: () => onSetSelectedQuarters(selectedQuarters.filter((x) => x !== q)),
    })
  })

  selectedMonths.forEach((m) => {
    chips.push({
      id: `month-${m}`,
      label: MONTH_LABELS[m] ?? m,
      onRemove: () => onSetSelectedMonths(selectedMonths.filter((x) => x !== m)),
    })
  })

  if (!statusIsDefault(filters.status, defaultStatusValues)) {
    filters.status.forEach((st) => {
      chips.push({
        id: `status-${st}`,
        label: `${pipelineLabel}: ${labelForOption(statusOptions, st)}`,
        onRemove: () => {
          const next = filters.status.filter((s) => s !== st)
          onPatchFilters({
            status: next.length > 0 ? next : [...defaultStatusValues],
          })
        },
      })
    })
  }

  filters.type.forEach((t) => {
    chips.push({
      id: `segment-${t}`,
      label: `Segment: ${getProjectSegmentLabel(t)}`,
      onRemove: () => onPatchFilters({ type: filters.type.filter((x) => x !== t) }),
    })
  })

  filters.customerType.forEach((ct) => {
    chips.push({
      id: `customerType-${ct}`,
      label: `Customer type: ${getCustomerTypeLegendLabel(ct as CustomerType)}`,
      onRemove: () =>
        onPatchFilters({ customerType: filters.customerType.filter((x) => x !== ct) }),
    })
  })

  filters.projectServiceType.forEach((pst) => {
    chips.push({
      id: `service-${pst}`,
      label: `Service: ${SERVICE_TYPE_LABELS[pst] ?? pst.replace(/_/g, ' ')}`,
      onRemove: () =>
        onPatchFilters({
          projectServiceType: filters.projectServiceType.filter((x) => x !== pst),
        }),
    })
  })

  if (userRole !== UserRole.SALES) {
    filters.salespersonId.forEach((id) => {
      chips.push({
        id: `sales-${id}`,
        label: `Sales: ${labelForOption(salesUserOptions, id)}`,
        onRemove: () =>
          onPatchFilters({
            salespersonId: filters.salespersonId.filter((x) => x !== id),
          }),
      })
    })
    if (filters.salespersonUnassigned) {
      chips.push({
        id: 'sales-unassigned',
        label: 'Sales: unassigned',
        onRemove: () => onPatchFilters({ salespersonUnassigned: false }),
      })
    }
  }

  if (filters.leadSourceIsNull) {
    chips.push({
      id: 'lead-null',
      label: 'Lead source: none',
      onRemove: () => onPatchFilters({ leadSourceIsNull: false }),
    })
  }

  filters.leadSource.forEach((ls) => {
    chips.push({
      id: `lead-${ls}`,
      label: `Lead: ${LEAD_SOURCE_LABELS[ls as LeadSource] ?? ls}`,
      onRemove: () => onPatchFilters({ leadSource: filters.leadSource.filter((x) => x !== ls) }),
    })
  })

  filters.supportTicketStatus.forEach((ts) => {
    chips.push({
      id: `ticket-${ts}`,
      label: TICKET_FILTER_LABELS[ts] ?? ts,
      onRemove: () =>
        onPatchFilters({
          supportTicketStatus: filters.supportTicketStatus.filter((x) => x !== ts),
        }),
    })
  })

  filters.paymentStatus.forEach((ps) => {
    chips.push({
      id: `payment-${ps}`,
      label: PAYMENT_FILTER_LABELS[ps] ?? ps,
      onRemove: () =>
        onPatchFilters({ paymentStatus: filters.paymentStatus.filter((x) => x !== ps) }),
    })
  })

  if (filters.hasDocuments) {
    chips.push({
      id: 'has-documents',
      label: 'Has artifacts',
      onRemove: () => onPatchFilters({ hasDocuments: false }),
    })
  }

  if (filters.availingLoan) {
    chips.push({
      id: 'availing-loan',
      label: 'Availing loan',
      onRemove: () => onPatchFilters({ availingLoan: false }),
    })
  }

  if (filters.peBucket) {
    chips.push({
      id: 'pe-bucket',
      label: PE_BUCKET_LABELS[filters.peBucket],
      onRemove: () => onPatchFilters({ peBucket: null }),
    })
  }

  filters.financingBank.forEach((bank) => {
    chips.push({
      id: `bank-${bank}`,
      label: `Bank: ${bank}`,
      onRemove: () =>
        onPatchFilters({ financingBank: filters.financingBank.filter((x) => x !== bank) }),
    })
  })

  if (filters.zenithClosedFrom || filters.zenithClosedTo) {
    chips.push({
      id: 'zenith-closed',
      label: 'Zenith: closed period',
      onRemove: () => onPatchFilters({ zenithClosedFrom: null, zenithClosedTo: null }),
    })
  }

  if (filters.zenithSlice) {
    const sliceLabel =
      filters.zenithSlice === 'revenue'
        ? filters.zenithFyProfit
          ? 'Zenith: FY profit'
          : 'Zenith: revenue'
        : 'Zenith: pipeline'
    chips.push({
      id: 'zenith-slice',
      label: sliceLabel,
      onRemove: () => onPatchFilters({ zenithSlice: null, zenithFyProfit: false }),
    })
  }

  if (filters.panelBrand) {
    chips.push({
      id: 'panel-brand',
      label: `Panel: ${filters.panelBrand}`,
      onRemove: () => onPatchFilters({ panelBrand: '' }),
    })
  }

  if (filters.inverterBrand) {
    chips.push({
      id: 'inverter-brand',
      label: `Inverter: ${filters.inverterBrand}`,
      onRemove: () => onPatchFilters({ inverterBrand: '' }),
    })
  }

  if (filters.lifecycleSpecsIncomplete) {
    chips.push({
      id: 'lifecycle-incomplete',
      label: 'Lifecycle: brands missing',
      onRemove: () => onPatchFilters({ lifecycleSpecsIncomplete: false }),
    })
  }

  if (filters.lifecycleSpecsComplete && !filters.panelBrand && !filters.inverterBrand) {
    chips.push({
      id: 'lifecycle-complete',
      label: 'Lifecycle: both brands set',
      onRemove: () => onPatchFilters({ lifecycleSpecsComplete: false }),
    })
  }

  if (filters.sortBy) {
    const sortLabel = SORT_LABELS[filters.sortBy] ?? `Sort: ${filters.sortBy}`
    const orderSuffix = filters.sortOrder === 'asc' ? ' ↑' : ' ↓'
    chips.push({
      id: 'sort',
      label: `${sortLabel}${orderSuffix}`,
      onRemove: () => onPatchFilters({ sortBy: '', sortOrder: 'desc' }),
    })
  }

  return chips
}
