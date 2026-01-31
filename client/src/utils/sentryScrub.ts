/**
 * Scrubs sensitive data from Sentry event payloads (passwords, tokens, credit cards, etc.).
 * Used in Sentry.init() beforeSend so PII never leaves the browser.
 */

const REDACTED = '[REDACTED]'

const SENSITIVE_KEYS = new Set([
  'password', 'passwordconfirm', 'currentpassword', 'newpassword', 'repeatpassword',
  'token', 'accesstoken', 'refreshtoken', 'idtoken', 'apikey', 'api_key', 'secret',
  'authorization', 'auth', 'cookie', 'cookies', 'bearer',
  'creditcard', 'credit_card', 'cardnumber', 'cvv', 'cvc', 'ssn',
])

function scrubString(s: string): string {
  if (typeof s !== 'string' || s.length < 4) return s
  let out = s
  out = out.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}(\d{0,3})?\b/g, REDACTED)
  out = out.replace(/\beyJ[A-Za-z0-9_-]*\.(?:[A-Za-z0-9_-]*\.)?[A-Za-z0-9_-]*\b/g, REDACTED)
  return out
}

function scrubValue(val: unknown): unknown {
  if (val === null || val === undefined) return val
  if (typeof val === 'string') return scrubString(val)
  if (Array.isArray(val)) return val.map(scrubValue)
  if (typeof val === 'object' && val !== null) return scrubObject(val as Record<string, unknown>)
  return val
}

function scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out = { ...obj }
  for (const key of Object.keys(out)) {
    const keyLower = key.toLowerCase()
    if (SENSITIVE_KEYS.has(keyLower) || keyLower.includes('password') || keyLower.includes('token') || keyLower.includes('secret')) {
      out[key] = REDACTED
    } else {
      out[key] = scrubValue(out[key]) as unknown
    }
  }
  return out
}

export function scrubSentryEvent(event: Record<string, unknown>): Record<string, unknown> {
  try {
    const req = event.request as Record<string, unknown> | undefined
    if (req?.headers && typeof req.headers === 'object') {
      req.headers = scrubObject(req.headers as Record<string, unknown>)
    }
    if (req?.data && typeof req.data === 'object') {
      req.data = scrubValue(req.data) as unknown
    }
    if (req?.cookies && typeof req.cookies === 'object') {
      req.cookies = REDACTED
    }
    if (event.extra && typeof event.extra === 'object') {
      event.extra = scrubValue(event.extra) as unknown
    }
    if (event.contexts && typeof event.contexts === 'object') {
      event.contexts = scrubValue(event.contexts) as unknown
    }
    if (event.message && typeof event.message === 'string') {
      event.message = scrubString(event.message)
    }
    const breadcrumbs = event.breadcrumbs as Array<Record<string, unknown>> | undefined
    if (Array.isArray(breadcrumbs)) {
      event.breadcrumbs = breadcrumbs.map((b) => {
        const bc = { ...b }
        if (bc.message && typeof bc.message === 'string') bc.message = scrubString(bc.message)
        if (bc.data && typeof bc.data === 'object') bc.data = scrubValue(bc.data) as unknown
        return bc
      })
    }
    const exc = event.exception as { values?: Array<{ value?: string }> } | undefined
    const values = exc?.values
    if (Array.isArray(values)) {
      for (const v of values) {
        if (v?.value && typeof v.value === 'string') v.value = scrubString(v.value)
      }
    }
  } catch {
    // If scrubbing fails, leave event as-is
  }
  return event
}
