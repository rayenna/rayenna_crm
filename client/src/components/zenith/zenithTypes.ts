export interface ZenithDateFilter {
  selectedFYs: string[]
  selectedQuarters: string[]
  selectedMonths: string[]
}

export interface ZenithFYRow {
  fy: string
  totalProjectValue?: number
  totalProfit?: number | null
  totalCapacity?: number
  totalPipeline?: number
}
