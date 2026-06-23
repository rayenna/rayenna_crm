export type ProjectStepState = 'complete' | 'current' | 'upcoming'

export interface ProjectStep {
  key: string
  label: string
  state: ProjectStepState
}

export interface HomeEnergySummary {
  year: number
  month: number
  monthLabel: string
  totalGenerated: number
  totalSavings: number
  estimatedTodayKwh: number
  isEstimated: boolean
  systemKw: number
}

export interface ConsumerHome {
  greeting: string
  displayName: string
  project: {
    headline: string
    subline: string | null
    siteAddress: string | null
    systemKw: number
    equipmentSummary: string
    progressPercent: number
    steps: ProjectStep[]
    isLive: boolean
  }
  energy: HomeEnergySummary
  systemHealth: {
    status: 'OPTIMAL' | 'WARNING' | 'CRITICAL' | string
    label: string
    message: string
  }
  nextMaintenance: {
    title: string
    statusLabel: string
  } | null
  member: {
    tier: string
    tierLabel: string
    points: number
  }
  unreadNotifications: number
}
