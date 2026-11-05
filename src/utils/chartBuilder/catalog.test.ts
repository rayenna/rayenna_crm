import { describe, expect, it } from 'vitest'
import { isValidChartSpec, TEMPLATES, buildChartBuilderMeta } from './catalog'

describe('chartBuilder catalog', () => {
  it('exposes templates with valid specs', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(8)
    for (const t of TEMPLATES) {
      expect(isValidChartSpec(t.spec)).toBe(true)
    }
  })

  it('rejects unknown dimension/measure', () => {
    expect(
      isValidChartSpec({
        dimension: 'notAField',
        measure: 'count',
        chartType: 'bar_horizontal',
        cohort: 'revenue',
      }),
    ).toBe(false)
  })

  it('meta includes dimensions and chart types', () => {
    const meta = buildChartBuilderMeta()
    expect(meta.dimensions.some((d) => d.id === 'roofType')).toBe(true)
    expect(meta.chartTypes.map((c) => c.id)).toEqual(
      expect.arrayContaining(['bar_horizontal', 'bar_vertical', 'donut']),
    )
  })
})
