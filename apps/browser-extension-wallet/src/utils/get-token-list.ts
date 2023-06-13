/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
import { PriceResult } from '@hooks';
import { Wallet } from '@lace/cardano';
import { addEllipsis } from '@lace/common';
import { nftImageSelector } from '@src/views/browser-view/features/nfts/selectors';
import { SpentBalances } from '@src/views/browser-view/features/send-transaction/types';
import isNil from 'lodash/isNil';
import { getTokenAmountInFiat, parseFiat } from './assets-transformers';
import { getAssetImageUrl } from './get-asset-image-url';
import { getRandomIcon } from './get-random-icon';
import { EnvironmentTypes } from '@stores';
import { CurrencyInfo } from '@src/types';
import { isNFT } from './is-nft';

export interface NFT {
  assetId: Wallet.Cardano.AssetId;
  image?: string;
  name: string;
  amount?: number | string;
}

export interface NonNFTAsset {
  assetId: Wallet.Cardano.AssetId;
  amount: string;
  fiat: string;
  name: string;
  description: string;
  logo?: string;
}

export interface GetTokenListParams {
  assetsInfo: Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo>;
  balance: Wallet.Cardano.Value['assets'];
  prices?: PriceResult;
  tokensSpent?: SpentBalances;
  fiatCurrency: CurrencyInfo;
  environmentName?: EnvironmentTypes;
}

export const getTokenList = (params: GetTokenListParams): { tokenList: NonNFTAsset[]; nftList: NFT[] } => {
  const {
    assetsInfo = new Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo>(),
    balance,
    prices,
    tokensSpent,
    fiatCurrency,
    environmentName
  } = params;
  const nfts: NFT[] = [];
  const tokens: NonNFTAsset[] = [];
  if (isNil(balance) || balance.size === 0) {
    return { tokenList: [], nftList: [] };
  }

  for (const [assetId, assetBalance] of balance) {
    const info = assetsInfo.get(assetId);

    const maxBalance =
      tokensSpent && tokensSpent[assetId.toString()]
        ? assetBalance - Wallet.util.assetBalanceToBigInt(tokensSpent[assetId.toString()], info)
        : assetBalance;
    const amount = Wallet.util.calculateAssetBalance(maxBalance, info);

    if (isNFT(info)) {
      nfts.push({
        assetId,
        name: info.nftMetadata?.name || `SingleNFT${environmentName || ''}`,
        image: nftImageSelector(info.nftMetadata?.image),
        amount
      });
    } else {
      const tokenPriceInAda = prices?.tokens?.get(assetId)?.priceInAda;
      const fiat =
        info?.tokenMetadata !== undefined && tokenPriceInAda && prices?.cardano.price
          ? `${parseFiat(Number(getTokenAmountInFiat(amount, tokenPriceInAda, prices.cardano.price)))} ${
              fiatCurrency.code
            }`
          : '-';
      const assetMetadata = { ...info?.tokenMetadata, ...info?.nftMetadata };
      tokens.push({
        assetId,
        amount,
        fiat,
        // eslint-disable-next-line no-magic-numbers
        name: assetMetadata.name || addEllipsis(info?.fingerprint.toString() || '-', 10, 4),
        description: assetMetadata?.ticker || '-',
        logo: assetMetadata?.icon
          ? getAssetImageUrl(assetMetadata.icon)
          : getRandomIcon({ id: assetId.toString(), size: 30 })
      });
    }
  }

  return { tokenList: tokens, nftList: nfts };
};
