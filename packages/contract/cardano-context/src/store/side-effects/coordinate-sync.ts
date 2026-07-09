import { toEmpty } from '@cardano-sdk/util-rxjs';
import { Timestamp } from '@lace-sdk/util';
import {
  combineLatest,
  concat,
  EMPTY,
  exhaustMap,
  filter,
  from,
  ignoreElements,
  map,
  merge,
  race,
  take,
  timer,
  withLatestFrom,
} from 'rxjs';

import { isCardanoAccount, isCardanoAddress } from '../../util';
import { CardanoSyncFailureId } from '../../value-objects';

import { syncAccountStateOperations } from './sync-account-state-operations';
import {
  CardanoSyncOperationType,
  createSyncOperationId,
} from './sync-operation-utils';

import type { SideEffect } from '../../contract';
import type { FailureId } from '@lace-contract/failures';
import type { TranslationKey } from '@lace-contract/i18n';
import type { SyncOperation, SyncOperationId } from '@lace-contract/sync';

const SYNC_ROUND_TIMEOUT_MS = 60_000; // 60 seconds

/**
 * Coordinates sync rounds for Cardano accounts.
 *
 * This side effect:
 * - Monitors account activation and tip changes (natural trigger)
 * - Supports manual retry for failed accounts (manual trigger)
 * - Creates coordinated sync rounds with operations
 * - Ensures no new round starts while one is in progress
 * - Generates operation IDs based on sync round (accountId-tipHash)
 * - Waits for operations to complete/fail/timeout before starting next round
 * - Only syncs accounts on the currently active chain
 */
export const coordinateCardanoSync: SideEffect = (
  { cardanoContext: { retrySyncRound$ } },
  {
    wallets: { selectActiveNetworkAccounts$ },
    addresses: { selectAllAddresses$ },
    cardanoContext: { selectTip$, selectChainId$ },
    sync: { selectIsSyncOperationPending$ },
    failures: { selectAllFailures$ },
  },
  { actions },
) => {
  const chainId$ = selectChainId$.pipe(filter(Boolean));

  // Natural trigger: combineLatest of accounts, addresses, tip, and chainId
  const naturalTrigger$ = combineLatest([
    selectActiveNetworkAccounts$.pipe(
      map(accounts => accounts.filter(isCardanoAccount)),
    ),
    selectAllAddresses$.pipe(
      map(addresses => addresses.filter(isCardanoAddress)),
    ),
    selectTip$,
    chainId$,
  ]);

  // Manual retry trigger: extract failed account IDs from failures
  const manualRetryTrigger$ = retrySyncRound$.pipe(
    withLatestFrom(
      selectActiveNetworkAccounts$,
      selectAllAddresses$,
      selectTip$,
      chainId$,
      selectAllFailures$,
    ),
    map(([_, allAccounts, allAddresses, tip, chainId, allFailures]) => {
      // Extract account IDs from Cardano sync failures
      const failedAccountIds = new Set(
        (Object.keys(allFailures) as FailureId[])
          .filter(CardanoSyncFailureId.is)
          .map(CardanoSyncFailureId.extractAccountId),
      );

      // Filter accounts to only include failed accounts
      const cardanoAccounts = allAccounts.filter(isCardanoAccount);
      const failedAccounts = cardanoAccounts.filter(account =>
        failedAccountIds.has(account.accountId),
      );

      const cardanoAddresses = allAddresses.filter(isCardanoAddress);

      // Return same shape as naturalTrigger$
      return [failedAccounts, cardanoAddresses, tip, chainId] as const;
    }),
    // Only emit if there are failed accounts to retry
    filter(([accounts]) => accounts.length > 0),
  );

  // Merge natural and manual triggers
  return merge(naturalTrigger$, manualRetryTrigger$).pipe(
    exhaustMap(([accounts, addresses, tip, chainId]) => {
      // Filter accounts to only include those on the currently active chain
      const accountsOnActiveChain = accounts.filter(
        account =>
          account.blockchainSpecific.chainId.networkMagic ===
          chainId.networkMagic,
      );
      // Build a set of accountIds that have addresses for O(1) lookup
      const accountsWithAddresses = new Set(
        addresses.map(addr => addr.accountId),
      );

      // Process each account on the active chain and collect all actions
      const allActions = accountsOnActiveChain.flatMap(account => {
        const hasAddresses = accountsWithAddresses.has(account.accountId);
        const tipHash = tip?.hash;
        const now = Timestamp(Date.now());
        const operations: SyncOperation[] = [];

        // Add address discovery operation if account has no addresses
        if (!hasAddresses) {
          // 1st account's sync operation is always address discovery
          // we start syncing other account state only when discovery completes at least once.
          // Account-state operations are chained onto the round by
          // addressDiscoverySync's chainAccountStateOperations after a
          // successful discovery, so we do not enqueue them here.
          operations.push({
            operationId: createSyncOperationId(
              account.accountId,
              tipHash,
              CardanoSyncOperationType.ADDRESS_DISCOVERY,
            ),
            status: 'Pending',
            description: 'sync.operation.address-discovery' as TranslationKey,
            startedAt: now,
          });
        } else {
          operations.push(
            ...syncAccountStateOperations({
              accountId: account.accountId,
              tipHash,
            }),
          );
        }

        // Return actions to add all operations for this sync round
        return operations.map(operation =>
          actions.sync.addSyncOperation({
            accountId: account.accountId,
            operation,
          }),
        );
      });

      // If no actions to emit, complete immediately
      if (allActions.length === 0) {
        return EMPTY;
      }

      // Extract operation IDs from actions for tracking.
      // For first-time sync (no addresses yet), this contains ONLY the
      // ADDRESS_DISCOVERY op; the TRANSACTION_POLLING op is chained later
      // by addressDiscoverySync and intentionally not tracked here. The
      // dispatch order in addressDiscoverySync (upsertAddresses ->
      // addSyncOp(TXP) -> completeSyncOp(AD)) ensures the natural-trigger
      // emission caused by upsertAddresses is dropped by exhaustMap before
      // discovery completion releases the round lock, so no duplicate TXP
      // op is enqueued in a second round. See chainAccountStateOperations.
      const operationIds: SyncOperationId[] = allActions.map(
        action => action.payload.operation.operationId,
      );

      // Emit all addSyncOperation actions, then wait for completion
      const waitForCompletion$ = selectIsSyncOperationPending$.pipe(
        map(selectIsSyncOperationPending => {
          // Check if all of our operations are no longer pending
          return operationIds.every(
            opId => !selectIsSyncOperationPending(opId),
          );
        }),
        filter(Boolean), // Only continue when all operations are done
        take(1), // Take first completion signal
      );

      const waitForAnyPendingOperation$ = selectIsSyncOperationPending$.pipe(
        map(selectIsSyncOperationPending => {
          // Check if any of operations is pending
          return operationIds.some(opId => selectIsSyncOperationPending(opId));
        }),
        filter(Boolean), // Only continue when we find a pending operation
        take(1), // Take first completion signal
        toEmpty,
      );

      const timeout$ = timer(SYNC_ROUND_TIMEOUT_MS);

      return concat(
        from(allActions),
        // Wait for any sync operation to be pending in state, so that
        // we don't have a race condition in waitForCompletion$ between
        // start of the sync (pending operation) and the completion.
        // We should never complete before it even starts sync.
        waitForAnyPendingOperation$,
        // Wait for operations to complete or timeout, then complete without emitting
        race(waitForCompletion$, timeout$).pipe(ignoreElements()),
      );
    }),
  );
};
