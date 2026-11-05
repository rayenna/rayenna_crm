import type { ZenithExplorerProject } from '../types/zenithExplorer'

/**
 * Capacity bands aligned with Ask Zenith `CAPACITY_BANDS` / Projects deep-link ranges.
 * Keep labels identical so drill → Projects filters match.
 */
export const ZENITH_CAPACITY_BANDS: { label: string; min: number; max: number | null }[] = [
  { label: 'Under 3 kW', min: 0, max: 2 },
  { label: '3–5 kW', min: 3, max: 5 },
  { label: '6–10 kW', min: 6, max: 10 },
  { label: 'Above 10 kW', min: 11, max: null },
]

/** One horizontal-bar row (same shape as panel/inverter brand charts, without component-cost). */
export type ZenithCountBarRow = {
  label: string
  count: number
  orderValueSum: number
  systemCapacitySumKw: number
}

export function capacityBandForKw(kw: number | null | undefined): string | null {
  if (kw == null || !Number.isFinite(kw) || kw <= 0) return null
  for (const b of ZENITH_CAPACITY_BANDS) {
    if (kw >= b.min && (b.max == null || kw <= b.max)) return b.label
  }
  return null
}

export function capacityBandRange(
  label: string,
): { min: number; max?: number } | null {
  const b = ZENITH_CAPACITY_BANDS.find((x) => x.label === label)
  if (!b) return null
  return b.max == null ? { min: b.min } : { min: b.min, max: b.max }
}

/**
 * Aggregate project counts by roof type for the current Zenith date scope.
 * Only includes projects with roof type set.
 */
export function buildZenithRoofTypeBarRows(
  projects: ZenithExplorerProject[],
): ZenithCountBarRow[] {
  const map = new Map<string, { count: number; order: number; capacitySumKw: number }>()
  for (const p of projects) {
    const k = p.roof_type?.trim()
    if (!k) continue
    const prev = map.get(k) ?? { count: 0, order: 0, capacitySumKw: 0 }
    prev.count += 1
    prev.order += Number(p.deal_value ?? 0)
    const kw = p.system_capacity_kw
    if (typeof kw === 'number' && Number.isFinite(kw) && kw > 0) {
      prev.capacitySumKw += kw
    }
    map.set(k, prev)
  }

  return [...map.entries()]
    .map(([label, v]) => ({
      label,
      count: v.count,
      orderValueSum: v.order,
      systemCapacitySumKw: v.capacitySumKw,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

/**
 * Aggregate project counts by system capacity band (Ask Zenith band labels).
 * Only includes projects with a positive system capacity that fits a known band.
 */
export function buildZenithCapacityBandBarRows(
  projects: ZenithExplorerProject[],
): ZenithCountBarRow[] {
  const map = new Map<string, { count: number; order: number; capacitySumKw: number }>()
  for (const b of ZENITH_CAPACITY_BANDS) {
    map.set(b.label, { count: 0, order: 0, capacitySumKw: 0 })
  }

  for (const p of projects) {
    const band = capacityBandForKw(p.system_capacity_kw)
    if (!band) continue
    const prev = map.get(band) ?? { count: 0, order: 0, capacitySumKw: 0 }
    prev.count += 1
    prev.order += Number(p.deal_value ?? 0)
    const kw = p.system_capacity_kw
    if (typeof kw === 'number' && Number.isFinite(kw) && kw > 0) {
      prev.capacitySumKw += kw
    }
    map.set(band, prev)
  }

  return ZENITH_CAPACITY_BANDS.map((b) => {
    const v = map.get(b.label)!
    return {
      label: b.label,
      count: v.count,
      orderValueSum: v.order,
      systemCapacitySumKw: v.capacitySumKw,
    }
  }).filter((row) => row.count > 0)
}
