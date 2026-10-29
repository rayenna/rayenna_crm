import { describe, expect, it } from 'vitest'
import { mergeReportPrefs } from './reportListPrefs'

const defaults = {
  salespersonId: '',
  search: '',
  stage: [] as string[],
  sortKey: 'closeDate',
  sortOrder: 'asc' as 'asc' | 'desc',
}

describe('mergeReportPrefs', () => {
  it('returns defaults when storage is empty or invalid', () => {
    expect(mergeReportPrefs(defaults, null)).toEqual(defaults)
    expect(mergeReportPrefs(defaults, 'nope')).toEqual(defaults)
    expect(mergeReportPrefs(defaults, [])).toEqual(defaults)
  })

  it('restores seller, search, list filters, and sort', () => {
    const merged = mergeReportPrefs(defaults, {
      salespersonId: 's1',
      search: 'nair',
      stage: ['Proposal'],
      sortKey: 'orderValue',
      sortOrder: 'desc',
      extra: 1,
    })
    expect(merged).toEqual({
      salespersonId: 's1',
      search: 'nair',
      stage: ['Proposal'],
      sortKey: 'orderValue',
      sortOrder: 'desc',
    })
  })

  it('ignores wrong types so a stale blob cannot break the page', () => {
    const merged = mergeReportPrefs(defaults, {
      salespersonId: 12,
      stage: 'Proposal',
      sortOrder: 'sideways',
      search: 'ok',
    })
    expect(merged.salespersonId).toBe('')
    expect(merged.stage).toEqual([])
    expect(merged.sortOrder).toBe('asc')
    expect(merged.search).toBe('ok')
  })
})
