/* eslint-disable no-magic-numbers */
/* eslint-disable unicorn/no-nested-ternary */
import BigNumber from 'bignumber.js';
import { walletBalanceTransformer } from '@src/api/transformers';
import { getRandomIcon } from '@src/utils/get-random-icon';

import { Wallet } from '@lace/cardano';

import CardanoLogo from '../assets/icons/browser-view/cardano-logo.svg';
import { AssetSortBy, IAssetDetails } from '@views/browser/features/assets/types';
import { compactNumber, formatLocaleNumber, isNumeric } from '@src/utils/format-number';
import { addEllipsis } from '@lace/common';
import { getAssetImageUrl } from '@src/utils/get-asset-image-url';
import isNumber from 'lodash/isNumber';
import { CoinId, CurrencyInfo } from '@src/types';
import { TokenPrice } from '@lib/scripts/types';
import { PriceResult } from '@hooks';

export const variationParser = (variation: number): string =>
  `${variation > 0 ? '+' : ''}${formatLocaleNumber(variation.toString())}`;

export const cardanoTransformer = (params: {
  total: Wallet.Cardano.Value;
  fiatPrice?: PriceResult['cardano'];
  cardanoCoin: CoinId;
  fiatCode: string;
  areBalancesVisible?: boolean;
  balancesPlaceholder?: string;
}): IAssetDetails => {
  const { fiatPrice, total, cardanoCoin, fiatCode, areBalancesVisible = true, balancesPlaceholder = '' } = params;
  const balance = walletBalanceTransformer(total?.coins.toString(), fiatPrice?.price);
  const fiatBalance =
    balance.fiatBalance === '-'
      ? balance.fiatBalance
      : isNumeric(balance.fiatBalance)
      ? formatLocaleNumber(balance.fiatBalance)
      : '?';

  return {
    id: cardanoCoin.id,
    logo: CardanoLogo,
    name: cardanoCoin.name,
    ticker: cardanoCoin.symbol,
    price: isNumber(fiatPrice?.price) ? formatLocaleNumber(fiatPrice?.price.toString(), 3) : '-',
    variation: fiatPrice?.priceVariationPercentage24h ? variationParser(fiatPrice?.priceVariationPercentage24h) : '-',
    balance: areBalancesVisible ? formatLocaleNumber(balance.coinBalance) : balancesPlaceholder,
    fiatBalance: areBalancesVisible ? `${fiatBalance} ${fiatCode}` : balancesPlaceholder
  };
};

export const parseFiat = (value: number): string => {
  if (!value) return value.toString();
  const magnitude = Math.floor(Math.log10(value));
  return magnitude < 0 ? value.toFixed(Math.abs(magnitude)) : value.toFixed(3);
};

// eslint-disable-next-line complexity
export const assetTransformer = (params: {
  token: Wallet.Asset.AssetInfo;
  key: Wallet.Cardano.AssetId;
  total?: Wallet.Cardano.Value;
  fiat?: number;
  pricesInfo?: TokenPrice;
  fiatCurrency: CurrencyInfo;
  areBalancesVisible?: boolean;
  balancesPlaceholder?: string;
}): IAssetDetails & AssetSortBy => {
  const {
    token,
    key,
    total,
    fiat,
    pricesInfo,
    fiatCurrency,
    areBalancesVisible = true,
    balancesPlaceholder = ''
  } = params;
  const { tokenMetadata, nftMetadata, fingerprint, policyId } = token;

  const assetMetadata = {
    name: '-',
    ticker: addEllipsis(fingerprint.toString(), 8, 6),
    ...tokenMetadata,
    ...nftMetadata
  };
  const { ticker, name, icon, decimals } = assetMetadata;

  const bigintBalance = total?.assets?.get(key) || BigInt(1);
  const tokenBalance = Wallet.util.calculateAssetBalance(bigintBalance, token);

  const fiatPrice = pricesInfo?.priceInAda && fiat ? fiat * pricesInfo.priceInAda : undefined;
  const fiatBalance =
    tokenMetadata !== undefined && fiatPrice !== undefined
      ? new BigNumber(tokenBalance).multipliedBy(fiatPrice)
      : undefined;
  const variation = pricesInfo?.priceVariationPercentage24h
    ? variationParser(pricesInfo?.priceVariationPercentage24h)
    : '-';
  const price = fiatPrice !== undefined ? parseFiat(fiatPrice) : '-';
  const formattedFiatBalance =
    fiatBalance !== undefined ? `${parseFiat(fiatBalance.toNumber())} ${fiatCurrency?.code}` : '-';

  return {
    id: key.toString(),
    logo: icon ? getAssetImageUrl(icon) : getRandomIcon({ id: key.toString(), size: 30 }),
    name,
    ticker,
    price,
    variation,
    balance: areBalancesVisible ? compactNumber(tokenBalance, decimals) : balancesPlaceholder,
    fiatBalance: areBalancesVisible ? formattedFiatBalance : balancesPlaceholder,
    sortBy: {
      policyId,
      fiatBalance: fiatBalance?.toNumber(),
      metadataName: tokenMetadata?.name,
      fingerprint,
      amount: tokenBalance
    }
  };
};

export const getTokenAmountInFiat = (amount: string, priceInADA: number, fiat: number): string =>
  new BigNumber(amount).multipliedBy(priceInADA).multipliedBy(fiat).toString(); // first get the price of the amount in ADA and then converted to fiat
