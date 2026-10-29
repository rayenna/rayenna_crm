import { describe, expect, it } from 'vitest'
import { buildFunnelVelocity, type FunnelVelocityProjectInput } from './funnelVelocity'
import {
  buildFunnelVelocityExcelBuffer,
  buildFunnelVelocityPdfBuffer,
  buildFunnelVelocityPptxBuffer,
  funnelVelocityExcelSheets,
  funnelVelocityExportBasename,
} from './funnelVelocityExport'

const NOW = new Date('2026-10-29T06:30:00.000Z')

function p(
  partial: Partial<FunnelVelocityProjectInput> & Pick<FunnelVelocityProjectInput, 'id'>,
): FunnelVelocityProjectInput {
  return {
    slNo: 42,
    projectStatus: 'PROPOSAL',
    year: '2026-27',
    projectCost: 400_000,
    salesProbability: 40,
    systemCapacity: 5,
    systemType: 'ON_GRID',
    type: 'SUBSIDY',
    confirmationDate: null,
    expectedCommissioningDate: '2026-12-15T00:00:00.000Z',
    stageEnteredAt: '2026-09-01T00:00:00.000Z',
    createdAt: '2026-08-01T00:00:00.000Z',
    lostDate: null,
    salespersonId: 's1',
    salespersonName: 'Kavya V',
    customerName: 'Nair Villa',
    customerType: 'RESIDENTIAL',
    ...partial,
  }
}

describe('funnelVelocityExcelSheets', () => {
  it('builds summary, funnel, aging, seller load, and stuck list', () => {
    const payload = buildFunnelVelocity([p({ id: 'j1' })], NOW)
    const sheets = funnelVelocityExcelSheets(payload, {
      sellerLabel: 'All sellers',
      exportedBy: 'admin@rayenna.test',
    })
    expect(sheets.summary.find((r) => r.Field === 'Seller')?.Value).toBe('All sellers')
    expect(sheets.summary.find((r) => r.Field === 'Open deals')?.Value).toBe(1)
    expect(sheets.funnel.some((r) => r.Metric === 'SLA red')).toBe(true)
    expect(sheets.sellerLoad[0]?.Seller).toBe('Kavya V')
    expect(sheets.deals.some((d) => d.Customer === 'Nair Villa')).toBe(true)
    expect(funnelVelocityExportBasename(payload, 'All sellers')).toMatch(
      /^funnel-velocity-FY2026-27-all-sellers-/,
    )
  })

  it('writes excel, pdf, and pptx buffers', async () => {
    const payload = buildFunnelVelocity([p({ id: 'j1' })], NOW)
    const meta = { sellerLabel: 'All sellers', exportedBy: 'admin@rayenna.test' }
    const xlsx = buildFunnelVelocityExcelBuffer(payload, meta)
    const pdf = await buildFunnelVelocityPdfBuffer(payload, meta)
    const pptx = await buildFunnelVelocityPptxBuffer(payload, meta)
    expect(xlsx.slice(0, 2).toString()).toBe('PK')
    expect(pdf.slice(0, 4).toString()).toBe('%PDF')
    expect(pptx.slice(0, 2).toString()).toBe('PK')
    expect(pptx.length).toBeGreaterThan(2000)
  })
})
