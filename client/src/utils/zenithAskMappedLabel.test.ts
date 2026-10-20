import { describe, expect, it } from 'vitest'
import { zenithAskMappedLabel } from './zenithAskMappedLabel'

describe('zenithAskMappedLabel', () => {
  it('maps call list and stalling immediately', () => {
    expect(zenithAskMappedLabel('Who should I call today?')).toBe('Who to call')
    expect(zenithAskMappedLabel('Why is my pipeline stalling?')).toBe('Stalled pipeline')
  })

  it('maps oldest ticket and proposal', () => {
    expect(zenithAskMappedLabel('Who has the oldest open ticket?')).toBe('Oldest open ticket')
    expect(zenithAskMappedLabel('Open proposal for SL 12')).toBe('Proposal Engine')
  })
})
