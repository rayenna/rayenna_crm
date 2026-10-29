import { describe, expect, it } from 'vitest'
import { buildDeliveryControl, type DeliveryControlProjectInput } from './deliveryControl'
import {
  buildDeliveryControlExcelBuffer,
  buildDeliveryControlPdfBuffer,
  buildDeliveryControlPptxBuffer,
  deliveryControlExcelSheets,
  deliveryControlExportBasename,
} from './deliveryControlExport'

const NOW = new Date('2026-10-29T06:30:00.000Z')

function p(
  partial: Partial<DeliveryControlProjectInput> & Pick<DeliveryControlProjectInput, 'id'>,
): DeliveryControlProjectInput {
  return {
    slNo: 158,
    projectStatus: 'UNDER_INSTALLATION',
    year: '2026-27',
    projectCost: 500_000,
    systemCapacity: 10,
    systemType: 'ON_GRID',
    type: 'SUBSIDY',
    confirmationDate: '2026-05-10T00:00:00.000Z',
    expectedCommissioningDate: '2026-11-15T00:00:00.000Z',
    stageEnteredAt: '2026-09-01T00:00:00.000Z',
    feasibilityDate: '2026-06-01T00:00:00.000Z',
    registrationDate: '2026-06-15T00:00:00.000Z',
    mnrePortalRegistrationDate: null,
    installationCompletionDate: null,
    completionReportSubmissionDate: null,
    subsidyRequestDate: null,
    subsidyCreditedDate: null,
    incentiveEligible: true,
    assignedOpsId: 'ops1',
    opsPersonName: 'Ops One',
    salespersonId: 's1',
    salespersonName: 'Kavya V',
    customerName: 'RAK Tower',
    customerType: 'APARTMENT',
    documentCategories: ['kseb'],
    ...partial,
  }
}

describe('deliveryControlExcelSheets', () => {
  it('builds summary, commissioning, ops load, and job sheets', () => {
    const payload = buildDeliveryControl([p({ id: 'j1' })], NOW)
    const sheets = deliveryControlExcelSheets(payload, {
      opsLabel: 'All ops',
      exportedBy: 'admin@rayenna.test',
    })
    expect(sheets.summary.find((r) => r.Field === 'Ops filter')?.Value).toBe('All ops')
    expect(sheets.commissioning.some((r) => r.Metric === 'Jobs')).toBe(true)
    expect(sheets.opsLoad[0]?.Ops).toBe('Ops One')
    expect(sheets.jobs.some((d) => d.Customer === 'RAK Tower')).toBe(true)
    expect(sheets.subsidyFunnel.some((r) => r.Metric === 'Jobs')).toBe(true)
    expect(sheets.summary.find((r) => r.Field === 'Subsidy on clock')?.Value).toBe(1)
    expect(deliveryControlExportBasename(payload, 'All ops')).toMatch(/^delivery-control-FY2026-27-all-ops-/)
  })

  it('writes excel, pdf, and pptx buffers', async () => {
    const payload = buildDeliveryControl([p({ id: 'j1' })], NOW)
    const meta = { opsLabel: 'All ops', exportedBy: 'admin@rayenna.test' }
    const xlsx = buildDeliveryControlExcelBuffer(payload, meta)
    const pdf = await buildDeliveryControlPdfBuffer(payload, meta)
    const pptx = await buildDeliveryControlPptxBuffer(payload, meta)
    expect(xlsx.slice(0, 2).toString()).toBe('PK')
    expect(pdf.slice(0, 4).toString()).toBe('%PDF')
    expect(pptx.slice(0, 2).toString()).toBe('PK')
    expect(pptx.length).toBeGreaterThan(2000)
  })
})
