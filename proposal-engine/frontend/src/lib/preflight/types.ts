/** Proposal Pre-Flight — types for findings and auto-fixes. */

export type PreflightSeverity = 'error' | 'warning';

export type PreflightFindingId =
  | 'missing_costing'
  | 'missing_bom'
  | 'missing_roi'
  | 'module_wattage_token'
  | 'system_size_zero'
  | 'system_size_mismatch'
  | 'gst_category_default'
  | 'inverter_array_ratio'
  | 'tariff_out_of_band'
  | 'gen_factor_out_of_band'
  | 'subsidy_override_high'
  | 'roof_include_missing'
  | 'roi_not_integer_kw';

export type PreflightNavigateTo = '/costing' | '/bom' | '/roi' | '/ai-layout';

export type PreflightAutoFixId =
  | 'gst_category_default'
  | 'system_size_mismatch'
  | 'subsidy_override_high'
  | 'roi_not_integer_kw';

/** Which system capacity the proposal should use when CRM project kW and Lifecycle panel-derived kW disagree. */
export type SystemSizeSource = 'crm' | 'lifecycle';

export interface PreflightSizeChoice {
  crmKw: number;
  /** CRM Lifecycle panel wattage × panel qty from costing. */
  lifecycleKw: number;
  /** Human-readable breakdown, e.g. "5 × 605 W". */
  lifecycleDetail: string;
}

export interface PreflightFinding {
  id: PreflightFindingId;
  severity: PreflightSeverity;
  title: string;
  detail: string;
  /** When true, Apply can correct this finding in-place. */
  autoFixable: boolean;
  /** Deep-link for manual fixes. */
  navigateTo?: PreflightNavigateTo;
  /** Help User Guide deep-link (e.g. /help#faq-preflight-capacity). */
  helpHref?: string;
  /** Maps to applyPreflightFixes handler when autoFixable. */
  autoFixId?: PreflightAutoFixId;
  /** Present on system_size_mismatch — user picks CRM project kW vs Lifecycle panel-derived. */
  sizeChoice?: PreflightSizeChoice;
}

export interface PreflightResult {
  findings: PreflightFinding[];
  errorCount: number;
  warningCount: number;
}

export interface PreflightRoofContext {
  includeRoofLayout: boolean;
  hasSavedLayout: boolean;
  hasValidGps: boolean;
  /** Placed array kW from roof layout when known. */
  placedSystemSizeKw?: number | null;
}

export interface PreflightContext {
  crmSystemSizeKw?: number | null;
  /** CRM Project Lifecycle panel wattage (W). */
  crmPanelWattage?: number | null;
  sheetItems: Array<{
    category: string;
    itemName: string;
    quantity: string;
    gstPercent: string;
    specification?: string;
  }>;
  sheetSystemSizeKw?: number | null;
  bomRows: Array<{
    category: string;
    itemName: string;
    quantity: string;
    specification?: string;
  }>;
  roi: {
    systemSizeKw: number;
    tariff: number;
    generationFactor: number;
    subsidyEligible?: boolean;
    subsidyAmount?: number;
  } | null;
  roof: PreflightRoofContext;
  /**
   * When set, skip the CRM-vs-costing size mismatch finding
   * (user already chose a proposal capacity for this run).
   */
  suppressSizeMismatch?: boolean;
}
