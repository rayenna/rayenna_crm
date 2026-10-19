import { describe, expect, it, beforeAll } from 'vitest';
import {
  signDocumentDownloadTicket,
  verifyDocumentDownloadTicket,
} from './signedDocumentDownload';

beforeAll(() => {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-secret-for-doc-signing';
  }
});

describe('signedDocumentDownload', () => {
  it('issues a verifiable short-lived ticket', () => {
    const { exp, sig } = signDocumentDownloadTicket('doc1', 'user1', true);
    expect(verifyDocumentDownloadTicket('doc1', 'user1', true, String(exp), sig)).toBe(true);
    expect(verifyDocumentDownloadTicket('doc1', 'user2', true, String(exp), sig)).toBe(false);
    expect(verifyDocumentDownloadTicket('doc1', 'user1', false, String(exp), sig)).toBe(false);
  });
});
