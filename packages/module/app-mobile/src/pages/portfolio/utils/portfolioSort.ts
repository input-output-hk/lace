import { getTokenPriceId } from '@lace-contract/token-pricing';
import { ORDERS } from '@lace-lib/ui-toolkit';
import { BigNumber } from '@lace-lib/util';
import { getTokenFiatValueTruncated } from '@lace-lib/util-render';

import type { TokenPrice } from '@lace-contract/token-pricing';
import type { Token } from '@lace-contract/tokens';
import type { BrowsePoolSortOrder } from '@lace-lib/ui-toolkit';

const TOKEN_SORT_OPTIONS = ['quantity', 'value', 'ticker'] as const;

export type TokenSortOption = (typeof TOKEN_SORT_OPTIONS)[number];

export type TokenSortOrder = BrowsePoolSortOrder;

/** An absent `option` means no explicit choice: the list falls back to {@link DEFAULT_TOKEN_SORT_OPTION}. */
export type TokenSortPreference = {
  option?: TokenSortOption;
  order: TokenSortOrder;
};

export const DEFAULT_TOKEN_SORT_OPTION: TokenSortOption = 'value';

export const getDefaultTokenSortOrder = (
  option: TokenSortOption,
): TokenSortOrder => (option === 'ticker' ? ORDERS.ASC : ORDERS.DESC);

export const getAvailableTokenSortOptions = (
  isTokenPricingEnabled: boolean,
): readonly TokenSortOption[] =>
  isTokenPricingEnabled
    ? TOKEN_SORT_OPTIONS
    : TOKEN_SORT_OPTIONS.filter(option => option !== 'value');

/**
 * Narrows a stored preference to what the current network offers, returning
 * `undefined` when the option is unavailable or unrecognised. A preference
 * outlives the network it was chosen on, so without this the list could stay
 * sorted by a criterion the sort sheet can no longer show as selected.
 */
export const resolveTokenSortOption = (
  option: TokenSortOption | undefined,
  isTokenPricingEnabled: boolean,
): TokenSortOption | undefined =>
  option && getAvailableTokenSortOptions(isTokenPricingEnabled).includes(option)
    ? option
    : undefined;

/**
 * Resolves the sort the list actually applies. `order` belongs to the option the
 * user picked, so the fallback derives its own: a narrowed-away preference leaves
 * a stored order behind that would otherwise reverse the default sort.
 */
export const resolveEffectiveTokenSort = (
  option: TokenSortOption | undefined,
  order: TokenSortOrder,
): Required<TokenSortPreference> =>
  option
    ? { option, order }
    : {
        option: DEFAULT_TOKEN_SORT_OPTION,
        order: getDefaultTokenSortOrder(DEFAULT_TOKEN_SORT_OPTION),
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
