import { ContactId } from '@lace-contract/address-book';
import { useAnalytics } from '@lace-contract/analytics';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { RecipientFormState } from './useRecipients';
import type { Contact, ContactAddress } from '@lace-contract/address-book';
import type { Address, AddressAliasResolution } from '@lace-contract/addresses';

const hasDuplicateName = (contacts: Contact[], name: string) => {
  return contacts.some(
    contact => contact.name.toLowerCase() === name.toLowerCase(),
  );
};

const hasDuplicateAddresses = (recipients: RecipientFormState[]) => {
  const addresses = recipients
    .map(r => r.address.trim().toLowerCase())
    .filter(Boolean);
  return new Set(addresses).size !== addresses.length;
};

const hasAddressInOtherContacts = (
  recipients: RecipientFormState[],
  existingContacts: Contact[],
  currentContactId?: ContactId,
) => {
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

interface UseFormSubmissionReturn {
  isSaveEnabled: boolean;
  handleSave: () => void;
  handleCancel: () => void;
}

interface UseFormSubmissionOptions {
  name: string;
  recipients: RecipientFormState[];
  existingContacts: Contact[];
  touchName: () => void;
  isValidating: boolean;
  contactId?: ContactId;
  avatarUrl?: Contact['avatar'];
  resolvedAlias?: AddressAliasResolution;
  existingAliases?: AddressAliasResolution[];
}

const AUTO_DETECT = 'auto-detect';

export const useFormSubmission = (
  options: UseFormSubmissionOptions,
): UseFormSubmissionReturn => {
  const {
    name,
    recipients,
    existingContacts,
    touchName,
    isValidating,
    contactId,
    avatarUrl,
    resolvedAlias,
    existingAliases,
  } = options;

  const { trackEvent } = useAnalytics();

  const contacts = useMemo(() => {
    return contactId
      ? existingContacts.filter(c => c.id !== contactId)
      : existingContacts;
  }, [existingContacts, contactId]);

  const networkType = useLaceSelector('network.selectNetworkType');
  const blockchainNetworks = useLaceSelector(
    'network.selectBlockchainNetworks',
  );
  const dispatchAddContact = useDispatchLaceAction('addressBook.addContact');

  const onClose = useCallback(() => {
    if (contactId) {
      NavigationControls.sheets.navigate(SheetRoutes.ContactDetails, {
        contactId: contactId,
      });
    } else {
      NavigationControls.sheets.close();
    }
  }, [contactId]);

  const isSaveEnabled = useMemo(() => {
    // Disable while validation is running
    if (isValidating) return false;

    const trimmedName = name.trim();
    const hasName = trimmedName.length > 0;

    // Check for duplicate name (case-insensitive)
    const isDuplicateName = hasDuplicateName(contacts, trimmedName);

    // Check for duplicate addresses within the contact
    const hasDuplicates = hasDuplicateAddresses(recipients);

    // Check for addresses that exist in other contacts
    const hasExistingAddress = hasAddressInOtherContacts(
      recipients,
      existingContacts,
      contactId,
    );

    // All address fields must have valid addresses (no empty or invalid)
    const areAllAddressesValid = recipients.every(
      r =>
        r.address.trim() &&
        !r.validationError &&
        (r.blockchainType !== AUTO_DETECT || r.detectedBlockchain),
    );

    return (
      hasName &&
      !isDuplicateName &&
      !hasDuplicates &&
      !hasExistingAddress &&
      areAllAddressesValid
    );
  }, [name, recipients, contacts, existingContacts, contactId, isValidating]);

  const handleSave = useCallback(() => {
    // Validate name synchronously
    const trimmedName = name.trim();
    if (!trimmedName) {
      touchName();
      return;
    }

    // Check for duplicate name (case-insensitive) - guards against race conditions
    // where contacts may have synced between isSaveEnabled check and save execution
    const isDuplicateName = hasDuplicateName(contacts, trimmedName);
    if (isDuplicateName) {
      touchName();
      return;
    }

    // Check for duplicate addresses within the contact
    if (hasDuplicateAddresses(recipients)) {
      return;
    }

    // Check for addresses that exist in other contacts
    if (hasAddressInOtherContacts(recipients, existingContacts, contactId)) {
      return;
    }

    // Check all recipients have resolved blockchain - guards against race conditions
    const hasUnresolvedBlockchain = recipients.some(
      r => r.blockchainType === AUTO_DETECT && !r.detectedBlockchain,
    );
    if (hasUnresolvedBlockchain) {
      return;
    }

    // Build valid addresses from recipients
    const validAddresses: ContactAddress[] = recipients.map(r => {
      const blockchainName =
        r.blockchainType !== AUTO_DETECT
          ? r.blockchainType
          : r.detectedBlockchain!;
      const network = blockchainNetworks[blockchainName]?.[networkType];
      if (!network)
        throw new Error(
          'Assert: blockchain network not initialized - ' + blockchainName,
        );
      return {
        address: r.address as Address,
        network,
        blockchainName,
      };
    });

    const contact: Contact = {
      id: contactId ?? ContactId(uuidv4()),
      aliases: resolvedAlias ? [resolvedAlias] : existingAliases ?? [],
      name: trimmedName,
      avatar: avatarUrl,
      addresses: validAddresses,
    };

    dispatchAddContact(contact);
    if (!contactId) {
      trackEvent('address book | contact | added');
    }
    onClose();
  }, [
    name,
    recipients,
    existingContacts,
    contactId,
    avatarUrl,
    resolvedAlias,
    existingAliases,
    dispatchAddContact,
    touchName,
    trackEvent,
    contacts,
    onClose,
    blockchainNetworks,
    networkType,
  ]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  return { isSaveEnabled, handleSave, handleCancel };
};
