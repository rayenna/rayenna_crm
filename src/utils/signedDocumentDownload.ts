import crypto from 'crypto';

const DEFAULT_TTL_SEC = 5 * 60; // 5 minutes for window.open download

function signingSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

function hmac(payload: string): string {
  return crypto.createHmac('sha256', signingSecret()).update(payload).digest('hex');
}

/** Short-lived ticket for document download without embedding the staff JWT in the URL. */
export function signDocumentDownloadTicket(
  documentId: string,
  userId: string,
  download: boolean,
  ttlSec: number = DEFAULT_TTL_SEC,
): { exp: number; sig: string } {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = hmac(`${documentId}:${userId}:${download ? '1' : '0'}:${exp}`);
  return { exp, sig };
}

export function verifyDocumentDownloadTicket(
  documentId: string,
  userId: string,
  download: boolean,
  expRaw: string,
  sigRaw: string,
): boolean {
  const exp = parseInt(String(expRaw || ''), 10);
  const sig = String(sigRaw || '').trim().toLowerCase();
  if (!Number.isFinite(exp) || !sig || sig.length < 32) return false;
  if (exp < Math.floor(Date.now() / 1000)) return false;
  const expected = hmac(`${documentId}:${userId}:${download ? '1' : '0'}:${exp}`);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(sig, 'utf8'));
  } catch {
    return false;
  }
}
