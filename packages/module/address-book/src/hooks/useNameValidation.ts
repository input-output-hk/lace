import { useTranslation } from '@lace-contract/i18n';
import { useCallback, useMemo, useState } from 'react';

import type { Contact } from '@lace-contract/address-book';

interface UseNameValidationReturn {
  name: string;
  setName: (name: string) => void;
  nameError: string | undefined;
  avatarFallback: string;
  isNameTouched: boolean;
  touchName: () => void;
}

export const useNameValidation = (
  existingContacts: Contact[],
  hasValidAddress: boolean,
  initialContact?: Contact,
): UseNameValidationReturn => {
  const { t } = useTranslation();
  const [name, setNameInternal] = useState(initialContact?.name || '');
  const [isNameTouched, setIsNameTouched] = useState(false);

  const setName = useCallback(
    (newName: string) => {
      setNameInternal(newName);
      if (!isNameTouched) {
        setIsNameTouched(true);
      }
    },
    [isNameTouched],
  );

  const touchName = useCallback(() => {
    setIsNameTouched(true);
  }, []);

  const nameError = useMemo((): string | undefined => {
    const trimmed = name.trim();
    // Show error if name is empty and either the field was touched or a valid address exists
    if (!trimmed && (isNameTouched || hasValidAddress)) {
      return t('v2.contact-sheet.error.empty-name');
    }
    // Check for duplicate name (case-insensitive), excluding the current contact when editing
    if (
      trimmed &&
      existingContacts.some(
        c =>
          c.name.toLowerCase() === trimmed.toLowerCase() &&
          c.id !== initialContact?.id,
      )
    ) {
      return t('v2.contact-sheet.error.duplicate-name');
    }
    return undefined;
  }, [
    name,
    isNameTouched,
    hasValidAddress,
    existingContacts,
    initialContact,
    t,
  ]);

  const avatarFallback = useMemo(
    () => name.slice(0, 2).toUpperCase() || '?',
    [name],
  );

  return { name, setName, nameError, avatarFallback, isNameTouched, touchName };
};
