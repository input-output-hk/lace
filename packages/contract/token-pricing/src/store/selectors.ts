import { tokensSelectors } from '@lace-contract/tokens';
import { createSelector } from 'reselect';

import { DEFAULT_CURRENCY_PREFERENCE, FIAT_CURRENCIES } from '../const';
import { calculatePortfolioValueOverTime } from '../utils';

import { slice } from './slice';

import type { CurrencyPreference, PriceDataPoint, TimeRange } from '../types';
import type { TokenPriceId } from '../value-objects';

const EMPTY_PRICE_DATA_POINTS: PriceDataPoint[] = [];

export const selectHasActivePricingError = createSelector(
  [slice.selectors.selectError, slice.selectors.selectIsPricingStale],
  (error, isPricingStale) => !!error && isPricingStale,
);

export const selectTokenPriceHistoryForRange = createSelector(
  slice.selectors.selectPriceHistory,
  (
    _: unknown,
    params: { priceId: TokenPriceId | null; timeRange: TimeRange },
  ) => params,
  (priceHistory, { priceId, timeRange }): PriceDataPoint[] => {
    if (!priceId) {
      return EMPTY_PRICE_DATA_POINTS;
    }

    const history = priceHistory[priceId];
    if (!history || !history[timeRange] || history[timeRange].length === 0) {
      return EMPTY_PRICE_DATA_POINTS;
    }
    return history[timeRange];
  },
);

/**
 * Select portfolio value history for a given time range
 * This is a cross-slice selector that combines price history with token data
 */
export const selectPortfolioValueHistory = createSelector(
  [
    slice.selectors.selectPriceHistory,
    slice.selectors.selectPrices,
    tokensSelectors.tokens.selectAggregatedFungibleTokensForVisibleAccounts,
    (_: unknown, timeRange: TimeRange) => timeRange,
  ],
  // eslint-disable-next-line max-params
  (priceHistory, prices, tokens, timeRange): PriceDataPoint[] => {
    if (!tokens || tokens.length === 0) {
      return EMPTY_PRICE_DATA_POINTS;
    }

    // Build a map of price histories for the selected time range
    // Only include entries that have data for this specific time range
    const priceHistoryMap = new Map<TokenPriceId, PriceDataPoint[]>();
    let hasAnyData = false;

    for (const [priceId, history] of Object.entries(priceHistory)) {
      const data = history[timeRange];
      if (data && data.length > 0) {
        priceHistoryMap.set(priceId as TokenPriceId, data);
        hasAnyData = true;
      }
    }

    if (!hasAnyData) {
      return EMPTY_PRICE_DATA_POINTS;
    }

    return calculatePortfolioValueOverTime(priceHistoryMap, tokens, prices);
  },
);

/**
 * The currencies the user can actually pick, in allowlist display order.
 *
 * While the supported-currencies list is unavailable (not yet fetched,
 * testnet, or offline) the full allowlist is shown.
 *
 * Never empty: the default currency always stays selectable (even when excluded
 * or dropped by CoinGecko), so a corrected user is never left on a currency
 * that is missing from the sheet.
 *
 * Inputs are raw slice fields (stable references); the intersection/filter and
 * allocation happen in the result function, per reselect input-stability rules.
 */
export const selectSupportedCurrencyPreferences = createSelector(
  [
    slice.selectors.selectSupportedVsCurrencies,
    slice.selectors.selectCurrencyChoiceExclusions,
  ],
  (supportedVsCurrencies, exclusions): CurrencyPreference[] => {
    const exclusionSet = new Set(exclusions.map(code => code.toLowerCase()));
    const supportedSet = supportedVsCurrencies?.length
      ? new Set(supportedVsCurrencies.map(code => code.toLowerCase()))
      : null;

    const defaultCode = DEFAULT_CURRENCY_PREFERENCE.name.toLowerCase();

    return FIAT_CURRENCIES.filter(currency => {
      const code = currency.name.toLowerCase();
      if (code === defaultCode) return true;
      if (exclusionSet.has(code)) return false;
      if (supportedSet && !supportedSet.has(code)) return false;
      return true;
    });
  },
);

/**
 * Whether the persisted currency preference must fall back to the default
 * because it is no longer selectable. The user is moved off silently: the
 * snapshot cannot tell a genuine CoinGecko removal apart from a currency that
 * was never supported (e.g. picked while the supported list was unavailable),
 * so no anomaly is reported.
 */
export type CurrencyFallbackDecision = { fallback: false } | { fallback: true };

const NO_CURRENCY_FALLBACK: CurrencyFallbackDecision = { fallback: false };
const CURRENCY_FALLBACK: CurrencyFallbackDecision = { fallback: true };

export const selectCurrencyFallback = createSelector(
  [
    slice.selectors.selectCurrencyPreference,
    selectSupportedCurrencyPreferences,
  ],
  (preference, selectableCurrencies): CurrencyFallbackDecision => {
    // Never leave the default currency — otherwise a fallback could loop.
    if (preference.name === DEFAULT_CURRENCY_PREFERENCE.name) {
      return NO_CURRENCY_FALLBACK;
    }
    if (selectableCurrencies.some(c => c.name === preference.name)) {
      return NO_CURRENCY_FALLBACK;
    }
    return CURRENCY_FALLBACK;
  },
);

export const tokenPricingSliceSelectors = {
  tokenPricing: {
    ...slice.selectors,
    selectHasActivePricingError,
    selectTokenPriceHistoryForRange,
    selectPortfolioValueHistory,
    selectSupportedCurrencyPreferences,
    selectCurrencyFallback,
  },
};
