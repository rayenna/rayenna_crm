export type ChartBuilderCohort = 'pipeline' | 'revenue' | 'all_non_lost'

export type ChartBuilderDimensionId =
  | 'leadSource'
  | 'projectStatus'
  | 'projectStage'
  | 'salesperson'
  | 'customerType'
  | 'roofType'
  | 'panelBrand'
  | 'inverterBrand'
  | 'panelType'
  | 'systemType'
  | 'financingBank'
  | 'year'
  | 'capacityBand'

export type ChartBuilderMeasureId = 'count' | 'orderValue' | 'grossProfit' | 'systemCapacity'

export type ChartBuilderChartType = 'bar_horizontal' | 'bar_vertical' | 'donut'

export type ChartBuilderSpec = {
  dimension: ChartBuilderDimensionId
  measure: ChartBuilderMeasureId
  chartType: ChartBuilderChartType
  cohort: ChartBuilderCohort
  extraFilters?: { availingLoan?: boolean }
}

export type ChartBuilderMeta = {
  dimensions: { id: ChartBuilderDimensionId; label: string; description: string }[]
  measures: { id: ChartBuilderMeasureId; label: string; description: string; valueLabel: string }[]
  cohorts: { id: ChartBuilderCohort; label: string; description: string }[]
  chartTypes: { id: ChartBuilderChartType; label: string; description: string }[]
  templates: {
    id: string
    name: string
    description: string
    spec: ChartBuilderSpec
  }[]
}

export type ChartBuilderSeriesPoint = {
  label: string
  value: number
  count: number
}

export type ChartBuilderQueryResult = {
  series: ChartBuilderSeriesPoint[]
  title: string
  valueLabel: string
}

export type ChartBuilderSavedChart = {
  id: string
  name: string
  description: string | null
  spec: ChartBuilderSpec
  createdAt: string
  updatedAt: string
  createdBy: { id: string; name: string }
  updatedBy: { id: string; name: string } | null
}

export const DEFAULT_CHART_SPEC: ChartBuilderSpec = {
  dimension: 'leadSource',
  measure: 'orderValue',
  chartType: 'bar_horizontal',
  cohort: 'revenue',
}
