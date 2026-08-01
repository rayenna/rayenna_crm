import { describe, expect, it } from 'vitest'
import { ProjectStatus, type Project } from '../types'
import {
  capacitiesDiffer,
  evaluatePeCapacityDrift,
  peCapacityToCrmPatchValue,
  pickPeSystemSizeKw,
} from './peSyncSteward'

function project(over: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    slNo: 1,
    customerId: 'c1',
    type: 'SUBSIDY' as any,
    projectServiceType: 'EPC_PROJECT' as any,
    year: '2026',
    count: 1,
    incentiveEligible: true,
    projectStatus: ProjectStatus.PROPOSAL,
    systemCapacity: 5,
    totalAmountReceived: 0,
    balanceAmount: 0,
    paymentStatus: 'PENDING' as any,
    createdById: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

describe('pickPeSystemSizeKw', () => {
  it('prefers costing over roi', () => {
    expect(pickPeSystemSizeKw({ costingSystemSizeKw: 6, roiSystemSizeKw: 5 })).toEqual({
      kw: 6,
      source: 'costing',
    })
    expect(pickPeSystemSizeKw({ roiSystemSizeKw: 4.5 })?.source).toBe('roi')
  })
})

describe('evaluatePeCapacityDrift', () => {
  it('returns empty when aligned', () => {
    expect(
      evaluatePeCapacityDrift(project({ systemCapacity: 5 }), { costingSystemSizeKw: 5 }),
    ).toEqual([])
  })

  it('flags mismatch and missing CRM', () => {
    const drift = evaluatePeCapacityDrift(project({ systemCapacity: 5 }), {
      costingSystemSizeKw: 6,
    })
    expect(drift).toHaveLength(1)
    expect(drift[0].peValue).toBe(6)
    expect(drift[0].crmValue).toBe(5)

    const missing = evaluatePeCapacityDrift(project({ systemCapacity: undefined }), {
      roiSystemSizeKw: 3,
    })
    expect(missing[0].crmValue).toBeNull()
    expect(missing[0].peSource).toBe('roi')
  })
})

describe('helpers', () => {
  it('tolerance and patch rounding', () => {
    expect(capacitiesDiffer(5, 5.05)).toBe(false)
    expect(capacitiesDiffer(5, 5.2)).toBe(true)
    expect(peCapacityToCrmPatchValue(5.04)).toBe(5)
    expect(peCapacityToCrmPatchValue(5.5)).toBe(5.5)
  })
})
