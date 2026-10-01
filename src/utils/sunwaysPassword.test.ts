import { describe, expect, it } from 'vitest';
import { encodeSunwaysPassword } from '../services/sunwaysCloudClient';

describe('encodeSunwaysPassword', () => {
  it('matches Base64(MD5(plain)) used by Sunways Portal login', () => {
    // md5("password") = 5f4dcc3b5aa765d61d8327deb882cf99
    expect(encodeSunwaysPassword('password')).toBe(
      Buffer.from('5f4dcc3b5aa765d61d8327deb882cf99', 'utf8').toString('base64'),
    );
  });
});
