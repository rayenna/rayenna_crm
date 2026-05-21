import type { CustomerType } from './customerRecord'

/**
 * Canonical customer-type hues (Dashboard donuts, Zenith, Projects list rows, badges).
 * CSS accents in tokens.css are tuned to match these.
 */
export const CUSTOMER_TYPE_CHART_HEX: Record<CustomerType, string> = {
  RESIDENTIAL: '#F5A623',
  APARTMENT: '#7C6CF0',
  COMMERCIAL: '#00D4B4',
}
