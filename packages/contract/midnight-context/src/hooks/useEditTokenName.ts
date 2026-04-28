import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  isTokenFullNameValid,
  isTokenShortNameValid,
} from '../token-name-validation';

import type {
  StoredTokenMetadata,
  TokenId,
  TokenMetadata,
} from '@lace-contract/tokens';

export interface EditTokenNameToken {
  tokenId: TokenId;
  metadata?: TokenMetadata | null;
  displayLongName: string;
  displayShortName: string;
}

export interface UseEditTokenNameProps {
  token: EditTokenNameToken | null;
  takenTokenNames: string[];
  onSave: (metadata: StoredTokenMetadata) => void;
  onClose: () => void;
  getErrorMessage: (
    name: string,
    excludedNames: string[],
  ) => string | undefined;
}

export interface UseEditTokenNameResult {
  tokenFullName: string;
  tokenShortName: string;
  setTokenFullName: (name: string) => void;
  setTokenShortName: (name: string) => void;
  tokenFullNameError: string | undefined;
  tokenShortNameError: string | undefined;
  isSaveDisabled: boolean;
  handleSave: () => void;
  handleClose: () => void;
}

export const useEditTokenName = ({
  token,
  takenTokenNames,
  onSave,
  onClose,
  getErrorMessage,
}: UseEditTokenNameProps): UseEditTokenNameResult => {
  const [tokenFullName, setTokenFullName] = useState(
    token?.metadata?.name ? token.displayLongName : '',
  );
  const [tokenShortName, setTokenShortName] = useState(
    token?.metadata?.ticker ? token.displayShortName : '',
  );
  const [isFullNameDirty, setIsFullNameDirty] = useState(false);
  const [isShortNameDirty, setIsShortNameDirty] = useState(false);

  const handleSetTokenFullName = useCallback((name: string) => {
    setIsFullNameDirty(true);
    setTokenFullName(name);
  }, []);

  const handleSetTokenShortName = useCallback((name: string) => {
    setIsShortNameDirty(true);
    setTokenShortName(name);
  }, []);

  const takenTokenNamesExcludingCurrent = useMemo(
    () =>
      takenTokenNames.filter(name => {
        const currentTokenDisplayLongName = token?.metadata?.name
          ? token.displayLongName
          : '';
        const currentTokenDisplayShortName = token?.metadata?.ticker
          ? token.displayShortName
          : '';

        return (
          currentTokenDisplayLongName !== name &&
          currentTokenDisplayShortName !== name
        );
      }),
    [token, takenTokenNames],
  );

  useEffect(() => {
    if (token?.metadata?.name) setTokenFullName(token.displayLongName);
    if (token?.metadata?.ticker) setTokenShortName(token.displayShortName);
    setIsFullNameDirty(false);
    setIsShortNameDirty(false);
  }, [token]);

  const tokenFullNameError = useMemo(
    () =>
      isFullNameDirty
        ? getErrorMessage(tokenFullName, takenTokenNamesExcludingCurrent)
        : undefined,
    [
      tokenFullName,
      getErrorMessage,
      isFullNameDirty,
      takenTokenNamesExcludingCurrent,
    ],
  );

  const tokenShortNameError = useMemo(
    () =>
      isShortNameDirty
        ? getErrorMessage(tokenShortName, takenTokenNamesExcludingCurrent)
        : undefined,
    [
      tokenShortName,
      getErrorMessage,
      isShortNameDirty,
      takenTokenNamesExcludingCurrent,
    ],
  );

  const isSaveDisabled =
    !!tokenFullNameError ||
    !!tokenShortNameError ||
    !(
      isTokenFullNameValid(tokenFullName, takenTokenNamesExcludingCurrent) &&
      isTokenShortNameValid(tokenShortName, takenTokenNamesExcludingCurrent)
    );

  const handleSave = useCallback(() => {
    if (!token || isSaveDisabled) return;

    setTokenFullName('');
    setTokenShortName('');
    setIsFullNameDirty(false);
    setIsShortNameDirty(false);

    onSave({
      ...token.metadata!,
      name: tokenFullName.trim(),
      ticker: tokenShortName.trim(),
      tokenId: token.tokenId,
    });
  }, [token, onSave, tokenFullName, tokenShortName, isSaveDisabled]);

  const handleClose = useCallback(() => {
    setTokenFullName('');
    setTokenShortName('');
    setIsFullNameDirty(false);
    setIsShortNameDirty(false);
    onClose();
  }, [onClose]);

  return {
    tokenFullName,
    tokenShortName,
    setTokenFullName: handleSetTokenFullName,
    setTokenShortName: handleSetTokenShortName,
    tokenFullNameError,
    tokenShortNameError,
    isSaveDisabled,
    handleSave,
    handleClose,
  };
};
