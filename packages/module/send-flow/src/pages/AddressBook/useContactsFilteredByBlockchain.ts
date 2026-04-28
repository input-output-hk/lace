import { useMemo } from 'react';

import type { Contact } from '@lace-contract/address-book';

export const useContactsFilteredByBlockchain = (
  contacts: Contact[] | undefined,
  blockchainName: string | undefined,
): Contact[] => {
  return useMemo(() => {
    if (!blockchainName || !contacts) return [];

    return contacts
      .map(contact => ({
        ...contact,
        addresses: contact.addresses.filter(
          addr => addr.blockchainName === blockchainName,
        ),
      }))
      .filter(contact => contact.addresses.length > 0);
  }, [contacts, blockchainName]);
};
