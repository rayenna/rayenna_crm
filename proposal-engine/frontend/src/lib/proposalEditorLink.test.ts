import { describe, expect, it } from 'vitest';
import {
  buildProposalEditorLinkHtml,
  defaultProposalEditorLinkLabel,
  normalizeProposalEditorLinkInput,
} from './proposalEditorLink';

describe('normalizeProposalEditorLinkInput', () => {
  it('accepts https URLs', () => {
    expect(normalizeProposalEditorLinkInput('https://rayenna.com/about')).toBe(
      'https://rayenna.com/about',
    );
  });

  it('upgrades http to https', () => {
    expect(normalizeProposalEditorLinkInput('http://example.com')).toBe('https://example.com/');
  });

  it('adds https to bare domains', () => {
    expect(normalizeProposalEditorLinkInput('www.example.com/path')).toBe(
      'https://www.example.com/path',
    );
  });

  it('accepts email addresses as mailto', () => {
    expect(normalizeProposalEditorLinkInput('sales@rayenna.com')).toBe('mailto:sales@rayenna.com');
  });

  it('accepts mailto prefix', () => {
    expect(normalizeProposalEditorLinkInput('mailto:hello@test.co')).toBe('mailto:hello@test.co');
  });

  it('rejects invalid input', () => {
    expect(normalizeProposalEditorLinkInput('')).toBeNull();
    expect(normalizeProposalEditorLinkInput('not a link')).toBeNull();
    expect(normalizeProposalEditorLinkInput('ftp://files.example.com')).toBeNull();
  });
});

describe('buildProposalEditorLinkHtml', () => {
  it('escapes label and adds target for https', () => {
    const html = buildProposalEditorLinkHtml('https://a.com', 'Click <here>');
    expect(html).toContain('href="https://a.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('Click &lt;here&gt;');
  });

  it('omits target for mailto', () => {
    const html = buildProposalEditorLinkHtml('mailto:a@b.co', 'Email us');
    expect(html).toContain('href="mailto:a@b.co"');
    expect(html).not.toContain('target=');
  });
});

describe('defaultProposalEditorLinkLabel', () => {
  it('uses hostname for https', () => {
    expect(defaultProposalEditorLinkLabel('https://www.rayenna.com/x')).toBe('rayenna.com');
  });

  it('uses email for mailto', () => {
    expect(defaultProposalEditorLinkLabel('mailto:sales@rayenna.com')).toBe('sales@rayenna.com');
  });
});
