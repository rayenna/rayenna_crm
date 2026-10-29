export type FunnelOpenStatus = 'LEAD' | 'SITE_SURVEY' | 'PROPOSAL'
export type FunnelSlaBand = 'GREEN' | 'AMBER' | 'RED' | 'NONE'
export type FunnelAgingKey = 'b0_7' | 'b8_14' | 'b15_21' | 'b22_30' | 'b30' | 'undated'

export type FunnelDeal = {
  id: string
  slNo: number | null
  customerName: string
  salespersonName: string | null
  salespersonId: string | null
  stage: string
  stageStatus: FunnelOpenStatus
  customerType: string | null
  customerTypeLabel: string
  systemType: string | null
  systemTypeLabel: string
  segment: string | null
  segmentLabel: string
  orderValue: number
  probability: number
  daysInStage: number | null
  slaDays: number
  slaBand: FunnelSlaBand
  slaLabel: string
  agingBucket: FunnelAgingKey
  agingLabel: string
  stageEnteredYmd: string | null
  stageDateEstimated: boolean
  closeDate: string | null
  flags: string[]
  flagLabels: string[]
}

export type FunnelStageCol = {
  key: FunnelOpenStatus
  label: string
  slaDays: number
}

export type FunnelMetricRow = {
  key: 'deals' | 'pipeline' | 'medianDays' | 'slaRed' | 'slaAmber'
  label: string
  values: (number | null)[]
  total: number | null
}

export type FunnelAgingRow = {
  key: 'deals' | 'pipeline'
  label: string
  values: number[]
  total: number
}

export type FunnelSellerLoadRow = {
  salespersonId: string | null
  salespersonName: string
  deals: number
  pipeline: number
  medianDays: number | null
  slaRed: number
  slaAmber: number
}

export type FunnelVelocityKpis = {
  openDeals: number
  openPipeline: number
  medianDays: number | null
  slaRed: number
  slaAmber: number
  estimatedDates: number
  confirmedYtdDeals: number
  confirmedYtdValue: number
  lostYtdDeals: number
  lostYtdValue: number
  winRate: number | null
  medianDaysToConfirm: number | null
  medianDaysToLose: number | null
}

export type FunnelVelocityPayload = {
  generatedAt: string
  salespersonId: string | null
  currentFy: string
  funnel: {
    columns: FunnelStageCol[]
    rows: FunnelMetricRow[]
  }
  aging: {
    columns: { key: FunnelAgingKey; label: string }[]
    rows: FunnelAgingRow[]
  }
  sellerLoad: FunnelSellerLoadRow[]
  deals: FunnelDeal[]
  kpis: FunnelVelocityKpis
}
