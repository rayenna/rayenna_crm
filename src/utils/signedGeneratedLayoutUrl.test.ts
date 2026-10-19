import { describe, expect, it, beforeAll } from 'vitest';
import {
  parseGeneratedLayoutFileName,
  signEphemeralLayoutUrl,
  verifyGeneratedLayoutSig,
} from './signedGeneratedLayoutUrl';

beforeAll(() => {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-secret-for-layout-signing';
  }
});

describe('signedGeneratedLayoutUrl', () => {
  it('parses safe layout filenames', () => {
    expect(parseGeneratedLayoutFileName('abc123_satellite.png')?.projectId).toBe('abc123');
    expect(parseGeneratedLayoutFileName('../etc/passwd')).toBeNull();
  });

  it('signs and verifies ephemeral layout URLs', () => {
    const signed = signEphemeralLayoutUrl('/api/generated_layouts/proj1_satellite.png');
    expect(signed).toMatch(/exp=\d+/);
    expect(signed).toMatch(/sig=[a-f0-9]+/);
    const u = new URL(signed!, 'http://localhost');
    expect(
      verifyGeneratedLayoutSig('proj1_satellite.png', u.searchParams.get('exp')!, u.searchParams.get('sig')!),
    ).toBe(true);
  });

  it('leaves https URLs unchanged', () => {
    expect(signEphemeralLayoutUrl('https://res.cloudinary.com/x/image.png')).toBe(
      'https://res.cloudinary.com/x/image.png',
    );
  });
});
