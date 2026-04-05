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
  /** CRM user id when assigned; omit or null for unassigned. */
  assigned_to_id?: string | null
  assigned_to_name: string
  updated_at: string
  /** When current CRM stage was entered — primary leaderboard “closed in period” signal. */
  stage_entered_at?: string | null
  confirmation_date?: string | null
  customer_name: string
  gross_profit?: number | null
  /** Raw `financingBank` when set; used for Projects deep link. */
  financing_bank?: string | null
  /** Matches `availingLoanByBank[].bankLabel` when project avails loan; else "". */
  loan_bank_label?: string
  /** True when CRM `availingLoan`; used for Availing Loan KPI quick drawer (same slice as count, excluding Lost client-side). */
  availing_loan?: boolean
  /** Prisma `PaymentStatus` or null stored as PENDING; N/A pill matches stage/cost via `matchesZenithPaymentNaBucket`. */
  payment_status?: string
}

export type ZenithChartDrilldownDimension =
  | 'lead_source'
  | 'assigned_to'
  | 'stage'
  | 'customer_segment'
  | 'fy'
  | 'forecast'
  | 'loan_bank'
  | 'payment_status'
