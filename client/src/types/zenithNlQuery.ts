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
  }
  insightHints?: string
}

export type ZenithNlPriorContext = {
  question: string
  metric: string
  filters?: ZenithNlIntent['filters']
}

export type ZenithNlTableColumn = { key: string; label: string }
export type ZenithNlTableRow = Record<string, string | number | null>

export type ZenithNlChartSeriesPoint = {
  label: string
  value: number
  count?: number
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

export type ZenithNlQuerySuccess = {
  ok: true
  question: string
  insight: string
  viz: ZenithNlViz
  projectsHref: string | null
  intent: ZenithNlIntent
  suggestedQuestions?: string[]
  followUps?: string[]
}

export type ZenithNlQueryClarify = {
  ok: false
  clarify: true
  question: string
  message: string
  suggestedQuestions: string[]
}

export type ZenithNlQueryResult = ZenithNlQuerySuccess | ZenithNlQueryClarify

/** Session-only Ask history entry (not persisted). */
export type ZenithAskHistoryItem = {
  id: string
  question: string
  insight: string
  metric: string
  at: number
}
