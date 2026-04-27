import '@lace-contract/module';
import { BigIntMath, isNotNil } from '@cardano-sdk/util';
import { walletsActions } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-sdk/util';
import { createSelector, createSlice } from '@reduxjs/toolkit';
import groupBy from 'lodash/groupBy';

import { TokenId } from '../../value-objects';

import { createRawToken } from './utils';

import type { RawToken } from '../../types';
import type { Address } from '@lace-contract/addresses';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { PayloadAction } from '@reduxjs/toolkit';

export type MultiAccountsTokensMap = Record<
  AccountId,
  Partial<Record<Address, Partial<Record<TokenId, RawToken>>>>
>;

export type RawTokensState = Partial<MultiAccountsTokensMap>;

export type SetTokensPayload = {
  tokens: Omit<RawToken, 'accountId' | 'address' | 'blockchainName'>[];
  accountId: RawToken['accountId'];
  address: RawToken['address'];
  blockchainName: RawToken['blockchainName'];
};

export type SetAccountTokensPayload = {
  byAddress: Array<{
    /***
     * All tokens must have the same `accountId`, `address` and `blockchainName`
     */
    tokens: Omit<RawToken, 'accountId' | 'address' | 'blockchainName'>[];
    address: RawToken['address'];
  }>;
  accountId: RawToken['accountId'];
  blockchainName: RawToken['blockchainName'];
};

export type ResetAddressTokensPayload = {
  accountId: AccountId;
};

const initialState: RawTokensState = {};

const rawTokensSlice = createSlice({
  name: 'rawTokens',
  initialState,
  reducers: {
    setAddressTokens: (
      state,
      {
        payload: { tokens, accountId, address, blockchainName },
      }: Readonly<PayloadAction<SetTokensPayload>>,
    ) => {
      if (tokens.length === 0) {
        if (state[accountId]?.[address]) {
          delete state[accountId][address];
        }
        return;
      }

      // initialize state structure for this account/address
      state[accountId] = state[accountId] || {};
      state[accountId][address] = state[accountId][address] || {};

      // remove tokens that are in state but are missing in the payload or have balance 0
      for (const existingTokenId of Object.keys(state[accountId][address])) {
        const token = tokens.find(t => t.tokenId === existingTokenId);
        if (!token || (token.available === '0' && token.pending === '0')) {
          delete state[accountId][address][TokenId(existingTokenId)];
        }
      }

      // update balances
      for (const updatedToken of tokens) {
        const existingToken = state[accountId][address][updatedToken.tokenId];
        if (updatedToken.available === '0' && updatedToken.pending === '0')
          continue;
        if (
          updatedToken.available !== existingToken?.available ||
          updatedToken.pending !== existingToken.pending
        ) {
          state[accountId][address][updatedToken.tokenId] = createRawToken({
            accountId,
            address,
            blockchainName,
            tokenWithoutContext: updatedToken,
          });
        }
      }
    },
    setAccountTokens: (
      state,
      {
        payload: { accountId, blockchainName, byAddress },
      }: PayloadAction<SetAccountTokensPayload>,
    ) => {
      state[accountId] = byAddress.reduce((account, { address, tokens }) => {
        account[address] = tokens.reduce(
          (rawTokens, { tokenId, available, pending }) => {
            rawTokens[tokenId] = {
              accountId,
              address,
              available,
              blockchainName,
              pending,
              tokenId,
            };
            return rawTokens;
          },
          {} as Record<TokenId, RawToken>,
        );
        return account;
      }, {} as Record<Address, Partial<Record<TokenId, RawToken>>>);
    },
    resetAccountTokens: (
      state,
      { payload }: Readonly<PayloadAction<ResetAddressTokensPayload>>,
    ) => {
      delete state[payload.accountId];
    },
  },
  extraReducers: builder => {
    /**
     * Handles the removeAccount action to remove the tokens data for the account.
     * @param state - The current state of the tokens slice.
     * @param action - The removeAccount action containing the payload with accountId.
     */
    builder.addCase(walletsActions.wallets.removeAccount, (state, action) => {
      const { accountId } = action.payload;
      delete state[accountId];
    });

    /**
     * Handles the removeWallet action to remove tokens for all accounts of the wallet.
     * @param state - The current state of the tokens slice.
     * @param action - The removeWallet action containing the walletId and accountIds.
     */
    builder.addCase(walletsActions.wallets.removeWallet, (state, action) => {
      const { accountIds } = action.payload;
      for (const accountId of accountIds) {
        delete state[accountId];
      }
    });
  },
  selectors: {
    selectAllMap: state => state,
  },
});

export const rawTokensReducers = {
  [rawTokensSlice.name]: rawTokensSlice.reducer,
};

/** Direct import of this is an anti-pattern. OK for tests. */
export const rawTokensActions = { ...rawTokensSlice.actions };

const aggregateAmounts = (tokens: RawToken[]) => ({
  available: BigNumber(
    BigIntMath.sum(tokens.map(({ available }) => BigInt(available))),
  ),
  pending: BigNumber(
    BigIntMath.sum(tokens.map(({ pending }) => BigInt(pending))),
  ),
});

const groupMultiAccountTokensById = (tokens: RawTokensState) => {
  const allRawTokens = Object.values(tokens)
    .flatMap(byAddress =>
      Object.values(byAddress || {}).flatMap(byTokenId =>
        Object.values(byTokenId || {}),
      ),
    )
    .filter(isNotNil);
  const byTokenId = groupBy(allRawTokens, token => token.tokenId);
  return Object.values(byTokenId).map(tokens => ({
    ...tokens[0],
    ...aggregateAmounts(tokens),
  }));
};

const selectAll = createSelector(
  rawTokensSlice.selectors.selectAllMap,
  tokensMap => groupMultiAccountTokensById(tokensMap),
);

const selectUniqueTokensCount = createSelector(
  selectAll,
  tokens =>
    tokens.filter(token => token.available !== '0' || token.pending !== '0')
      .length,
);

const selectHasFunds = createSelector(
  selectUniqueTokensCount,
  tokenCount => tokenCount > 0,
);

/** Direct import of this is an anti-pattern. OK for tests. */
export const rawTokensSelectors = {
  ...rawTokensSlice.selectors,
  selectAll,
  selectUniqueTokensCount,
  selectHasFunds,
};
