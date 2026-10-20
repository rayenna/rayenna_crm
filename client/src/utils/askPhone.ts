/** Digits-only E.164-ish number for tel: / wa.me (India default). */
export function askPhoneDigits(raw: string | null | undefined): string {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  return digits
}

export function askTelHref(raw: string | null | undefined): string | null {
  const d = askPhoneDigits(raw)
  return d ? `tel:+${d}` : null
}

export function askWhatsAppHref(raw: string | null | undefined, text?: string): string | null {
  const d = askPhoneDigits(raw)
  if (!d) return null
  const q = text?.trim() ? `?text=${encodeURIComponent(text.trim())}` : ''
  return `https://wa.me/${d}${q}`
}
