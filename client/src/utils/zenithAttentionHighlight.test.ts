import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  markZenithAttentionIntroPlayed,
  shouldPlayZenithAttentionIntro,
} from './zenithAttentionHighlight'

describe('zenithAttentionHighlight', () => {
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('plays intro when never seen', () => {
    expect(shouldPlayZenithAttentionIntro('u1')).toBe(true)
  })

  it('does not replay on the same calendar day', () => {
    markZenithAttentionIntroPlayed('u1')
    expect(shouldPlayZenithAttentionIntro('u1')).toBe(false)
  })
})
