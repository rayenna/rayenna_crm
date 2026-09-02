/** Row shapes from `/api/dashboard/zenith-focus` — shared by Your focus tables and mobile cards. */

export type SalesPipelineRow = {
  projectId: string
  projectSerialNumber?: number
  customerName: string
  stage: string
  dealValue: number
  daysSinceActivity: number
  expectedCloseDate?: string | null
  confirmationDate?: string | null
  advanceReceived?: number
  createdAt?: string
  updatedAt?: string
  stageEnteredAt?: string | null
  salespersonId?: string
  salespersonName?: string | null
  leadSource?: string | null
  paymentStatus?: string | null
  balanceAmount?: number | null
  lastRemarkAt?: string | null
  lastPaymentDate?: string | null
}

export type FinanceOverdueRow = {
  projectId: string
  projectSerialNumber?: number
  customerName: string
  amount: number
  dueSince: string
  daysOverdue: number
  customerPhone?: string | null
  customerEmail?: string | null
  orderValue?: number
  amountPaid?: number
  projectStatus?: string
  paymentStatus?: string
  salespersonId?: string | null
  salespersonName?: string | null
}

export type LatestPaymentRow = {
  projectId: string
  projectSerialNumber?: number | null
  customerName: string
  salespersonName: string
  amount: number
  receivedAt: string
  installmentType: 'ADVANCE' | 'PAYMENT_1' | 'PAYMENT_2' | 'PAYMENT_3' | 'LAST_PAYMENT'
  paymentStatus?: string | null
  projectStatus?: string
}

export type InstallRow = {
  projectId: string
  projectSerialNumber?: number
  customerName: string
  kW: number | null
  salespersonName: string
  startDate: string | null
  expectedCompletion: string | null
  percentComplete: number | null
  overdue: boolean
  projectStatus?: string
  lastNote?: string | null
}
