import { isDuplicateString } from '@lace-contract/account-management';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { useTheme } from '@lace-lib/ui-toolkit';
import { useCallback, useState, useEffect, useMemo } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { Token } from '@lace-contract/tokens';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

type TokenWithSelection = Token & { isSelected: boolean };

const toggleNftSelectionAtIndex = (
  item: TokenWithSelection,
  index_: number,
  targetIndex: number,
) => {
  if (index_ === targetIndex) {
    return { ...item, isSelected: !item.isSelected };
  }
  return item;
};

const getSelectedTokenIds = (nfts: TokenWithSelection[]) =>
  nfts.filter(nft => nft.isSelected).map(nft => nft.tokenId);

const useFolderNameHelpers = (setFolderName: (n: string) => void) => {
  const onFolderNameChange = useCallback((name: string) => {
    setFolderName(name);
  }, []);

  return { onFolderNameChange };
};

const useModalHelpers = (
  setVisible: (visible: boolean) => void,
  handleDeleteFolderPress: () => void,
) => {
  const showDeleteModal = useCallback(() => {
    setVisible(true);
  }, []);
  const hideDeleteModal = useCallback(() => {
    setVisible(false);
  }, []);
  const onDeleteModalPress = useCallback(() => {
    showDeleteModal();
  }, [showDeleteModal]);
  const onDeleteModalClose = useCallback(() => {
    hideDeleteModal();
  }, [hideDeleteModal]);
  const onDeleteModalConfirm = useCallback(() => {
    hideDeleteModal();
    handleDeleteFolderPress();
  }, [hideDeleteModal, handleDeleteFolderPress]);
  return {
    onDeleteModalPress,
    onDeleteModalClose,
    onDeleteModalConfirm,
    showDeleteModal,
    hideDeleteModal,
  };
};

export const useEditFolder = (
  props: SheetScreenProps<SheetRoutes.EditFolder>,
) => {
  const { folderId, accountId } = props.route.params;

  const { t } = useTranslation();
  const { theme } = useTheme();

  const selectorParams = useMemo(
    () => ({ accountId, folderId }),
    [accountId, folderId],
  );
  const selectableNfts = useLaceSelector(
    'tokens.selectFolderSelectableTokens',
    selectorParams,
  );
  const editTokenFolderState = useLaceSelector(
    'editTokenFolderFlow.selectState',
  );

  const currentFolder = useLaceSelector(
    'tokenFolders.selectFolderById',
    folderId,
  );
  const allFolders = useLaceSelector('tokenFolders.selectAllFolders');

  const confirmNameChange = useDispatchLaceAction(
    'editTokenFolderFlow.confirmNameChange',
  );
  const goToSelectingTokens = useDispatchLaceAction(
    'editTokenFolderFlow.selectTokens',
  );
  const goToEditing = useDispatchLaceAction(
    'editTokenFolderFlow.selectingTokensBack',
  );
  const setTokens = useDispatchLaceAction('editTokenFolderFlow.setTokens');
  const completeTokenSelection = useDispatchLaceAction(
    'editTokenFolderFlow.selectingTokensComplete',
  );
  const deleteFolder = useDispatchLaceAction('editTokenFolderFlow.delete');
  const setSelectedFolderId = useDispatchLaceAction('ui.setSelectedFolderId');
  const startEditing = useDispatchLaceAction(
    'editTokenFolderFlow.startEditing',
  );
  const cancelEditFlow = useDispatchLaceAction('editTokenFolderFlow.cancel');

  const title = t('v2.edit-nft-folder.title');
  const buttonPrimaryLabel = t('v2.edit-nft-folder.saveChanges');
  const buttonSecondaryLabel = t('v2.nft-folder.cancel');
  const buttonTertiaryLabel = t('v2.edit-nft-folder.deleteFolder');
  const moreSettingsLabel = t('v2.edit-nft-folder.moreSettings');
  const updateNftsLabel = t('v2.edit-nft-folder.updateNfts');
  const folderNameLabel = t('v2.nft-folder.folderName');
  const inputLabel = t('v2.nft-folder.inputLabel');
  const deleteModalTitle = t('v2.edit-nft-folder.deleteTitle');
  const deleteModalDescription = t('v2.edit-nft-folder.deleteDescription');
  const pickNftsLabel = t('v2.create-nft-folder.pickNfts');
  const duplicateFolderNameMessage = t('v2.nft-folder.error.duplicate-name');

  const showToast = useDispatchLaceAction('ui.showToast');
  const successMessage = t('v2.edit-nft-folder.success-message');

  const [folderName, setFolderName] = useState(currentFolder?.name || '');
  const [nfts, setNfts] = useState<TokenWithSelection[]>([]);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const { onFolderNameChange } = useFolderNameHelpers(setFolderName);

  const isDuplicateFolderName = useMemo(
    () =>
      isDuplicateString(
        folderName,
        allFolders.map(f => f.name),
        currentFolder?.name,
      ),
    [folderName, allFolders, currentFolder?.name],
  );

  const folderNameInputError = isDuplicateFolderName
    ? duplicateFolderNameMessage
    : undefined;

  const isDisabled = folderName.length === 0;

  const handleSaveChangesPress = useCallback(() => {
    if (isDuplicateFolderName) return;
    if (editTokenFolderState.status === 'Editing') {
      confirmNameChange(folderName.trim());
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
      NavigationControls.sheets.close();
    }
  }, [
    confirmNameChange,
    currentFolder,
    folderName,
    editTokenFolderState.status,
    showToast,
    successMessage,
    theme,
    isDuplicateFolderName,
  ]);

  const handleDeleteFolderPress = useCallback(() => {
    if (currentFolder && editTokenFolderState.status === 'Editing') {
      deleteFolder();
      setSelectedFolderId(null);
    }
    NavigationControls.sheets.close();
  }, [
    currentFolder,
    deleteFolder,
    setSelectedFolderId,
    editTokenFolderState.status,
  ]);

  const handleSheetClose = useCallback(() => {
    cancelEditFlow();
    NavigationControls.sheets.close();
  }, [cancelEditFlow]);

  const onUpdateNftsPress = useCallback(() => {
    if (editTokenFolderState.status === 'Editing') {
      goToSelectingTokens();
    }
  }, [goToSelectingTokens, editTokenFolderState.status]);

  const { onDeleteModalPress, onDeleteModalClose, onDeleteModalConfirm } =
    useModalHelpers(setIsDeleteModalVisible, handleDeleteFolderPress);

  const onToggleNftSelection = useCallback((index: number) => {
    setNfts(nfts =>
      nfts.map((item, index_) =>
        toggleNftSelectionAtIndex(item, index_, index),
      ),
    );
  }, []);

  const onNftSelectionClose = useCallback(() => goToEditing(), [goToEditing]);

  const handleUpdateFolderTokens = useCallback(() => {
    setTokens(getSelectedTokenIds(nfts));
    completeTokenSelection();
  }, [nfts, setTokens, completeTokenSelection]);

  const onNftSelectionDone = useCallback(() => {
    handleUpdateFolderTokens();
  }, [handleUpdateFolderTokens]);

  const folderNameProps = {
    folderName,
    onFolderNameChange,
    folderNameLabel,
    inputLabel,
    userInputFolderName: folderName,
    inputError: folderNameInputError,
  };

  const buttonProps = useMemo(
    () => ({
      buttonPrimaryLabel,
      buttonPrimaryPress: handleSaveChangesPress,
      buttonSecondaryLabel,
      buttonSecondaryPress: handleSheetClose,
      buttonTertiaryLabel,
      buttonPrimaryTestID: 'edit-nft-folder-save-changes-btn',
      buttonSecondaryTestID: 'edit-nft-folder-cancel-btn',
      disabled: isDisabled || isDuplicateFolderName,
    }),
    [
      buttonPrimaryLabel,
      handleSaveChangesPress,
      buttonSecondaryLabel,
      handleSheetClose,
      buttonTertiaryLabel,
      folderName,
      currentFolder,
      isDisabled,
      isDuplicateFolderName,
    ],
  );

  const actionProps = useMemo(
    () => ({
      onUpdateNftsPress,
      onDeleteFolderPress: onDeleteModalPress,
      moreSettingsLabel,
      updateNftsLabel,
      isUpdateNftsDisabled: editTokenFolderState.status !== 'Editing',
    }),
    [
      onUpdateNftsPress,
      onDeleteModalPress,
      moreSettingsLabel,
      updateNftsLabel,
      editTokenFolderState.status,
    ],
  );

  const deleteModalProps = useMemo(
    () => ({
      title: deleteModalTitle,
      description: deleteModalDescription,
      onClose: onDeleteModalClose,
      onConfirm: onDeleteModalConfirm,
      visible: isDeleteModalVisible,
    }),
    [
      deleteModalTitle,
      deleteModalDescription,
      onDeleteModalClose,
      onDeleteModalConfirm,
      isDeleteModalVisible,
    ],
  );

  const nftsProps = useMemo(
    () => ({
      nfts,
      onToggleNftSelection,
      onClose: onNftSelectionClose,
      onDone: onNftSelectionDone,
      pickNftsLabel,
    }),
    [
      nfts,
      onToggleNftSelection,
      onNftSelectionClose,
      onNftSelectionDone,
      pickNftsLabel,
    ],
  );

  useEffect(() => {
    setNfts(selectableNfts);
  }, [selectableNfts, currentFolder?.name]);

  useEffect(() => {
    if (folderId && editTokenFolderState.status === 'Idle') {
      startEditing(folderId);
    }
  }, [folderId, editTokenFolderState.status, startEditing]);

  return {
    folderNameProps,
    buttonProps,
    actionProps,
    deleteModalProps,
    editTokenFolderState,
    title,
    nftsProps,
  };
};
