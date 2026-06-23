export type SystemHealthStatus = 'OPTIMAL' | 'WARNING' | 'CRITICAL'

export interface SystemHealth {
  status: SystemHealthStatus
  label: string
  message: string
  systemKw: number
  panelCount: number
  installedAt: string | null
  installedLabel: string | null
}

export interface SystemSpec {
  systemKw: number
  panelCount: number
  panelBrand: string | null
  panelType: string | null
  panelCapacityW: number | null
  panelLabel: string
  inverterBrand: string | null
  inverterCapacityKw: number | null
  inverterLabel: string
  equipmentSummary: string
}

export interface WarrantyItem {
  id: string
  componentKey: string
  name: string
  specification: string | null
  totalYears: number
  yearsRemaining: number
  expiryDate: string
  progressPercent: number
}

export interface WarrantyResponse {
  systemHealth: SystemHealth
  items: WarrantyItem[]
  systemSpec: SystemSpec
}

export type ScheduleStatus = 'DUE' | 'COMPLETED' | 'OVERDUE'

export interface MaintenanceScheduleItem {
  id: string
  taskKey: string
  title: string
  status: ScheduleStatus
  dueDate: string | null
  completedAt: string | null
  statusLabel: string
  planNote: string | null
}

export type MaintenanceRequestType = 'SCHEDULE_SERVICE' | 'REPORT_ISSUE'

export interface MaintenanceRequest {
  id: string
  requestType: MaintenanceRequestType
  title: string
  description: string | null
  preferredDate: string | null
  status: string
  createdAt: string
}

export interface CreateMaintenanceRequestInput {
  requestType: MaintenanceRequestType
  title: string
  description?: string
  preferredDate?: string
}
