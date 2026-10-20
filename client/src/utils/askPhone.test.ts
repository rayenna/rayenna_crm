import { describe, expect, it } from 'vitest'
import { askPhoneDigits, askTelHref, askWhatsAppHref } from './askPhone'

describe('askPhone', () => {
  it('adds 91 for 10-digit Indian numbers', () => {
    expect(askPhoneDigits('9876543210')).toBe('919876543210')
    expect(askTelHref('9876543210')).toBe('tel:+919876543210')
    expect(askWhatsAppHref('9876543210')).toBe('https://wa.me/919876543210')
  })
})
