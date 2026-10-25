import { describe, expect, it } from 'vitest'
import { pickAskTableEmphasisColumn, pickAskTableTitleColumn } from './zenithAskTableLayout'

const pipelineCols = [
  { key: 'sl', label: 'SL' },
  { key: 'customer', label: 'Customer' },
  { key: 'stage', label: 'Stage' },
  { key: 'dealHealth', label: 'Deal health' },
  { key: 'score', label: 'Score' },
  { key: 'daysActive', label: 'Days active' },
  { key: 'daysIdle', label: 'Days idle' },
  { key: 'orderValue', label: 'Order value' },
]

describe('zenithAskTableLayout', () => {
  it('picks customer as the mobile card title for pipeline analysis', () => {
    expect(pickAskTableTitleColumn(pipelineCols)?.key).toBe('customer')
  })

  it('picks order value as the emphasized amount on the card', () => {
    expect(pickAskTableEmphasisColumn(pipelineCols, 'customer')?.key).toBe('orderValue')
  })

  it('uses customer name as the card title for system-type customer lists', () => {
    expect(
      pickAskTableTitleColumn([
        { key: 'name', label: 'Name' },
        { key: 'project', label: 'Project' },
        { key: 'status', label: 'Status' },
        { key: 'customerId', label: 'ID' },
      ])?.key,
    ).toBe('name')
  })

  it('falls back when columns are anonymous', () => {
    const cols = [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
    ]
    expect(pickAskTableTitleColumn(cols)?.key).toBe('a')
    expect(pickAskTableEmphasisColumn(cols, 'a')).toBeNull()
  })
})
