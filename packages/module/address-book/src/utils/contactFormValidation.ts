import type { RecipientFormState } from '../hooks/useRecipients';
import type { Contact } from '@lace-contract/address-book';

export const hasDuplicateName = (contacts: Contact[], name: string): boolean =>
  contacts.some(c => c.name.toLowerCase() === name.toLowerCase());

export const hasDuplicateAddresses = (
  recipients: RecipientFormState[],
): boolean => {
  const addresses = recipients
    .map(r => r.address.trim().toLowerCase())
    .filter(Boolean);
  return new Set(addresses).size !== addresses.length;
};

export const hasAddressInOtherContacts = (
  recipients: RecipientFormState[],
  existingContacts: Contact[],
  currentContactId?: Contact['id'],
): boolean => {
  const otherContactAddresses = new Set<string>();
  for (const contact of existingContacts) {
    if (contact.id === currentContactId) continue;
    for (const addr of contact.addresses) {
      otherContactAddresses.add(addr.address.trim().toLowerCase());
    }
  }
  return recipients.some(r =>
    otherContactAddresses.has(r.address.trim().toLowerCase()),
  );
};
