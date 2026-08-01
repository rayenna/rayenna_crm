/**
 * Shared ROI / subsidy assumptions used by the ROI calculator and Proposal Pre-Flight.
 * Keep these in one place so validation and calculation stay in sync.
 */

/** Default tariff (₹/kWh) when the salesperson does not override. */
export const DEFAULT_TARIFF_INR = 8.2;

/** Default generation factor (kWh/kW/year) — Kerala average used in Help. */
export const DEFAULT_GENERATION_FACTOR = 1500;

/** Tariff band for pre-flight warnings (₹/kWh). */
export const TARIFF_BAND_MIN = 4;
export const TARIFF_BAND_MAX = 15;

/** Generation factor band for pre-flight warnings (kWh/kW/year). */
export const GEN_FACTOR_BAND_MIN = 1000;
export const GEN_FACTOR_BAND_MAX = 2000;

/** Inverter AC kW / array DC kW ratio considered acceptable. */
export const INVERTER_ARRAY_RATIO_MIN = 0.8;
export const INVERTER_ARRAY_RATIO_MAX = 1.3;

/** System size values differing by more than this (kW) are a mismatch. */
export const SYSTEM_SIZE_MISMATCH_TOLERANCE_KW = 0.1;

/**
 * Subsidy support as per PM-Surya Ghar / MNRE rooftop solar scheme
 * (myscheme.gov.in — Suitable Rooftop Solar Plant Capacity for households).
 * 0–150 units/mo → 1–2 kW → ₹30,000–₹60,000; 150–300 → 2–3 kW → ₹60,000–₹78,000; >300 → above 3 kW → ₹78,000.
 */
export function getSubsidyByCapacityKw(kw: number): number {
  if (kw <= 0) return 0;
  if (kw <= 2) return Math.round(kw * 30000);
  if (kw <= 3) return Math.round(60000 + (kw - 2) * 18000);
  return 78000;
}
