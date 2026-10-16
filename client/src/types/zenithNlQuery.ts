export type ZenithNlVizKind = 'chart' | 'table'
export type ZenithNlChartType = 'bar' | 'pie'

export type ZenithNlIntent = {
  metric: string
  viz: ZenithNlVizKind
  chartType?: ZenithNlChartType
  filters?: {
    projectStatus?: string
    paymentStatus?: string
    peBucket?: string
    leadSource?: string
    search?: string
    panelBrand?: string
    inverterBrand?: string
    financingBank?: string
    availingLoan?: boolean
    ticketStatus?: string
    ticketSource?: string
    projectType?: string
    projectServiceType?: string
    customerType?: string
    panelType?: string
    systemType?: string
    roofType?: string
    capacityMin?: number
    capacityMax?: number
    salespersonName?: string
    salespersonUnassigned?: boolean
    city?: string
    opsName?: string
    projectStage?: string
    statusIndicator?: string
    leadSourceIsNull?: boolean
    incentiveEligible?: boolean
    hasDocuments?: boolean
    lifecycleSpecsIncomplete?: boolean
    dataSenseNeedsReview?: boolean
    hubPlantLinked?: boolean
    panelCapacityWMin?: number
    panelCapacityWMax?: number
    inverterCapacityKwMin?: number
    inverterCapacityKwMax?: number
  }
  insightHints?: string
}

export type ZenithNlPriorContext = {
  question: string
  metric: string
  filters?: ZenithNlIntent['filters']
}

export type ZenithNlTableColumn = { key: string; label: string }
/** Row cells plus optional drill-down `href` (not rendered as a column). */
export type ZenithNlTableRow = {
  href?: string
  [key: string]: string | number | null | undefined
}

export type ZenithNlChartSeriesPoint = {
  label: string
  value: number
  count?: number
  /** Optional Projects / Tickets drill-down for this slice. */
  href?: string
}

export type ZenithNlViz =
  | {
      kind: 'table'
      title: string
      columns: ZenithNlTableColumn[]
      rows: ZenithNlTableRow[]
    }
  | {
      kind: 'chart'
      title: string
      chartType: ZenithNlChartType
      series: ZenithNlChartSeriesPoint[]
      valueLabel?: string
    }

export type ZenithNlEffectiveDateFilter = {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
  source: 'command_bar' | 'question'
  phrase?: string
}

export type ZenithNlQueryMetricSuccess = {
  ok: true
  kind: 'metric'
  question: string
  insight: string
  viz: ZenithNlViz
  projectsHref: string | null
  intent: ZenithNlIntent
  suggestedQuestions?: string[]
  followUps?: string[]
  effectiveDateFilter?: ZenithNlEffectiveDateFilter
  chipMatch?: boolean
}

export type ZenithNlQueryActionSuccess = {
  ok: true
  kind: 'action'
  question: string
  action: string
  label: string
  message: string
  href: string
  autoNavigate: boolean
  suggestedQuestions?: string[]
  chipMatch?: boolean
  effectiveDateFilter?: ZenithNlEffectiveDateFilter
}

export type ZenithNlQuerySuccess = ZenithNlQueryMetricSuccess | ZenithNlQueryActionSuccess

export type ZenithNlCatalogHint = {
  metric: string
  title: string
  description: string
  ask: string
}

export type ZenithNlQueryClarify = {
  ok: false
  clarify: true
  question: string
  message: string
  suggestedQuestions: string[]
  catalogHints?: ZenithNlCatalogHint[]
  effectiveDateFilter?: ZenithNlEffectiveDateFilter
}

export type ZenithNlQueryResult = ZenithNlQuerySuccess | ZenithNlQueryClarify

/** Ask history entry — server-backed (Neon) with localStorage cache for this browser. */
export type ZenithAskHistoryItem = {
  id: string
  question: string
  insight: string
  metric: string
  at: number
}
