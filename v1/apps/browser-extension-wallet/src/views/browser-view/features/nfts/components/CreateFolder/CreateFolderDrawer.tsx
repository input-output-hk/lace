/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
import React, { useCallback, useEffect, useState } from 'react';
import flatten from 'lodash/flatten';
import { useTranslation } from 'react-i18next';
import { Button, Drawer, DrawerHeader, DrawerNavigation, useKeyboardShortcut } from '@lace/common';
import { NftFolderItemProps } from '@lace/core';
import { NftFoldersRecordParams, useNftsFoldersContext, withNftsFoldersContext } from '@src/features/nfts/context';
import { NFT } from '@src/utils/get-token-list';
import FolderIcon from '@assets/icons/new-folder-plain-icon.component.svg';
import FolderIconDelete from '@assets/icons/delete-folder-plain-icon.component.svg';
import { SelectTokenButton } from '@components/AssetSelectionButton/SelectTokensButton';
import { AssetPicker } from './AssetPicker';
import { NameForm } from './NameForm';
import { NftsList } from './NftsList';
import styles from './CreateFolderDrawer.module.scss';
import { NftFolderConfirmationModal } from '../NftFolderConfirmationModal';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

interface GeneralSettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSelectNft: (nft: NFT) => void;
  isPopupView?: boolean;
  selectedFolder?: NftFolderItemProps;
}

export enum Sections {
  FOLDER = 'FOLDER',
  FORM = 'FORM',
  ASSET_PICKER = 'ASSET_PICKER'
}

export const NFTFolderDrawer = withNftsFoldersContext(
  ({
    visible,
    onClose,
    isPopupView = false,
    selectedFolder,
    onSelectNft
  }: GeneralSettingsDrawerProps): React.ReactElement => {
    const { t } = useTranslation();
    const analytics = useAnalyticsContext();
    const [name, setName] = useState('');
    const [selectedTokenIds, setSelectedTokenIds] = useState<Array<string>>([]);
    const MAIN_SECTION = selectedFolder ? Sections.FOLDER : Sections.FORM;
    const [currentSection, setCurrentSection] = useState<Sections>(MAIN_SECTION);
    const [isExitModalVisible, setIsExitModalVisible] = useState(false);
    const [isCreateFormValid, setIsCreateFormValid] = useState(false);
    const {
      list: nftFolders,
      utils: { saveRecord: saveNftFolder, updateRecord: updateNftFolder }
    } = useNftsFoldersContext();

    const usedNftsIds = flatten(nftFolders?.map((folder: NftFoldersRecordParams) => folder.assets));
    const usedFolderNames = flatten(nftFolders?.map((folder: NftFoldersRecordParams) => folder.name));

    const onCloseDrawerConfirm = useCallback(() => {
      onClose();
      setSelectedTokenIds([]);
      setName('');
      setCurrentSection(Sections[MAIN_SECTION]);
      setIsExitModalVisible(false);
    }, [onClose, MAIN_SECTION]);

    const onCloseDrawer = useCallback(() => {
      if (currentSection === Sections.FOLDER) onCloseDrawerConfirm();
      else setIsExitModalVisible(true);
    }, [currentSection, onCloseDrawerConfirm]);

    const goToAssetsSelection = useCallback(() => {
      if (name || MAIN_SECTION === Sections.FOLDER) {
        setCurrentSection(Sections.ASSET_PICKER);
      }
    }, [name, MAIN_SECTION]);

    const onGoBack = useCallback(() => {
      if (currentSection === Sections.ASSET_PICKER) setCurrentSection(Sections[MAIN_SECTION]);
      else onCloseDrawer();
    }, [currentSection, MAIN_SECTION, onCloseDrawer]);

    const createFolder = useCallback(() => {
      if (!isCreateFormValid) return;
      saveNftFolder(
        {
          name,
          assets: selectedTokenIds
        },
        {
          text: t('browserView.nfts.folderDrawer.toast.create'),
          icon: FolderIcon
        }
      );
      onCloseDrawerConfirm();
    }, [isCreateFormValid, name, onCloseDrawerConfirm, saveNftFolder, selectedTokenIds, t]);

    const addToFolder = () => {
      const { assets } = [...(nftFolders as [])].find(({ id }) => id === selectedFolder?.id);

      updateNftFolder(
        selectedFolder?.id,
        {
          assets: [...assets, ...selectedTokenIds]
        },
        {
          text: t('browserView.nfts.folderDrawer.toast.update'),
          icon: FolderIcon
        }
      );
      onGoBack();
      setSelectedTokenIds([]);
    };

    const removeFromFolder = (nftId: string) => {
      const { assets } = [...(nftFolders as [])].find(({ id }) => id === selectedFolder?.id);
      const removedItemIndex = (assets as [string])?.indexOf(nftId);
      const newAssets = [...assets];
      newAssets.splice(removedItemIndex, 1);

      updateNftFolder(
        selectedFolder?.id,
        {
          assets: newAssets
        },
        {
          text: t('browserView.nfts.folderDrawer.toast.delete'),
          icon: FolderIconDelete
        }
      );
    };

    const onEnter = useCallback(() => {
      if (isExitModalVisible) {
        onCloseDrawerConfirm();
        setIsExitModalVisible(false);
      } else if (currentSection === Sections[MAIN_SECTION]) goToAssetsSelection();
      else createFolder();
    }, [createFolder, currentSection, goToAssetsSelection, isExitModalVisible, onCloseDrawerConfirm, MAIN_SECTION]);

    useKeyboardShortcut(['Enter'], onEnter, visible);

    useKeyboardShortcut(['Escape'], onGoBack, visible);

    useEffect(() => {
      setCurrentSection(selectedFolder ? Sections.FOLDER : Sections.FORM);
    }, [selectedFolder]);

    const selectTokenButton = selectedTokenIds.length > 0 && (
      <div className={styles.titleAside}>
        <SelectTokenButton
          count={selectedTokenIds.length}
          label={t('multipleSelection.clear')}
          onClick={() => setSelectedTokenIds([])}
          testId="assets-clear"
        />
      </div>
    );

    const headerMap: Record<Sections, React.ReactElement> = {
      [Sections.FOLDER]: (
        <DrawerHeader
          popupView={isPopupView}
          title={
            <div className={styles.nftFolderDrawerTitle}>
              <span data-testid="selected-folder-title">{selectedFolder?.name}</span>
              <span data-testid="selected-folder-nft-counter" className={styles.nftFolderDrawerTitleSideText}>
                ({selectedFolder?.nfts?.length || 0})
              </span>
            </div>
          }
        />
      ),
      [Sections.FORM]: (
        <DrawerHeader popupView={isPopupView} title={t('browserView.nfts.folderDrawer.nameForm.title')} />
      ),
      [Sections.ASSET_PICKER]: (
        <DrawerHeader
          popupView={isPopupView}
          title={
            <div className={styles.assetPickerHeader}>
              <div className={styles.title}>{t('browserView.nfts.folderDrawer.assetPicker.title')}</div>
              {!isPopupView && selectTokenButton}
            </div>
          }
        />
      )
    };

    const sectionMap: Record<Sections, React.ReactElement> = {
      [Sections.FOLDER]: (
        <span className={styles.nftFolderDrawerList} data-testid="asset-selector-wrapper">
          <NftsList
            nfts={selectedFolder?.nfts}
            onSelectNft={onSelectNft}
            onAddNft={goToAssetsSelection}
            onRemoveNft={removeFromFolder}
            isPopupView={isPopupView}
          />
        </span>
      ),
      [Sections.FORM]: (
        <NameForm
          onSetIsFormValid={setIsCreateFormValid}
          usedFolderNames={usedFolderNames}
          name={name}
          onSetName={setName}
        />
      ),
      [Sections.ASSET_PICKER]: (
        <AssetPicker
          onSetIsFormValid={setIsCreateFormValid}
          usedNftsIds={usedNftsIds}
          selectedTokenIds={selectedTokenIds}
          setSelectedTokenIds={setSelectedTokenIds}
          isPopupView={isPopupView}
        />
      )
    };

    const footerMap: Record<Sections, React.ReactElement> = {
      [Sections.FOLDER]: undefined,
      [Sections.FORM]: (
        <Button
          size="large"
          block
          disabled={!isCreateFormValid}
          onClick={() => {
            analytics.sendEventToPostHog(PostHogAction.NFTCreateFolderNameYourFolderNextClick);
            goToAssetsSelection();
          }}
          data-testid={'create-folder-drawer-form-cta'}
        >
          {t('browserView.nfts.folderDrawer.cta.create')}
        </Button>
      ),
      [Sections.ASSET_PICKER]: (
        <Button
          size="large"
          block
          disabled={!isCreateFormValid}
          onClick={() => {
            if (selectedFolder) {
              addToFolder();
              return;
            }
            analytics.sendEventToPostHog(PostHogAction.NFTCreateFolderSelectNftsNextClick);
            createFolder();
          }}
          data-testid={'create-folder-drawer-asset-picker-cta'}
        >
          {t(`browserView.nfts.folderDrawer.cta.${selectedFolder ? 'update' : 'create'}`)}
        </Button>
      )
    };

    return (
      <>
        <Drawer
          keyboard={false}
          visible={visible}
          onClose={onCloseDrawer}
          title={headerMap[currentSection]}
          navigation={
            <DrawerNavigation
              title={
                !isPopupView ? (
                  <div>{t(`browserView.nfts.folderDrawer.${selectedFolder ? 'existingFolderHeader' : 'header'}`)}</div>
                ) : undefined
              }
              onCloseIconClick={!isPopupView ? onCloseDrawer : undefined}
              onArrowIconClick={isPopupView || currentSection === Sections.ASSET_PICKER ? onGoBack : undefined}
              rightActions={isPopupView && currentSection === Sections.ASSET_PICKER ? selectTokenButton : undefined}
            />
          }
          popupView={isPopupView}
          footer={footerMap[currentSection]}
          destroyOnClose
        >
          {sectionMap[currentSection]}
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
