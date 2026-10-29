export type MarginBandKey = 'loss' | 'thin' | 'ok' | 'healthy' | 'unknown'
export type KwBandKey = 'b0_3' | 'b3_5' | 'b5_10' | 'b10_20' | 'b20' | 'unknown'

export type MarginJob = {
  id: string
  slNo: number | null
  customerName: string
  salespersonName: string | null
  salespersonId: string | null
  stage: string
  stageStatus: string
  customerType: string | null
  customerTypeLabel: string
  systemType: string | null
  systemTypeLabel: string
  segment: string | null
  segmentLabel: string
  capacityKw: number | null
  kwBand: KwBandKey
  kwBandLabel: string
  orderValue: number
  cost: number | null
  peCost: number | null
  profit: number | null
  profitPct: number | null
  profitEstimated: boolean
  marginBand: MarginBandKey
  marginBandLabel: string
  missingCost: boolean
  flags: string[]
  flagLabels: string[]
}

export type MixRow = {
  key: string
  label: string
  jobs: number
  revenue: number
  profit: number | null
  profitPct: number | null
  missingCost: number
}

export type MarginMixKpis = {
  jobs: number
  revenue: number
  profit: number | null
  profitPct: number | null
  missingCostJobs: number
  thinJobs: number
  lossJobs: number
  peMismatchJobs: number
  lastFyRevenue: number
  lastFyProfit: number | null
  lastFyProfitPct: number | null
  revenueYoy: number | null
  profitPctYoy: number | null
}

export type MarginMixPayload = {
  generatedAt: string
  salespersonId: string | null
  currentFy: string
  lastFy: string
  quarter: 1 | 2 | 3 | 4 | null
  availableFys: string[]
  periodLabel: string
  kpis: MarginMixKpis
  sellerLoad: MixRow[]
  segmentMix: MixRow[]
  systemMix: MixRow[]
  kwMix: MixRow[]
  bandMix: MixRow[]
  jobs: MarginJob[]
}
