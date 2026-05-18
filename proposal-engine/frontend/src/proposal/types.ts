import type { SavedSheet, BomRowGenerated, RoiAutofill } from '../lib/costingConstants';

export interface BomOverrides {
  sheetId: string;
  rows: BomRowGenerated[];
  savedAt: string;
}

export interface YearlyRow {
  year: number;
  generation: number;
  tariffRate: number;
  savings: number;
  cumulativeSavings: number;
  paybackReached: boolean;
}

export interface ROIResult {
  inputs: {
    systemSizeKw: number;
    tariff: number;
    generationFactor: number;
    escalationPercent: number;
    projectCost: number;
    subsidyEligible?: boolean;
    subsidyAmount?: number;
  };
  annualGeneration: number;
  annualSavings: number;
  paybackYears: number;
  totalSavings25Years: number;
  roiPercent: number;
  lcoe: number;
  co2OffsetTons: number;
  yearlyBreakdown?: YearlyRow[];
  effectiveProjectCost?: number;
}

export interface CustomerDetails {
  customerName: string;
  location: string;
  contactPerson: string;
  phone: string;
  email: string;
}

export type DocxModule = typeof import('docx');
export type DocxTableRow = import('docx').TableRow;

export interface ProposalData {
  refNumber: string;
  generatedAt: string;
  customer: CustomerDetails;
  systemSizeKw: number;
  sheet: SavedSheet | null;
  bom: BomRowGenerated[];
  roi: ROIResult | null;
  roiAutofill: RoiAutofill | null;
  customerNumber?: string | null;
  projectNumber?: number | null;
}

export interface ProposalMeta {
  customerNumber?: string | null;
  projectNumber?: number | null;
}

/** Text overrides extracted from the live DOM before DOCX export. */
export interface TextOverrides {
  'exec-summary-p1'?: string;
  'exec-summary-p2'?: string;
  'about-p1'?: string;
  'about-p2'?: string;
  'financial-p1'?: string;
  'financial-p2'?: string;
  'financial-no-roi'?: string;
  'scope-intro'?: string;
  'what-we-offer-intro'?: string;
  'our-process-intro'?: string;
  'section-closing-note'?: string;
  [key: string]: string | undefined;
}
