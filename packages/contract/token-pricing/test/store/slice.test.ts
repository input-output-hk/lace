import { TokenId } from '@lace-contract/tokens';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect } from 'vitest';

import { DEFAULT_CURRENCY_PREFERENCE } from '../../src/const';
import {
  tokenPricingReducers,
  tokenPricingActions,
} from '../../src/store/slice';
import { CardanoTokenPriceId } from '../../src/value-objects';

import type {
  CurrencyPreference,
  TokenPrice,
  TokenPricingState,
} from '../../src/types';

const createStore = (preloadedState?: { tokenPricing: TokenPricingState }) =>
  configureStore({
    reducer: tokenPricingReducers,
    preloadedState,
  });

const defaultCurrencyPreference: CurrencyPreference =
  DEFAULT_CURRENCY_PREFERENCE;

describe('tokenPricing slice', () => {
  describe('reducers', () => {
    describe('startUpdate', () => {
      it('should set isUpdating to true and clear error', () => {
        const store = createStore({
          tokenPricing: {
            prices: {},
            priceHistory: {},
            metadata: {
              lastSuccessfulUpdate: null,
              isUpdating: false,
              error: { message: 'old error', timestamp: 123 },
              failedTokenIds: [],
            },
            currencyPreference: defaultCurrencyPreference,
          },
        });

        store.dispatch(tokenPricingActions.tokenPricing.startUpdate());

        const state = store.getState().tokenPricing;
        expect(state.metadata.isUpdating).toBe(true);
        expect(state.metadata.error).toBeNull();
      });
    });

    describe('setPrices', () => {
      it('should set prices and update metadata', () => {
        const store = createStore();
        const timestamp = Date.now();
        const priceId = CardanoTokenPriceId(TokenId('ada'));
        const prices: TokenPrice[] = [
          {
            priceId,
            blockchain: 'Cardano',
            identifier: 'ada',
            price: 0.5,
            fiatCurrency: 'USD',
            lastUpdated: timestamp,
            change24h: 2.5,
          },
        ];

        store.dispatch(
          tokenPricingActions.tokenPricing.setPrices({ prices, timestamp }),
        );

        const state = store.getState().tokenPricing;

        expect(state.prices[priceId]).toBeDefined();
        expect(state.prices[priceId].price).toBe(0.5);
        expect(state.metadata.lastSuccessfulUpdate).toBe(timestamp);
        expect(state.metadata.isUpdating).toBe(false);
        expect(state.metadata.error).toBeNull();
      });

      it('should update existing prices', () => {
        const priceId = CardanoTokenPriceId(TokenId('ada'));
        const store = createStore({
          tokenPricing: {
            prices: {
              [priceId]: {
                priceId,
                blockchain: 'Cardano',
                identifier: 'ada',
                price: 0.4,
                fiatCurrency: 'USD',
                lastUpdated: 1000,
              },
            },
            priceHistory: {},
            metadata: {
              lastSuccessfulUpdate: 1000,
              isUpdating: false,
              error: null,
              failedTokenIds: [],
            },
            currencyPreference: defaultCurrencyPreference,
          },
        });

        const timestamp = Date.now();
        store.dispatch(
          tokenPricingActions.tokenPricing.setPrices({
            prices: [
              {
                priceId,
                blockchain: 'Cardano',
                identifier: 'ada',
                price: 0.5,
                fiatCurrency: 'USD',
                lastUpdated: timestamp,
              },
            ],
            timestamp,
          }),
        );

        const state = store.getState().tokenPricing;
        expect(state.prices[priceId].price).toBe(0.5);
        expect(state.prices[priceId].lastUpdated).toBe(timestamp);
      });
    });

    describe('setError', () => {
      it('should set error and mark prices as stale', () => {
        const priceId = CardanoTokenPriceId(TokenId('ada'));
        const store = createStore({
          tokenPricing: {
            prices: {
              [priceId]: {
                priceId,
                blockchain: 'Cardano',
                identifier: 'ada',
                price: 0.5,
                fiatCurrency: 'USD',
                lastUpdated: Date.now(),
                isStale: false,
              },
            },
            priceHistory: {},
            metadata: {
              lastSuccessfulUpdate: Date.now(),
              isUpdating: true,
              error: null,
              failedTokenIds: [],
            },
            currencyPreference: defaultCurrencyPreference,
          },
        });

        store.dispatch(
          tokenPricingActions.tokenPricing.setError({
            error: {
              message: 'Network error',
              timestamp: Date.now(),
            },
          }),
        );

        const state = store.getState().tokenPricing;
        expect(state.metadata.error).not.toBeNull();
        expect(state.metadata.error?.message).toBe('Network error');
        expect(state.metadata.isUpdating).toBe(false);
        expect(state.prices[priceId].isStale).toBe(true);
      });
    });

    describe('clearError', () => {
      it('should clear error from metadata', () => {
        const store = createStore({
          tokenPricing: {
            prices: {},
            priceHistory: {},
            metadata: {
              lastSuccessfulUpdate: null,
              isUpdating: false,
              error: { message: 'Network error', timestamp: 123 },
              failedTokenIds: [],
            },
            currencyPreference: defaultCurrencyPreference,
          },
        });

        store.dispatch(tokenPricingActions.tokenPricing.clearError());

        const state = store.getState().tokenPricing;
        expect(state.metadata.error).toBeNull();
      });
    });

    describe('clearPrices', () => {
      it('should clear all prices and reset metadata', () => {
        const priceId = CardanoTokenPriceId(TokenId('ada'));
        const store = createStore({
          tokenPricing: {
            prices: {
              [priceId]: {
                priceId,
                blockchain: 'Cardano',
                identifier: 'ada',
                price: 0.5,
                fiatCurrency: 'USD',
                lastUpdated: Date.now(),
              },
            },
            priceHistory: {},
            metadata: {
              lastSuccessfulUpdate: Date.now(),
              isUpdating: false,
              error: null,
              failedTokenIds: [],
            },
            currencyPreference: defaultCurrencyPreference,
          },
        });

        store.dispatch(tokenPricingActions.tokenPricing.clearPrices());

        const state = store.getState().tokenPricing;
        expect(Object.keys(state.prices)).toHaveLength(0);
        expect(state.metadata.lastSuccessfulUpdate).toBeNull();
      });
    });

    describe('setCurrencyPreference', () => {
      it('should set currency preference', () => {
        const store = createStore();
        const eurPreference: CurrencyPreference = {
          name: 'EUR',
          ticker: '€',
        };

        store.dispatch(
          tokenPricingActions.tokenPricing.setCurrencyPreference(eurPreference),
        );

        const state = store.getState().tokenPricing;
        expect(state.currencyPreference).toEqual(eurPreference);
      });

      it('should default to USD', () => {
        const store = createStore();
        const state = store.getState().tokenPricing;
        expect(state.currencyPreference).toEqual(defaultCurrencyPreference);
      });
    });

    describe('clearPriceHistory', () => {
      it('should clear all price history', () => {
        const priceId = CardanoTokenPriceId(TokenId('ada'));
        const timestamp = Date.now();
        const store = createStore({
          tokenPricing: {
            prices: {
              [priceId]: {
                priceId,
                blockchain: 'Cardano',
                identifier: 'ada',
                price: 0.5,
                fiatCurrency: 'USD',
                lastUpdated: timestamp,
              },
            },
            priceHistory: {
              [priceId]: {
                '24H': [
                  { timestamp: timestamp - 1000, price: 0.48, date: '1/25' },
                  { timestamp, price: 0.5, date: '1/26' },
                ],
                '7D': [{ timestamp, price: 0.5, date: '1/26' }],
                '1M': [],
                '1Y': [],
                lastFetched: {
                  '24H': timestamp,
                  '7D': timestamp,
                  '1M': 0,
                  '1Y': 0,
                },
              },
            },
            metadata: {
              lastSuccessfulUpdate: timestamp,
              isUpdating: false,
              error: null,
              failedTokenIds: [],
            },
            currencyPreference: defaultCurrencyPreference,
          },
        });

        store.dispatch(tokenPricingActions.tokenPricing.clearPriceHistory());

        const state = store.getState().tokenPricing;
        expect(Object.keys(state.priceHistory)).toHaveLength(0);
        // Verify that prices and metadata are not affected
        expect(state.prices[priceId]).toBeDefined();
        expect(state.prices[priceId].price).toBe(0.5);
        expect(state.metadata.lastSuccessfulUpdate).toBe(timestamp);
      });
    });
  });
});
