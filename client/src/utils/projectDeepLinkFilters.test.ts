import { describe, expect, it } from 'vitest'
import {
  filtersHaveDeepLinkOnlyFields,
  isProjectsDeepLinkChipId,
  projectsDeepLinkClearPatch,
} from './projectDeepLinkFilters'

describe('projectDeepLinkFilters', () => {
  it('recognizes deep-link chip ids', () => {
    expect(isProjectsDeepLinkChipId('pe-bucket')).toBe(true)
    expect(isProjectsDeepLinkChipId('bank-SBI')).toBe(true)
    expect(isProjectsDeepLinkChipId('zenith-slice')).toBe(true)
    expect(isProjectsDeepLinkChipId('panel-brand')).toBe(true)
    expect(isProjectsDeepLinkChipId('pending-subsidy')).toBe(false)
    expect(isProjectsDeepLinkChipId('availing-loan')).toBe(false)
    expect(isProjectsDeepLinkChipId('status-LEAD')).toBe(false)
  })

  it('clear patch resets deep-link fields only', () => {
    const patch = projectsDeepLinkClearPatch()
    expect(patch.peBucket).toBeNull()
    expect(patch.financingBank).toEqual([])
    expect(patch.zenithSlice).toBeNull()
    expect(patch.panelBrand).toBe('')
  })

  it('detects when deep-link fields are active', () => {
    expect(
      filtersHaveDeepLinkOnlyFields({
        peBucket: null,
        financingBank: [],
        zenithClosedFrom: null,
        zenithClosedTo: null,
        zenithSlice: null,
        zenithFyProfit: false,
        panelBrand: '',
        inverterBrand: '',
        lifecycleSpecsComplete: false,
        lifecycleSpecsIncomplete: false,
        salespersonUnassigned: false,
        leadSourceIsNull: false,
      }),
    ).toBe(false)
    expect(
      filtersHaveDeepLinkOnlyFields({
        peBucket: 'draft',
        financingBank: [],
        zenithClosedFrom: null,
        zenithClosedTo: null,
        zenithSlice: null,
        zenithFyProfit: false,
        panelBrand: '',
        inverterBrand: '',
        lifecycleSpecsComplete: false,
        lifecycleSpecsIncomplete: false,
        salespersonUnassigned: false,
        leadSourceIsNull: false,
      }),
    ).toBe(true)
  })
})
