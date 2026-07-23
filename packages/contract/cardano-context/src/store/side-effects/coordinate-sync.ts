import { toEmpty } from '@cardano-sdk/util-rxjs';
import {
  concat,
  EMPTY,
  exhaustMap,
  filter,
  from,
  ignoreElements,
  map,
  race,
  take,
  timer,
  type Observable,
} from 'rxjs';

import type { SideEffect } from '../../contract';
import type { CardanoWalletAccount } from '../../util';
import type { Cardano } from '@cardano-sdk/core';
import type { SyncOperation, SyncOperationId } from '@lace-contract/sync';

const SYNC_ROUND_TIMEOUT_MS = 60_000; // 60 seconds

/**
 * Round context the engine reads to coordinate a sync round. The engine only
 * needs the accounts to dispatch for and the active chain to filter against;
 * everything else required to build the round's operations is carried in the
 * concrete `Ctx` and consumed by `buildRoundOperations`.
 */
export type CardanoSyncRoundContext = {
  accounts: CardanoWalletAccount[];
  chainId: Cardano.ChainId;
};

/**
 * Configuration injected into the coordinate-sync engine, parameterizing it
 * over the round model (ADR 12) without baking in the monolith's specifics:
 * - `trigger$` produces a round context per emission (natural + manual retry).
 * - `buildRoundOperations` is a PURE function of `(account, ctx)` returning the
 *   operations to enqueue for that account in the round.
 */
export type CardanoSyncEngineConfig<Context extends CardanoSyncRoundContext> = {
  // Parameters<SideEffect> = [actionObservables, stateObservables, dependencies].
  trigger$: (...args: Parameters<SideEffect>) => Observable<Context>;
  buildRoundOperations: (
    account: CardanoWalletAccount,
    context: Context,
  ) => SyncOperation[];
};

/**
 * Coordinates sync rounds for Cardano accounts.
 *
 * This side effect:
 * - Derives round contexts from the injected `config.trigger$`
 * - Creates coordinated sync rounds with operations via `config.buildRoundOperations`
 * - Ensures no new round starts while one is in progress
 * - Waits for operations to complete/fail/timeout before starting next round
 * - Only syncs accounts on the currently active chain
 */
export const createCoordinateCardanoSync =
  <Context extends CardanoSyncRoundContext>(
    config: CardanoSyncEngineConfig<Context>,
  ): SideEffect =>
  (actionObservables, stateObservables, dependencies) => {
    const {
      sync: { selectIsSyncOperationPending$ },
    } = stateObservables;
    const { actions } = dependencies;

    return config
      .trigger$(actionObservables, stateObservables, dependencies)
      .pipe(
        exhaustMap(context => {
          // Filter accounts to only include those on the currently active chain
          const accountsOnActiveChain = context.accounts.filter(
            account =>
              account.blockchainSpecific.chainId.networkMagic ===
              context.chainId.networkMagic,
          );

          // Process each account on the active chain and collect all actions
          const allActions = accountsOnActiveChain.flatMap(account =>
            config.buildRoundOperations(account, context).map(operation =>
              actions.sync.addSyncOperation({
                accountId: account.accountId,
                operation,
              }),
            ),
          );

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

          const waitForAnyPendingOperation$ =
            selectIsSyncOperationPending$.pipe(
              map(selectIsSyncOperationPending => {
                // Check if any of operations is pending
                return operationIds.some(opId =>
                  selectIsSyncOperationPending(opId),
                );
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
