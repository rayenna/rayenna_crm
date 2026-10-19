import crypto from 'crypto';

const DEFAULT_TTL_SEC = 2 * 60 * 60; // 2 hours — enough for PE editor sessions

function signingSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

/** Safe layout filenames only: `{projectId}_{kind}.{ext}` */
export const GENERATED_LAYOUT_FILE_RE =
  /^([a-z0-9_-]+)_(satellite|ai_layout|manual_layout|3d_layout)\.(png|jpg|jpeg)$/i;

export function parseGeneratedLayoutFileName(fileName: string): {
  projectId: string;
  kind: string;
  ext: string;
} | null {
  const base = pathBasename(fileName);
  const m = base.match(GENERATED_LAYOUT_FILE_RE);
  if (!m) return null;
  return { projectId: m[1], kind: m[2].toLowerCase(), ext: m[3].toLowerCase() };
}

function pathBasename(fileName: string): string {
  const s = String(fileName || '').replace(/\\/g, '/');
  const parts = s.split('/');
  return parts[parts.length - 1] || '';
}

function hmac(payload: string): string {
  return crypto.createHmac('sha256', signingSecret()).update(payload).digest('hex');
}

/**
 * Append exp+sig query params to an ephemeral `/api/generated_layouts/...` URL
 * so <img src> works without putting the staff JWT in the query string.
 */
export function signEphemeralLayoutUrl(
  url: string | null | undefined,
  ttlSec: number = DEFAULT_TTL_SEC,
): string | null {
  if (url == null) return null;
  const raw = String(url).trim();
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (!raw.includes('/generated_layouts/')) return raw;

  const qIndex = raw.indexOf('?');
  const pathOnly = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
  const fileName = pathBasename(pathOnly);
  if (!parseGeneratedLayoutFileName(fileName)) return raw;

  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = hmac(`${fileName}:${exp}`);
  const sep = pathOnly.includes('?') ? '&' : '?';
  return `${pathOnly}${sep}exp=${exp}&sig=${sig}`;
}

export function verifyGeneratedLayoutSig(fileName: string, expRaw: string, sigRaw: string): boolean {
  const base = pathBasename(fileName);
  if (!parseGeneratedLayoutFileName(base)) return false;
  const exp = parseInt(String(expRaw || ''), 10);
  const sig = String(sigRaw || '').trim().toLowerCase();
  if (!Number.isFinite(exp) || !sig || sig.length < 32) return false;
  if (exp < Math.floor(Date.now() / 1000)) return false;
  const expected = hmac(`${base}:${exp}`);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(sig, 'utf8'));
  } catch {
    return false;
  }
}
