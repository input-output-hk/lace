import { tokensSelectors } from '@lace-contract/tokens';
import { createSelector } from 'reselect';

import { calculatePortfolioValueOverTime } from '../utils';

import { slice } from './slice';

import type { PriceDataPoint, TimeRange } from '../types';
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

export const tokenPricingSliceSelectors = {
  tokenPricing: {
    ...slice.selectors,
    selectHasActivePricingError,
    selectTokenPriceHistoryForRange,
    selectPortfolioValueHistory,
  },
};
