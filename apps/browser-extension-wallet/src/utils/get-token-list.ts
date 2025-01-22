/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
import { AssetOrHandleInfo, AssetOrHandleInfoMap, PriceResult } from '@hooks';
import { Wallet } from '@lace/cardano';
import { addEllipsis, getRandomIcon } from '@lace/common';
import { nftImageSelector, nftNameSelector } from '@src/views/browser-view/features/nfts/selectors';
import { SpentBalances } from '@src/views/browser-view/features/send-transaction/types';
import isNil from 'lodash/isNil';
import { getTokenAmountInFiat, parseFiat } from './assets-transformers';
import { getAssetImageUrl } from './get-asset-image-url';
import { EnvironmentTypes } from '@stores';
import { CurrencyInfo } from '@src/types';
import { isNFT } from './is-nft';
import { getAssetImage } from './get-asset-image';
import { Asset } from '@cardano-sdk/core';
import { TokenInformation } from '@src/views/browser-view/features/assets/types';

const DISPLAY_FALLBACK = '-';
const NAME_TRUNCATE_LENGTH = 10;
const NAME_TRUNCATE_TRAILING_CHARS = 4;

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
  defaultLogo: string;
  decimals?: number;
}

export interface GetTokenListParams {
  assetsInfo: AssetOrHandleInfoMap;
  balance: Wallet.Cardano.Value['assets'];
  prices?: PriceResult;
  tokensSpent?: SpentBalances;
  fiatCurrency: CurrencyInfo;
  environmentName?: EnvironmentTypes;
}

/**
 * Attempts to retrieve the image URL for an NFT asset.
 *
 * @param info - The asset information which may contain NFT or token metadata.
 *
 * @returns The URL of the NFT image or the token icon, or undefined if neither are available.
 */
const getNftImageUrl = (info?: AssetOrHandleInfo): string | undefined => {
  const nftImage = nftImageSelector(getAssetImage(info));

  if (nftImage) {
    return nftImage;
  }

  return info?.tokenMetadata?.icon ? getAssetImageUrl(info.tokenMetadata.icon) : undefined;
};

/**
 * Retrieves the most appropriate logo URL for a given asset, checking first for token metadata,
 * then for NFT images, and finally defaulting to a random icon if no other images are available.
 *
 * @param info - The asset information which may contain NFT or token metadata.
 *
 * @returns The URL of the logo.
 */
const getTokenLogoUrl = (info: AssetOrHandleInfo): string => {
  if (!info) {
    return getRandomIcon({ id: '0', size: 30 });
  }

  if (info.tokenMetadata?.icon) {
    return getAssetImageUrl(info.tokenMetadata.icon);
  }

  const nftImage = nftImageSelector(getAssetImage(info));

  if (nftImage) {
    return nftImage;
  }

  return getRandomIcon({ id: info.assetId.toString(), size: 30 });
};

/**
 * Retrieves the ticker from NFT metadata if it exists and is a string.
 *
 * @param metadata The NFT metadata which might contain a ticker.
 *
 * @returns The ticker if present and a string; otherwise, undefined.
 */
const getTickerFromNftMetadata = (metadata?: Asset.NftMetadata): string | undefined => {
  const ticker = metadata?.otherProperties?.get('ticker');
  return typeof ticker === 'string' ? ticker : undefined;
};

/**
 * Retrieves the decimal value from NFT metadata properties.
 *
 * This function looks for the 'decimals' property within the NFT metadata's otherProperties map.
 *
 * @param metadata - Optional metadata object that may contain the 'decimals' property.
 *
 * @returns The decimals value as a number if valid, or undefined if no valid decimals value is found.
 */
const getDecimalsFromNftMetadata = (metadata?: Asset.NftMetadata): number | undefined => {
  const rawDecimals = metadata?.otherProperties?.get('decimals');

  if (typeof rawDecimals === 'number') {
    return rawDecimals;
  } else if (typeof rawDecimals === 'string' && !Number.isNaN(Number(rawDecimals))) {
    return Number(rawDecimals);
  }

  /* eslint-disable-next-line consistent-return */
  return undefined;
};

/**
 * Constructs display metadata for an asset, prioritizing token metadata,
 * then NFT metadata, and finally using a fallback.
 *
 * @param info The asset or handle information containing various metadata.
 *
 * @returns An object with name, ticker, decimals and logo of the asset.
 */
export const getTokenDisplayMetadata = (
  info?: AssetOrHandleInfo
): Pick<NonNFTAsset, 'name' | 'description' | 'logo' | 'decimals'> & Partial<TokenInformation> => {
  const name =
    info?.tokenMetadata?.name ||
    info?.nftMetadata?.name ||
    addEllipsis(info?.fingerprint?.toString() || DISPLAY_FALLBACK, NAME_TRUNCATE_LENGTH, NAME_TRUNCATE_TRAILING_CHARS);

  const ticker = info?.tokenMetadata?.ticker || getTickerFromNftMetadata(info?.nftMetadata) || DISPLAY_FALLBACK;
  const decimals = info?.tokenMetadata?.decimals || getDecimalsFromNftMetadata(info?.nftMetadata);

  return {
    name,
    description: ticker,
    decimals,
    logo: getTokenLogoUrl(info),
    policyId: info?.policyId,
    fingerprint: info?.fingerprint
  };
};

/**
 * Retrieves display metadata for an NFT, using available NFT or token metadata.
 * Falls back to a generated name incorporating the provided chain environment name if no metadata name is found.
 *
 * @param info - The asset information containing metadata for NFTs or tokens.
 *
 * @returns An object containing the name and image URL for the NFT.
 */
export const getNftDisplayMetadata = (info?: AssetOrHandleInfo): Pick<NFT, 'name' | 'image'> => {
  const name = nftNameSelector(info);
  const image = getNftImageUrl(info);

  return { name, image };
};

export const getTokenList = (params: GetTokenListParams): { tokenList: NonNFTAsset[]; nftList: NFT[] } => {
  const { assetsInfo = new Map() as AssetOrHandleInfoMap, balance, prices, tokensSpent, fiatCurrency } = params;
  const nfts: NFT[] = [];
  const tokens: (NonNFTAsset & Partial<TokenInformation>)[] = [];
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
      const nftDisplayMetadata = getNftDisplayMetadata(info);

      nfts.push({
        assetId,
        name: nftDisplayMetadata.name,
        image: nftDisplayMetadata.image,
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

      const ftDisplayMetadata = getTokenDisplayMetadata(info);

      tokens.push({
        assetId,
        amount,
        fiat,
        name: ftDisplayMetadata.name,
        description: ftDisplayMetadata.description,
        logo: ftDisplayMetadata.logo,
        defaultLogo: getRandomIcon({ id: assetId.toString(), size: 30 }),
        decimals: ftDisplayMetadata.decimals,
        policyId: ftDisplayMetadata.policyId,
        fingerprint: ftDisplayMetadata.fingerprint
      });
    }
  }

  return { tokenList: tokens, nftList: nfts };
};
