import { type SheetScreenProps } from '@lace-lib/navigation';
import {
  EditFolderSheet as EditFolderSheetTemplate,
  Modal,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect, useMemo } from 'react';

import { useEditFolder } from './useEditFolder';

import type { SheetRoutes } from '@lace-lib/navigation';
import type { ButtonConfig } from '@lace-lib/ui-toolkit';

export const EditFolder = (props: SheetScreenProps<SheetRoutes.EditFolder>) => {
  const {
    deleteModalProps,
    editTokenFolderState,
    folderNameProps,
    buttonProps,
    actionProps,
    nftsProps,
    title,
  } = useEditFolder(props);
  const isSelectingTokens = editTokenFolderState.status === 'SelectingTokens';

  const primaryButton = useMemo<ButtonConfig>(
    () => ({
      label: buttonProps.buttonPrimaryLabel,
      onPress: isSelectingTokens
        ? nftsProps.onDone
        : buttonProps.buttonPrimaryPress,
      disabled: isSelectingTokens ? false : buttonProps.disabled,
      testID: isSelectingTokens
        ? 'nft-folder-select-done-btn'
        : buttonProps.buttonPrimaryTestID,
    }),
    [buttonProps, isSelectingTokens, nftsProps.onDone],
  );

  useEffect(() => {
    props.navigation.setOptions({
      detents: !isSelectingTokens ? ['auto'] : [1],
      scrollable: isSelectingTokens,
      header: <Sheet.Header title={title} />,
      footer: (
        <Sheet.Footer
          showDivider={false}
          secondaryButton={{
            label: buttonProps.buttonSecondaryLabel,
            onPress: isSelectingTokens
              ? nftsProps.onClose
              : buttonProps.buttonSecondaryPress,
            testID: buttonProps.buttonSecondaryTestID,
          }}
          primaryButton={primaryButton}
        />
      ),
    });
  }, [
    props.navigation,
    title,
    isSelectingTokens,
    buttonProps,
    nftsProps,
    primaryButton,
  ]);

  return (
    <>
      <Sheet.SubmitProvider action={primaryButton}>
        <EditFolderSheetTemplate
          folderName={folderNameProps}
          buttons={buttonProps}
          actions={actionProps}
          nfts={nftsProps}
          editTokenFolderState={editTokenFolderState}
        />
      </Sheet.SubmitProvider>
      <Modal
        title={deleteModalProps.title}
        icon="FolderOff"
        iconSize={80}
        description={deleteModalProps.description}
        visible={deleteModalProps.visible}
        onClose={deleteModalProps.onClose}
        onConfirm={deleteModalProps.onConfirm}
      />
    </>
  );
};
