/** Chart Builder catalog — whitelist only (no arbitrary SQL). */

export const CHART_BUILDER_ROLES = ['ADMIN', 'MANAGEMENT'] as const;

export type ChartBuilderCohort = 'pipeline' | 'revenue' | 'all_non_lost';

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
  | 'capacityBand';

export type ChartBuilderMeasureId =
  | 'count'
  | 'orderValue'
  | 'grossProfit'
  | 'systemCapacity';

export type ChartBuilderChartType = 'bar_horizontal' | 'bar_vertical' | 'donut';

export type ChartBuilderSpec = {
  dimension: ChartBuilderDimensionId;
  measure: ChartBuilderMeasureId;
  chartType: ChartBuilderChartType;
  cohort: ChartBuilderCohort;
  /** Optional hard filters (e.g. loans-only). */
  extraFilters?: {
    availingLoan?: boolean;
  };
};

export type ChartBuilderDateFilters = {
  fy?: string[];
  quarter?: string[];
  month?: string[];
};

export const DIMENSIONS: {
  id: ChartBuilderDimensionId;
  label: string;
  description: string;
}[] = [
  { id: 'leadSource', label: 'Lead source', description: 'How the lead entered CRM' },
  { id: 'projectStatus', label: 'Project status', description: 'Execution / pipeline stage status' },
  { id: 'projectStage', label: 'Project stage', description: 'Lifecycle stage field' },
  { id: 'salesperson', label: 'Salesperson', description: 'Assigned sales owner' },
  { id: 'customerType', label: 'Customer type', description: 'Residential / Apartment / Commercial' },
  { id: 'roofType', label: 'Roof type', description: 'Sales & Commercial roof type' },
  { id: 'panelBrand', label: 'Panel brand', description: 'Project Lifecycle panel brand' },
  { id: 'inverterBrand', label: 'Inverter brand', description: 'Project Lifecycle inverter brand' },
  { id: 'panelType', label: 'Panel type', description: 'DCR / Non-DCR' },
  { id: 'systemType', label: 'System type', description: 'On-grid / Off-grid / Hybrid' },
  { id: 'financingBank', label: 'Financing bank', description: 'Loan bank when availing finance' },
  { id: 'year', label: 'Financial year', description: 'Project FY (year field)' },
  { id: 'capacityBand', label: 'System capacity band', description: 'Under 3 / 3–5 / 6–10 / Above 10 kW' },
];

export const MEASURES: {
  id: ChartBuilderMeasureId;
  label: string;
  description: string;
  valueLabel: string;
}[] = [
  { id: 'count', label: 'Project count', description: 'Number of projects', valueLabel: 'Projects' },
  {
    id: 'orderValue',
    label: 'Order value (sum)',
    description: 'Sum of project order value',
    valueLabel: 'Order value (₹)',
  },
  {
    id: 'grossProfit',
    label: 'Gross profit (sum)',
    description: 'Sum of gross profit',
    valueLabel: 'Gross profit (₹)',
  },
  {
    id: 'systemCapacity',
    label: 'System capacity (sum kW)',
    description: 'Sum of installed capacity',
    valueLabel: 'Capacity (kW)',
  },
];

export const COHORTS: { id: ChartBuilderCohort; label: string; description: string }[] = [
  {
    id: 'revenue',
    label: 'Revenue cohort',
    description: 'Confirmed / Under Installation / Completed (+ subsidy credited); excludes Survey/Proposal stages',
  },
  {
    id: 'pipeline',
    label: 'Pipeline cohort',
    description: 'All non-Lost projects with order value',
  },
  {
    id: 'all_non_lost',
    label: 'All non-Lost',
    description: 'Every project except Lost (includes early stages without order value)',
  },
];

export const CHART_TYPES: {
  id: ChartBuilderChartType;
  label: string;
  description: string;
}[] = [
  { id: 'bar_horizontal', label: 'Horizontal bar', description: 'Best for ranked categories' },
  { id: 'bar_vertical', label: 'Column', description: 'Vertical bars for categories or FY' },
  { id: 'donut', label: 'Donut', description: 'Share of total (best with ≤12 slices)' },
];

export type ChartBuilderTemplate = {
  id: string;
  name: string;
  description: string;
  spec: ChartBuilderSpec;
};

export const TEMPLATES: ChartBuilderTemplate[] = [
  {
    id: 'revenue_by_lead_source',
    name: 'Revenue by lead source',
    description: 'Order value in the revenue cohort by lead source',
    spec: {
      dimension: 'leadSource',
      measure: 'orderValue',
      chartType: 'bar_horizontal',
      cohort: 'revenue',
    },
  },
  {
    id: 'pipeline_by_status',
    name: 'Pipeline by stage',
    description: 'Project counts in the open pipeline by status',
    spec: {
      dimension: 'projectStatus',
      measure: 'count',
      chartType: 'bar_horizontal',
      cohort: 'pipeline',
    },
  },
  {
    id: 'projects_by_panel_brand',
    name: 'Projects by panel brand',
    description: 'Count of projects by panel brand',
    spec: {
      dimension: 'panelBrand',
      measure: 'count',
      chartType: 'bar_horizontal',
      cohort: 'pipeline',
    },
  },
  {
    id: 'projects_by_inverter_brand',
    name: 'Projects by inverter brand',
    description: 'Count of projects by inverter brand',
    spec: {
      dimension: 'inverterBrand',
      measure: 'count',
      chartType: 'bar_horizontal',
      cohort: 'pipeline',
    },
  },
  {
    id: 'projects_by_roof_type',
    name: 'Projects by roof type',
    description: 'Count of projects by roof type',
    spec: {
      dimension: 'roofType',
      measure: 'count',
      chartType: 'bar_horizontal',
      cohort: 'pipeline',
    },
  },
  {
    id: 'projects_by_capacity_band',
    name: 'Projects by system capacity',
    description: 'Count of projects by capacity band',
    spec: {
      dimension: 'capacityBand',
      measure: 'count',
      chartType: 'bar_horizontal',
      cohort: 'pipeline',
    },
  },
  {
    id: 'revenue_by_salesperson',
    name: 'Revenue by salesperson',
    description: 'Order value in the revenue cohort by sales owner',
    spec: {
      dimension: 'salesperson',
      measure: 'orderValue',
      chartType: 'bar_horizontal',
      cohort: 'revenue',
    },
  },
  {
    id: 'revenue_by_customer_type',
    name: 'Revenue by customer type',
    description: 'Order value share by customer type',
    spec: {
      dimension: 'customerType',
      measure: 'orderValue',
      chartType: 'donut',
      cohort: 'revenue',
    },
  },
  {
    id: 'loans_by_bank',
    name: 'Loans by bank',
    description: 'Projects availing loan, counted by financing bank',
    spec: {
      dimension: 'financingBank',
      measure: 'count',
      chartType: 'bar_horizontal',
      cohort: 'pipeline',
      extraFilters: { availingLoan: true },
    },
  },
  {
    id: 'capacity_by_fy',
    name: 'Capacity sold by FY',
    description: 'Sum of system capacity (kW) by financial year',
    spec: {
      dimension: 'year',
      measure: 'systemCapacity',
      chartType: 'bar_vertical',
      cohort: 'revenue',
    },
  },
];

const DIMENSION_IDS = new Set(DIMENSIONS.map((d) => d.id));
const MEASURE_IDS = new Set(MEASURES.map((m) => m.id));
const CHART_TYPE_IDS = new Set(CHART_TYPES.map((c) => c.id));
const COHORT_IDS = new Set(COHORTS.map((c) => c.id));

export function isValidChartSpec(raw: unknown): raw is ChartBuilderSpec {
  if (!raw || typeof raw !== 'object') return false;
  const s = raw as Record<string, unknown>;
  if (!DIMENSION_IDS.has(s.dimension as ChartBuilderDimensionId)) return false;
  if (!MEASURE_IDS.has(s.measure as ChartBuilderMeasureId)) return false;
  if (!CHART_TYPE_IDS.has(s.chartType as ChartBuilderChartType)) return false;
  if (!COHORT_IDS.has(s.cohort as ChartBuilderCohort)) return false;
  if (s.extraFilters != null) {
    if (typeof s.extraFilters !== 'object') return false;
    const ef = s.extraFilters as Record<string, unknown>;
    if (ef.availingLoan != null && typeof ef.availingLoan !== 'boolean') return false;
  }
  return true;
}

/** Donut is awkward with many slices — UI may warn; still allowed. */
export function chartTypeCompatible(
  _dimension: ChartBuilderDimensionId,
  _measure: ChartBuilderMeasureId,
  _chartType: ChartBuilderChartType,
): { ok: boolean; reason?: string } {
  // v1: all single dimension + single measure types are compatible.
  return { ok: true };
}

export function buildChartBuilderMeta() {
  return {
    dimensions: DIMENSIONS,
    measures: MEASURES,
    cohorts: COHORTS,
    chartTypes: CHART_TYPES,
    templates: TEMPLATES,
  };
}
