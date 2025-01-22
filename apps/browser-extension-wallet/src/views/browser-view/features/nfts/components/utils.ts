import isNil from 'lodash/isNil';
import { Wallet } from '@lace/cardano';
import { AssetSelectorOverlayProps } from '@lace/core';
import { getTokenList } from '@src/utils/get-token-list';
import { EnvironmentTypes } from '@src/stores';
import { CurrencyInfo } from '@src/types';

export const formatNftsList = (
  assetsInfo: Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo> = new Map(),
  balance: Wallet.Cardano.Value,
  environmentName: EnvironmentTypes,
  fiatCurrency: CurrencyInfo
): AssetSelectorOverlayProps['nfts'] => {
  if (isNil(balance)) {
    return [];
  }

  const { nftList } = getTokenList({ assetsInfo, balance: balance.assets, environmentName, fiatCurrency });

  return nftList.map((nft) => ({ ...nft, id: nft.assetId.toString() }));
};
