import { describe, expect, it } from 'vitest'
import {
  askProjectsDrillFilterPatch,
  askProjectsDrillHasAny,
  parseAskProjectsDrillParams,
} from './askProjectsDrillParams'
import { normalizeSystemTypeFilter } from './projectListQuery'

describe('parseAskProjectsDrillParams systemType', () => {
  it('reads a single system type from the URL', () => {
    const d = parseAskProjectsDrillParams(new URLSearchParams('systemType=HYBRID'))
    expect(d.systemType).toEqual(['HYBRID'])
    expect(askProjectsDrillHasAny(d)).toBe(true)
    expect(askProjectsDrillFilterPatch(d).systemType).toEqual(['HYBRID'])
  })

  it('reads multiple system types and drops invalid values', () => {
    const p = new URLSearchParams()
    p.append('systemType', 'ON_GRID')
    p.append('systemType', 'hybrid')
    p.append('systemType', 'bogus')
    const d = parseAskProjectsDrillParams(p)
    expect(d.systemType).toEqual(['ON_GRID', 'HYBRID'])
  })
})

describe('normalizeSystemTypeFilter', () => {
  it('coerces a saved string from older sessions', () => {
    expect(normalizeSystemTypeFilter('HYBRID')).toEqual(['HYBRID'])
    expect(normalizeSystemTypeFilter(['on_grid', 'HYBRID', 'HYBRID'])).toEqual([
      'ON_GRID',
      'HYBRID',
    ])
    expect(normalizeSystemTypeFilter(undefined)).toEqual([])
  })
})
