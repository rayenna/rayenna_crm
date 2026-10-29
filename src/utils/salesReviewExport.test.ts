import { describe, expect, it } from 'vitest'
import { buildSalesReview, type SalesReviewProjectInput } from './salesReview'
import {
  buildSalesReviewExcelBuffer,
  buildSalesReviewPdfBuffer,
  buildSalesReviewPptxBuffer,
  salesReviewExcelSheets,
  salesReviewExportBasename,
} from './salesReviewExport'

const NOW = new Date('2026-10-29T06:30:00.000Z')

function p(partial: Partial<SalesReviewProjectInput> & Pick<SalesReviewProjectInput, 'id'>): SalesReviewProjectInput {
  return {
    slNo: 1,
    projectStatus: 'PROPOSAL',
    year: '2026-27',
    projectCost: 200_000,
    grossProfit: 40_000,
    expectedProfit: null,
    profitability: 20,
    salesProbability: 30,
    systemCapacity: 10,
    systemType: 'ON_GRID',
    type: 'SUBSIDY',
    confirmationDate: null,
    expectedCommissioningDate: '2026-11-15T00:00:00.000Z',
    availingLoan: false,
    salespersonId: 's1',
    salespersonName: 'Kavya V',
    customerName: 'RAK Tower',
    customerType: 'APARTMENT',
    ...partial,
  }
}

describe('salesReviewExcelSheets', () => {
  it('builds summary, achievement, forecast, and deal sheets', () => {
    const payload = buildSalesReview(
      [
        p({ id: 'open' }),
        p({
          id: 'won',
          projectStatus: 'CONFIRMED',
          projectCost: 500_000,
          confirmationDate: '2026-05-10T00:00:00.000Z',
        }),
      ],
      NOW,
    )
    const sheets = salesReviewExcelSheets(payload, { sellerLabel: 'Kavya V', exportedBy: 'admin@rayenna.test' })
    expect(sheets.summary.find((r) => r.Field === 'Seller')?.Value).toBe('Kavya V')
    expect(sheets.achievement.some((r) => r.Metric === 'Revenue')).toBe(true)
    expect(sheets.forecast.some((r) => r.Metric === 'Pipeline')).toBe(true)
    expect(sheets.deals.length).toBeGreaterThanOrEqual(1)
    expect(sheets.deals.some((d) => d.Customer === 'RAK Tower')).toBe(true)
    expect(salesReviewExportBasename(payload, 'Kavya V')).toMatch(/^sales-review-FY2026-27-kavya-v-/)
  })

  it('writes excel, pdf, and pptx buffers', async () => {
    const payload = buildSalesReview([p({ id: 'open' })], NOW)
    const meta = { sellerLabel: 'Kavya V', exportedBy: 'admin@rayenna.test' }
    const xlsx = buildSalesReviewExcelBuffer(payload, meta)
    const pdf = await buildSalesReviewPdfBuffer(payload, meta)
    const pptx = await buildSalesReviewPptxBuffer(payload, meta)
    expect(xlsx.slice(0, 2).toString()).toBe('PK')
    expect(pdf.slice(0, 4).toString()).toBe('%PDF')
    expect(pptx.slice(0, 2).toString()).toBe('PK')
    expect(pptx.length).toBeGreaterThan(2000)
  })
})
