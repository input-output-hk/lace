import { isDuplicateString } from '@lace-contract/account-management';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { getIsWideLayout, useTheme } from '@lace-lib/ui-toolkit';
import { useCallback, useState, useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

const useFolderNameHelpers = (setFolderName: (n: string) => void) => {
  const onFolderNameChange = useCallback((name: string) => {
    setFolderName(name);
  }, []);

  const isDisabled = useCallback((folderName: string) => {
    return !folderName.trim();
  }, []);

  return { onFolderNameChange, isDisabled };
};

export const useCreateFolder = (
  _props: SheetScreenProps<SheetRoutes.CreateFolder>,
) => {
  const createFolderState = useLaceSelector(
    'createTokenFolderFlow.selectState',
  );
  const accountId = _props.route.params?.accountId ?? '';
  const selectorParams = useMemo(() => ({ accountId }), [accountId]);
  const folderTokens = useLaceSelector(
    'tokens.selectCreateFolderTokens',
    selectorParams,
  );
  const allFolders = useLaceSelector('tokenFolders.selectAllFolders');

  const { t } = useTranslation();
  const { theme } = useTheme();

  const proceedToTokenSelection = useDispatchLaceAction(
    'createTokenFolderFlow.namingFolderNext',
  );
  const completeCreation = useDispatchLaceAction(
    'createTokenFolderFlow.selectingTokensNext',
  );
  const cancelFlow = useDispatchLaceAction('createTokenFolderFlow.cancel');
  const addToken = useDispatchLaceAction('createTokenFolderFlow.addToken');
  const removeToken = useDispatchLaceAction(
    'createTokenFolderFlow.removeToken',
  );
  const startCreation = useDispatchLaceAction(
    'createTokenFolderFlow.startCreation',
  );

  const isSelectingTokens = createFolderState.status === 'SelectingTokens';

  const showToast = useDispatchLaceAction('ui.showToast');

  const title = isSelectingTokens
    ? t('v2.create-nft-folder.title-adding-nfts')
    : t('v2.create-nft-folder.title');
  const buttonPrimaryLabel = t('v2.nft-folder.continue');
  const buttonSecondaryLabel = !isSelectingTokens
    ? t('v2.nft-folder.cancel')
    : t('v2.create-nft-folder.selecting-tokens-secondary-button-label');
  const folderNameLabel = t('v2.nft-folder.folderName');
  const inputLabel = t('v2.nft-folder.inputLabel');
  const pickNftsLabel = t('v2.create-nft-folder.pickNfts');
  const doneLabel = t('v2.create-nft-folder.done');
  const successMessage = t('v2.create-nft-folder.success-message');
  const duplicateFolderNameMessage = t('v2.nft-folder.error.duplicate-name');

  const [folderName, setFolderName] = useState('');
  const { width } = useWindowDimensions();

  const isDuplicateFolderName = useMemo(
    () =>
      isDuplicateString(
        folderName,
        allFolders.map(f => f.name),
      ),
    [folderName, allFolders],
  );

  const folderNameInputError = isDuplicateFolderName
    ? duplicateFolderNameMessage
    : undefined;

  const { onFolderNameChange, isDisabled } =
    useFolderNameHelpers(setFolderName);

  const canContinue = useCallback(() => folderName.trim(), [folderName]);

  const handleContinuePress = useCallback(() => {
    if (isDuplicateFolderName) return;
    if (canContinue()) {
      proceedToTokenSelection(folderName.trim());
    }
  }, [proceedToTokenSelection, folderName, canContinue, isDuplicateFolderName]);

  const handleCancelPress = useCallback(() => {
    cancelFlow();
    NavigationControls.sheets.close();
  }, [cancelFlow]);

  const onToggleNftSelection = useCallback(
    (index: number) => {
      const { tokenId, isSelected } = folderTokens[index];

      if (isSelected) {
        removeToken(tokenId);
      } else {
        addToken(tokenId);
      }
    },
    [folderTokens, removeToken, addToken],
  );

  const onNftSelectionClose = useCallback(() => {
    NavigationControls.sheets.close();
  }, []);

  const handleCreateFolder = useCallback(() => {
    completeCreation();
    NavigationControls.sheets.close();
    showToast({
      text: successMessage,
      color: 'positive',
      duration: 3,
      leftIcon: {
        name: 'Folder01',
        size: 25,
        color: theme.brand.white,
      },
      rightIcon: {
        name: 'Checkmark',
        size: 25,
        color: theme.brand.white,
      },
    });
  }, [completeCreation, successMessage, showToast, theme]);

  const onNftSelectionDone = useCallback(() => {
    handleCreateFolder();
  }, [handleCreateFolder]);

  const folderNameProps = {
    folderName,
    onFolderNameChange,
    folderNameLabel,
    inputLabel,
    inputError: folderNameInputError,
  };

  const numberOfColumns = useMemo(() => {
    return getIsWideLayout(width) ? 4 : 3;
  }, [width]);

  const buttonProps = useMemo(() => {
    if (createFolderState.status === 'SelectingTokens') {
      const selectedTokensCount = folderTokens.filter(
        token => token.isSelected,
      ).length;
      const shouldDisableDone = selectedTokensCount === 0;
      return {
        buttonPrimaryLabel: doneLabel,
        buttonPrimaryPress: onNftSelectionDone,
        buttonSecondaryLabel,
        buttonSecondaryPress: onNftSelectionClose,
        buttonPrimaryTestID: 'nft-folder-select-done-btn',
        buttonSecondaryTestID: 'nft-folder-name-cancel-btn',
        disabled: shouldDisableDone,
      };
    }
    return {
      buttonPrimaryLabel,
      buttonPrimaryPress: handleContinuePress,
      buttonSecondaryLabel,
      buttonSecondaryPress: handleCancelPress,
      buttonPrimaryTestID: 'nft-folder-name-continue-btn',
      buttonSecondaryTestID: 'nft-folder-name-cancel-btn',
      disabled: isDisabled(folderName) || isDuplicateFolderName,
    };
  }, [
    createFolderState.status,
    folderTokens,
    doneLabel,
    onNftSelectionDone,
    buttonSecondaryLabel,
    onNftSelectionClose,
    buttonPrimaryLabel,
    handleContinuePress,
    handleCancelPress,
    folderName,
    isDisabled,
    isDuplicateFolderName,
  ]);

  const nftsProps = useMemo(
    () => ({
      nfts: folderTokens,
      onToggleNftSelection,
      onClose: onNftSelectionClose,
      onDone: onNftSelectionDone,
      pickNftsLabel,
      doneLabel,
    }),
    [
      folderTokens,
      onToggleNftSelection,
      onNftSelectionClose,
      onNftSelectionDone,
      pickNftsLabel,
      doneLabel,
    ],
  );

  useEffect(() => {
    if (createFolderState.status === 'Idle') {
      setFolderName('');
      startCreation(accountId);
    }
  }, [createFolderState.status, startCreation, setFolderName, accountId]);

  const templateProps = {
    folderName: folderNameProps,
    buttons: buttonProps,
    nfts: nftsProps,
    createFolderState,
    title,
    theme,
    numberOfColumns,
  };

  return {
    templateProps,
  };
};
