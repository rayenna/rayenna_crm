import { describe, expect, it } from 'vitest'
import {
  buildLostDealsExcelBuffer,
  buildLostDealsPdfBuffer,
  buildLostDealsPptxBuffer,
  lostDealsExcelSheets,
  lostDealsExportBasename,
  type LostDealsExportPayload,
} from './lostDealsExport'

const payload: LostDealsExportPayload = {
  summary: {
    lostCount: 1,
    lostValue: 400_000,
    wonCount: 3,
    wonValue: 1_200_000,
    winRateCount: 75,
    winRateValue: 75,
    uncategorizedCount: 0,
  },
  byReason: [{ reason: 'NO_BUDGET', count: 1, value: 400_000 }],
  byCompetitionSubtype: [],
  bySalesperson: [{ id: 's1', name: 'Kavya V', count: 1, value: 400_000 }],
  byFy: [{ fy: '2026-27', count: 1, value: 400_000 }],
  projects: [
    {
      slNo: 42,
      customerName: 'Nair Villa',
      salespersonName: 'Kavya V',
      year: '2026-27',
      projectCost: 400_000,
      lostReason: 'NO_BUDGET',
      lostToCompetitionReason: null,
      lostOtherReason: null,
      lostDate: '2026-09-12T00:00:00.000Z',
      confirmationDate: null,
      peReady: true,
    },
  ],
}

const meta = {
  sellerLabel: 'All sellers',
  exportedBy: 'admin@rayenna.test',
  periodLabel: 'FY2026-27',
  generatedAt: '2026-10-31T06:30:00.000Z',
}

describe('lostDealsExcelSheets', () => {
  it('builds summary, reason mix, salesperson, and lost list', () => {
    const sheets = lostDealsExcelSheets(payload, meta)
    expect(sheets.summary.find((r) => r.Field === 'Seller')?.Value).toBe('All sellers')
    expect(sheets.summary.find((r) => r.Field === 'Lost deals')?.Value).toBe(1)
    expect(sheets.byReason[0]?.Reason).toBe('No Budget')
    expect(sheets.bySalesperson[0]?.Seller).toBe('Kavya V')
    expect(sheets.projects[0]?.Customer).toBe('Nair Villa')
    expect(sheets.projects[0]?.['PE Ready']).toBe('Y')
    expect(lostDealsExportBasename(meta)).toBe('lost-deals-fy2026-27-all-sellers-2026-10-31')
  })

  it('writes excel, pdf, and pptx buffers', async () => {
    const xlsx = buildLostDealsExcelBuffer(payload, meta)
    const pdf = await buildLostDealsPdfBuffer(payload, meta)
    const pptx = await buildLostDealsPptxBuffer(payload, meta)
    expect(xlsx.slice(0, 2).toString()).toBe('PK')
    expect(pdf.slice(0, 4).toString()).toBe('%PDF')
    expect(pptx.slice(0, 2).toString()).toBe('PK')
    expect(pptx.length).toBeGreaterThan(2000)
  })
})
