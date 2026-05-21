import { Prisma } from '@prisma/client';

export type CustomerContactEntry = {
  prefix?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phones?: string[];
  emails?: string[];
};

export function formatContactPersonName(contact: CustomerContactEntry): string {
  return [contact.prefix, contact.firstName, contact.middleName, contact.lastName]
    .map((p) => (p != null ? String(p).trim() : ''))
    .filter(Boolean)
    .join(' ');
}

export function parseContactsPayload(raw: unknown): CustomerContactEntry[] {
  if (raw == null) return [];
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item): CustomerContactEntry | null => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const phones = Array.isArray(row.phones)
        ? row.phones.map((p) => String(p).trim()).filter(Boolean)
        : [];
      const emails = Array.isArray(row.emails)
        ? row.emails.map((e) => String(e).trim()).filter(Boolean)
        : [];
      return {
        prefix: row.prefix != null ? String(row.prefix).trim() : '',
        firstName: row.firstName != null ? String(row.firstName).trim() : '',
        middleName: row.middleName != null ? String(row.middleName).trim() : '',
        lastName: row.lastName != null ? String(row.lastName).trim() : '',
        phones,
        emails,
      };
    })
    .filter((c): c is CustomerContactEntry => c != null);
}

export function normalizeContactsForSave(entries: CustomerContactEntry[]): CustomerContactEntry[] {
  return entries
    .map((entry) => ({
      prefix: entry.prefix?.trim() || '',
      firstName: entry.firstName?.trim() || '',
      middleName: entry.middleName?.trim() || '',
      lastName: entry.lastName?.trim() || '',
      phones: (entry.phones ?? []).map((p) => p.trim()).filter(Boolean),
      emails: (entry.emails ?? []).map((e) => e.trim()).filter(Boolean),
    }))
    .filter(
      (entry) =>
        formatContactPersonName(entry) ||
        (entry.phones?.length ?? 0) > 0 ||
        (entry.emails?.length ?? 0) > 0,
    );
}

export function validateBusinessContacts(entries: CustomerContactEntry[]): string | null {
  const normalized = normalizeContactsForSave(entries);
  if (normalized.length === 0) {
    return 'Add at least one contact for commercial or apartment customers.';
  }

  let hasPhone = false;
  for (let i = 0; i < normalized.length; i++) {
    const entry = normalized[i];
    const name = formatContactPersonName(entry);
    if (!entry.firstName?.trim() && !entry.lastName?.trim()) {
      return `Contact ${i + 1}: enter first name or last name.`;
    }
    if (!entry.phones?.length) {
      return `Contact ${i + 1}: add at least one phone number.`;
    }
    hasPhone = true;
  }
  if (!hasPhone) {
    return 'At least one phone number is required across all contacts.';
  }
  return null;
}

export function aggregatePhonesFromContacts(entries: CustomerContactEntry[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of entries) {
    for (const phone of entry.phones ?? []) {
      const p = phone.trim();
      if (p && !seen.has(p)) {
        seen.add(p);
        out.push(p);
      }
    }
  }
  return out;
}

export function aggregateEmailsFromContacts(entries: CustomerContactEntry[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of entries) {
    for (const email of entry.emails ?? []) {
      const e = email.trim();
      if (e && !seen.has(e)) {
        seen.add(e);
        out.push(e);
      }
    }
  }
  return out;
}

export function contactsToPrismaJson(entries: CustomerContactEntry[]): Prisma.InputJsonValue {
  return normalizeContactsForSave(entries) as unknown as Prisma.InputJsonValue;
}

export function stringifyContactArrays(phones: string[], emails: string[]): {
  contactNumbersStr: string | null;
  emailsStr: string | null;
} {
  return {
    contactNumbersStr: phones.length > 0 ? JSON.stringify(phones) : null,
    emailsStr: emails.length > 0 ? JSON.stringify(emails) : null,
  };
}
