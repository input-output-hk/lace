import { useEffect, useRef } from 'react';

import { useLaceSelector } from '../hooks';

import { useFormSubmission } from './useFormSubmission';
import { useNameValidation } from './useNameValidation';
import { useRecipients } from './useRecipients';
import { useResolveAddressAlias } from './useResolveAddressAlias';

import type { Contact } from '@lace-contract/address-book';
import type {
  BlockchainOption,
  ContactBlockchainType,
  Recipient,
} from '@lace-lib/ui-toolkit';
import type { BlockchainName } from '@lace-lib/util-store';

interface UseContactFormReturn {
  name: string;
  onNameChange: (name: string) => void;
  nameError: string | undefined;
  avatarFallback: string;
  avatarUrl: Contact['avatar'];
  isResolvingAlias: boolean;
  recipients: Recipient[];
  blockchainOptions: BlockchainOption[];
  onAddressChange: (
    id: string,
    address: string,
    blockchainType?: ContactBlockchainType,
  ) => void;
  onAddressBlur: (id: string) => void;
  onBlockchainChange: (id: string, type: ContactBlockchainType) => void;
  onAddRecipient: (
    address?: string,
    blockchainType?: BlockchainName | 'auto-detect',
  ) => void;
  onRemoveRecipient: (id: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saveDisabled: boolean;
}

export const useContactForm = (contact?: Contact): UseContactFormReturn => {
  const existingContacts = useLaceSelector('addressBook.selectAllContacts');

  const {
    recipients,
    mappedRecipients,
    blockchainOptions,
    handleAddressChange,
    handleAddressBlur,
    handleBlockchainChange,
    handleAddRecipient,
    handleRemoveRecipient,
    hasValidAddress,
    isValidating,
  } = useRecipients({ initialContact: contact, existingContacts });

  const { name, setName, nameError, avatarFallback, touchName } =
    useNameValidation(existingContacts, hasValidAddress, contact);

  const { resolution, isResolving } = useResolveAddressAlias(
    name,
    'auto-detect',
  );

  // Track last resolved address to update (not duplicate) when alias changes
  const lastResolvedAddressRef = useRef<string | null>(null);
  const recipientsRef = useRef(recipients);
  recipientsRef.current = recipients;

  // Auto-add or update recipient when alias is resolved
  useEffect(() => {
    if (resolution.isSome()) {
      const { resolvedAddress, blockchainName } = resolution.value;

      // Skip if this is the same address we already resolved
      if (lastResolvedAddressRef.current === resolvedAddress) {
        return;
      }

      // Check if the new resolved address already exists (manually added by user)
      const hasNewAddressAlready = recipientsRef.current.some(
        r => r.address.toLowerCase() === resolvedAddress.toLowerCase(),
      );

      if (hasNewAddressAlready) {
        // Address already exists, just update our tracking
        lastResolvedAddressRef.current = resolvedAddress;
        return;
      }

      // Check if first recipient has an empty address - update it instead of adding
      const firstRecipient = recipientsRef.current[0];
      if (firstRecipient && firstRecipient.address.trim() === '') {
        handleAddressChange(firstRecipient.id, resolvedAddress, blockchainName);
        handleBlockchainChange(firstRecipient.id, blockchainName);
        lastResolvedAddressRef.current = resolvedAddress;
        return;
      }

      // Find recipient with the previously resolved address to update it
      const previousRecipient = lastResolvedAddressRef.current
        ? recipientsRef.current.find(
            r =>
              r.address.toLowerCase() ===
              lastResolvedAddressRef.current?.toLowerCase(),
          )
        : undefined;

      if (previousRecipient) {
        // Update existing alias-resolved recipient with new address
        handleAddressChange(
          previousRecipient.id,
          resolvedAddress,
          blockchainName,
        );
        handleBlockchainChange(previousRecipient.id, blockchainName);
      } else {
        // First resolution - add new recipient with resolved blockchain
        handleAddRecipient(resolvedAddress, blockchainName);
      }

      lastResolvedAddressRef.current = resolvedAddress;
    }
  }, [
    resolution,
    handleAddRecipient,
    handleAddressChange,
    handleBlockchainChange,
  ]);

  // Use resolved image if available, otherwise fall back to existing contact's avatar
  const avatarUrl = resolution.isSome()
    ? resolution.value.image
    : contact?.avatar;

  const { isSaveEnabled, handleSave, handleCancel } = useFormSubmission({
    name,
    recipients,
    existingContacts,
    touchName,
    isValidating,
    contactId: contact?.id,
    avatarUrl,
    resolvedAlias: resolution.unwrapOr(undefined),
    existingAliases: contact?.aliases,
  });

  return {
    name,
    onNameChange: setName,
    nameError,
    avatarFallback,
    avatarUrl,
    isResolvingAlias: isResolving,
    recipients: mappedRecipients,
    blockchainOptions,
    onAddressChange: handleAddressChange,
    onAddressBlur: handleAddressBlur,
    onBlockchainChange: handleBlockchainChange,
    onAddRecipient: handleAddRecipient,
    onRemoveRecipient: handleRemoveRecipient,
    onSave: handleSave,
    onCancel: handleCancel,
    saveDisabled: !isSaveEnabled,
  };
};
