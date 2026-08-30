import { CustomerType, type Customer } from '@prisma/client';
import { isBusinessCustomerType } from './customerRecord';
import crypto from 'crypto';

/** 12-char password for new Hub accounts and admin resets. Never commit a shared default. */
export function generateHubTemporaryPassword(): string {
  const raw = crypto.randomBytes(9).toString('base64url').replace(/[^a-zA-Z0-9]/g, 'A');
  return `Ray${raw.slice(0, 9)}`;
}

/**
 * Password used when auto-provisioning a Hub account (project status sync).
 * Set CONSUMER_INITIAL_PASSWORD on Render. If unset in production, auto-create is skipped.
 */
export function consumerProvisioningPassword(): string | null {
  const fromEnv = process.env.CONSUMER_INITIAL_PASSWORD?.trim();
  if (fromEnv && fromEnv.length >= 8) return fromEnv;
  if (process.env.NODE_ENV !== 'production') return generateHubTemporaryPassword();
  return null;
}

/** Dev/demo login — never auto-deactivated by project status sync */
export const DEMO_HUB_USERNAME = 'hub.demo';

export function isDemoHubUsername(username: string): boolean {
  return normalizeUsername(username) === DEMO_HUB_USERNAME;
}

export const HUB_ELIGIBLE_PROJECT_STATUSES = ['COMPLETED', 'COMPLETED_SUBSIDY_CREDITED'] as const;

export type CustomerContactRow = {
  prefix?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  phones?: string[];
  emails?: string[];
};

export type UsernameNameParts = {
  prefix: string;
  lastName: string | null;
  useSocietyFallback: boolean;
};

/** Lowercase alphanumeric only (no dots). */
export function normalizeUsernameToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 40);
}

export function normalizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

function parseContactsJson(raw: unknown): CustomerContactRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row) => row && typeof row === 'object') as CustomerContactRow[];
}

function parseContactNumbersJson(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(String).map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function resolveUsernameNameParts(customer: Customer): UsernameNameParts {
  const contacts = parseContactsJson(customer.contacts);
  const primary = contacts[0];

  const firstName = (primary?.firstName ?? customer.firstName)?.trim() || '';
  const lastName = (primary?.lastName ?? customer.lastName)?.trim() || '';
  const company = customer.companyName?.trim() || '';

  if (firstName) {
    const prefix = normalizeUsernameToken(firstName);
    if (prefix.length >= 3) {
      const lastToken = lastName ? normalizeUsernameToken(lastName) : null;
      return {
        prefix,
        lastName: lastToken && lastToken.length > 0 ? lastToken : null,
        useSocietyFallback: false,
      };
    }
  }

  const societySource = company || customer.customerName?.trim() || 'customer';
  const prefix = normalizeUsernameToken(societySource);
  return {
    prefix: prefix.length >= 3 ? prefix : `${prefix}${customer.customerId}`.slice(0, 12),
    lastName: null,
    useSocietyFallback: isBusinessCustomerType(customer.customerType ?? CustomerType.RESIDENTIAL),
  };
}

export function buildBaseUsername(parts: UsernameNameParts, existingAccountCount: number): string {
  if (existingAccountCount <= 0) {
    if (parts.lastName) {
      return `${parts.prefix}.${parts.lastName}`;
    }
    return parts.prefix;
  }

  const suffixIndex = existingAccountCount;
  return `${parts.prefix}.username${suffixIndex}`;
}

export function resolveUniqueUsernameCandidate(base: string, takenUsernames: Set<string>): string {
  const normalized = normalizeUsername(base);
  if (!normalized) {
    throw new Error('Cannot derive username');
  }

  if (!takenUsernames.has(normalized)) {
    return normalized;
  }

  let n = 2;
  while (n < 10_000) {
    const candidate = normalizeUsername(`${base}${n}`);
    if (candidate && !takenUsernames.has(candidate)) {
      return candidate;
    }
    n += 1;
  }

  throw new Error('Unable to allocate unique username');
}

export function parseCustomerContactNumbers(customer: Customer): string[] {
  const fromJson = parseContactNumbersJson(customer.contactNumbers);
  const primary = customer.phone?.trim();
  const phones = primary ? [primary, ...fromJson] : fromJson;
  return [...new Set(phones.filter(Boolean))];
}

export function parseCustomerContacts(customer: Customer): CustomerContactRow[] {
  return parseContactsJson(customer.contacts);
}
