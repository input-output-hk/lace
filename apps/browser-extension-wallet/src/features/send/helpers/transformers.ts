/* eslint-disable no-magic-numbers */
import isEmpty from 'lodash/isEmpty';
import { IAssetInfo } from '../types';
import { Tokens, TokensDetails } from '../../../types';
import { Wallet } from '@lace/cardano';
import { addEllipsis } from '@lace/common';
import { cardanoCoin } from '../../../utils/constants';

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
    symbol: !isEmpty(tokensInfo)
      ? tokensInfo.get(assetId)?.tokenMetadata?.ticker ??
        tokensInfo.get(assetId)?.tokenMetadata?.name ??
        addEllipsis(tokensInfo.get(assetId)?.fingerprint.toString() ?? assetId.toString(), 8, 6)
      : addEllipsis(assetId.toString(), 8, 6)
  }));

  return [adaCoin, ...assetList];
};
