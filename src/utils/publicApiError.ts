import type { Response } from 'express'

/** Safe, user-facing copy — never expose Prisma paths, pool settings, or stack traces. */
export const PUBLIC_ERRORS = {
  GENERIC:
    'Something went wrong on our side. Please try again. If this keeps happening, contact your administrator.',
  DATABASE:
    'We could not reach the database right now. Please try again in a moment. If this keeps happening, contact your administrator.',
  BUSY: 'The server is busy or still waking up. Please wait a moment and try again.',
  NETWORK: 'We could not connect to the server. Check your internet connection and try again.',
} as const

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
  /stack\s*:/i,
]

/** True when the string looks like a developer-facing error, not end-user copy. */
export function isTechnicalErrorMessage(message: string): boolean {
  const m = message.trim()
  if (!m) return true
  if (m.length > 220) return true
  return TECHNICAL_PATTERNS.some((re) => re.test(m))
}

/** Map Prisma / infra failures to calm, actionable messages. */
export function toPublicErrorMessage(
  error: unknown,
  fallback: string = PUBLIC_ERRORS.GENERIC,
): string {
  if (error == null) return fallback

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : ''

  if (code.startsWith('P1') || code === 'P2024') {
    return PUBLIC_ERRORS.DATABASE
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ''

  if (message) {
    const lower = message.toLowerCase()
    if (
      lower.includes('connection pool') ||
      lower.includes('timed out fetching') ||
      lower.includes("can't reach database") ||
      lower.includes('database connection')
    ) {
      return PUBLIC_ERRORS.DATABASE
    }
    if (!isTechnicalErrorMessage(message)) {
      return message
    }
  }

  return fallback
}

export function sendErrorResponse(
  res: Response,
  status: number,
  error: unknown,
  fallback: string = PUBLIC_ERRORS.GENERIC,
): void {
  if (res.headersSent) return
  res.status(status).json({ error: toPublicErrorMessage(error, fallback) })
}
