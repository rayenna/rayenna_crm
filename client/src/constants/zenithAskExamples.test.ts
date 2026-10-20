import { describe, expect, it } from 'vitest'
import { zenithAskDemoChips, zenithAskTryChips } from './zenithAskExamples'

describe('zenithAskDemoChips', () => {
  it('uses live-book call / stall / oldest ticket for Sales', () => {
    expect(zenithAskDemoChips('SALES')).toEqual([
      'Who should I call today?',
      'Why is my pipeline stalling?',
      'Who has the oldest open ticket?',
    ])
  })

  it('omits tickets and stall for Finance', () => {
    expect(zenithAskDemoChips('FINANCE')).toEqual([
      'Who should I call today?',
      'Unpaid invoices',
      'Payment status breakdown',
    ])
  })

  it('drops demo questions from the Try asking row', () => {
    expect(
      zenithAskTryChips(
        [
          'Who should I call today?',
          'Why is my pipeline stalling?',
          'Show open support tickets',
          'List pending subsidy projects',
        ],
        zenithAskDemoChips('ADMIN'),
      ),
    ).toEqual(['Show open support tickets', 'List pending subsidy projects'])
  })
})
