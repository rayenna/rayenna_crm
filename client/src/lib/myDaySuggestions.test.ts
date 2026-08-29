import { describe, expect, it } from 'vitest'
import { UserRole } from '../types'
import { buildMyDaySuggestions } from './myDaySuggestions'

describe('buildMyDaySuggestions data_sense', () => {
  it('adds critical Data Sense rows for Sales', () => {
    const out = buildMyDaySuggestions({
      role: UserRole.SALES,
      userId: 'u1',
      focusData: {
        dataSenseGaps: [
          {
            projectId: 'p1',
            projectSerialNumber: 12,
            customerName: 'Acme',
            stageLabel: 'Proposal',
            primaryRuleId: 'A1',
            primaryTitle: 'Expected commissioning date has passed',
            severity: 'critical',
          },
        ],
      },
    })
    expect(out.some((s) => s.source === 'data_sense' && s.projectId === 'p1')).toBe(true)
    expect(out[0]?.urgency).toBe('critical')
  })

  it('skips Data Sense for Finance', () => {
    const out = buildMyDaySuggestions({
      role: UserRole.FINANCE,
      userId: 'u1',
      focusData: {
        dataSenseGaps: [
          {
            projectId: 'p1',
            customerName: 'Acme',
            stageLabel: 'Proposal',
            primaryRuleId: 'A1',
            primaryTitle: 'Expected commissioning date has passed',
            severity: 'critical',
          },
        ],
      },
    })
    expect(out.filter((s) => s.source === 'data_sense')).toHaveLength(0)
  })
})
