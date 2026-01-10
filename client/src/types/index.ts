export enum UserRole {
  ADMIN = 'ADMIN',
  SALES = 'SALES',
  OPERATIONS = 'OPERATIONS',
  FINANCE = 'FINANCE',
  MANAGEMENT = 'MANAGEMENT',
}

export enum ProjectType {
  RESIDENTIAL_SUBSIDY = 'RESIDENTIAL_SUBSIDY',
  RESIDENTIAL_NON_SUBSIDY = 'RESIDENTIAL_NON_SUBSIDY',
  COMMERCIAL_INDUSTRIAL = 'COMMERCIAL_INDUSTRIAL',
}

export enum ProjectStatus {
  LEAD = 'LEAD',
  CONFIRMED = 'CONFIRMED',
  UNDER_INSTALLATION = 'UNDER_INSTALLATION',
  SUBMITTED_FOR_SUBSIDY = 'SUBMITTED_FOR_SUBSIDY',
  COMPLETED = 'COMPLETED',
  COMPLETED_SUBSIDY_CREDITED = 'COMPLETED_SUBSIDY_CREDITED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  FULLY_PAID = 'FULLY_PAID',
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt?: string
}

export interface Project {
  id: string
  slNo: number
  customerName: string
  address?: string
  contactNumbers?: string
  consumerNumber?: string
  type: ProjectType
  leadSource?: string
  leadBroughtBy?: string
  salespersonId?: string
  year: string
  count: number
  systemCapacity?: number
  projectCost?: number
  confirmationDate?: string
  loanDetails?: string
  incentiveEligible: boolean
  expectedProfit?: number
  finalProfit?: number
  mnrePortalRegistrationDate?: string
  feasibilityDate?: string
  registrationDate?: string
  installationCompletionDate?: string
  mnreInstallationDetails?: string
  subsidyRequestDate?: string
  subsidyCreditedDate?: string
  projectStatus: ProjectStatus
  advanceReceived?: number
  advanceReceivedDate?: string
  payment1?: number
  payment1Date?: string
  payment2?: number
  payment2Date?: string
  payment3?: number
  payment3Date?: string
  lastPayment?: number
  lastPaymentDate?: string
  totalAmountReceived: number
  balanceAmount: number
  paymentStatus: PaymentStatus
  remarks?: string
  internalNotes?: string
  createdById: string
  createdBy?: User
  salesperson?: User
  documents?: Document[]
  auditLogs?: AuditLog[]
  createdAt: string
  updatedAt: string
}

export interface Document {
  id: string
  projectId: string
  fileName: string
  filePath: string
  fileType: string
  fileSize: number
  category: string
  description?: string
  uploadedById: string
  uploadedBy?: User
  createdAt: string
  updatedAt: string
}

export interface AuditLog {
  id: string
  projectId: string
  userId: string
  user?: User
  action: string
  field?: string
  oldValue?: string
  newValue?: string
  remarks?: string
  createdAt: string
}
