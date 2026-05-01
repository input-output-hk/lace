import { describe, expect, it } from 'vitest';

import { swapContextActions as actions } from '../../src/index';
import { swapContextReducers } from '../../src/store/slice';

import type { SwapConfigState } from '../../src/store/types';

const baseState: SwapConfigState = {
  disclaimerAcknowledged: false,
  slippage: 0.5,
  excludedDexes: [],
  availableDexes: null,
  tradableTokenIds: null,
  providerTokens: null,
};

describe('swapContext config slice', () => {
  describe('reducers', () => {
    describe('acknowledgeDisclaimer', () => {
      it('sets disclaimerAcknowledged to true', () => {
        const state = swapContextReducers.swapConfig(
          baseState,
          actions.swapConfig.acknowledgeDisclaimer(),
        );
        expect(state.disclaimerAcknowledged).toBe(true);
      });
    });

    describe('setSlippage', () => {
      it('updates slippage value', () => {
        const state = swapContextReducers.swapConfig(
          baseState,
          actions.swapConfig.setSlippage(2.5),
        );
        expect(state.slippage).toBe(2.5);
      });
    });

    describe('setExcludedDexes', () => {
      it('updates excluded dexes list', () => {
        const state = swapContextReducers.swapConfig(
          baseState,
          actions.swapConfig.setExcludedDexes(['SundaeSwap']),
        );
        expect(state.excludedDexes).toEqual(['SundaeSwap']);
      });
    });

    describe('setAvailableDexes', () => {
      it('updates available dexes list', () => {
        const dexes = [
          { id: 'Minswap', name: 'Minswap' },
          { id: 'SundaeSwap', name: 'SundaeSwap' },
        ];
        const state = swapContextReducers.swapConfig(
          baseState,
          actions.swapConfig.setAvailableDexes(dexes),
        );
        expect(state.availableDexes).toEqual(dexes);
      });

      it('accepts null to clear available dexes', () => {
        const state = swapContextReducers.swapConfig(
          {
            ...baseState,
            availableDexes: [{ id: 'Minswap', name: 'Minswap' }],
          },
          actions.swapConfig.setAvailableDexes(null),
        );
        expect(state.availableDexes).toBeNull();
      });
    });

    describe('setTradableTokenIds', () => {
      it('updates tradable token ids list', () => {
        const ids = ['lovelace', 'abc123'];
        const state = swapContextReducers.swapConfig(
          baseState,
          actions.swapConfig.setTradableTokenIds(ids),
        );
        expect(state.tradableTokenIds).toEqual(ids);
      });
    });

    describe('setProviderTokens', () => {
      it('updates provider tokens list', () => {
        const tokens = [
          {
            id: 'lovelace',
            ticker: 'ADA',
            name: 'Cardano',
            decimals: 6,
          },
        ];
        const state = swapContextReducers.swapConfig(
          baseState,
          actions.swapConfig.setProviderTokens(tokens),
        );
        expect(state.providerTokens).toEqual(tokens);
      });

      it('accepts null to clear provider tokens', () => {
        const state = swapContextReducers.swapConfig(
          {
            ...baseState,
            providerTokens: [
              {
                id: 'lovelace',
                ticker: 'ADA',
                name: 'Cardano',
                decimals: 6,
              },
            ],
          },
          actions.swapConfig.setProviderTokens(null),
        );
        expect(state.providerTokens).toBeNull();
      });
    });
  });
});
