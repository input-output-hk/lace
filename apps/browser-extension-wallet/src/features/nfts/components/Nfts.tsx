/* eslint-disable complexity */
/* eslint-disable unicorn/no-useless-undefined, max-statements */
import { useAssetInfo, useRedirection } from '@hooks';
import { useWalletStore } from '@src/stores';
import { Button, useObservable } from '@lace/common';
import { DEFAULT_WALLET_BALANCE } from '@src/utils/constants';
import flatten from 'lodash/flatten';
import { Skeleton } from 'antd';
import isNil from 'lodash/isNil';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Nfts.module.scss';
import { ListEmptyState, NftFolderItemProps, NftGrid, NftItemProps, NftListProps, NftsItemsTypes } from '@lace/core';
import { ContentLayout } from '@src/components/Layout';
import { FundWalletBanner } from '@src/views/browser-view/components';
import { walletRoutePaths } from '@routes';
import { getTokenList } from '@src/utils/get-token-list';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import FolderIcon from '@assets/icons/new-folder-icon.component.svg';
import { SectionTitle } from '@components/Layout/SectionTitle';
import { NFTFolderDrawer } from '@src/views/browser-view/features/nfts/components/CreateFolder/CreateFolderDrawer';
import { NftFoldersRecordParams, useNftsFoldersContext, withNftsFoldersContext } from '../context';
import { RenameFolderDrawer } from '@views/browser/features/nfts/components/RenameFolderDrawer';
import { RenameFolderType } from '@views/browser/features/nfts';
import { NftFolderConfirmationModal } from '@views/browser/features/nfts/components/NftFolderConfirmationModal';
import RemoveFolderIcon from '@assets/icons/remove-folder.component.svg';
import { useAnalyticsContext, useCurrencyStore } from '@providers';
import { SearchBox } from '@input-output-hk/lace-ui-toolkit';
import { useNftSearch } from '@hooks/useNftSearch';

const MIN_ASSET_COUNT_FOR_SEARCH = 10;
export const extensionScrollableContainerID = 'contentLayout';

export const Nfts = withNftsFoldersContext((): React.ReactElement => {
  const redirectToNftDetail = useRedirection<{ params: { id: string } }>(walletRoutePaths.nftDetail);
  const [isCreateFolderDrawerOpen, setIsCreateFolderDrawerOpen] = useState(false);
  const { environmentName } = useWalletStore();

  const [selectedFolderId, setSelectedFolderId] = useState<number | undefined>();
  const { walletInfo, inMemoryWallet } = useWalletStore();
  const { t } = useTranslation();
  const assetsInfo = useAssetInfo();
  const { isSearching, handleSearch, filteredResults } = useNftSearch(assetsInfo);
  const assetsBalance = useObservable(inMemoryWallet.balance.utxo.total$, DEFAULT_WALLET_BALANCE.utxo.total$);
  const analytics = useAnalyticsContext();
  const { fiatCurrency } = useCurrencyStore();
  const [folderToRename, setFolderToRename] = useState<RenameFolderType>();
  const [folderToDelete, setFolderToDelete] = useState<number>();
  const [isRenameFolderDrawerOpen, setIsRenameFolderDrawerOpen] = useState(false);
  const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);
  const {
    utils: { deleteRecord }
  } = useNftsFoldersContext();

  const [searchValue, setSearchValue] = useState('');

  const [hasRecordedAnalytics, setHasRecordedAnalytics] = useState(false);

  const onSelectNft = useCallback(
    (nft) => {
      analytics.sendEventToPostHog(PostHogAction.NFTsImageClick);
      redirectToNftDetail({ params: { id: nft.assetId.toString() } });
    },
    [analytics, redirectToNftDetail]
  );

  const nfts: NftItemProps[] = useMemo(() => {
    const { nftList } = getTokenList({ assetsInfo, balance: assetsBalance?.assets, environmentName, fiatCurrency });
    return nftList.map((nft) => ({
      ...nft,
      type: NftsItemsTypes.NFT,
      onClick: () => onSelectNft(nft)
    }));
  }, [assetsBalance?.assets, assetsInfo, environmentName, fiatCurrency, onSelectNft]);

  const renderContextMenu = useCallback(
    (id: number, folderName: string) =>
      [
        {
          label: t('browserView.nfts.contextMenu.rename'),
          onClick: () => {
            setIsRenameFolderDrawerOpen(true);
            setFolderToRename({ id, name: folderName });
          }
        },
        {
          label: t('browserView.nfts.contextMenu.delete'),
          onClick: () => {
            setFolderToDelete(id);
            setIsDeleteFolderModalOpen(true);
          }
        }
      ] || [],
    [t]
  );

  const { list: nftFolders } = useNftsFoldersContext();
  const folders: NftFolderItemProps[] = useMemo(
    () =>
      nftFolders?.map(({ name, assets, id }: NftFoldersRecordParams) => ({
        id,
        name,
        type: NftsItemsTypes.FOLDER,
        nfts: assets
          .map((nftId: string) => nfts.find(({ assetId }) => assetId.toString() === nftId))
          .filter((_nfts) => !!_nfts),
        contextMenuItems: renderContextMenu(id, name),
        onClick: () => {
          setSelectedFolderId(id);
          setIsCreateFolderDrawerOpen(true);
        }
      })) || [],
    [nftFolders, nfts, renderContextMenu]
  );

  const selectedFolder = useMemo(() => folders.find(({ id }) => selectedFolderId === id), [selectedFolderId, folders]);

  const usedNftsIds = flatten(nftFolders?.map(({ assets }: NftFoldersRecordParams) => assets));
  const nftsNotInFolders = nfts.filter(({ assetId }) => !usedNftsIds.includes(assetId));
  const items: NftListProps['items'] = [...folders, ...nftsNotInFolders];

  const isLoadingFirstTime = isNil(assetsBalance) || isNil(nftFolders);

  const onDeleteFolderConfirm = () => {
    setIsDeleteFolderModalOpen(false);
    deleteRecord(folderToDelete, {
      text: t('browserView.nfts.deleteFolderSuccess'),
      icon: RemoveFolderIcon
    });
  };
  const onCloseFolderDrawer = useCallback(() => {
    setIsCreateFolderDrawerOpen(false);
    setSelectedFolderId(undefined);
  }, []);

  const handleNftSearch = (searchItems: NftListProps['items'], value: string) => {
    setSearchValue(value);
    if (!hasRecordedAnalytics) {
      analytics.sendEventToPostHog(PostHogAction.NFTsSearchType);
      setHasRecordedAnalytics(true);
    }

    handleSearch(searchItems, value);
  };

  const ref = useRef<HTMLDivElement>(null);
  const nftstoDisplay = searchValue !== '' ? filteredResults : items;

  return (
    <>
      <ContentLayout
        title={
          <Skeleton loading={isLoadingFirstTime}>
            <div className={styles.sectionTitle}>
              <SectionTitle
                classname={styles.title}
                title={t('browserView.nfts.pageTitle')}
                sideText={`(${nfts.length})`}
                isPopup
              />
              {nfts.length > 0 && process.env.USE_NFT_FOLDERS === 'true' && (
                <Button
                  className={styles.newFolderBtn}
                  color="gradient"
                  onClick={() => {
                    setIsCreateFolderDrawerOpen(true);
                    analytics.sendEventToPostHog(PostHogAction.NFTsCreateFolderClick);
                  }}
                  data-testid="create-folder-button"
                >
                  <FolderIcon className={styles.newFolderIcon} />
                </Button>
              )}
            </div>
          </Skeleton>
        }
        mainClassName={styles.nftsLayout}
      >
        <div className={styles.nfts}>
          <div ref={ref} className={styles.content} data-testid="nft-list-container">
            <Skeleton loading={isLoadingFirstTime}>
              {items.length > 0 ? (
                <>
                  {items.length >= MIN_ASSET_COUNT_FOR_SEARCH && (
                    <SearchBox
                      placeholder={t('browserView.nfts.searchPlaceholder')}
                      onChange={(value) => handleNftSearch(items, value)}
                      data-testid="nft-search-input"
                      value={searchValue}
                      onClear={() => setSearchValue('')}
                    />
                  )}
                  {!isSearching && searchValue !== '' && filteredResults.length === 0 && (
                    <ListEmptyState message={t('core.assetSelectorOverlay.noMatchingResult')} icon="sad-face" />
                  )}
                </>
              ) : (
                <FundWalletBanner
                  title={t('browserView.nfts.fundWalletBanner.title')}
                  prompt={t('browserView.nfts.fundWalletBanner.prompt')}
                  walletAddress={walletInfo.addresses[0].address.toString()}
                />
              )}
            </Skeleton>
            <NftGrid
              columns={2}
              scrollableTargetId={extensionScrollableContainerID}
              items={isLoadingFirstTime ? [] : nftstoDisplay}
            />
          </div>
        </div>
        <NFTFolderDrawer
          selectedFolder={selectedFolder}
          onSelectNft={onSelectNft}
          visible={isCreateFolderDrawerOpen}
          onClose={onCloseFolderDrawer}
          isPopupView
        />
        <RenameFolderDrawer
          folderToRename={folderToRename}
          visible={isRenameFolderDrawerOpen}
          onClose={() => setIsRenameFolderDrawerOpen(false)}
          isPopupView
        />
      </ContentLayout>
      <NftFolderConfirmationModal
        onCancel={() => setIsDeleteFolderModalOpen(false)}
        visible={isDeleteFolderModalOpen}
        title={t('browserView.nfts.deleteFolderModal.header')}
        description={
          <>
            <div>{t('browserView.nfts.deleteFolderModal.description1')}</div>
            <div className="mt-3">{t('browserView.nfts.deleteFolderModal.description2')}</div>
          </>
        }
        actions={[
          {
            body: t('browserView.nfts.deleteFolderModal.cancel'),
            dataTestId: 'delete-folder-modal-cancel',
            color: 'secondary',
            onClick: () => setIsDeleteFolderModalOpen(false)
          },
          {
            dataTestId: 'delete-folder-modal-confirm',
            onClick: onDeleteFolderConfirm,
            body: t('browserView.nfts.deleteFolderModal.confirm')
          }
        ]}
      />
    </>
  );
});
