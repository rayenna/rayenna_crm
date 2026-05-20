import type { LineItem } from '../lib/costingConstants';

export interface FormValues {
  items: LineItem[];
}

export interface CostingTemplate {
  id: string;
  name: string;
  description: string;
  savedAt: string;
  items: LineItem[];
  isBuiltIn?: boolean;
}

export interface ImportRow {
  category: string;
  itemName: string;
  specification: string;
  quantity: string;
  unitCost: string;
  error?: string;
}
