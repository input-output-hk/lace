import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import {
  getNextActiveAccount,
  updateActiveAccountAfterAccountRemoval,
  updateActiveAccountAfterWalletUpdate,
} from './utils';

import type { AnyAccount } from '..';
import type { WalletEntity } from '../entities';
import type { AccountId, WalletId } from '../value-objects';
import type { PayloadAction } from '@reduxjs/toolkit';

export type ActiveAccountContext = {
  walletId: WalletId;
  accountId: AccountId;
} | null;

export const repositoryAdapter = createEntityAdapter({
  selectId: (wallet: Readonly<WalletEntity>) => wallet.walletId,
  sortComparer: (a, b) => a.metadata.order - b.metadata.order,
});

export const repositorySlice = createSlice({
  name: 'wallets',
  initialState: {
    ...repositoryAdapter.getInitialState(),
    activeAccountContext: null as ActiveAccountContext,
    isWalletRepoMigrating: false,
  },
  reducers: {
    setIsWalletRepoMigrating: (state, action: PayloadAction<boolean>) => {
      state.isWalletRepoMigrating = action.payload;
    },
    addWallet: (state, action: PayloadAction<WalletEntity>) => {
      repositoryAdapter.addOne(state, action);
      if (state.activeAccountContext === null) {
        state.activeAccountContext = getNextActiveAccount(state);
      }
    },
    removeWallet: {
      reducer: (
        state,
        action: PayloadAction<{ walletId: WalletId; accountIds: AccountId[] }>,
      ) => {
        repositoryAdapter.removeOne(state, action.payload.walletId);
        if (state.activeAccountContext?.walletId === action.payload.walletId) {
          state.activeAccountContext = getNextActiveAccount(state);
        }
      },
      prepare: (walletId: WalletId, accountIds: AccountId[]) => {
        return {
          payload: { walletId, accountIds },
        };
      },
    },
    updateWallet: (
      state,
      action: PayloadAction<{ id: WalletId; changes: Partial<WalletEntity> }>,
    ) => {
      repositoryAdapter.updateOne(state, action);
      updateActiveAccountAfterWalletUpdate(state, action.payload.id);
    },
    removeAccount: {
      reducer: (
        state,
        action: PayloadAction<{ walletId: WalletId; accountId: AccountId }>,
      ) => {
        const { walletId, accountId } = action.payload;
        const wallet = state.entities[walletId];
        if (!wallet) return;

        wallet.accounts = wallet.accounts.filter(
          account => account.accountId !== accountId,
        ) as typeof wallet.accounts;

        updateActiveAccountAfterAccountRemoval(state, walletId, accountId);

        if (wallet.accounts.length === 0) {
          repositoryAdapter.removeOne(state, walletId);
          if (state.activeAccountContext?.walletId === walletId) {
            state.activeAccountContext = getNextActiveAccount(state);
          }
        }
      },
      prepare: (walletId: WalletId, accountId: AccountId) => ({
        payload: { walletId, accountId },
      }),
    },
    updateAccount: {
      reducer: (
        state,
        action: PayloadAction<{
          walletId: WalletId;
          accountId: AccountId;
          changes: Partial<Readonly<AnyAccount>>;
        }>,
      ) => {
        const { walletId, accountId, changes } = action.payload;
        const wallet = state.entities[walletId];

        return {
          ...state,
          entities: {
            ...state.entities,
            [walletId]: {
              ...wallet,
              accounts: wallet.accounts.map(account =>
                account.accountId === accountId
                  ? { ...account, ...changes }
                  : account,
              ),
            },
          },
        };
      },
      prepare: (
        walletId: WalletId,
        accountId: AccountId,
        changes: Partial<Readonly<AnyAccount>>,
      ) => ({
        payload: { walletId, accountId, changes },
      }),
    },
    setActiveAccountContext: (
      state,
      action: PayloadAction<ActiveAccountContext>,
    ) => {
      state.activeAccountContext = action.payload;
    },
    clearActiveAccountContext: state => {
      state.activeAccountContext = null;
    },
    /**
     * Removes all wallets from the store atomically.
     * Used during password recovery when all wallet data must be cleared.
     */
    removeAllWallets: state => {
      repositoryAdapter.removeAll(state);
      state.activeAccountContext = null;
    },
  },
});
