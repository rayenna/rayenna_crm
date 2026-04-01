/** Rows from dashboard `zenithExplorerProjects` — same date scope as Zenith charts. */
export type ZenithExplorerProject = {
  id: string
  projectStatus: string
  /** Prisma `ProjectStage` or null — used to mirror `getRevenueWhere` (exclude SURVEY/PROPOSAL when set). */
  project_stage?: string | null
  /** False when `projectCost` was null in CRM (excluded from pipeline/revenue aggregates that require order value). */
  has_deal_value?: boolean
  stageLabel: string
  deal_value: number
  lead_source: string
  customer_segment: string
  financial_year: string
  assigned_to_name: string
  updated_at: string
  customer_name: string
  gross_profit?: number | null
  /** Matches `availingLoanByBank[].bankLabel` when project avails loan; else "". */
  loan_bank_label?: string
}

export type ZenithChartDrilldownDimension =
  | 'lead_source'
  | 'assigned_to'
  | 'stage'
  | 'customer_segment'
  | 'fy'
  | 'forecast'
  | 'loan_bank'
