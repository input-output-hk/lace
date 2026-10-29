import { filter, merge, switchMap, take, takeUntil } from 'rxjs';

import { isTransactionPollingOperation } from './sync-operation-utils';

import type { SideEffect } from '../../contract';
import type { AccountId } from '@lace-contract/wallet-repo';

/** Restart cancelled derived-data work once ordinary polling recovers, even if its data is unchanged. */
export const retryAfterWalletResetFailure = (
  accountId: AccountId,
  { cardanoContext, sync }: Parameters<SideEffect>[0],
) =>
  cardanoContext.setWalletSyncResetResult$.pipe(
    filter(
      a => a.payload.accountId === accountId && a.payload.status === 'Failed',
    ),
    switchMap(() =>
      sync.completeSyncOperation$.pipe(
        filter(
          a =>
            a.payload.accountId === accountId &&
            isTransactionPollingOperation(a.payload.operationId),
        ),
        take(1),
        takeUntil(
          merge(
            cardanoContext.resetWalletSyncState$.pipe(
              filter(a => a.payload.accountId === accountId),
            ),
            sync.clearPendingSyncsForAccounts$.pipe(
              filter(a => a.payload.accountIds.includes(accountId)),
            ),
          ),
        ),
      ),
    ),
  );
