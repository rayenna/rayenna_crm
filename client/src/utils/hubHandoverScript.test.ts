import { describe, expect, it } from 'vitest'
import {
  buildHubCustomerWhatsApp,
  buildHubHandoverChecklist,
  buildHubStaffCredentialsCopy,
  hubUrlForCopy,
} from './hubHandoverScript'

describe('hubHandoverScript', () => {
  it('includes username, URL, and Android install path', () => {
    const text = buildHubHandoverChecklist({
      hubUrl: 'https://example-hub.test',
      username: 'ravi.k',
      phone: 'android',
    })
    expect(text).toContain('https://example-hub.test')
    expect(text).toContain('ravi.k')
    expect(text).toContain('Chrome')
    expect(text).toContain('Add to Home screen')
    expect(text).not.toContain('Share, then Add to Home Screen')
  })

  it('uses Safari share sheet for iPhone', () => {
    const text = buildHubHandoverChecklist({
      hubUrl: 'https://example-hub.test',
      username: 'ravi.k',
      phone: 'iphone',
    })
    expect(text).toContain('Safari')
    expect(text).toContain('Share, then Add to Home Screen')
    expect(text).not.toContain('Install app')
  })

  it('WhatsApp copy has URL and no password', () => {
    const text = buildHubCustomerWhatsApp({
      hubUrl: 'https://example-hub.test',
      username: 'ravi.k',
    })
    expect(text).toContain('https://example-hub.test')
    expect(text).toContain('ravi.k')
    expect(text.toLowerCase()).not.toContain('password')
  })

  it('staff credentials copy includes password and URL', () => {
    const text = buildHubStaffCredentialsCopy({
      hubUrl: 'https://example-hub.test',
      username: 'ravi.k',
      password: 'TempPass1',
    })
    expect(text).toContain('TempPass1')
    expect(text).toContain('Open: https://example-hub.test')
  })

  it('placeholder when Hub URL is unset', () => {
    expect(hubUrlForCopy('')).toContain('VITE_SOLAR_HUB_URL')
  })
})
