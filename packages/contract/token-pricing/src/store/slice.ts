import { createAction, createSlice } from '@reduxjs/toolkit';

import { DEFAULT_CURRENCY_PREFERENCE } from '../const';

import type {
  CurrencyPreference,
  TokenPrice,
  TokenPricingState,
  PricingError,
} from '../types';
import type { PriceDataPoint, TimeRange } from '../types';
import type { TokenPriceId } from '../value-objects';
import type { PayloadAction } from '@reduxjs/toolkit';

const initialState: TokenPricingState = {
  prices: {},
  priceHistory: {},
  metadata: {
    lastSuccessfulUpdate: null,
    isUpdating: false,
    error: null,
    failedTokenIds: [],
  },
  currencyPreference: DEFAULT_CURRENCY_PREFERENCE,
};

export interface SetPricesPayload {
  prices: TokenPrice[];
  timestamp: number;
}

export interface SetErrorPayload {
  error: PricingError;
}

export interface SetPriceHistoryPayload {
  priceId: TokenPriceId;
  timeRange: TimeRange;
  data: PriceDataPoint[];
  timestamp: number;
}

export interface RequestPriceHistoryPayload {
  timeRange: TimeRange;
}

export const slice = createSlice({
  name: 'tokenPricing',
  initialState,
  reducers: {
    startUpdate: state => {
      state.metadata.isUpdating = true;
      state.metadata.error = null;
    },
    setPrices: (state, { payload }: PayloadAction<SetPricesPayload>) => {
      const { prices, timestamp } = payload;

      for (const price of prices) {
        state.prices[price.priceId] = {
          ...price,
          lastUpdated: timestamp,
          isStale: false,
        };
      }

      state.metadata.isUpdating = false;
      state.metadata.lastSuccessfulUpdate = timestamp;
      state.metadata.error = null;
      state.metadata.failedTokenIds = [];
    },
    setPriceHistory: (
      state,
      { payload }: PayloadAction<SetPriceHistoryPayload>,
    ) => {
      const { priceId, timeRange, data, timestamp } = payload;

      // Initialize priceHistory for this token if it doesn't exist
      if (!state.priceHistory[priceId]) {
        state.priceHistory[priceId] = {
          '24H': [],
          '7D': [],
          '1M': [],
          '1Y': [],
          lastFetched: {
            '24H': 0,
            '7D': 0,
            '1M': 0,
            '1Y': 0,
          },
        };
      }

      // Update the specific time range
      state.priceHistory[priceId][timeRange] = data;
      state.priceHistory[priceId].lastFetched[timeRange] = timestamp;
    },
    setError: (state, { payload }: PayloadAction<SetErrorPayload>) => {
      const { error } = payload;
      state.metadata.isUpdating = false;
      state.metadata.error = error;

      // Mark all existing prices as stale
      for (const priceId of Object.keys(state.prices) as TokenPriceId[]) {
        state.prices[priceId] = {
          ...state.prices[priceId],
          isStale: true,
        };
      }
    },
    clearError: state => {
      state.metadata.error = null;
    },
    clearPrices: state => {
      state.prices = {};
      state.metadata = initialState.metadata;
    },
    clearPriceHistory: state => {
      state.priceHistory = {};
    },
    setCurrencyPreference: (
      state,
      { payload }: PayloadAction<CurrencyPreference>,
    ) => {
      state.currencyPreference = payload;
    },
  },
  selectors: {
    selectPrices: state => state.prices,
    selectMetadata: state => state.metadata,
    selectIsUpdating: state => state.metadata.isUpdating,
    selectError: state => state.metadata.error,
    selectLastSuccessfulUpdate: state => state.metadata.lastSuccessfulUpdate,
    selectIsPricingStale: state =>
      Object.values(state.prices).some(price => price.isStale),
    selectPriceHistory: state => state.priceHistory,
    selectCurrencyPreference: state => state.currencyPreference,
  },
});

const requestPriceHistory = createAction<RequestPriceHistoryPayload>(
  'tokenPricing/requestPriceHistory',
);

export const tokenPricingReducers = {
  [slice.name]: slice.reducer,
};

export const tokenPricingActions = {
  tokenPricing: {
    ...slice.actions,
    requestPriceHistory,
  },
};

export type { TokenPricingState };
