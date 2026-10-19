import crypto from 'crypto';

/** SHA-256 hex digest — store this in User.resetToken; never store the raw token. */
export function hashPasswordResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(String(rawToken), 'utf8').digest('hex');
}
