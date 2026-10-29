export type AgingKey = 'b0_30' | 'b31_60' | 'b61_90' | 'b90' | 'undated'

export type CollectionsAgingRow = {
  key: 'jobs' | 'balance'
  label: string
  values: number[]
  total: number
}

export type CollectionsSellerLoadRow = {
  salespersonId: string | null
  salespersonName: string
  jobs: number
  outstanding: number
  aging90: number
  loan: number
  neverPaid: number
}

export type CollectionsRow = {
  id: string
  slNo: number | null
  customerName: string
  salespersonName: string | null
  salespersonId: string | null
  stage: string
  stageStatus: string
  customerType: string | null
  customerTypeLabel: string
  segment: string | null
  segmentLabel: string
  paymentStatus: string | null
  paymentStatusLabel: string
  orderValue: number
  received: number
  balance: number
  lastPaymentDate: string | null
  daysOutstanding: number | null
  agingBucket: AgingKey
  agingLabel: string
  availingLoan: boolean
  bankLabel: string
  subsidyInFlight: boolean
  neverPaid: boolean
  flags: string[]
  flagLabels: string[]
}

export type CollectionsCashKpis = {
  outstandingJobs: number
  outstanding: number
  receivedOnBook: number
  aging90Jobs: number
  aging90: number
  neverPaidJobs: number
  loanJobs: number
  loanOutstanding: number
  cashOutstanding: number
  subsidyInFlightJobs: number
  subsidyInFlightValue: number
  pendingJobs: number
  partialJobs: number
}

export type CollectionsCashPayload = {
  generatedAt: string
  salespersonId: string | null
  currentFy: string
  aging: {
    columns: { key: AgingKey; label: string }[]
    rows: CollectionsAgingRow[]
  }
  sellerLoad: CollectionsSellerLoadRow[]
  rows: CollectionsRow[]
  kpis: CollectionsCashKpis
}
