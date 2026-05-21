import type { Customer } from '../types'
import { parseCustomerStringListForForm } from './customerContactFields'

export interface CustomerContactEntry {
  prefix: string
  firstName: string
  middleName: string
  lastName: string
  phones: string[]
  emails: string[]
}

export function emptyCustomerContact(): CustomerContactEntry {
  return {
    prefix: '',
    firstName: '',
    middleName: '',
    lastName: '',
    phones: [''],
    emails: [''],
  }
}

export function formatContactPersonName(contact: Pick<
  CustomerContactEntry,
  'prefix' | 'firstName' | 'middleName' | 'lastName'
>): string {
  return [contact.prefix, contact.firstName, contact.middleName, contact.lastName]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(' ')
}

export function parseCustomerContactsJson(raw: unknown): CustomerContactEntry[] {
  if (raw == null || raw === '') return []
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []

  return parsed
    .map((item): CustomerContactEntry | null => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      return {
        prefix: String(row.prefix ?? '').trim(),
        firstName: String(row.firstName ?? '').trim(),
        middleName: String(row.middleName ?? '').trim(),
        lastName: String(row.lastName ?? '').trim(),
        phones: parseCustomerStringListForForm(
          Array.isArray(row.phones) ? JSON.stringify(row.phones) : String(row.phones ?? ''),
        ),
        emails: parseCustomerStringListForForm(
          Array.isArray(row.emails) ? JSON.stringify(row.emails) : String(row.emails ?? ''),
        ),
      }
    })
    .filter((c): c is CustomerContactEntry => c != null)
}

/** Load business contacts from JSON or legacy contactPerson + customer-level phones/emails. */
export function loadBusinessContactsFromCustomer(customer: Customer | null | undefined): CustomerContactEntry[] {
  if (!customer) return [emptyCustomerContact()]

  const fromJson = parseCustomerContactsJson(customer.contacts as unknown)
  if (fromJson.length > 0) return fromJson

  const legacyName = customer.contactPerson?.trim() || ''
  const phones = parseCustomerStringListForForm(customer.contactNumbers)
  const emails = parseCustomerStringListForForm(customer.email)
  const hasLegacy = legacyName || phones.some((p) => p.trim()) || emails.some((e) => e.trim())

  if (!hasLegacy) return [emptyCustomerContact()]

  const parts = legacyName.split(/\s+/).filter(Boolean)
  return [
    {
      prefix: '',
      firstName: parts[0] ?? '',
      middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
      lastName: parts.length > 1 ? parts[parts.length - 1] : '',
      phones,
      emails,
    },
  ]
}

export function normalizeContactsForSave(entries: CustomerContactEntry[]): CustomerContactEntry[] {
  return entries
    .map((entry) => ({
      prefix: entry.prefix.trim() || '',
      firstName: entry.firstName.trim(),
      middleName: entry.middleName.trim() || '',
      lastName: entry.lastName.trim() || '',
      phones: entry.phones.map((p) => p.trim()).filter(Boolean),
      emails: entry.emails.map((e) => e.trim()).filter(Boolean),
    }))
    .filter(
      (entry) =>
        formatContactPersonName(entry) ||
        entry.phones.length > 0 ||
        entry.emails.length > 0,
    )
}

export function aggregatePhonesFromContacts(entries: CustomerContactEntry[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of entries) {
    for (const phone of entry.phones) {
      const p = phone.trim()
      if (p && !seen.has(p)) {
        seen.add(p)
        out.push(p)
      }
    }
  }
  return out
}

export function aggregateEmailsFromContacts(entries: CustomerContactEntry[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of entries) {
    for (const email of entry.emails) {
      const e = email.trim()
      if (e && !seen.has(e)) {
        seen.add(e)
        out.push(e)
      }
    }
  }
  return out
}

export function validateBusinessContacts(entries: CustomerContactEntry[]): string[] {
  const errs: string[] = []
  const normalized = normalizeContactsForSave(entries)

  if (normalized.length === 0) {
    errs.push('Add at least one contact for commercial or apartment customers.')
    return errs
  }

  let hasAnyPhone = false
  normalized.forEach((entry, index) => {
    const label = `Contact ${index + 1}`
    if (!entry.firstName.trim() && !entry.lastName.trim()) {
      errs.push(`${label}: enter first name or last name.`)
    }
    if (entry.phones.length === 0) {
      errs.push(`${label}: add at least one phone number.`)
    } else {
      hasAnyPhone = true
    }
  })

  if (!hasAnyPhone) {
    errs.push('At least one phone number is required across all contacts.')
  }

  return errs
}

export function getPrimaryContactLabel(customer: Customer): string | null {
  const contacts = parseCustomerContactsJson(customer.contacts as unknown)
  if (contacts.length > 0) {
    const name = formatContactPersonName(contacts[0])
    return name || null
  }
  return customer.contactPerson?.trim() || null
}
