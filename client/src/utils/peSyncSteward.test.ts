import { describe, expect, it } from 'vitest'
import { ProjectStatus, type Project } from '../types'
import {
  capacitiesDiffer,
  evaluatePeCapacityDrift,
  isCostingCapacityOutOfBand,
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

describe('isCostingCapacityOutOfBand', () => {
  it('allows redundancy bumps within CRM to CRM+1 kW', () => {
    expect(isCostingCapacityOutOfBand(3, 3)).toBe(false)
    expect(isCostingCapacityOutOfBand(3, 3.2)).toBe(false)
    expect(isCostingCapacityOutOfBand(3, 3.3)).toBe(false)
    expect(isCostingCapacityOutOfBand(3, 4)).toBe(false)
    expect(isCostingCapacityOutOfBand(6, 6.2)).toBe(false)
  })

  it('flags below CRM or above CRM+1', () => {
    expect(isCostingCapacityOutOfBand(3, 2.9)).toBe(true)
    expect(isCostingCapacityOutOfBand(3, 4.01)).toBe(true)
    expect(isCostingCapacityOutOfBand(5, 6)).toBe(false) // at CRM+1 ceiling — OK
    expect(isCostingCapacityOutOfBand(5, 6.1)).toBe(true)
    expect(isCostingCapacityOutOfBand(null, 3)).toBe(true)
  })
})

describe('evaluatePeCapacityDrift', () => {
  it('returns empty when costing is within redundancy band', () => {
    expect(
      evaluatePeCapacityDrift(project({ systemCapacity: 6 }), { costingSystemSizeKw: 6.2 }),
    ).toEqual([])
    expect(
      evaluatePeCapacityDrift(project({ systemCapacity: 3 }), { costingSystemSizeKw: 3.3 }),
    ).toEqual([])
  })

  it('flags only costing sheet out-of-band; ignores ROI-only', () => {
    const drift = evaluatePeCapacityDrift(project({ systemCapacity: 5 }), {
      costingSystemSizeKw: 6.5,
    })
    expect(drift).toHaveLength(1)
    expect(drift[0].peValue).toBe(6.5)
    expect(drift[0].crmValue).toBe(5)
    expect(drift[0].peSource).toBe('costing')

    expect(
      evaluatePeCapacityDrift(project({ systemCapacity: 5 }), { roiSystemSizeKw: 9 }),
    ).toEqual([])

    const missing = evaluatePeCapacityDrift(project({ systemCapacity: undefined }), {
      costingSystemSizeKw: 3,
    })
    expect(missing).toHaveLength(1)
    expect(missing[0].crmValue).toBeNull()
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
