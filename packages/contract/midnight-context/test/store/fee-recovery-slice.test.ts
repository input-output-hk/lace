import {
  AccountId,
  WalletId,
  walletsActions,
} from '@lace-contract/wallet-repo';
import {
  repositorySlice,
  repositoryAdapter,
} from '@lace-contract/wallet-repo/src/store/repo-slice';
import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';

import {
  feeRecoveryInitialState,
  feeRecoverySlice,
} from '../../src/store/fee-recovery-slice';
import {
  midnightWallet,
  walletId as restoredWalletId,
  accountId as restoredAccountId,
} from '../../src/stub-data';

const { reducer, actions } = feeRecoverySlice;
const first = AccountId('first');
const second = AccountId('second');
const sibling = AccountId('sibling');
const walletId = WalletId('wallet');
const hash = 'a'.repeat(64);
const seed = () =>
  [first, second, sibling].reduce(
    (state, accountId) => {
      const requested = reducer(
        state,
        actions.requestMissingFees({
          accountId,
          requestId: accountId,
          networkId: 'preprod',
          indexerAddress: 'https://indexer.example',
        }),
      );
      return reducer(
        requested,
        actions.feeRecoveryChecked({
          accountId,
          requestId: accountId,
          hash,
          fee: '42',
        }),
      );
    },
    { ...feeRecoveryInitialState, supported: true },
  );

describe('fee recovery account lifecycle', () => {
  it.each([
    {
      label: 'account',
      action: walletsActions.wallets.removeAccount(walletId, first),
      removed: [first],
      retained: [second, sibling],
    },
    {
      label: 'wallet',
      action: walletsActions.wallets.removeWallet(walletId, [first, second]),
      removed: [first, second],
      retained: [sibling],
    },
    {
      label: 'all wallets',
      action: walletsActions.wallets.removeAllWallets(),
      removed: [first, second, sibling],
      retained: [],
    },
  ])(
    'clears fees and jobs on removal of $label without affecting siblings',
    ({ action, removed, retained }) => {
      const state = reducer(seed(), action);
      for (const accountId of removed) {
        expect(state.feesByAccount[accountId]).toBeUndefined();
        expect(state.jobs[accountId]).toBeUndefined();
        // A provider response racing deletion cannot recreate a removed cache.
        expect(
          reducer(
            state,
            actions.feeRecoveryChecked({
              accountId,
              requestId: accountId,
              hash,
              fee: '99',
            }),
          ),
        ).toEqual(state);
      }
      for (const accountId of retained) {
        expect(state.feesByAccount[accountId]).toEqual({ [hash]: '42' });
        expect(state.jobs[accountId]?.status).toBe('running');
      }
      expect(state.supported).toBe(true);
    },
  );
});

it('cleans up in the same Redux dispatch that removes the wallet', () => {
  const store = configureStore({
    reducer: { wallets: repositorySlice.reducer, midnightFeeRecovery: reducer },
    preloadedState: {
      wallets: repositoryAdapter.addOne(
        repositorySlice.getInitialState(),
        midnightWallet,
      ),
      midnightFeeRecovery: { ...feeRecoveryInitialState, supported: true },
    },
  });
  store.dispatch(
    actions.requestMissingFees({
      accountId: restoredAccountId,
      requestId: 'running',
      networkId: 'preprod',
      indexerAddress: 'https://indexer.example',
    }),
  );
  store.dispatch(
    actions.feeRecoveryChecked({
      accountId: restoredAccountId,
      requestId: 'running',
      hash,
      fee: '42',
    }),
  );
  store.dispatch(
    walletsActions.wallets.removeWallet(restoredWalletId, [restoredAccountId]),
  );
  expect(store.getState().wallets.entities[restoredWalletId]).toBeUndefined();
  expect(store.getState().midnightFeeRecovery.feesByAccount).toEqual({});
  expect(store.getState().midnightFeeRecovery.jobs).toEqual({});
  store.dispatch(
    actions.feeRecoveryChecked({
      accountId: restoredAccountId,
      requestId: 'running',
      hash,
      fee: '99',
    }),
  );
  expect(store.getState().midnightFeeRecovery.feesByAccount).toEqual({});
});
