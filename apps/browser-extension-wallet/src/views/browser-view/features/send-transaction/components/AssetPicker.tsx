/* eslint-disable max-params */
import React, { useEffect, useState } from 'react';
import { AssetSelectorOverlay, AssetSelectorOverlayProps } from '@lace/core';
import { Wallet } from '@lace/cardano';
import CardanoLogo from '../../../../../assets/icons/browser-view/cardano-logo.svg';
import {
  useFetchCoinPrice,
  PriceResult,
  useMaxAda,
  AssetOrHandleInfoMap,
  useAssetInfo,
  useChainHistoryProvider
} from '@hooks';
import { EnvironmentTypes, useWalletStore } from '@src/stores';
import {
  useCoinStateSelector,
  useCurrentRow,
  useCurrentCoinIdToChange,
  useSections,
  useSpentBalances,
  useAssetOverlaySection,
  useMultipleSelection,
  useSelectedTokenList
} from '../store';
import { useTranslation } from 'react-i18next';
import isNil from 'lodash/isNil';
import { getTokenList } from '@src/utils/get-token-list';
import { SpentBalances } from '../types';
import { getReachedMaxAmountList } from '../helpers';
import { CurrencyInfo } from '@src/types';
import { firstValueFrom } from 'rxjs';
import { WarningModal } from '@src/views/browser-view/components';
import { walletBalanceTransformer } from '@src/api/transformers';
import styles from './AssetPicker.module.scss';
import { useAppSettingsContext, useCurrencyStore } from '@providers';
import { isNFT } from '@src/utils/is-nft';
import { useObservable } from '@lace/common';

const formatAssetPickerLists = (
  assetsInfo: AssetOrHandleInfoMap = new Map(),
  balance: Wallet.Cardano.Value,
  prices: PriceResult,
  addCardanoAsAnAsset: boolean,
  tokensSpent: SpentBalances,
  cardanoCoin: Wallet.CoinId,
  availableRewards: bigint,
  environmentName: EnvironmentTypes,
  fiatCurrency: CurrencyInfo
): { tokenList: AssetSelectorOverlayProps['tokens']; nftList: AssetSelectorOverlayProps['nfts'] } => {
  if (isNil(balance)) {
    return { tokenList: [], nftList: [] };
  }

  const { tokenList, nftList } = getTokenList({
    assetsInfo,
    balance: balance.assets,
    fiatCurrency,
    prices,
    tokensSpent,
    environmentName
  });
  const cardanoBalance = walletBalanceTransformer(
    (BigInt(balance?.coins || 0) + BigInt(availableRewards || 0)).toString(),
    prices?.cardano?.price || 0
  );

  const tokens = tokenList.map((token) => {
    const { assetId, ...rest } = token;
    return { ...rest, id: assetId.toString() };
  });

  const nfts = nftList.map((nft) => {
    const { assetId, ...rest } = nft;
    return { ...rest, id: assetId.toString() };
  });

  if (addCardanoAsAnAsset) {
    tokens.push({
      id: cardanoCoin.id,
      amount: cardanoBalance?.coinBalance || '0',
      fiat: `$${cardanoBalance?.fiatBalance}`,
      name: cardanoCoin.name,
      description: cardanoCoin.symbol,
      logo: CardanoLogo
    });
  }

  return { tokenList: tokens, nftList: nfts };
};

const nftsPerRow = {
  popupView: 2,
  browserView: 3
};

interface AssetPickerProps {
  isPopupView: boolean;
}

const isTokenBundleSizeExceedingLimit = async (
  selectedTokenIds: Array<string>,
  inMemoryWallet: Wallet.ObservableWallet
) => {
  const [{ chainName }] = useAppSettingsContext();
  const chainHistoryProvider = useChainHistoryProvider({ chainName });
  // should we validate the other added assets to the bundle transaction? (existing outputs)
  const { validateOutput } = Wallet.createWalletUtil({ ...inMemoryWallet, chainHistoryProvider });
  // how much tokens should we use to validate this, the entire amount for each selected asset or just 1?
  const { coins, assets } = await firstValueFrom(inMemoryWallet.balance.utxo.available$);
  // we need a valid address for the outputs
  const address = (await firstValueFrom(inMemoryWallet.addresses$))[0].address;

  let tokensMap: Array<[Wallet.Cardano.AssetId, bigint]> = [];

  for (const id of selectedTokenIds) {
    // don't add cardano to tokensMap
    if (id !== '1') {
      const assetId = Wallet.Cardano.AssetId(id);
      const assetAmount = assets.get(assetId);
      tokensMap = [...tokensMap, [assetId, assetAmount]];
    }
  }

  const output: Wallet.Cardano.TxOut = {
    address,
    value: {
      coins,
      assets: new Map(tokensMap)
    }
  };

  const { tokenBundleSizeExceedsLimit } = await validateOutput(output);
  return tokenBundleSizeExceedsLimit;
};

export const AssetPicker = ({ isPopupView }: AssetPickerProps): React.ReactElement => {
  const { t } = useTranslation();
  const [overlaySection] = useAssetOverlaySection();
  const {
    inMemoryWallet,
    walletUI: { cardanoCoin },
    environmentName
  } = useWalletStore();
  const [row] = useCurrentRow();
  const assets = useAssetInfo();
  const { priceResult } = useFetchCoinPrice();
  const balance = useObservable(inMemoryWallet.balance.utxo.total$);
  const availableRewards = useObservable(inMemoryWallet.balance.rewardAccounts.rewards$);
  const coinId = useCurrentCoinIdToChange();
  const { setPrevSection } = useSections();
  const tokensUsed = useSpentBalances();
  const spendableCoin = useMaxAda();
  const { setSelectedTokenList, selectedTokenList, removeTokenFromList } = useSelectedTokenList();
  const [multipleSelectionAvailable] = useMultipleSelection();
  const { fiatCurrency } = useCurrencyStore();

  const { uiOutputs: list, setPickedCoin, setCoinValue } = useCoinStateSelector(row);
  const [exceededLimit, setExceededLimit] = useState(false);

  useEffect(() => {
    if (selectedTokenList.length > 0) {
      isTokenBundleSizeExceedingLimit(selectedTokenList, inMemoryWallet)
        .then((res) => setExceededLimit(res))
        .catch((error) => console.error(error));
    }
  }, [selectedTokenList, inMemoryWallet]);

  const reachedMaxAmountList = getReachedMaxAmountList({
    assets,
    tokensUsed,
    spendableCoin,
    balance,
    cardanoCoin
  });

  const usedAssetsIds = new Set([...list.map(({ id }) => id), ...reachedMaxAmountList]);
  const notUsedAssets = balance?.assets?.size
    ? new Map([...balance.assets].filter(([id]) => !usedAssetsIds.has(id.toString())))
    : balance?.assets;

  const { nftList, tokenList } = formatAssetPickerLists(
    assets,
    { ...balance, assets: notUsedAssets },
    priceResult,
    !usedAssetsIds.has(cardanoCoin.id),
    tokensUsed,
    cardanoCoin,
    availableRewards,
    environmentName,
    fiatCurrency
  );

  const hasNfts = assets ? [...assets.values()].some((asset) => balance?.assets?.has(asset.assetId)) : false;
  const coinInputSelectionTranslations = {
    assetSelection: t('core.coinInputSelection.assetSelection'),
    tokens: t('core.coinInputSelection.tokens'),
    nfts: t('core.coinInputSelection.nfts')
  };

  const getAssetInfo = (id: string): Wallet.Asset.AssetInfo | undefined => {
    if (id === cardanoCoin.id) return;
    // eslint-disable-next-line consistent-return
    return assets?.get(Wallet.Cardano.AssetId(id));
  };

  const changePickedCoin = (id: string) => {
    setPickedCoin(row, { prev: coinId, next: id });
    const assetInfo = getAssetInfo(id);
    if (isNFT(assetInfo)) {
      setCoinValue(row, { id, value: '1' });
    }

    setPrevSection();
  };

  const handleMultipleTokens = (id: string) => {
    const assetInfo = getAssetInfo(id);
    setSelectedTokenList(id, isNFT(assetInfo));
  };

  return (
    <>
      <AssetSelectorOverlay
        className={styles.selectorOverlay}
        nfts={nftList}
        tokens={tokenList}
        nftListConfig={{ rows: isPopupView ? nftsPerRow.popupView : nftsPerRow.browserView }}
        onClick={multipleSelectionAvailable ? handleMultipleTokens : changePickedCoin}
        translations={coinInputSelectionTranslations}
        intialSection={overlaySection}
        hasUsedAllNFTs={nftList.length === 0}
        hasUsedAllTokens={tokenList.length === 0}
        hasNFTs={hasNfts}
        selectedTokenList={selectedTokenList}
        removeTokenFromList={removeTokenFromList}
        doesWalletHaveTokens={balance?.coins > BigInt(0) && balance?.assets?.size > 0}
      />

      <WarningModal
        header={t('multipleSelection.reachedTheTxLimit')}
        content={t('multipleSelection.noOtherTokensCanBeAdded')}
        visible={exceededLimit}
        onConfirm={() => setExceededLimit(false)}
        confirmLabel={t('multipleSelection.gotIt')}
      />
    </>
  );
};
