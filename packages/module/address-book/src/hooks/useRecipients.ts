import { useTranslation } from '@lace-contract/i18n';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useLoadModules } from '../hooks';

import { useAddressValidation } from './useAddressValidation';

import type { Contact } from '@lace-contract/address-book';
import type {
  BlockchainOption,
  ContactBlockchainType,
  Recipient,
} from '@lace-lib/ui-toolkit';
import type { BlockchainName } from '@lace-lib/util-store';

export type RecipientFormState = {
  id: string;
  blockchainType: BlockchainName | 'auto-detect';
  address: string;
  detectedBlockchain?: BlockchainName;
  validationError?:
    | 'duplicate'
    | 'empty'
    | 'exists-in-other-contact'
    | 'invalid';
};

export type ValidateAddressFunction = (
  address: string,
  blockchainType: BlockchainName | 'auto-detect',
) => {
  isValid: boolean;
  error?: 'empty' | 'invalid';
  detectedBlockchain?: BlockchainName;
};

export type BlockchainOptionWithId = BlockchainOption & { id: string };

interface UseRecipientsReturn {
  recipients: RecipientFormState[];
  mappedRecipients: Recipient[];
  blockchainOptions: BlockchainOptionWithId[];
  handleAddressChange: (
    id: string,
    address: string,
    blockchainTypeFromUi?: ContactBlockchainType,
  ) => void;
  handleAddressBlur: (id: string) => void;
  handleBlockchainChange: (id: string, type: ContactBlockchainType) => void;
  handleAddRecipient: (
    address?: string,
    blockchainType?: BlockchainName | 'auto-detect',
  ) => void;
  handleRemoveRecipient: (id: string) => void;
  hasValidAddress: boolean;
  isValidating: boolean;
}

const AUTO_DETECT = 'auto-detect';
const DEBOUNCE_MS = 300;

const blockchainIconMap: Record<BlockchainName, string> = {
  Cardano: 'Cardano',
  Bitcoin: 'Bitcoin',
  Midnight: 'Midnight',
};

const getBlockchainIcon = (blockchainName: BlockchainName): string =>
  blockchainIconMap[blockchainName] ?? 'Wallet';

const generateId = (): string => uuidv4();

const findDuplicateAddresses = (
  recipients: RecipientFormState[],
): Set<string> => {
  const addressCounts = new Map<string, number>();
  for (const r of recipients) {
    const trimmed = r.address.trim().toLowerCase();
    if (trimmed) {
      addressCounts.set(trimmed, (addressCounts.get(trimmed) || 0) + 1);
    }
  }
  const duplicates = new Set<string>();
  for (const [address, count] of addressCounts) {
    if (count > 1) {
      duplicates.add(address);
    }
  }
  return duplicates;
};

const findAddressesInOtherContacts = (
  existingContacts: Contact[],
  currentContactId?: string,
): Set<string> => {
  const addresses = new Set<string>();
  for (const contact of existingContacts) {
    // Skip the current contact when editing
    if (contact.id === currentContactId) continue;
    for (const addr of contact.addresses) {
      addresses.add(addr.address.trim().toLowerCase());
    }
  }
  return addresses;
};

const initializeRecipients = (
  initialContact?: Contact,
): RecipientFormState[] => {
  if (!initialContact?.addresses || initialContact.addresses.length === 0) {
    return [{ id: generateId(), blockchainType: AUTO_DETECT, address: '' }];
  }
  return initialContact.addresses.map(addr => ({
    id: generateId(),
    blockchainType: addr.blockchainName,
    address: addr.address,
  }));
};

interface UseRecipientsOptions {
  initialContact?: Contact;
  existingContacts: Contact[];
}

export const useRecipients = ({
  initialContact,
  existingContacts,
}: UseRecipientsOptions): UseRecipientsReturn => {
  const { t } = useTranslation();
  const validators = useLoadModules('addons.loadAddressBookAddressValidators');
  const [recipients, setRecipients] = useState<RecipientFormState[]>(() =>
    initializeRecipients(initialContact),
  );
  const [validatingIds, setValidatingIds] = useState<Set<string>>(new Set());

  const currentRecipientsRef = useRef(recipients);
  currentRecipientsRef.current = recipients;

  const debounceTimeoutRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const isValidating = useMemo(() => validatingIds.size > 0, [validatingIds]);
  const { validateAddress } = useAddressValidation();

  // Keep latest validateAddress in ref to avoid stale closures in debounced timeouts
  const validateAddressRef = useRef(validateAddress);
  validateAddressRef.current = validateAddress;

  // Keep latest recipients in ref for use inside effects without adding to deps
  const recipientsRef = useRef(recipients);
  recipientsRef.current = recipients;

  // Memoize addresses from other contacts
  const addressesInOtherContacts = useMemo(
    () => findAddressesInOtherContacts(existingContacts, initialContact?.id),
    [existingContacts, initialContact?.id],
  );

  useEffect(() => {
    return () => {
      Object.values(debounceTimeoutRef.current).forEach(clearTimeout);
    };
  }, []);

  const blockchainOptions = useMemo<BlockchainOptionWithId[]>(
    () =>
      (validators || []).map((v, index) => ({
        id: `${v.blockchainName}-${index}`,
        type: v.blockchainName,
        text: v.blockchainName,
        leftIcon: getBlockchainIcon(
          v.blockchainName,
        ) as BlockchainOption['leftIcon'],
      })),
    [validators],
  );

  const updateDuplicateErrors = useCallback(
    (recipients: RecipientFormState[]): RecipientFormState[] => {
      const duplicatesWithinContact = findDuplicateAddresses(recipients);
      return recipients.map(r => {
        const trimmed = r.address.trim().toLowerCase();
        const isDuplicateWithin =
          trimmed && duplicatesWithinContact.has(trimmed);
        const existsInOther = trimmed && addressesInOtherContacts.has(trimmed);

        // Determine if current error is a duplicate-related error that we manage
        const hasDuplicateRelatedError =
          r.validationError === 'duplicate' ||
          r.validationError === 'exists-in-other-contact';

        // Only modify if no validation error OR if it's a duplicate-related error we can update
        const canSetError = !r.validationError || hasDuplicateRelatedError;

        // Priority: duplicate within contact > exists in other contact
        if (isDuplicateWithin) {
          if (canSetError && r.validationError !== 'duplicate') {
            return { ...r, validationError: 'duplicate' };
          }
          return r;
        }

        if (existsInOther) {
          if (canSetError && r.validationError !== 'exists-in-other-contact') {
            return { ...r, validationError: 'exists-in-other-contact' };
          }
          return r;
        }

        // Clear duplicate/exists errors if address is no longer problematic
        if (hasDuplicateRelatedError) {
          return { ...r, validationError: undefined };
        }

        return r;
      });
    },
    [addressesInOtherContacts],
  );

  // Check for duplicates on initial mount when editing an existing contact
  const hasRunInitialCheck = useRef(false);
  useEffect(() => {
    if (
      !hasRunInitialCheck.current &&
      initialContact?.addresses &&
      initialContact.addresses.length > 0
    ) {
      hasRunInitialCheck.current = true;
      setRecipients(current => updateDuplicateErrors(current));
    }
  }, [initialContact?.addresses, updateDuplicateErrors]);

  const debouncedValidate = useCallback(
    (
      id: string,
      address: string,
      blockchainType: BlockchainName | 'auto-detect',
    ) => {
      // Mark as validating
      setValidatingIds(previous => new Set(previous).add(id));

      if (debounceTimeoutRef.current[id]) {
        clearTimeout(debounceTimeoutRef.current[id]);
      }
      debounceTimeoutRef.current[id] = setTimeout(() => {
        setRecipients(previous => {
          const recipient = previous.find(r => r.id === id);
          // Skip if address changed since timeout was scheduled (stale validation)
          if (!recipient || recipient.address !== address) {
            return previous;
          }
          const result = validateAddressRef.current(address, blockchainType);
          const updated = previous.map(r =>
            r.id === id
              ? {
                  ...r,
                  validationError: result.error,
                  detectedBlockchain: result.detectedBlockchain,
                }
              : r,
          );
          // Check for duplicates after validation
          return updateDuplicateErrors(updated);
        });
        // Clear validating flag
        setValidatingIds(previous => {
          const next = new Set(previous);
          next.delete(id);
          return next;
        });
      }, DEBOUNCE_MS);
    },
    [validateAddress, updateDuplicateErrors],
  );

  // Re-validate auto-detect recipients that have a stale 'invalid' error caused by
  // validators not being loaded when the debounce fired. Runs whenever validators or
  // debouncedValidate change (both update on the same render when validators load),
  // so a CI race where useLoadModules resolves after the 300ms debounce does not
  // permanently lock out the save button.
  useEffect(() => {
    if (!validators?.length) return;
    for (const r of recipientsRef.current) {
      if (
        r.address.trim() &&
        r.blockchainType === AUTO_DETECT &&
        r.validationError === 'invalid'
      ) {
        debouncedValidate(r.id, r.address, r.blockchainType);
      }
    }
  }, [validators, debouncedValidate]);

  const handleAddressChange = useCallback(
    (
      id: string,
      address: string,
      blockchainTypeFromUi?: ContactBlockchainType,
    ) => {
      const chainForDebounce = (blockchainTypeFromUi ??
        currentRecipientsRef.current.find(r => r.id === id)?.blockchainType ??
        AUTO_DETECT) as BlockchainName | 'auto-detect';

      setRecipients(previous => {
        const updated = previous.map(r =>
          r.id === id
            ? {
                ...r,
                address,
                validationError: undefined,
                detectedBlockchain: undefined,
              }
            : r,
        );
        // Re-check duplicates when any address changes
        return updateDuplicateErrors(updated);
      });

      const willScheduleDebounce = Boolean(address.trim());
      if (willScheduleDebounce) {
        debouncedValidate(id, address, chainForDebounce);
      }
    },
    [debouncedValidate, updateDuplicateErrors],
  );

  const handleAddressBlur = useCallback((id: string) => {
    setRecipients(previous =>
      previous.map(r => {
        if (r.id !== id) return r;
        // Only set empty error on blur if address is empty
        if (!r.address.trim()) {
          return { ...r, validationError: 'empty' };
        }
        return r;
      }),
    );
  }, []);

  const handleBlockchainChange = useCallback(
    (id: string, blockchainType: ContactBlockchainType) => {
      let recipientAddress: string | undefined;

      setRecipients(previous => {
        const recipient = previous.find(r => r.id === id);
        recipientAddress = recipient?.address;
        const updated = previous.map(r =>
          r.id === id
            ? {
                ...r,
                blockchainType: blockchainType as
                  | BlockchainName
                  | 'auto-detect',
                detectedBlockchain: undefined,
                validationError: undefined,
              }
            : r,
        );
        // Re-check duplicates when blockchain changes
        return updateDuplicateErrors(updated);
      });

      if (recipientAddress !== undefined && recipientAddress.trim()) {
        debouncedValidate(
          id,
          recipientAddress,
          blockchainType as BlockchainName | 'auto-detect',
        );
      }
    },
    [debouncedValidate, updateDuplicateErrors],
  );

  const handleAddRecipient = useCallback(
    (
      address = '',
      blockchainType: BlockchainName | 'auto-detect' = AUTO_DETECT,
    ) => {
      setRecipients(previous => [
        ...previous,
        { id: generateId(), blockchainType, address },
      ]);
    },
    [],
  );

  const handleRemoveRecipient = useCallback(
    (id: string) => {
      setRecipients(previous => {
        const filtered = previous.filter(r => r.id !== id);
        // Re-check duplicates after removal
        return updateDuplicateErrors(filtered);
      });
      if (debounceTimeoutRef.current[id]) {
        clearTimeout(debounceTimeoutRef.current[id]);
        delete debounceTimeoutRef.current[id];
      }
      // Clear from validating set
      setValidatingIds(previous => {
        const next = new Set(previous);
        next.delete(id);
        return next;
      });
    },
    [updateDuplicateErrors],
  );

  const getErrorMessage = useCallback(
    (
      validationError?:
        | 'duplicate'
        | 'empty'
        | 'exists-in-other-contact'
        | 'invalid',
    ): string | undefined => {
      if (!validationError) return undefined;
      switch (validationError) {
        case 'invalid':
          return t('v2.contact-sheet.error.invalid-address');
        case 'duplicate':
          return t('v2.contact-sheet.error.duplicate-address');
        case 'exists-in-other-contact':
          return t('v2.contact-sheet.error.address-exists-in-other-contact');
        case 'empty':
        default:
          return t('v2.contact-sheet.error.empty-address');
      }
    },
    [t],
  );

  const mappedRecipients: Recipient[] = useMemo(
    () =>
      recipients.map(r => {
        const blockchain =
          r.detectedBlockchain ??
          (r.blockchainType !== AUTO_DETECT ? r.blockchainType : '');
        return {
          id: r.id,
          blockchainType: r.blockchainType,
          blockchain:
            blockchain || t('v2.contact-sheet.blockchain.auto-detect'),
          blockchainIcon: (blockchain
            ? getBlockchainIcon(blockchain)
            : 'TextColor') as Recipient['blockchainIcon'],
          address: r.address,
          error: getErrorMessage(r.validationError),
        };
      }),
    [recipients, t, getErrorMessage],
  );

  const hasValidAddress = useMemo(
    () =>
      recipients.some(
        r =>
          r.address.trim() &&
          !r.validationError &&
          (r.blockchainType !== AUTO_DETECT || r.detectedBlockchain),
      ),
    [recipients],
  );

  return {
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
  };
};
