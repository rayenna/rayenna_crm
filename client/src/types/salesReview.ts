export type SalesReviewAchievementCol = { fy: string; ytd: boolean; label: string }

export type SalesReviewAchievementRow = {
  key: 'revenue' | 'profit' | 'avgProfitability' | 'yoy' | 'deals' | 'capacityKw'
  label: string
  values: (number | null)[]
}

export type SalesReviewForecastMonth = {
  key: string
  label: string
  startYmd: string
  endYmd: string
}

export type SalesReviewForecastCol = {
  key: 'CQ' | 'NQ' | 'NQ1' | 'NQ2'
  label: string
  shortLabel: string
  fy: string
  quarter: 1 | 2 | 3 | 4
  startYmd: string
  endYmd: string
  months: SalesReviewForecastMonth[]
}

export type SalesReviewForecastRow = {
  key: 'pipeline' | 'weighted' | 'closed' | 'lastYear' | 'yoy' | 'qoq'
  label: string
  values: (number | null)[]
  total: number | null
}

export type SalesReviewDeal = {
  id: string
  slNo: number | null
  customerName: string
  salespersonName: string | null
  stage: string
  stageStatus: string
  probability: number
  customerType: string | null
  customerTypeLabel: string
  systemType: string | null
  systemTypeLabel: string
  segment: string | null
  segmentLabel: string
  closeDate: string | null
  quarter: string | null
  fy: string | null
  bankLoan: boolean | null
  orderValue: number
  weightedValue: number
  capacityKw: number | null
  pastDue: boolean
  unscheduled: boolean
  forecastBucket: 'CQ' | 'NQ' | 'NQ1' | 'NQ2' | 'later' | 'unscheduled'
}

export type SalesReviewKpis = {
  closedYtdRevenue: number
  closedYtdProfit: number
  closedYtdDeals: number
  closedYtdKw: number
  openPipeline: number
  openWeighted: number
  openDeals: number
  pastDueDeals: number
  unscheduledDeals: number
  lostYtdValue: number
  lostYtdDeals: number
}

export type SalesReviewPayload = {
  generatedAt: string
  salespersonId: string | null
  currentFy: string
  achievement: {
    columns: SalesReviewAchievementCol[]
    rows: SalesReviewAchievementRow[]
  }
  forecast: {
    columns: SalesReviewForecastCol[]
    rows: SalesReviewForecastRow[]
    unscheduledPipeline: number
    unscheduledWeighted: number
    laterPipeline: number
    laterWeighted: number
  }
  deals: SalesReviewDeal[]
  kpis: SalesReviewKpis
}
