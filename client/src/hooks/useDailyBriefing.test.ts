import { describe, expect, it } from 'vitest'
import { briefingTodayYmd, shouldAutoOpenBriefing } from './useDailyBriefing'

describe('briefingTodayYmd', () => {
  it('uses the IST calendar day, not UTC', () => {
    // 22 Oct 2026 23:30 IST = 18:00 UTC same calendar day
    expect(briefingTodayYmd(new Date('2026-10-22T18:00:00.000Z'))).toBe('2026-10-22')
    // 23 Oct 2026 00:30 IST = 22 Oct 19:00 UTC — IST already rolled
    expect(briefingTodayYmd(new Date('2026-10-22T19:00:00.000Z'))).toBe('2026-10-23')
  })
})

describe('shouldAutoOpenBriefing', () => {
  it('opens when nothing was stored', () => {
    expect(shouldAutoOpenBriefing(null, '2026-10-22')).toBe(true)
  })

  it('stays closed for the same IST day after dismiss', () => {
    expect(shouldAutoOpenBriefing('2026-10-22', '2026-10-22')).toBe(false)
  })

  it('opens again the next IST day', () => {
    expect(shouldAutoOpenBriefing('2026-10-22', '2026-10-23')).toBe(true)
  })
})
