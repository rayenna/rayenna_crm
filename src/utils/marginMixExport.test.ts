import { describe, expect, it } from 'vitest'
import { buildMarginMix, type MarginMixProjectInput } from './marginMix'
import {
  buildMarginMixExcelBuffer,
  buildMarginMixPdfBuffer,
  buildMarginMixPptxBuffer,
  marginMixExcelSheets,
  marginMixExportBasename,
} from './marginMixExport'

const NOW = new Date('2026-10-29T06:30:00.000Z')

function p(
  partial: Partial<MarginMixProjectInput> & Pick<MarginMixProjectInput, 'id'>,
): MarginMixProjectInput {
  return {
    slNo: 158,
    projectStatus: 'CONFIRMED',
    year: '2026-27',
    projectCost: 500_000,
    totalProjectCost: 400_000,
    grossProfit: 100_000,
    expectedProfit: null,
    profitability: 20,
    systemCapacity: 5,
    systemType: 'ON_GRID',
    type: 'SUBSIDY',
    confirmationDate: '2026-06-10T00:00:00.000Z',
    peCostingTotal: null,
    salespersonId: 's1',
    salespersonName: 'Kavya V',
    customerName: 'RAK Tower',
    customerType: 'APARTMENT',
    ...partial,
  }
}

describe('marginMixExcelSheets', () => {
  it('builds summary and mix sheets', () => {
    const payload = buildMarginMix([p({ id: 'j1' })], NOW)
    const sheets = marginMixExcelSheets(payload, {
      sellerLabel: 'All sellers',
      exportedBy: 'admin@rayenna.test',
    })
    expect(sheets.summary.find((r) => r.Field === 'Period')?.Value).toBe('FY2026-27')
    expect(sheets.summary.find((r) => r.Field === 'Seller')?.Value).toBe('All sellers')
    expect(sheets.summary.find((r) => r.Field === 'Jobs')?.Value).toBe(1)
    expect(sheets.sellerLoad[0]?.Slice).toBe('Kavya V')
    expect(sheets.jobs.some((d) => d.Customer === 'RAK Tower')).toBe(true)
    expect(marginMixExportBasename(payload, 'All sellers')).toMatch(/^margin-mix-FY2026-27-all-sellers-/)
    const q3 = buildMarginMix([p({ id: 'j1' })], NOW, { fy: '2026-27', quarter: 3 })
    expect(marginMixExportBasename(q3, 'All sellers')).toMatch(/^margin-mix-FY2026-27-Q3-all-sellers-/)
  })

  it('writes excel, pdf, and pptx buffers', async () => {
    const payload = buildMarginMix([p({ id: 'j1' })], NOW)
    const meta = { sellerLabel: 'All sellers', exportedBy: 'admin@rayenna.test' }
    const xlsx = buildMarginMixExcelBuffer(payload, meta)
    const pdf = await buildMarginMixPdfBuffer(payload, meta)
    const pptx = await buildMarginMixPptxBuffer(payload, meta)
    expect(xlsx.slice(0, 2).toString()).toBe('PK')
    expect(pdf.slice(0, 4).toString()).toBe('%PDF')
    expect(pptx.slice(0, 2).toString()).toBe('PK')
    expect(pptx.length).toBeGreaterThan(2000)
  })
})
