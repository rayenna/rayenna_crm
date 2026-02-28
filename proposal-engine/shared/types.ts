// ─────────────────────────────────────────────────────────────────────────────
// Proposal Engine — Shared Types (Solar)
// ─────────────────────────────────────────────────────────────────────────────

export type CostingCategory =
  | 'module'
  | 'inverter'
  | 'structure'
  | 'cable'
  | 'labour'
  | 'misc';

export interface Proposal {
  id: number;
  customerName: string;
  systemSizeKw: number;
  location: string;
  tariff: number;           // ₹ per kWh
  createdAt: string;

  costingItems?: CostingItem[];
  bomItems?: BOMItem[];
  roi?: ROI | null;
}

export interface CostingItem {
  id: number;
  proposalId: number;
  category: CostingCategory;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface BOMItem {
  id: number;
  proposalId: number;
  itemName: string;
  specification: string;
  quantity: number;
  brand: string;
  warranty: string;
}

export interface ROI {
  id: number;
  proposalId: number;
  annualGeneration: number;     // kWh/year
  annualSavings: number;        // ₹/year
  paybackYears: number;
  totalSavings25Years: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface HealthResponse {
  status: string;
  message: string;
  module: string;
  version: string;
  timestamp: string;
}
