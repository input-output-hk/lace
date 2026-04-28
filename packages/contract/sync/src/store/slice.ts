import { markParameterizedSelector } from '@lace-contract/module';
import { walletsActions } from '@lace-contract/wallet-repo';
import { Timestamp } from '@lace-sdk/util';
import { createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

import type { SyncSliceState, SyncOperation, SyncOperationId } from '../types';
import type { Percent } from '@cardano-sdk/util';
import type { TranslationKey } from '@lace-contract/i18n';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';
import type * as _immer from 'immer';

const initialState: SyncSliceState = {
  syncStatusByAccount: {},
};

type AddSyncOperationPayload = {
  accountId: AccountId;
  operation: SyncOperation;
};

type UpdateSyncOperationPayload = {
  accountId: AccountId;
  operationId: SyncOperationId;
  update: Partial<SyncOperation>;
};

type CompleteSyncOperationPayload = {
  accountId: AccountId;
  operationId: SyncOperationId;
};

type FailSyncOperationPayload = {
  accountId: AccountId;
  operationId: SyncOperationId;
  error: TranslationKey;
};

type UpdateSyncProgressPayload = {
  accountId: AccountId;
  operationId: SyncOperationId;
  progress: Percent;
};

const slice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    addSyncOperation: (
      state,
      { payload }: PayloadAction<AddSyncOperationPayload>,
    ) => {
      const { accountId, operation } = payload;

      // Initialize account if not exists
      if (!state.syncStatusByAccount[accountId]) {
        state.syncStatusByAccount[accountId] = {
          pendingSync: {
            startedAt: Timestamp(Date.now()),
            operations: {},
          },
        };
      }

      const accountStatus = state.syncStatusByAccount[accountId];

      // Initialize pendingSync if it doesn't exist
      if (!accountStatus.pendingSync) {
        accountStatus.pendingSync = {
          startedAt: Timestamp(Date.now()),
          operations: {},
        };
      }

      // Add operation to pendingSync
      accountStatus.pendingSync.operations[operation.operationId] = operation;
    },

    updateSyncOperation: (
      state,
      { payload }: PayloadAction<UpdateSyncOperationPayload>,
    ) => {
      const { accountId, operationId, update } = payload;
      const accountStatus = state.syncStatusByAccount[accountId];

      if (!accountStatus?.pendingSync?.operations[operationId]) {
        return;
      }

      // Merge update into operation
      accountStatus.pendingSync.operations[operationId] = {
        ...accountStatus.pendingSync.operations[operationId],
        ...update,
      } as SyncOperation;
    },

    completeSyncOperation: (
      state,
      { payload }: PayloadAction<CompleteSyncOperationPayload>,
    ) => {
      const { accountId, operationId } = payload;
      const accountStatus = state.syncStatusByAccount[accountId];

      if (!accountStatus?.pendingSync?.operations[operationId]) {
        return;
      }

      const operation = accountStatus.pendingSync.operations[operationId];

      // Mark operation as completed
      accountStatus.pendingSync.operations[operationId] = {
        ...operation,
        status: 'Completed',
        completedAt: Timestamp(Date.now()),
      } as SyncOperation;

      // Check if all operations are terminal (Completed or Failed)
      const allOperations = Object.values(accountStatus.pendingSync.operations);
      const isAllTerminal = allOperations.every(
        op => op.status === 'Completed' || op.status === 'Failed',
      );

      if (isAllTerminal) {
        // Check if all succeeded
        const didAllSucceeded = allOperations.every(
          op => op.status === 'Completed',
        );

        if (didAllSucceeded) {
          accountStatus.lastSuccessfulSync = Timestamp(Date.now());
        }

        // Clear pendingSync
        accountStatus.pendingSync = undefined;
      }
    },

    failSyncOperation: (
      state,
      { payload }: PayloadAction<FailSyncOperationPayload>,
    ) => {
      const { accountId, operationId, error } = payload;
      const accountStatus = state.syncStatusByAccount[accountId];

      if (!accountStatus?.pendingSync?.operations[operationId]) {
        return;
      }

      const operation = accountStatus.pendingSync.operations[operationId];

      // Mark operation as failed
      accountStatus.pendingSync.operations[operationId] = {
        ...operation,
        status: 'Failed',
        failedAt: Timestamp(Date.now()),
        error,
      } as SyncOperation;

      // Check if all operations are terminal (Completed or Failed)
      const allOperations = Object.values(accountStatus.pendingSync.operations);
      const isAllTerminal = allOperations.every(
        op => op.status === 'Completed' || op.status === 'Failed',
      );

      if (isAllTerminal) {
        // Don't update lastSuccessfulSync on failure
        // Clear pendingSync
        accountStatus.pendingSync = undefined;
      }
    },

    markAccountAsSynced: (
      state,
      { payload }: PayloadAction<{ accountId: AccountId }>,
    ) => {
      const { accountId } = payload;

      if (!state.syncStatusByAccount[accountId]) {
        state.syncStatusByAccount[accountId] = {};
      }

      state.syncStatusByAccount[accountId].lastSuccessfulSync = Timestamp(
        Date.now(),
      );
    },

    updateSyncProgress: (
      state,
      { payload }: PayloadAction<UpdateSyncProgressPayload>,
    ) => {
      const { accountId, operationId, progress } = payload;
      const accountStatus = state.syncStatusByAccount[accountId];

      if (!accountStatus?.pendingSync?.operations[operationId]) {
        return;
      }

      const operation = accountStatus.pendingSync.operations[operationId];

      // Only update progress for InProgress Determinate operations
      if (
        operation.status === 'InProgress' &&
        'type' in operation &&
        operation.type === 'Determinate'
      ) {
        accountStatus.pendingSync.operations[operationId] = {
          ...operation,
          progress,
        };
      }
    },
  },
  extraReducers: builder => {
    /**
     * Handles the removeAccount action to remove sync status for the account.
     * @param state - The current state of the sync slice.
     * @param action - The removeAccount action containing the payload with accountId.
     */
    builder.addCase(walletsActions.wallets.removeAccount, (state, action) => {
      const { accountId } = action.payload;
      delete state.syncStatusByAccount[accountId];
    });

    /**
     * Handles the removeWallet action to remove sync status for all accounts of the wallet.
     * @param state - The current state of the sync slice.
     * @param action - The removeWallet action containing the walletId and accountIds.
     */
    builder.addCase(walletsActions.wallets.removeWallet, (state, action) => {
      const { accountIds } = action.payload;
      for (const accountId of accountIds) {
        delete state.syncStatusByAccount[accountId];
      }
    });
  },
  selectors: {
    selectSyncStatusByAccount: ({ syncStatusByAccount }) => syncStatusByAccount,
  },
});

// Parameterized selectors using createSelector and marked for StateObservables
const selectIsAccountSyncing = markParameterizedSelector(
  createSelector(
    slice.selectors.selectSyncStatusByAccount,
    (_: unknown, accountId: AccountId) => accountId,
    (syncStatusByAccount, accountId): boolean =>
      !!syncStatusByAccount[accountId]?.pendingSync,
  ),
);

const selectIsSyncOperationPending = markParameterizedSelector(
  createSelector(
    slice.selectors.selectSyncStatusByAccount,
    (_: unknown, operationId: SyncOperationId) => operationId,
    (syncStatusByAccount, operationId): boolean => {
      // Search across all accounts for the operation ID
      for (const accountStatus of Object.values(syncStatusByAccount)) {
        if (accountStatus.pendingSync?.operations[operationId]) {
          return true;
        }
      }
      return false;
    },
  ),
);

export const syncReducers = {
  [slice.name]: slice.reducer,
};

export const syncActions = {
  sync: slice.actions,
};

export const syncSelectors = {
  sync: {
    ...slice.selectors,
    selectIsAccountSyncing,
    selectIsSyncOperationPending,
  },
};

export type { SyncSliceState };

export type SyncStoreState = StateFromReducersMapObject<typeof syncReducers>;
