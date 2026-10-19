import { describe, expect, it } from 'vitest';
import { hashPasswordResetToken } from './passwordResetToken';

describe('hashPasswordResetToken', () => {
  it('returns stable sha256 hex', () => {
    const a = hashPasswordResetToken('abc123');
    const b = hashPasswordResetToken('abc123');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPasswordResetToken('other')).not.toBe(a);
  });
});
