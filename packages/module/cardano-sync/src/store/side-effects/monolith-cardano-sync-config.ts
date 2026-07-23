import {
  CardanoSyncFailureId,
  CardanoSyncOperationType,
  createSyncOperationId,
  isCardanoAccount,
  isCardanoAddress,
  syncAccountStateOperations,
} from '@lace-contract/cardano-context';
import { Timestamp } from '@lace-lib/util';
import { combineLatest, filter, map, merge, withLatestFrom } from 'rxjs';

import type {
  CardanoSyncEngineConfig,
  CardanoSyncRoundContext,
} from '@lace-contract/cardano-context';
import type { FailureId } from '@lace-contract/failures';
import type { TranslationKey } from '@lace-contract/i18n';
import type { SyncOperation } from '@lace-contract/sync';
import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * Monolith round context. Extends the engine's round context with the inputs
 * `buildRoundOperations` needs, all computed in `trigger$` (one per emission,
 * same cadence as the previous in-`exhaustMap` computation) so that
 * `buildRoundOperations` stays a PURE function of `(account, ctx)`.
 */
export type MonolithCardanoSyncRoundContext = CardanoSyncRoundContext & {
  // Set of accountIds that have addresses for O(1) lookup.
  accountsWithAddresses: Set<AccountId>;
  tipHash: string | undefined;
};

/**
 * The monolith's Cardano sync round configuration.
 *
 * - `trigger$` reproduces the original coordinate-sync trigger plumbing:
 *   - natural trigger: combineLatest of accounts, addresses, tip, and chainId
 *   - manual retry trigger: re-syncs only accounts with Cardano sync failures
 * - `buildRoundOperations`:
 *   - account with addresses -> account-state operations (transaction polling)
 *   - account without addresses -> a single ADDRESS_DISCOVERY operation; the
 *     1st account's sync operation is always address discovery, account-state
 *     operations are chained onto the round by addressDiscoverySync's
 *     chainAccountStateOperations after a successful discovery.
 */
export const monolithCardanoSyncConfig: CardanoSyncEngineConfig<MonolithCardanoSyncRoundContext> =
  {
    trigger$: (
      { cardanoContext: { retrySyncRound$ } },
      {
        wallets: { selectActiveNetworkAccounts$ },
        addresses: { selectAllAddresses$ },
        cardanoContext: { selectTip$, selectChainId$ },
        failures: { selectAllFailures$ },
      },
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
      ]).pipe(
        map(
          ([
            accounts,
            cardanoAddresses,
            tip,
            chainId,
          ]): MonolithCardanoSyncRoundContext => ({
            accounts,
            chainId,
            accountsWithAddresses: new Set(
              cardanoAddresses.map(addr => addr.accountId),
            ),
            tipHash: tip?.hash,
          }),
        ),
      );

      // Manual retry trigger: extract failed account IDs from failures
      const manualRetryTrigger$ = retrySyncRound$.pipe(
        withLatestFrom(
          selectActiveNetworkAccounts$,
          selectAllAddresses$,
          selectTip$,
          chainId$,
          selectAllFailures$,
        ),
        map(
          ([
            _,
            allAccounts,
            allAddresses,
            tip,
            chainId,
            allFailures,
          ]): MonolithCardanoSyncRoundContext => {
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

            return {
              accounts: failedAccounts,
              chainId,
              accountsWithAddresses: new Set(
                cardanoAddresses.map(addr => addr.accountId),
              ),
              tipHash: tip?.hash,
            };
          },
        ),
        // Only emit if there are failed accounts to retry
        filter(context => context.accounts.length > 0),
      );

      // Merge natural and manual triggers
      return merge(naturalTrigger$, manualRetryTrigger$);
    },
    buildRoundOperations: (account, context) => {
      const hasAddresses = context.accountsWithAddresses.has(account.accountId);

      // Add account-state operations if the account already has addresses
      if (hasAddresses) {
        return syncAccountStateOperations({
          accountId: account.accountId,
          tipHash: context.tipHash,
        });
      }

      // Otherwise the 1st account's sync operation is always address discovery;
      // we start syncing other account state only when discovery completes at
      // least once. Account-state operations are chained onto the round by
      // addressDiscoverySync's chainAccountStateOperations after a successful
      // discovery, so we do not enqueue them here.
      const operations: SyncOperation[] = [
        {
          operationId: createSyncOperationId(
            account.accountId,
            context.tipHash,
            CardanoSyncOperationType.ADDRESS_DISCOVERY,
          ),
          status: 'Pending',
          description: 'sync.operation.address-discovery' as TranslationKey,
          startedAt: Timestamp(Date.now()),
        },
      ];
      return operations;
    },
  };
