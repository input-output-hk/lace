import React, { ReactElement, useState } from 'react';
import { Button, Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import styles from './RenameFolderDrawer.module.scss';
import { NameForm } from '@views/browser/features/nfts/components/CreateFolder/NameForm';
import { NftFoldersRecordParams, useNftsFoldersContext, withNftsFoldersContext } from '@src/features/nfts/context';
import flatten from 'lodash/flatten';
import { RenameFolderType } from '@views/browser/features/nfts';
import FolderIcon from '@assets/icons/folder.component.svg';
import { NftFolderConfirmationModal } from './NftFolderConfirmationModal';
import { useTranslation } from 'react-i18next';

interface RenameFolderDrawerProps {
  folderToRename: RenameFolderType;
  visible: boolean;
  onClose: () => void;
  isPopupView?: boolean;
}

export const RenameFolderDrawer = withNftsFoldersContext(
  ({ folderToRename, visible, onClose, isPopupView = false }: RenameFolderDrawerProps): ReactElement => {
    const [name, setName] = useState('');
    const {
      list: nftFolders,
      utils: { updateRecord }
    } = useNftsFoldersContext();
    const [isFormValid, setIsFormValid] = useState(false);
    const [isExitModalVisible, setIsExitModalVisible] = useState(false);
    const { t } = useTranslation();

    const usedFolderNames = flatten(nftFolders?.map((folder: NftFoldersRecordParams) => folder.name));

    const onCloseDrawer = () => {
      !name || name === folderToRename.name ? onClose() : setIsExitModalVisible(true);
    };

    const changeFolderName = () => {
      updateRecord(
        folderToRename.id,
        { name },
        {
          text: t('browserView.nfts.renameFolderSuccess'),
          icon: FolderIcon
        }
      );
      setName('');
      onClose();
    };

    const onCloseDrawerConfirm = () => {
      onClose();
      setName('');
      setIsExitModalVisible(false);
    };

    const footer = (
      <div className={styles.actionButtons}>
        <Button
          size="large"
          block
          disabled={!isFormValid}
          onClick={changeFolderName}
          data-testid={'rename-folder-drawer-form-confirm-button'}
        >
          {t('general.button.confirm')}
        </Button>
        <Button
          size="large"
          block
          color="secondary"
          onClick={onCloseDrawer}
          data-testid={'rename-folder-drawer-form-cancel-button'}
        >
          {t('general.button.cancel')}
        </Button>
      </div>
    );

    return (
      <>
        <Drawer
          visible={visible}
          onClose={onCloseDrawer}
          popupView={isPopupView}
          title={<DrawerHeader popupView={isPopupView} title={t('browserView.nfts.renameYourFolder')} />}
          navigation={
            <DrawerNavigation
              title={!isPopupView && <div>{t('browserView.nfts.folderDrawer.existingFolderHeader')}</div>}
              onCloseIconClick={!isPopupView && onCloseDrawer}
            />
          }
          footer={footer}
        >
          <NameForm
            onSetIsFormValid={setIsFormValid}
            usedFolderNames={usedFolderNames}
            name={name || folderToRename?.name}
            onSetName={setName}
          />
        </Drawer>
        <NftFolderConfirmationModal
          onCancel={() => setIsExitModalVisible(false)}
          visible={isExitModalVisible}
          title={t('browserView.nfts.exitModal.header')}
          description={t('browserView.nfts.exitModal.description')}
          actions={[
            {
              body: t('browserView.nfts.exitModal.cancel'),
              dataTestId: 'create-folder-modal-cancel',
              color: 'secondary',
              onClick: () => setIsExitModalVisible(false)
            },
            {
              dataTestId: 'create-folder-modal-confirm',
              onClick: onCloseDrawerConfirm,
              body: t('browserView.nfts.exitModal.confirm')
            }
          ]}
          popupView={isPopupView}
        />
      </>
    );
  }
);
