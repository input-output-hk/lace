import { getTokenPriceId } from '@lace-contract/token-pricing';
import { ORDERS } from '@lace-lib/ui-toolkit';
import { getTokenFiatValueTruncated } from '@lace-lib/util-render';
import { BigNumber } from '@lace-sdk/util';

import type { TokenPrice } from '@lace-contract/token-pricing';
import type { Token } from '@lace-contract/tokens';
import type { BrowsePoolSortOrder } from '@lace-lib/ui-toolkit';

export const TOKEN_SORT_OPTIONS = ['quantity', 'value', 'ticker'] as const;

export type TokenSortOption = (typeof TOKEN_SORT_OPTIONS)[number];

export type TokenSortOrder = BrowsePoolSortOrder;

export const DEFAULT_TOKEN_SORT_OPTION: TokenSortOption = 'quantity';

export const getDefaultTokenSortOrder = (
  option: TokenSortOption,
): TokenSortOrder => (option === 'ticker' ? ORDERS.ASC : ORDERS.DESC);

export const isTokenSortOption = (
  value: TokenSortOption,
): value is TokenSortOption => TOKEN_SORT_OPTIONS.includes(value);

export const isTokenSortOrder = (value: TokenSortOrder) =>
  value === ORDERS.ASC || value === ORDERS.DESC;

export const getTokenSortOption = (
  value: TokenSortOption | undefined,
): TokenSortOption | undefined =>
  isTokenSortOption(value as TokenSortOption) ? value : undefined;

export const getTokenSortOrder = (
  value: TokenSortOrder | undefined,
  option?: TokenSortOption,
): TokenSortOrder => {
  if (!option) return ORDERS.ASC;
  return isTokenSortOrder(value as TokenSortOrder)
    ? (value as TokenSortOrder)
    : getDefaultTokenSortOrder(option);
};

export const compareBigIntDesc = (left: bigint, right: bigint) => {
  if (left === right) return 0;
  return left > right ? -1 : 1;
};

export const compareNumbersDesc = (left: number, right: number) => right - left;

export const applySortOrder = (result: number, order: TokenSortOrder) =>
  order === ORDERS.ASC ? -result : result;

export const applyAscendingSortOrder = (
  result: number,
  order: TokenSortOrder,
) => (order === ORDERS.ASC ? result : -result);

export const getTickerSortValue = (asset: Token) =>
  (asset.metadata?.ticker ?? asset.displayShortName ?? asset.displayLongName)
    .trim()
    .toLocaleLowerCase();

export const compareTokensByTicker = (left: Token, right: Token) => {
  const result = getTickerSortValue(left).localeCompare(
    getTickerSortValue(right),
    undefined,
    { numeric: true, sensitivity: 'base' },
  );
  return result || left.tokenId.localeCompare(right.tokenId);
};

export const compareTokensByQuantity = (left: Token, right: Token) => {
  const leftAvailable = BigNumber.valueOf(left.available);
  const rightAvailable = BigNumber.valueOf(right.available);
  const normalizedLeft =
    leftAvailable * 10n ** BigInt(Math.max(0, right.decimals));
  const normalizedRight =
    rightAvailable * 10n ** BigInt(Math.max(0, left.decimals));

  return compareBigIntDesc(normalizedLeft, normalizedRight);
};

export const getTokenSortValue = (
  asset: Token,
  prices: Record<string, TokenPrice> | undefined,
) => {
  const priceId = getTokenPriceId(asset);
  const priceData = priceId ? prices?.[priceId] : undefined;

  if (!priceData) return 0;

  return getTokenFiatValueTruncated({
    available: asset.available.toString(),
    decimals: asset.decimals,
    price: priceData.price,
  });
};
