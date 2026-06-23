import type { Customer, CustomerType } from '@prisma/client';
import {
  parseCustomerContactNumbers,
  parseCustomerContacts,
  type CustomerContactRow,
} from './consumerUsername';

export type ConsumerCrmProfileDto = {
  customerId: string;
  customerType: CustomerType | null;
  prefix: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  companyName: string | null;
  contactPerson: string | null;
  phones: string[];
  emails: string[];
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pinCode: string | null;
  contacts: CustomerContactRow[];
};

function collectEmails(customer: Customer): string[] {
  const emails: string[] = [];
  const seen = new Set<string>();
  const push = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    emails.push(trimmed);
  };

  push(customer.email);

  for (const contact of parseCustomerContacts(customer)) {
    for (const email of contact.emails ?? []) {
      push(String(email));
    }
  }

  return emails;
}

/** All phones in Customer Master order: primary phone → contactNumbers → contacts[].phones */
export function allPhonesFromCustomer(customer: Customer): string[] {
  const out = [...parseCustomerContactNumbers(customer)];
  const seen = new Set(out);

  for (const contact of parseCustomerContacts(customer)) {
    for (const phone of contact.phones ?? []) {
      const trimmed = String(phone).trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        out.push(trimmed);
      }
    }
  }

  return out;
}

export function primaryPhoneFromCustomer(customer: Customer): string | null {
  return allPhonesFromCustomer(customer)[0] ?? null;
}

export function primaryEmailFromCustomer(customer: Customer): string | null {
  return collectEmails(customer)[0] ?? null;
}

/** Fields mirrored from Customer Master onto consumer_users (first phone / first email). */
export function consumerMasterContactFields(customer: Customer): {
  phone: string | null;
  email: string | null;
} {
  return {
    phone: primaryPhoneFromCustomer(customer),
    email: primaryEmailFromCustomer(customer),
  };
}

export function buildConsumerCrmProfile(customer: Customer): ConsumerCrmProfileDto {
  const contacts = parseCustomerContacts(customer);
  const primary = contacts[0];

  return {
    customerId: customer.customerId,
    customerType: customer.customerType,
    prefix: primary?.prefix?.trim() || customer.prefix?.trim() || null,
    firstName: primary?.firstName?.trim() || customer.firstName?.trim() || null,
    middleName: primary?.middleName?.trim() || customer.middleName?.trim() || null,
    lastName: primary?.lastName?.trim() || customer.lastName?.trim() || null,
    companyName: customer.companyName?.trim() || null,
    contactPerson: customer.contactPerson?.trim() || null,
    phones: allPhonesFromCustomer(customer),
    emails: collectEmails(customer),
    addressLine1: customer.addressLine1?.trim() || null,
    addressLine2: customer.addressLine2?.trim() || null,
    city: customer.city?.trim() || null,
    state: customer.state?.trim() || null,
    country: customer.country?.trim() || null,
    pinCode: customer.pinCode?.trim() || null,
    contacts,
  };
}

export function displayNameFromCrmProfile(profile: ConsumerCrmProfileDto): string {
  const person = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
  if (person) return person;
  if (profile.companyName) return profile.companyName;
  if (profile.contactPerson) return profile.contactPerson;
  return 'Member';
}
