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
  SITE_SURVEY = 'SITE_SURVEY',
  PROPOSAL = 'PROPOSAL',
  CONFIRMED = 'CONFIRMED',
  UNDER_INSTALLATION = 'UNDER_INSTALLATION',
  SUBMITTED_FOR_SUBSIDY = 'SUBMITTED_FOR_SUBSIDY',
  COMPLETED = 'COMPLETED',
  COMPLETED_SUBSIDY_CREDITED = 'COMPLETED_SUBSIDY_CREDITED',
  LOST = 'LOST',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  FULLY_PAID = 'FULLY_PAID',
}

export enum ProjectServiceType {
  EPC_PROJECT = 'EPC_PROJECT',
  PANEL_CLEANING = 'PANEL_CLEANING',
  MAINTENANCE = 'MAINTENANCE',
  REPAIR = 'REPAIR',
  CONSULTING = 'CONSULTING',
  RESALE = 'RESALE',
  OTHER_SERVICES = 'OTHER_SERVICES',
}

export enum ProjectStage {
  SURVEY = 'SURVEY',
  PROPOSAL = 'PROPOSAL',
  APPROVED = 'APPROVED',
  INSTALLATION = 'INSTALLATION',
  BILLING = 'BILLING',
  LIVE = 'LIVE',
  AMC = 'AMC',
  LOST = 'LOST',
}

export enum LostReason {
  LOST_TO_COMPETITION = 'LOST_TO_COMPETITION',
  NO_BUDGET = 'NO_BUDGET',
  INDEFINITELY_DELAYED = 'INDEFINITELY_DELAYED',
  OTHER = 'OTHER',
}

export enum LeadSource {
  WEBSITE = 'WEBSITE',
  REFERRAL = 'REFERRAL',
  GOOGLE = 'GOOGLE',
  CHANNEL_PARTNER = 'CHANNEL_PARTNER',
  DIGITAL_MARKETING = 'DIGITAL_MARKETING',
  SALES = 'SALES',
  MANAGEMENT_CONNECT = 'MANAGEMENT_CONNECT',
  OTHER = 'OTHER',
}

export enum SystemType {
  ON_GRID = 'ON_GRID',
  OFF_GRID = 'OFF_GRID',
  HYBRID = 'HYBRID',
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
  customerId: string
  customer?: Customer
  type: ProjectType
  projectServiceType: ProjectServiceType
  salespersonId?: string
  year: string
  count: number
  systemCapacity?: number
  projectCost?: number
  confirmationDate?: string
  loanDetails?: string
  incentiveEligible: boolean
  expectedProfit?: number
  grossProfit?: number
  profitability?: number
  finalProfit?: number
  mnrePortalRegistrationDate?: string
  feasibilityDate?: string
  registrationDate?: string
  installationCompletionDate?: string
  mnreInstallationDetails?: string
  subsidyRequestDate?: string
  subsidyCreditedDate?: string
  projectStatus: ProjectStatus
  // Lifecycle fields
  projectStage?: ProjectStage
  stageEnteredAt?: string
  slaDays?: number
  // Lost stage fields
  lostDate?: string
  lostReason?: LostReason
  lostOtherReason?: string
  statusIndicator?: 'GREEN' | 'AMBER' | 'RED'
  systemType?: SystemType
  panelBrand?: string
  inverterBrand?: string
  roofType?: string
  siteAddress?: string
  expectedCommissioningDate?: string
  marginEstimate?: number
  assignedOpsId?: string
  opsPerson?: User
  leadId?: string
  leadSource?: LeadSource
  leadSourceDetails?: string
  totalProjectCost?: number
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

export interface Customer {
  id: string
  customerId: string // 6-digit alphanumeric ID
  customerName?: string // Legacy field, kept for backward compatibility
  prefix?: string // Mr., Ms., Mrs., Mx., Dr., etc.
  firstName?: string
  middleName?: string
  lastName?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  country?: string
  pinCode?: string
  contactNumbers?: string
  consumerNumber?: string
  email?: string
  idProofNumber?: string
  idProofType?: string
  companyName?: string
  companyGst?: string
  createdById?: string
  salespersonId?: string
  salesperson?: User
  projects?: Project[]
  createdAt: string
  updatedAt: string
}

export interface ProjectRemark {
  id: string
  projectId: string
  userId: string
  user?: User
  remark: string
  createdAt: string
  updatedAt: string
}
