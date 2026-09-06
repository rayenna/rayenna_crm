import { describe, expect, it } from 'vitest';
import { toWhatsAppE164, whatsAppMeUrl } from './whatsappE164';
import { hubPathForKind, getHubAlertTemplate } from './hubAlertTemplates';

describe('toWhatsAppE164', () => {
  it('prefixes 10-digit India mobiles', () => {
    expect(toWhatsAppE164('9876543210')).toBe('919876543210');
  });

  it('accepts +91 formatted numbers', () => {
    expect(toWhatsAppE164('+91 98765 43210')).toBe('919876543210');
  });

  it('returns null for empty', () => {
    expect(toWhatsAppE164('')).toBeNull();
  });
});

describe('whatsAppMeUrl', () => {
  it('encodes draft text', () => {
    expect(whatsAppMeUrl('919876543210', 'Hello')).toContain('wa.me/919876543210');
    expect(whatsAppMeUrl('919876543210', 'Hello')).toContain('text=Hello');
  });
});

describe('hub alert templates', () => {
  it('maps kinds to Hub paths', () => {
    expect(hubPathForKind('ticket_received')).toBe('/support');
    expect(hubPathForKind('cleaning_due')).toBe('/maintain');
    expect(hubPathForKind('crm_custom')).toBe('/');
  });

  it('has CRM templates', () => {
    expect(getHubAlertTemplate('ticket_update')?.label).toMatch(/ticket/i);
  });
});
