/* eslint-disable unicorn/no-useless-undefined */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import cn from 'classnames';
import styles from './NftsLayout.module.scss';
import { useWalletStore } from '@stores';
import { useTranslation } from 'react-i18next';
import { NftItemProps, NftList, NftListProps, NftFolderItemProps, NftsItemsTypes, ListEmptyState } from '@lace/core';
import flatten from 'lodash/flatten';
import isNil from 'lodash/isNil';
import { useOutputInitialState, useAnalyticsSendFlowTriggerPoint, SendFlowTriggerPoints } from '../../send-transaction';
import { Button, useObservable } from '@lace/common';
import { DEFAULT_WALLET_BALANCE } from '@src/utils/constants';
import { Skeleton } from 'antd';
import { SectionLayout, EducationalList, FundWalletBanner, Layout } from '@src/views/browser-view/components';
import { DrawerContent } from '@src/views/browser-view/components/Drawer';
import { useDrawer } from '@src/views/browser-view/stores';
import { SectionTitle } from '@components/Layout/SectionTitle';
import Book from '@assets/icons/book.svg';
import LightBulb from '@assets/icons/light.svg';
import Video from '@assets/icons/video.svg';
import FolderIcon from '@assets/icons/new-folder-icon.component.svg';
import RemoveFolderIcon from '@assets/icons/remove-folder.component.svg';
import { getTokenList, NFT } from '@src/utils/get-token-list';
import { useAnalyticsContext, useCurrencyStore } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { DetailsDrawer } from './DetailsDrawer';
import { NFTFolderDrawer } from './CreateFolder/CreateFolderDrawer';
import { NftFoldersRecordParams, useNftsFoldersContext, withNftsFoldersContext } from '@src/features/nfts/context';
import { RenameFolderDrawer } from './RenameFolderDrawer';
import { NftFolderConfirmationModal } from './NftFolderConfirmationModal';
import { useAssetInfo } from '@hooks';
import { SearchBox } from '@lace/ui';
import { useNftSearch } from '@hooks/useNftSearch';

export type RenameFolderType = Pick<NftFoldersRecordParams, 'id' | 'name'>;

const MIN_ASSET_COUNT_FOR_SEARCH = 10;

// eslint-disable-next-line max-statements, complexity
export const NftsLayout = withNftsFoldersContext((): React.ReactElement => {
  const { walletInfo, inMemoryWallet, blockchainProvider, environmentName } = useWalletStore();
  const [selectedFolderId, setSelectedFolderId] = useState<number | undefined>();
  const { t } = useTranslation();
  const assetsInfo = useAssetInfo();
  const { isSearching, handleSearch, filteredResults } = useNftSearch(assetsInfo);

  const assetsBalance = useObservable(inMemoryWallet.balance.utxo.total$, DEFAULT_WALLET_BALANCE.utxo.total$);
  const total = useObservable(inMemoryWallet.balance.utxo.total$);
  const analytics = useAnalyticsContext();
  const [folderToRename, setFolderToRename] = useState<RenameFolderType>();
  const [folderToDelete, setFolderToDelete] = useState<number>();
  const {
    utils: { deleteRecord }
  } = useNftsFoldersContext();
  const { fiatCurrency } = useCurrencyStore();
  const { setTriggerPoint } = useAnalyticsSendFlowTriggerPoint();
  const [, setDrawerConfig] = useDrawer();
  const setSendInitialState = useOutputInitialState();

  const [selectedNft, setSelectedNft] = useState<NFT>();
  const [isCreateFolderDrawerOpen, setIsCreateFolderDrawerOpen] = useState(false);
  const [isRenameFolderDrawerOpen, setIsRenameFolderDrawerOpen] = useState(false);
  const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);

  const [searchValue, setSearchValue] = useState('');
  const [hasRecordedAnalytics, setHasRecordedAnalytics] = useState(false);

  const onDeleteFolderConfirm = () => {
    setIsDeleteFolderModalOpen(false);
    deleteRecord(folderToDelete, {
      text: t('browserView.nfts.deleteFolderSuccess'),
      icon: RemoveFolderIcon
    });
  };

  const handleNftSearch = (items: NftItemProps[], value: string) => {
    setSearchValue(value);

    if (!hasRecordedAnalytics) {
      analytics.sendEventToPostHog(PostHogAction.NFTsSearchType);
      setHasRecordedAnalytics(true);
    }

    handleSearch(items, value);
  };

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

  const onSelectNft = useCallback(
    (nft) => {
      setSelectedNft(nft);
      analytics.sendEventToPostHog(PostHogAction.NFTsImageClick);
    },
    [analytics]
  );

  // eslint-disable-next-line unicorn/no-useless-undefined
  const closeNftDetails = () => setSelectedNft(undefined);
  const nfts: NftItemProps[] = useMemo(() => {
    const { nftList } = getTokenList({
      assetsInfo,
      balance: assetsBalance?.assets,
      environmentName,
      fiatCurrency
    });
    return nftList.map((nft) => ({
      ...nft,
      type: NftsItemsTypes.NFT,
      onClick: () => {
        onSelectNft(nft);
      }
    }));
  }, [onSelectNft, assetsBalance?.assets, assetsInfo, environmentName, fiatCurrency]);

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

  const titles = {
    glossary: t('educationalBanners.title.glossary'),
    faq: t('educationalBanners.title.faq'),
    video: t('educationalBanners.title.video')
  };

  const educationalItems = [
    {
      title: titles.glossary,
      subtitle: t('educationalBanners.subtitle.collections'),
      src: Book,
      link: `${process.env.WEBSITE_URL}/glossary?term=collection-nfts`
    },
    {
      title: titles.faq,
      subtitle: t('educationalBanners.subtitle.buyAnNft'),
      src: LightBulb,
      link: `${process.env.WEBSITE_URL}/faq?question=how-do-i-buy-an-nft`
    },
    {
      title: titles.video,
      subtitle: t('educationalBanners.subtitle.enterNFTGallery'),
      src: Video,
      link: `${process.env.WEBSITE_URL}/learn?video=enter-the-nft-gallery-with-lace`
    }
  ];

  const isLoadingFirstTime = isNil(total) || isNil(nftFolders);

  // Close nft details drawer if network (blockchainProvider) has changed
  useEffect(() => {
    closeNftDetails();
  }, [blockchainProvider]);

  const onSendAsset = useCallback(() => {
    // eslint-disable-next-line camelcase
    analytics.sendEventToPostHog(PostHogAction.SendClick, { trigger_point: SendFlowTriggerPoints.NFTS });
    closeNftDetails();
    setSendInitialState(selectedNft?.assetId.toString());
    setDrawerConfig({ content: DrawerContent.SEND_TRANSACTION });
    setTriggerPoint(SendFlowTriggerPoints.NFTS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setDrawerConfig, analytics, selectedNft?.assetId, setSendInitialState]);

  const onCloseFolderDrawer = useCallback(() => {
    setIsCreateFolderDrawerOpen(false);
    setSelectedFolderId(undefined);
  }, []);

  const showCreateFolder = nfts.length > 0 && nftsNotInFolders.length > 0 && process.env.USE_NFT_FOLDERS === 'true';

  return (
    <>
      <Layout>
        <SectionLayout
          sidePanelContent={
            <EducationalList items={educationalItems} title={t('browserView.nfts.educationalList.title')} />
          }
        >
          <Skeleton loading={isLoadingFirstTime}>
            <div className={cn(styles.sectionTitle, { [styles.titleWithCreateNFTFolder]: showCreateFolder })}>
              <SectionTitle
                classname={styles.title}
                title={t('browserView.nfts.pageTitle')}
                sideText={`(${nfts.length})`}
              />
              {showCreateFolder && (
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
                  {t('browserView.nfts.createFolder')}
                </Button>
              )}
            </div>
            <div className={styles.content} data-testid="nft-list-container">
              {items.length > 0 ? (
                <>
                  {items.length >= MIN_ASSET_COUNT_FOR_SEARCH && (
                    <SearchBox
                      placeholder={t('browserView.nfts.searchPlaceholder')}
                      onChange={(value) => handleNftSearch(nfts, value)}
                      data-testid="nft-search-input"
                      value={searchValue}
                      onClear={() => setSearchValue('')}
                    />
                  )}
                  <Skeleton loading={isSearching}>
                    {searchValue !== '' && filteredResults.length > 0 && <NftList items={filteredResults} rows={4} />}
                    {searchValue !== '' && filteredResults.length === 0 && (
                      <ListEmptyState
                        message={t('package.core.assetSelectorOverlay.noMatchingResult')}
                        icon="sad-face"
                      />
                    )}
                    {searchValue === '' && <NftList items={items} rows={4} />}
                  </Skeleton>
                </>
              ) : (
                <FundWalletBanner
                  title={t('browserView.nfts.fundWalletBanner.title')}
                  subtitle={t('browserView.nfts.fundWalletBanner.subtitle')}
                  walletAddress={walletInfo.addresses[0].address.toString()}
                  prompt={t('browserView.nfts.fundWalletBanner.prompt')}
                  shouldHaveVerticalContent
                />
              )}
            </div>
          </Skeleton>
          <DetailsDrawer
            selectedNft={selectedNft}
            assetsInfo={assetsInfo}
            onClose={closeNftDetails}
            onSend={onSendAsset}
          />
          <NFTFolderDrawer
            selectedFolder={selectedFolder}
            onSelectNft={onSelectNft}
            visible={isCreateFolderDrawerOpen}
            onClose={onCloseFolderDrawer}
          />
          <RenameFolderDrawer
            folderToRename={folderToRename}
            visible={isRenameFolderDrawerOpen}
            onClose={() => setIsRenameFolderDrawerOpen(false)}
          />
        </SectionLayout>
      </Layout>
      <NftFolderConfirmationModal
        onCancel={() => setIsDeleteFolderModalOpen(false)}
        visible={isDeleteFolderModalOpen}
        title={t('browserView.nfts.deleteFolderModal.header')}
        description={
          <>
            <div className="ws-preline">{t('browserView.nfts.deleteFolderModal.description1')}</div>
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
