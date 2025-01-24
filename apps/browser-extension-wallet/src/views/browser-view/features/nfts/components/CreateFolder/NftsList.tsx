/* eslint-disable max-params */
import React, { useMemo } from 'react';
import { NftFolderItemProps, NftGrid, NftsItemsTypes, PlaceholderItem } from '@lace/core';
import { useTranslation } from 'react-i18next';
import { NFT, getTokenList } from '@src/utils/get-token-list';
import AddNft from '@assets/icons/add-nft-icon.component.svg';
import { useWalletStore } from '../../../../../../stores';
import styles from './CreateFolderDrawer.module.scss';
import { useCurrencyStore } from '@providers';
import { useObservable, VirtualisedGridColumns } from '@lace/common';
import { useAssetInfo } from '@hooks';

const nftsPerRow: Record<'popupView' | 'browserView', VirtualisedGridColumns> = {
  popupView: 2,
  browserView: 3
};

interface NftsListProps {
  isPopupView: boolean;
  nfts: NftFolderItemProps['nfts'];
  onSelectNft: (nft: NFT) => void;
  onAddNft: () => void;
  onRemoveNft: (id: NFT['assetId']) => void;
}

export const NftsList = ({
  isPopupView,
  nfts,
  onSelectNft,
  onAddNft,
  onRemoveNft
}: NftsListProps): React.ReactElement => {
  const { t } = useTranslation();
  const { inMemoryWallet, environmentName } = useWalletStore();
  const assetsInfo = useAssetInfo();
  const balance = useObservable(inMemoryWallet.balance.utxo.total$);
  const nftsIds = useMemo(() => nfts?.map(({ assetId }) => assetId), [nfts]);
  const { fiatCurrency } = useCurrencyStore();

  const notUsedAssets = balance?.assets?.size
    ? new Map([...balance.assets].filter(([id]) => nftsIds?.includes(id.toString())))
    : balance?.assets;

  const { nftList } = getTokenList({ assetsInfo, balance: notUsedAssets, environmentName, fiatCurrency });
  const addNftItem: PlaceholderItem = {
    type: NftsItemsTypes.PLACEHOLDER,
    children: (
      <div className={styles.addFolderItem}>
        <AddNft className={styles.addFolderIcon} />
      </div>
    ),
    onClick: onAddNft
  };
  const list = [
    addNftItem,
    ...nftList?.map((nft) => ({
      ...nft,
      type: NftsItemsTypes.NFT,
      onClick: () => onSelectNft(nft),
      contextMenu: (
        <div
          className={styles.contextMenu}
          data-testid="nft-folder-context-menu"
          onClick={() => onRemoveNft(nft?.assetId)}
        >
          <div className={styles.contextMenuItem} data-testid="context-menu-item-remove">
            {t('browserView.nfts.folderDrawer.contextMenu.remove')}
          </div>
        </div>
      )
    }))
  ];

  return (
    <div className={styles.assetsSelectorWrapper}>
      <NftGrid
        columns={isPopupView ? nftsPerRow.popupView : nftsPerRow.browserView}
        scrollableTargetId={'drawer-scrollable-content'}
        items={list ?? []}
      />
    </div>
  );
};
