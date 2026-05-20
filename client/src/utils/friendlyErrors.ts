/** Mirrors server `publicApiError` — last line of defense before UI/toast. */

const TECHNICAL_PATTERNS: RegExp[] = [
  /invalid\s+`prisma\./i,
  /prisma\.\w+\./i,
  /invocation\s+in\s+\//i,
  /connection\s+pool/i,
  /timed\s+out\s+fetching/i,
  /pris\.ly\//i,
  /can't\s+reach\s+database/i,
  /database\s+server\s+at/i,
  /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN/i,
  /\/Users\/|\/home\/|\\\\src\\\\/i,
  /\.ts:\d+/,
  /at\s+\w+\s+\(/,
  /JWT_SECRET|DATABASE_URL/i,
]

export const FRIENDLY_DEFAULT =
  'Something went wrong. Please try again. If this keeps happening, contact your administrator.'

export const FRIENDLY_DATABASE =
  'We could not reach the database right now. Please try again in a moment.'

export function isTechnicalErrorMessage(message: string): boolean {
  const m = message.trim()
  if (!m) return true
  if (m.length > 220) return true
  return TECHNICAL_PATTERNS.some((re) => re.test(m))
}

/** Returns a safe string for UI, or null if the raw message must not be shown. */
export function sanitizeUserFacingMessage(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  const lower = trimmed.toLowerCase()
  if (
    lower.includes('connection pool') ||
    lower.includes('timed out fetching') ||
    lower.includes("can't reach database") ||
    lower.includes('database connection') ||
    /invalid\s+`prisma\./i.test(trimmed)
  ) {
    return FRIENDLY_DATABASE
  }

  if (isTechnicalErrorMessage(trimmed)) return null
  return trimmed
}
