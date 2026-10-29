import type { SalesReviewForecastCol } from './salesReview'

export type DeliveryBoardRow = {
  key: 'jobs' | 'capacityKw' | 'value' | 'overdue'
  label: string
  values: number[]
  total: number
}

export type DeliveryOpsLoadRow = {
  opsPersonId: string | null
  opsPersonName: string
  jobs: number
  capacityKw: number
  orderValue: number
  overdue: number
  blocked: number
}

export type DeliveryJob = {
  id: string
  slNo: number | null
  customerName: string
  salespersonName: string | null
  opsPersonName: string | null
  assignedOpsId: string | null
  stage: string
  stageStatus: string
  customerType: string | null
  customerTypeLabel: string
  systemType: string | null
  systemTypeLabel: string
  segment: string | null
  segmentLabel: string
  commissionDate: string | null
  quarter: string | null
  fy: string | null
  orderValue: number
  capacityKw: number | null
  daysLate: number | null
  daysInStage: number | null
  pastDue: boolean
  unscheduled: boolean
  unassignedOps: boolean
  forecastBucket: 'CQ' | 'NQ' | 'NQ1' | 'NQ2' | 'later' | 'unscheduled'
  blockers: string[]
  blockerLabels: string[]
}

export type DeliveryControlKpis = {
  inDeliveryJobs: number
  inDeliveryValue: number
  inDeliveryKw: number
  confirmedJobs: number
  installingJobs: number
  subsidyJobs: number
  overdueJobs: number
  unscheduledJobs: number
  unassignedJobs: number
  blockedJobs: number
}

export type SubsidyClockStep =
  | 'kseb_feasibility'
  | 'kseb_registration'
  | 'install'
  | 'mnre_portal'
  | 'completion_report'
  | 'request'
  | 'awaiting_credit'

export type SubsidyClockJob = {
  id: string
  slNo: number | null
  customerName: string
  salespersonName: string | null
  opsPersonName: string | null
  assignedOpsId: string | null
  stage: string
  stageStatus: string
  step: SubsidyClockStep
  stepLabel: string
  daysInStep: number | null
  orderValue: number
  capacityKw: number | null
  requestDate: string | null
  exceptions: string[]
  exceptionLabels: string[]
}

export type SubsidyClockFunnelRow = {
  key: 'jobs' | 'capacityKw' | 'value' | 'medianDays'
  label: string
  values: number[]
  total: number
}

export type SubsidyClockKpis = {
  onClockJobs: number
  onClockValue: number
  onClockKw: number
  awaitingCreditJobs: number
  awaitingCreditValue: number
  completedNotCreditedJobs: number
  stale90Jobs: number
  exceptionJobs: number
}

export type DeliveryControlPayload = {
  generatedAt: string
  opsPersonId: string | null
  currentFy: string
  board: {
    columns: SalesReviewForecastCol[]
    rows: DeliveryBoardRow[]
    unscheduledJobs: number
    unscheduledValue: number
    unscheduledKw: number
    laterJobs: number
    laterValue: number
    laterKw: number
  }
  opsLoad: DeliveryOpsLoadRow[]
  jobs: DeliveryJob[]
  kpis: DeliveryControlKpis
  subsidyClock: {
    columns: Array<{ key: SubsidyClockStep; label: string }>
    rows: SubsidyClockFunnelRow[]
    jobs: SubsidyClockJob[]
    kpis: SubsidyClockKpis
  }
}
