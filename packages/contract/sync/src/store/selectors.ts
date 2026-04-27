import { Percent } from '@cardano-sdk/util';
import { walletsSelectors } from '@lace-contract/wallet-repo';
import { createSelector } from '@reduxjs/toolkit';
import sum from 'lodash/sum';

import { syncSelectors } from './slice';

import type {
  AccountSyncStatus,
  GlobalSyncStatus,
  SyncOperationFailed,
} from '../types';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * Aggregates account-level sync statuses into a global sync status.
 *
 * Logic:
 * - 'syncing': At least one account has pending sync
 * - 'error': At least one account has failed operations
 * - 'synced': All accounts synced (have lastSuccessfulSync, no pending)
 * - 'idle': No accounts have sync data yet
 */
export const selectGlobalSyncStatus = createSelector(
  [syncSelectors.sync.selectSyncStatusByAccount],
  (syncStatusByAccount): GlobalSyncStatus => {
    const accounts = Object.values(syncStatusByAccount).filter(
      account => account.pendingSync || account.lastSuccessfulSync,
    );

    if (accounts.length === 0) {
      return 'idle';
    }

    // Check if any account has pending sync
    const isAnyPending = accounts.some(account => account.pendingSync);
    if (isAnyPending) {
      // Check if any operation has failed
      const isAnyFailed = accounts.some(account =>
        account.pendingSync
          ? Object.values(account.pendingSync.operations).some(
              op => op.status === 'Failed',
            )
          : false,
      );

      return isAnyFailed ? 'error' : 'syncing';
    }

    // All accounts have completed syncing - check if they have lastSuccessfulSync
    const isAllSynced = accounts.every(account => account.lastSuccessfulSync);

    // Return 'error' so the UI treats this as a recoverable failure
    // rather than a perpetual loading state.
    return isAllSynced ? 'synced' : 'error';
  },
);

/**
 * Calculates average sync progress across all accounts.
 * Only considers accounts with pending syncs.
 *
 * @returns value between 0 and 1.
 * If there are no accounts currently syncing, returns 1.
 */
export const selectAverageSyncProgress = createSelector(
  [syncSelectors.sync.selectSyncStatusByAccount],
  (syncStatusByAccount): Percent | undefined => {
    const accountsWithPendingSync = Object.values(syncStatusByAccount).filter(
      account => account.pendingSync,
    );

    if (accountsWithPendingSync.length === 0) {
      return Percent(1);
    }

    // Calculate average progress across all accounts
    const accountProgresses = accountsWithPendingSync.map(account => {
      const operations = Object.values(account.pendingSync!.operations);
      const determinateOperations = operations.filter(
        op =>
          op.status === 'InProgress' &&
          'type' in op &&
          op.type === 'Determinate',
      );

      if (determinateOperations.length === 0) {
        // No determinate operations - consider as 0 progress
        return 0;
      }

      // Calculate average progress for this account's determinate operations
      const operationProgresses = determinateOperations.map(op =>
        'progress' in op ? op.progress : 0,
      );
      return sum(operationProgresses) / determinateOperations.length;
    });

    const averageProgress =
      sum(accountProgresses) / accountsWithPendingSync.length;
    return Percent(averageProgress);
  },
);

/**
 * Gets all failed operations across all accounts.
 * Useful for displaying error messages to users.
 */
export const selectAllFailedOperations = createSelector(
  [syncSelectors.sync.selectSyncStatusByAccount],
  (
    syncStatusByAccount,
  ): Array<{ accountId: AccountId; operation: SyncOperationFailed }> => {
    const failedOperations: Array<{
      accountId: AccountId;
      operation: SyncOperationFailed;
    }> = [];

    for (const [accountId, accountStatus] of Object.entries(
      syncStatusByAccount,
    )) {
      if (accountStatus.pendingSync) {
        const operations = Object.values(accountStatus.pendingSync.operations);
        const failed = operations.filter(
          (op): op is SyncOperationFailed => op.status === 'Failed',
        );

        for (const operation of failed) {
          failedOperations.push({
            accountId: accountId as AccountId,
            operation,
          });
        }
      }
    }

    return failedOperations;
  },
);

/**
 * Computes the average sync progress for an account as a display percentage (0–100).
 *
 * Only considers determinate InProgress operations. Returns undefined when there
 * are no such operations (e.g. account has only indeterminate ops, or no pending sync).
 *
 * Capped at 99 while pendingSync exists: when computeConnectedSyncRatio returns 1
 * in the "connected but empty" initial state, the stored operation progress reaches 1
 * before isStrictlyComplete is true. Capping prevents "Syncing (100%)" from appearing.
 */
export const computeAccountSyncingProgress = (
  accountStatus: AccountSyncStatus | undefined,
): number | undefined => {
  if (!accountStatus?.pendingSync) return undefined;

  const operations = Object.values(accountStatus.pendingSync.operations);
  const determinateOps = operations.filter(
    op =>
      op.status === 'InProgress' && 'type' in op && op.type === 'Determinate',
  );

  if (determinateOps.length === 0) return undefined;

  const total = determinateOps.reduce(
    (accumulator, op) => accumulator + ('progress' in op ? op.progress : 0),
    0,
  );
  const value = Math.floor((total / determinateOps.length) * 100);
  return Math.min(value, 99);
};

/**
 * Checks if any account has ever successfully synced.
 * Useful for distinguishing initial load from subsequent syncs/polling.
 *
 * @returns true if at least one account has lastSuccessfulSync
 */
export const selectHasEverSynced = createSelector(
  [syncSelectors.sync.selectSyncStatusByAccount],
  (syncStatusByAccount): boolean => {
    return Object.values(syncStatusByAccount).some(
      account => account.lastSuccessfulSync,
    );
  },
);

/**
 * Calculates sync progress for the active account only.
 *
 * @returns value between 0 and 1.
 * Returns 1 when the active account has no pending sync or when there is no active account.
 */
export const selectActiveAccountSyncProgress = createSelector(
  [
    syncSelectors.sync.selectSyncStatusByAccount,
    walletsSelectors.wallets.selectActiveAccountContext,
  ],
  (syncStatusByAccount, activeAccountContext): Percent => {
    if (!activeAccountContext) return Percent(1);

    const accountStatus = syncStatusByAccount[activeAccountContext.accountId];
    if (!accountStatus?.pendingSync) return Percent(1);

    const operations = Object.values(accountStatus.pendingSync.operations);
    const determinateOperations = operations.filter(
      op =>
        op.status === 'InProgress' && 'type' in op && op.type === 'Determinate',
    );

    if (determinateOperations.length === 0) return Percent(0);

    const operationProgresses = determinateOperations.map(op =>
      'progress' in op ? op.progress : 0,
    );
    const progress = sum(operationProgresses) / determinateOperations.length;

    // Cap below 1 while pendingSync exists — only return 1 once pendingSync is
    // cleared by completeSyncOperation. This prevents the "connected but empty"
    // initial state (where progress = 1 but isStrictlyComplete is still false)
    // from prematurely showing the wallet as synced.
    return Percent(Math.min(progress, 0.99));
  },
);
