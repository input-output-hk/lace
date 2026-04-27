import { format } from 'date-fns';

import { COINGECKO_ENDPOINTS } from './const';
import {
  buildPriceUrl,
  extractPriceData,
  getSupportedCurrency,
  getTimeRangeParams,
} from './utils';

import type { CoinGeckoCoinsList, CoinGeckoPriceData } from './types';
import type { PriceDataPoint, TimeRange } from '@lace-lib/ui-toolkit';

interface CoinGeckoSimplePriceResponse {
  [coinId: string]: {
    [key: string]: number;
  };
}

interface CoinGeckoMarketChartResponse {
  prices: [number, number][];
}

type FetchPriceHistoryParams = {
  baseUrl: string;
  coinGeckoIds: string[];
  currency: string;
  timeRange: TimeRange;
};

export const coingeckoClient = {
  fetchCoinsList: async (baseUrl: string): Promise<CoinGeckoCoinsList> => {
    const url = `${baseUrl}${COINGECKO_ENDPOINTS.COINS_LIST}?include_platform=true`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('CoinGecko rate limit exceeded');
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    return (await response.json()) as CoinGeckoCoinsList;
  },

  fetchTokenPrices: async (
    baseUrl: string,
    coinGeckoIds: string[],
    currency = 'USD',
  ): Promise<Map<string, CoinGeckoPriceData>> => {
    if (coinGeckoIds.length === 0) {
      return new Map();
    }

    // Fetch each token individually for better proxy caching
    // This ensures that when one token's price changes, we don't invalidate the cache for all tokens
    const fetchPromises = coinGeckoIds.map(async coinId => {
      const supportedCurrency = getSupportedCurrency(currency);
      const url = buildPriceUrl(baseUrl, coinId, supportedCurrency);

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('CoinGecko rate limit exceeded');
        }
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = (await response.json()) as CoinGeckoSimplePriceResponse;
      return { coinId, data };
    });

    const results = await Promise.all(fetchPromises);

    const priceMap = new Map<string, CoinGeckoPriceData>();

    for (const { coinId, data } of results) {
      const priceInfo = data[coinId];
      if (priceInfo) {
        const priceData = extractPriceData(priceInfo, currency);
        if (priceData) {
          priceMap.set(coinId, priceData);
        }
      }
    }

    return priceMap;
  },

  fetchPriceHistory: async ({
    baseUrl,
    currency,
    timeRange,
    coinGeckoIds,
  }: FetchPriceHistoryParams): Promise<Map<string, PriceDataPoint[]>> => {
    if (coinGeckoIds.length === 0) {
      return new Map();
    }

    const { from, to } = getTimeRangeParams(timeRange);

    // Fetch each token individually in parallel for better caching
    const fetchPromises = coinGeckoIds.map(async coinId => {
      const endpoint = COINGECKO_ENDPOINTS.MARKET_CHART_RANGE.replace(
        ':id',
        coinId,
      );
      const url = `${baseUrl}${endpoint}?vs_currency=${currency.toLowerCase()}&from=${from}&to=${to}`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('CoinGecko rate limit exceeded');
        }
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = (await response.json()) as CoinGeckoMarketChartResponse;

      const priceHistory = data.prices.map(([timestamp, price]) => ({
        timestamp,
        price,
        date: format(timestamp, 'MM/dd'),
      }));

      return { coinId, priceHistory };
    });

    const results = await Promise.all(fetchPromises);

    const historyMap = new Map<string, PriceDataPoint[]>();
    for (const { coinId, priceHistory } of results) {
      historyMap.set(coinId, priceHistory);
    }

    return historyMap;
  },
};
