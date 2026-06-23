export type SolarHubUser = {
  id: string
  username: string
  email: string | null
  phone: string | null
  isActive: boolean
  isDemo: boolean
  lastLoginAt: string | null
  createdAt: string
  firstName?: string | null
  lastName?: string | null
  referralCode?: string
  points?: number
  memberTier?: string
  project: {
    id: string
    slNo: number
    projectStatus: string
    customerName: string
    customerId?: string
  }
}

export type SolarHubUserListResponse = {
  items: SolarHubUser[]
  total: number
  page: number
  limit: number
}

export type SolarHubPasswordResetResponse = {
  username: string
  temporaryPassword: string
}

export type SolarHubProvisionResponse = {
  action: string
  username?: string | null
  reason?: string
}

export type HubMaintenanceRequestStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export type HubMaintenanceRequest = {
  id: string
  requestType: 'SCHEDULE_SERVICE' | 'REPORT_ISSUE'
  title: string
  description: string | null
  preferredDate: string | null
  status: HubMaintenanceRequestStatus
  createdAt: string
  updatedAt: string
  username: string
  projectId: string
  projectSlNo: number
  customerName: string
}

export type HubMaintenanceListResponse = {
  items: HubMaintenanceRequest[]
  total: number
  page: number
  limit: number
}

export type ProvisioningGapItem = {
  projectId: string
  slNo: number
  projectStatus: string
  customerName: string
  customerId: string
}

export type ProvisioningGapListResponse = {
  items: ProvisioningGapItem[]
  total: number
  page: number
  limit: number
}

export type BulkProvisionSummary = {
  created: number
  reactivated: number
  synced: number
  unchanged: number
  skipped: number
  errors: { projectId: string; message: string }[]
}
