import { describe, expect, it } from 'vitest'
import type { ZenithExplorerProject } from '../types/zenithExplorer'
import {
  buildZenithCapacityBandBarRows,
  buildZenithRoofTypeBarRows,
  capacityBandForKw,
  capacityBandRange,
} from './zenithRoofCapacityChartData'

function proj(partial: Partial<ZenithExplorerProject>): ZenithExplorerProject {
  return {
    id: partial.id ?? 'p1',
    projectStatus: partial.projectStatus ?? 'CONFIRMED',
    stageLabel: partial.stageLabel ?? 'Confirmed Order',
    deal_value: partial.deal_value ?? 100000,
    lead_source: partial.lead_source ?? 'Sales',
    customer_segment: partial.customer_segment ?? 'Residential',
    financial_year: partial.financial_year ?? '2025-26',
    assigned_to_name: partial.assigned_to_name ?? 'A',
    updated_at: partial.updated_at ?? '2026-01-01T00:00:00.000Z',
    customer_name: partial.customer_name ?? 'Cust',
    roof_type: partial.roof_type,
    system_capacity_kw: partial.system_capacity_kw,
  }
}

describe('zenithRoofCapacityChartData', () => {
  it('maps capacity to Ask Zenith bands', () => {
    expect(capacityBandForKw(2)).toBe('Under 3 kW')
    expect(capacityBandForKw(3)).toBe('3–5 kW')
    expect(capacityBandForKw(10)).toBe('6–10 kW')
    expect(capacityBandForKw(11)).toBe('Above 10 kW')
    expect(capacityBandForKw(null)).toBeNull()
    expect(capacityBandRange('Above 10 kW')).toEqual({ min: 11 })
    expect(capacityBandRange('3–5 kW')).toEqual({ min: 3, max: 5 })
  })

  it('aggregates roof types by count', () => {
    const rows = buildZenithRoofTypeBarRows([
      proj({ id: '1', roof_type: 'Metal', deal_value: 50 }),
      proj({ id: '2', roof_type: 'Metal', deal_value: 70 }),
      proj({ id: '3', roof_type: 'Tile', deal_value: 30 }),
      proj({ id: '4', roof_type: null }),
    ])
    expect(rows).toEqual([
      { label: 'Metal', count: 2, orderValueSum: 120, systemCapacitySumKw: 0 },
      { label: 'Tile', count: 1, orderValueSum: 30, systemCapacitySumKw: 0 },
    ])
  })

  it('keeps capacity bands in canonical order and skips empty', () => {
    const rows = buildZenithCapacityBandBarRows([
      proj({ id: '1', system_capacity_kw: 12, deal_value: 10 }),
      proj({ id: '2', system_capacity_kw: 2, deal_value: 20 }),
      proj({ id: '3', system_capacity_kw: 12, deal_value: 5 }),
    ])
    expect(rows.map((r) => r.label)).toEqual(['Under 3 kW', 'Above 10 kW'])
    expect(rows[0]).toMatchObject({ count: 1, orderValueSum: 20, systemCapacitySumKw: 2 })
    expect(rows[1]).toMatchObject({ count: 2, orderValueSum: 15, systemCapacitySumKw: 24 })
  })
})
