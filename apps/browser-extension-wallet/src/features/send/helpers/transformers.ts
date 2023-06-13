/* eslint-disable no-magic-numbers */
import isEmpty from 'lodash/isEmpty';
import { IAssetInfo, DisplayedCoinDetail } from '../types';
import { Tokens, CardanoTxOutValue, TokensDetails, TxMinimumCoinQuantity } from '../../../types';
import { Wallet } from '@lace/cardano';
import { addEllipsis } from '@lace/common';
import { cardanoCoin } from '../../../utils/constants';
import { MIN_COIN_TO_SEND } from '../config';
import BigNumber from 'bignumber.js';

export const availableCoinsTransformer = (
  coins: string,
  tokens?: Tokens,
  tokensInfo?: Map<Wallet.Cardano.AssetId, TokensDetails>
): IAssetInfo[] => {
  const adaCoin = { symbol: cardanoCoin.symbol, id: cardanoCoin.id, balance: Wallet.util.lovelacesToAdaString(coins) };

  if (!tokens) {
    return [adaCoin];
  }

  const assetList = [...tokens.entries()].map(([assetId, balance]) => ({
    id: assetId.toString(),
    balance: balance.toString(),
    symbol: isEmpty(tokensInfo)
      ? addEllipsis(assetId.toString(), 8, 6)
      : tokensInfo.get(assetId)?.tokenMetadata?.ticker ??
        tokensInfo.get(assetId)?.tokenMetadata?.name ??
        addEllipsis(tokensInfo.get(assetId)?.fingerprint.toString() ?? assetId.toString(), 8, 6)
  }));

  return [adaCoin, ...assetList];
};

export const displayedCoinsTransformer = (
  displayedCoins: Array<DisplayedCoinDetail>,
  minimumCoinQuantity?: TxMinimumCoinQuantity
): CardanoTxOutValue => {
  const ada = displayedCoins.find((item) => item.coinId === cardanoCoin.id);
  const nonAdaAssets = displayedCoins.filter((item) => item.coinId !== cardanoCoin.id);

  const assets =
    nonAdaAssets.length > 0
      ? new Map<Wallet.Cardano.AssetId, bigint>(
          nonAdaAssets.map((asset) => [Wallet.Cardano.AssetId(asset.coinId), BigInt(asset.amount)])
        )
      : undefined;

  return {
    // The transaction must always have ADA on it,
    // if the displayedCoins list does not have ADA we send the minimum coin qty
    coins:
      ada && new BigNumber(ada.amount).gte(0)
        ? BigInt(Wallet.util.adaToLovelacesString(ada.amount))
        : BigInt(minimumCoinQuantity?.minimumCoin ?? Wallet.util.adaToLovelacesString(MIN_COIN_TO_SEND.toString())),
    assets
  };
};
