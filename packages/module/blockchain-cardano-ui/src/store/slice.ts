import { cardanoContextActions } from '@lace-contract/cardano-context';
import { syncActions } from '@lace-contract/sync';
import { walletsActions } from '@lace-contract/wallet-repo';
import { createSlice } from '@reduxjs/toolkit';

import type { TranslationKey } from '@lace-contract/i18n';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { PayloadAction } from '@reduxjs/toolkit';

// Presentation survives view remounts, without holding a sync round or persisting a result.
const initialState = {
  failedResets: {} as Partial<Record<AccountId, TranslationKey>>,
};

const slice = createSlice({
  name: 'cardanoSyncUi',
  initialState,
  reducers: {
    dismissResetFailure: (
      state,
      { payload }: PayloadAction<{ accountId: AccountId }>,
    ) => {
      delete state.failedResets[payload.accountId];
    },
  },
  extraReducers: builder => {
    builder
      .addCase(
        cardanoContextActions.cardanoContext.setWalletSyncResetResult,
        (state, { payload: { accountId, status, error } }) => {
          if (status === 'Failed') {
            state.failedResets[accountId] =
              error ?? 'v2.account-settings.hd-wallet-sync.toast.error';
          } else {
            delete state.failedResets[accountId];
          }
        },
      )
      .addCase(
        cardanoContextActions.cardanoContext.resetWalletSyncState,
        (state, { payload: { accountId } }) => {
          delete state.failedResets[accountId];
        },
      )
      .addCase(
        syncActions.sync.clearPendingSyncsForAccounts,
        (state, { payload }) => {
          for (const accountId of payload.accountIds)
            delete state.failedResets[accountId];
        },
      )
      .addCase(walletsActions.wallets.removeAccount, (state, { payload }) => {
        delete state.failedResets[payload.accountId];
      })
      .addCase(walletsActions.wallets.removeWallet, (state, { payload }) => {
        for (const accountId of payload.accountIds)
          delete state.failedResets[accountId];
      });
  },
  selectors: {
    selectFailedResets: state => state.failedResets,
  },
});

export const reducers = { [slice.name]: slice.reducer };
export const actions = { [slice.name]: slice.actions };
export const selectors = { [slice.name]: slice.selectors };
