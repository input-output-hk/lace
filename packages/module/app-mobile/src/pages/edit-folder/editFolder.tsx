import { type SheetScreenProps } from '@lace-lib/navigation';
import {
  EditFolderSheet as EditFolderSheetTemplate,
  Modal,
} from '@lace-lib/ui-toolkit';
import React from 'react';

import { useEditFolder } from './useEditFolder';

import type { SheetRoutes } from '@lace-lib/navigation';

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

  return (
    <>
      <EditFolderSheetTemplate
        title={title}
        folderName={folderNameProps}
        buttons={buttonProps}
        actions={actionProps}
        nfts={nftsProps}
        editTokenFolderState={editTokenFolderState}
      />
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
