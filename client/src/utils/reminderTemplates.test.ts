import { describe, expect, it } from 'vitest'
import { ProjectStatus, type Project } from '../types'
import {
  buildPaymentReminderRemark,
  getOutstanding,
  projectAllowsPaymentReminder,
  projectToReminderTemplate,
} from './reminderTemplates'

function sampleProject(over: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    slNo: 1,
    customerId: 'cust-1',
    type: 'SUBSIDY' as any,
    projectServiceType: 'EPC_PROJECT' as any,
    year: '2026',
    count: 1,
    incentiveEligible: true,
    projectStatus: ProjectStatus.CONFIRMED,
    projectCost: 500000,
    advanceReceived: 100000,
    payment1: 50000,
    totalAmountReceived: 150000,
    balanceAmount: 350000,
    paymentStatus: 'PARTIAL' as any,
    confirmationDate: '2026-01-15',
    createdById: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    customer: {
      id: 'cust-1',
      customerId: 'C00001',
      customerName: 'Test Customer',
      contactNumbers: JSON.stringify(['9876543210']),
      email: JSON.stringify(['a@b.co']),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    ...over,
  }
}

describe('projectToReminderTemplate', () => {
  it('maps outstanding balance and contacts', () => {
    const t = projectToReminderTemplate(sampleProject())
    expect(t.projectId).toBe('proj-1')
    expect(getOutstanding(t)).toBe(350000)
    expect(t.customerPhone).toBe('9876543210')
    expect(t.customerEmail).toBe('a@b.co')
  })

  it('computes balance when balanceAmount missing', () => {
    const t = projectToReminderTemplate(
      sampleProject({
        balanceAmount: undefined as any,
        projectCost: 200000,
        advanceReceived: 50000,
        payment1: 0,
        payment2: 0,
        payment3: 0,
        lastPayment: 0,
      }),
    )
    expect(getOutstanding(t)).toBe(150000)
  })
})

describe('projectAllowsPaymentReminder', () => {
  it('allows confirmed projects with balance', () => {
    expect(projectAllowsPaymentReminder(sampleProject())).toBe(true)
  })

  it('blocks early stages and fully paid', () => {
    expect(
      projectAllowsPaymentReminder(sampleProject({ projectStatus: ProjectStatus.PROPOSAL })),
    ).toBe(false)
    expect(
      projectAllowsPaymentReminder(
        sampleProject({ balanceAmount: 0, projectCost: 100000, advanceReceived: 100000 }),
      ),
    ).toBe(false)
  })
})

describe('buildPaymentReminderRemark', () => {
  it('mentions channel and amount', () => {
    const remark = buildPaymentReminderRemark('whatsapp', projectToReminderTemplate(sampleProject()))
    expect(remark).toMatch(/WhatsApp/)
    expect(remark).toMatch(/₹/)
  })
})
