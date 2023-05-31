/* eslint-disable max-params */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ASSET_COMPONENTS, AssetSelectorOverlay } from '@lace/core';
import { useWalletStore } from '@stores';
import { useObservable } from '@hooks';
import styles from './CreateFolderDrawer.module.scss';
import { formatNftsList } from '../utils';
import { useCurrencyStore } from '@providers';

const nftsPerRow = {
  popupView: 2,
  browserView: 3
};

interface AssetPickerProps {
  usedNftsIds: Array<string>;
  selectedTokenIds: Array<string>;
  setSelectedTokenIds: (nfts: Array<string>) => void;
  onSetIsFormValid: (isValid: boolean) => void;
  isPopupView: boolean;
}

export const AssetPicker = ({
  usedNftsIds,
  selectedTokenIds,
  onSetIsFormValid,
  setSelectedTokenIds,
  isPopupView
}: AssetPickerProps): React.ReactElement => {
  const { t } = useTranslation();
  const { inMemoryWallet, environmentName } = useWalletStore();
  const assets = useObservable(inMemoryWallet.assetInfo$);
  const balance = useObservable(inMemoryWallet.balance.utxo.total$);
  const { fiatCurrency } = useCurrencyStore();

  const [selectedNFTs, setSelectedNfts] = useState<Array<string>>([]);

  const notUsedAssets = balance?.assets?.size
    ? new Map([...balance.assets].filter(([id]) => !usedNftsIds.includes(id.toString())))
    : balance?.assets;

  const nftList = formatNftsList(assets, { ...balance, assets: notUsedAssets }, environmentName, fiatCurrency);

  const hasNfts = assets ? [...assets.values()].some((asset) => balance?.assets?.has(asset.assetId)) : false;
  const coinInputSelectionTranslations = {
    assetSelection: t('core.coinInputSelection.assetSelection'),
    tokens: t('core.coinInputSelection.tokens'),
    nfts: t('core.coinInputSelection.nfts')
  };

  const removeTokenFromList = (id: string) => {
    const nfts = [...selectedNFTs.filter((_id) => _id !== id)];
    setSelectedNfts(nfts);
    setSelectedTokenIds(nfts);
  };

  // eslint-disable-next-line unicorn/consistent-function-scoping
  const setSelectedTokens = (id: string) => {
    const nfts = [...selectedNFTs, id];
    setSelectedNfts(nfts);
    setSelectedTokenIds(nfts);
  };

  useEffect(() => {
    setSelectedNfts(selectedTokenIds);
  }, [selectedTokenIds, setSelectedTokenIds]);

  useEffect(() => {
    onSetIsFormValid(selectedNFTs.length > 0);
  }, [selectedNFTs, onSetIsFormValid]);

  return (
    <div className={styles.assetsSelectorWrapper}>
      <AssetSelectorOverlay
        nfts={nftList}
        nftListConfig={{ rows: isPopupView ? nftsPerRow.popupView : nftsPerRow.browserView }}
        onClick={setSelectedTokens}
        addToMultipleSelectionList={setSelectedTokens}
        translations={coinInputSelectionTranslations}
        intialSection={ASSET_COMPONENTS.NFTS}
        hasUsedAllNFTs={nftList.length === 0}
        hasNFTs={hasNfts}
        selectedTokenList={selectedNFTs}
        removeTokenFromList={removeTokenFromList}
        doesWalletHaveTokens={balance?.coins > BigInt(0) && balance?.assets?.size > 0}
        groups={[ASSET_COMPONENTS.NFTS]}
        isMultipleSelectionAvailable
      />
    </div>
  );
};
