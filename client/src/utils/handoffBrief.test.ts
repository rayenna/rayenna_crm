import { describe, expect, it } from 'vitest'
import { ProjectStatus, type Project, type ProjectRemark } from '../types'
import {
  buildHandoffBrief,
  buildHandoffLoggedRemark,
  defaultHandoffAudienceForRole,
} from './handoffBrief'

function sampleProject(over: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    slNo: 42,
    customerId: 'cust-1',
    type: 'SUBSIDY' as any,
    projectServiceType: 'EPC_PROJECT' as any,
    year: '2026',
    count: 1,
    incentiveEligible: true,
    projectStatus: ProjectStatus.CONFIRMED,
    systemCapacity: 5,
    panelBrand: 'Waaree',
    panelCapacityW: 540,
    inverterBrand: 'Growatt',
    inverterCapacityKw: 5,
    projectCost: 400000,
    advanceReceived: 100000,
    totalAmountReceived: 100000,
    balanceAmount: 300000,
    paymentStatus: 'PARTIAL' as any,
    confirmationDate: '2026-02-01',
    createdById: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    customer: {
      id: 'cust-1',
      customerId: 'C00001',
      customerName: 'Handoff Customer',
      firstName: 'Handoff',
      lastName: 'Customer',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    documents: [
      {
        id: 'd1',
        projectId: 'proj-1',
        fileName: 'site-photo.jpg',
        filePath: '/x',
        fileType: 'image/jpeg',
        fileSize: 100,
        category: 'SITE_PHOTOS',
        uploadedById: 'u1',
        createdAt: '2026-01-10T00:00:00.000Z',
        updatedAt: '2026-01-10T00:00:00.000Z',
      },
    ],
    auditLogs: [
      {
        id: 'a1',
        projectId: 'proj-1',
        userId: 'u1',
        action: 'UPDATE',
        field: 'projectStatus',
        oldValue: 'PROPOSAL',
        newValue: 'CONFIRMED',
        createdAt: '2026-02-01T10:00:00.000Z',
        user: { id: 'u1', email: 's@r.co', name: 'Sales User', role: 'SALES' as any, createdAt: '', updatedAt: '' },
      },
    ],
    ...over,
  }
}

const remarks: ProjectRemark[] = [
  {
    id: 'r1',
    projectId: 'proj-1',
    userId: 'u1',
    remark: 'Customer prefers morning install.',
    createdAt: '2026-02-02T09:00:00.000Z',
    updatedAt: '2026-02-02T09:00:00.000Z',
    user: { id: 'u1', email: 's@r.co', name: 'Sales User', role: 'SALES' as any, createdAt: '', updatedAt: '' },
  },
]

describe('buildHandoffBrief', () => {
  it('sales_to_ops emphasizes site and PE, includes commercial snapshot', () => {
    const text = buildHandoffBrief(
      {
        project: sampleProject(),
        remarks,
        peSummary: { peStatus: 'draft', lastUpdated: '2026-02-03T12:00:00.000Z' },
        openGaps: ['Missing panel brand'],
        generatedAt: new Date('2026-03-01T08:00:00.000Z'),
      },
      'sales_to_ops',
    )
    expect(text).toMatch(/Sales → Ops/)
    expect(text).toMatch(/Project #42/)
    expect(text).toMatch(/Waaree/)
    expect(text).toMatch(/Proposal Engine: draft/)
    expect(text).toMatch(/Missing panel brand/)
    expect(text).toMatch(/Customer prefers morning install/)
    expect(text).toMatch(/site-photo\.jpg/)
    expect(text).toMatch(/Commercial snapshot/)
    expect(text).not.toMatch(/— Payments —/)
  })

  it('ops_to_finance emphasizes payments', () => {
    const text = buildHandoffBrief(
      {
        project: sampleProject(),
        remarks: [],
        peSummary: { peStatus: 'proposal-ready' },
        generatedAt: new Date('2026-03-01T08:00:00.000Z'),
      },
      'ops_to_finance',
    )
    expect(text).toMatch(/Ops → Finance/)
    expect(text).toMatch(/— Payments —/)
    expect(text).toMatch(/Outstanding/)
    expect(text).not.toMatch(/— Site & lifecycle —/)
  })
})

describe('defaultHandoffAudienceForRole', () => {
  it('maps finance and ops', () => {
    expect(defaultHandoffAudienceForRole(['FINANCE'])).toBe('ops_to_finance')
    expect(defaultHandoffAudienceForRole(['OPERATIONS'])).toBe('sales_to_ops')
    expect(defaultHandoffAudienceForRole(['ADMIN'])).toBe('full')
  })
})

describe('buildHandoffLoggedRemark', () => {
  it('mentions audience', () => {
    expect(buildHandoffLoggedRemark('full')).toMatch(/Full brief/)
  })
})
