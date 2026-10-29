import { describe, expect, it } from 'vitest'
import { buildCollectionsCash, type CollectionsProjectInput } from './collectionsCash'
import {
  buildCollectionsCashExcelBuffer,
  buildCollectionsCashPdfBuffer,
  buildCollectionsCashPptxBuffer,
  collectionsCashExcelSheets,
  collectionsCashExportBasename,
} from './collectionsCashExport'

const NOW = new Date('2026-10-29T06:30:00.000Z')

function p(
  partial: Partial<CollectionsProjectInput> & Pick<CollectionsProjectInput, 'id'>,
): CollectionsProjectInput {
  return {
    slNo: 158,
    projectStatus: 'UNDER_INSTALLATION',
    year: '2026-27',
    type: 'SUBSIDY',
    projectCost: 500_000,
    balanceAmount: 200_000,
    totalAmountReceived: 300_000,
    paymentStatus: 'PARTIAL',
    confirmationDate: '2026-05-10T00:00:00.000Z',
    lastPaymentDate: '2026-09-01T00:00:00.000Z',
    availingLoan: false,
    financingBank: null,
    financingBankOther: null,
    subsidyRequestDate: null,
    subsidyCreditedDate: null,
    salespersonId: 's1',
    salespersonName: 'Kavya V',
    customerName: 'RAK Tower',
    customerType: 'APARTMENT',
    ...partial,
  }
}

describe('collectionsCashExcelSheets', () => {
  it('builds summary, aging, seller load, and collections sheets', () => {
    const payload = buildCollectionsCash([p({ id: 'j1' })], NOW)
    const sheets = collectionsCashExcelSheets(payload, {
      sellerLabel: 'All sellers',
      exportedBy: 'admin@rayenna.test',
    })
    expect(sheets.summary.find((r) => r.Field === 'Seller')?.Value).toBe('All sellers')
    expect(sheets.summary.find((r) => r.Field === 'Advance due')?.Value).toBe(0)
    expect(sheets.aging.some((r) => r.Metric === 'Outstanding')).toBe(true)
    expect(sheets.sellerLoad[0]?.Seller).toBe('Kavya V')
    expect(sheets.jobs.some((d) => d.Customer === 'RAK Tower')).toBe(true)
    expect(collectionsCashExportBasename(payload, 'All sellers')).toMatch(
      /^collections-cash-FY2026-27-all-sellers-/,
    )
  })

  it('writes excel, pdf, and pptx buffers', async () => {
    const payload = buildCollectionsCash([p({ id: 'j1' })], NOW)
    const meta = { sellerLabel: 'All sellers', exportedBy: 'admin@rayenna.test' }
    const xlsx = buildCollectionsCashExcelBuffer(payload, meta)
    const pdf = await buildCollectionsCashPdfBuffer(payload, meta)
    const pptx = await buildCollectionsCashPptxBuffer(payload, meta)
    expect(xlsx.slice(0, 2).toString()).toBe('PK')
    expect(pdf.slice(0, 4).toString()).toBe('%PDF')
    expect(pptx.slice(0, 2).toString()).toBe('PK')
    expect(pptx.length).toBeGreaterThan(2000)
  })
})
