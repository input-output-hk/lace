import { WalletId, walletsActions } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-sdk/util';
import { beforeEach, describe, expect, it } from 'vitest';

import { reducers } from '../../src/store';
import {
  rawTokensActions as actions,
  rawTokensSelectors as selectors,
} from '../../src/store/slice/rawTokensSlice';

import {
  cardanoAccountId,
  cardanoAdaToken,
  cardanoAddress,
  cardanoOtherToken,
  cardanoTokenContext,
  midnightAccountId,
  midnightAddress,
  midnightToken,
} from './mock-tokens';

import type { RawToken } from '../../src';
import type { RawTokensState } from '../../src/store/slice';
import type { State } from '@lace-contract/module';

const createStateWithRawTokens = (tokens: RawTokensState) =>
  ({
    rawTokens: tokens,
  } as State);

describe('rawTokens slice', () => {
  let initialState: RawTokensState = {};

  beforeEach(() => {
    initialState = {};
  });

  describe('reducers', () => {
    it('should correctly set tokens for a given blockchain', () => {
      initialState = {
        [cardanoAccountId]: {
          [cardanoAddress]: { [cardanoAdaToken.tokenId]: cardanoAdaToken },
        },
      };

      const action = actions.setAddressTokens({
        tokens: [cardanoOtherToken],
        ...cardanoTokenContext,
      });

      const state = reducers.rawTokens(initialState, action);

      expect(state[cardanoAccountId]![cardanoAddress]).toEqual({
        [cardanoOtherToken.tokenId]: cardanoOtherToken,
      });
    });

    it('should remove token data from store when reached balance 0', () => {
      initialState = {
        [cardanoAccountId]: {
          [cardanoAddress]: { [cardanoAdaToken.tokenId]: cardanoAdaToken },
        },
      };

      const action = actions.setAddressTokens({
        tokens: [
          {
            ...cardanoAdaToken,
            available: BigNumber(0n),
          },
        ],
        ...cardanoTokenContext,
      });

      const state = reducers.rawTokens(initialState, action);

      expect(state[cardanoAccountId]![cardanoAddress]).toEqual({});
    });

    it('should remove all tokens for address when empty tokens array is provided', () => {
      initialState = {
        [cardanoAccountId]: {
          [cardanoAddress]: {
            [cardanoAdaToken.tokenId]: cardanoAdaToken,
            [cardanoOtherToken.tokenId]: cardanoOtherToken,
          },
        },
      };

      const action = actions.setAddressTokens({
        tokens: [],
        ...cardanoTokenContext,
      });

      const state = reducers.rawTokens(initialState, action);

      expect(state[cardanoAccountId]![cardanoAddress]).toBeUndefined();
    });

    it('can reset tokens and balance', () => {
      initialState = {
        [cardanoAccountId]: {
          [cardanoAddress]: { [cardanoAdaToken.tokenId]: cardanoAdaToken },
        },
        [midnightAccountId]: {
          [midnightAddress]: { [midnightToken.tokenId]: midnightToken },
        },
      };

      const action = actions.resetAccountTokens({
        accountId: midnightAccountId,
      });

      const state = reducers.rawTokens(initialState, action);

      expect(state).toEqual({
        [cardanoAccountId]: {
          [cardanoAddress]: { [cardanoAdaToken.tokenId]: cardanoAdaToken },
        },
      });
    });
  });

  describe('extraReducers', () => {
    describe('removeAccount', () => {
      it('should remove all the tokens data for the account', () => {
        const walletId = WalletId('wallet1');

        const state = {
          ...initialState,
          [cardanoAccountId]: {
            [cardanoAddress]: { [cardanoAdaToken.tokenId]: cardanoAdaToken },
          },
          [midnightAccountId]: {
            [midnightAddress]: { [midnightToken.tokenId]: midnightToken },
          },
        } as unknown as RawTokensState;

        const newState = reducers.rawTokens(
          state,
          walletsActions.wallets.removeAccount(walletId, cardanoAccountId),
        );
        expect(newState).toEqual({
          [midnightAccountId]: {
            [midnightAddress]: { [midnightToken.tokenId]: midnightToken },
          },
        });
      });
    });

    describe('removeWallet', () => {
      it('should remove tokens for all accounts in the wallet', () => {
        const walletId = WalletId('wallet1');

        const state = {
          ...initialState,
          [cardanoAccountId]: {
            [cardanoAddress]: { [cardanoAdaToken.tokenId]: cardanoAdaToken },
          },
          [midnightAccountId]: {
            [midnightAddress]: { [midnightToken.tokenId]: midnightToken },
          },
        } as unknown as RawTokensState;

        const newState = reducers.rawTokens(
          state,
          walletsActions.wallets.removeWallet(walletId, [
            cardanoAccountId,
            midnightAccountId,
          ]),
        );

        expect(newState).toEqual({});
      });
    });
  });

  describe('selectors', () => {
    describe('should correctly select tokens count', () => {
      it('0 for empty collection', () => {
        expect(
          selectors.selectUniqueTokensCount(createStateWithRawTokens({})),
        ).toEqual(0);
      });

      it('0 for token with no quantity available nor pending', () => {
        const zeroBalanceToken: RawToken = {
          ...cardanoAdaToken,
          available: BigNumber(0n),
          pending: BigNumber(0n),
        };
        const action = actions.setAddressTokens({
          tokens: [zeroBalanceToken],
          ...cardanoTokenContext,
        });

        const state = reducers.rawTokens(initialState, action);

        expect(
          selectors.selectUniqueTokensCount(createStateWithRawTokens(state)),
        ).toEqual(0);
      });

      it('1 for token with available quantity', () => {
        const tokens: RawToken[] = [
          {
            ...cardanoAdaToken,
            available: BigNumber(1_000_000n),
            pending: BigNumber(0n),
          },
        ];

        const action = actions.setAddressTokens({
          tokens,
          ...cardanoTokenContext,
        });

        const state = reducers.rawTokens(initialState, action);

        expect(selectors.selectUniqueTokensCount({ rawTokens: state })).toEqual(
          1,
        );
      });

      it('1 for token with pending quantity', () => {
        const tokens: RawToken[] = [
          {
            ...cardanoAdaToken,
            available: BigNumber(0n),
            pending: BigNumber(1_000_000n),
          },
        ];

        const action = actions.setAddressTokens({
          tokens,
          ...cardanoTokenContext,
        });

        const state = reducers.rawTokens(initialState, action);

        expect(
          selectors.selectUniqueTokensCount(createStateWithRawTokens(state)),
        ).toEqual(1);
      });

      it('1 for token with quantity and token with no quantity', () => {
        const tokens: RawToken[] = [
          {
            ...cardanoAdaToken,
            available: BigNumber(0n),
            pending: BigNumber(0n),
          },
          {
            ...cardanoOtherToken,
            available: BigNumber(1_000_000n),
            pending: BigNumber(0n),
          },
        ];

        const action = actions.setAddressTokens({
          tokens,
          ...cardanoTokenContext,
        });

        const state = reducers.rawTokens(initialState, action);

        expect(
          selectors.selectUniqueTokensCount(createStateWithRawTokens(state)),
        ).toEqual(1);
      });

      it('2 for two tokens with quantity', () => {
        const tokens: RawToken[] = [
          {
            ...cardanoAdaToken,
            available: BigNumber(1000n),
            pending: BigNumber(0n),
          },
          {
            ...cardanoOtherToken,
            available: BigNumber(1_000_000n),
            pending: BigNumber(0n),
          },
        ];

        const action = actions.setAddressTokens({
          tokens,
          ...cardanoTokenContext,
        });

        const state = reducers.rawTokens(initialState, action);

        expect(
          selectors.selectUniqueTokensCount(createStateWithRawTokens(state)),
        ).toEqual(2);
      });
    });

    describe('should correctly select has funds for an active blockchain', () => {
      it('return false if no tokens with quantity', () => {
        const tokens: RawToken[] = [
          {
            ...cardanoAdaToken,
            available: BigNumber(0n),
            pending: BigNumber(0n),
          },
          {
            ...cardanoOtherToken,
            available: BigNumber(0n),
            pending: BigNumber(0n),
          },
        ];

        const action = actions.setAddressTokens({
          tokens,
          ...cardanoTokenContext,
        });

        const state = reducers.rawTokens(initialState, action);

        expect(selectors.selectHasFunds(createStateWithRawTokens(state))).toBe(
          false,
        );
      });

      it('return true for tokens with available quantity', () => {
        const tokens: RawToken[] = [
          {
            ...cardanoAdaToken,
            available: BigNumber(1000n),
            pending: BigNumber(0n),
          },
          {
            ...cardanoOtherToken,
            available: BigNumber(0n),
            pending: BigNumber(0n),
          },
        ];

        const action = actions.setAddressTokens({
          tokens,
          ...cardanoTokenContext,
        });

        const state = reducers.rawTokens(initialState, action);

        expect(selectors.selectHasFunds(createStateWithRawTokens(state))).toBe(
          true,
        );
      });

      it('return true for tokens with pending quantity', () => {
        const tokens: RawToken[] = [
          {
            ...cardanoAdaToken,
            available: BigNumber(0n),
            pending: BigNumber(1000n),
          },
          {
            ...cardanoOtherToken,
            available: BigNumber(0n),
            pending: BigNumber(0n),
          },
        ];

        const action = actions.setAddressTokens({
          tokens,
          ...cardanoTokenContext,
        });

        const state = reducers.rawTokens(initialState, action);

        expect(selectors.selectHasFunds(createStateWithRawTokens(state))).toBe(
          true,
        );
      });
    });
  });
});
