import { deepEquals } from '@cardano-sdk/util';
import {
  hasMidnightAccount,
  isInMemoryMidnightAccount,
  midnightAccounts$,
} from '@lace-contract/midnight-context';
import { Timestamp } from '@lace-lib/util';
import {
  catchError,
  defaultIfEmpty,
  distinctUntilChanged,
  EMPTY,
  filter,
  forkJoin,
  from,
  map,
  merge,
  mergeMap,
  of,
  switchMap,
  take,
  withLatestFrom,
} from 'rxjs';

import type { SideEffect } from '../..';
import type {
  MidnightAccountId,
  MidnightAccountProps,
  SerializedMidnightWallet,
} from '@lace-contract/midnight-context';
import type { CollectionStorage } from '@lace-contract/storage';
import type { InMemoryWalletAccount } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

const withMidnightAccounts =
  (
    makeSideEffect: (
      accounts$: Observable<InMemoryWalletAccount<MidnightAccountProps>[]>,
    ) => SideEffect,
  ): SideEffect =>
  (actionObservables, stateObservables, dependencies) =>
    makeSideEffect(midnightAccounts$(stateObservables))(
      actionObservables,
      stateObservables,
      dependencies,
    );

export const requestResyncWallet = withMidnightAccounts(
  midnightAccount$ =>
    ({ midnightSync: { requestResync$ } }, _, { actions }) =>
      merge(
        requestResync$.pipe(
          withLatestFrom(midnightAccount$),
          switchMap(([_, accounts]) => {
            const syncActions = accounts.map(({ accountId }) =>
              actions.sync.addSyncOperation({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'Pending',
                  description: 'sync.operation.midnight-resync',
                  startedAt: Timestamp(Date.now()),
                },
              }),
            );

            return from([...syncActions, actions.midnightSync.resync()]);
          }),
        ),
      ),
);

export const createClearWalletStateOnResync = (
  store: CollectionStorage<SerializedMidnightWallet>,
): SideEffect =>
  withMidnightAccounts(
    midnightAccounts$ =>
      (
        { midnightSync: { resync$ } },
        _,
        { actions, stopAllMidnightWallets, logger },
      ) =>
        resync$.pipe(
          withLatestFrom(midnightAccounts$),
          switchMap(([_, midnightAccounts]) =>
            stopAllMidnightWallets().pipe(
              // Deregisters every wallet before stopping it, so a rejection
              // leaves them unreachable AND unrestarted. Log and continue —
              // the restart below is the only thing that brings sync back.
              catchError(error => {
                logger.error('Midnight resync: stop failed', error);
                return of(void 0);
              }),
              switchMap(() =>
                store.clear().pipe(
                  defaultIfEmpty(undefined),
                  // The wallets are already stopped, so the restart below must
                  // run even when the wipe fails — aborting would strand them
                  // stopped. A failed wipe leaves old state in place, which
                  // makes the resync a no-op rather than a corruption.
                  catchError(error => {
                    logger.error('Midnight resync: state wipe failed', error);
                    return of(undefined);
                  }),
                ),
              ),
              switchMap(() => [
                // Every derived store the wiped documents fed, matching
                // createResetSyncStateSideEffect. Dust in particular is
                // persisted and keyed on a deterministic account id, so a
                // stale balance would otherwise outlive the state it came from.
                //
                // Sync status is deliberately NOT reset: requestResyncWallet
                // registers a Pending operation immediately before dispatching
                // resync, and clearing it here would drop the very marker that
                // shows the resync running.
                ...midnightAccounts.flatMap(({ accountId }) => [
                  actions.addresses.resetAddresses({ accountId }),
                  actions.tokens.resetAccountTokens({ accountId }),
                  actions.activities.resetActivities({ accountId }),
                  actions.midnightContext.resetAccountDust({
                    accountId: accountId as MidnightAccountId,
                  }),
                ]),
                actions.midnightSync.restartWalletWatch(),
              ]),
            ),
          ),
        ),
  );

/**
 * Side-effect that triggers a Midnight wallet resync whenever the config change
 * is made with a feature flag override and the wallet is unlocked.
 */
export const resyncWalletOnConfigChangeFromFeatureFlags = withMidnightAccounts(
  midnightAccounts$ =>
    (
      _,
      {
        appLock: { isUnlocked$ },
        midnightContext: {
          selectCurrentNetwork$,
          selectNetworksConfigFeatureFlagsOverrides$,
        },
      },
      { actions },
    ) => {
      const configChangesCausedByFFUpdate$ =
        selectNetworksConfigFeatureFlagsOverrides$.pipe(
          withLatestFrom(isUnlocked$),
          filter(([_, isUnlocked]) => isUnlocked),
          switchMap(() => selectCurrentNetwork$.pipe(take(1))),
          map(({ config }) => config),
          distinctUntilChanged(deepEquals),
        );

      return configChangesCausedByFFUpdate$.pipe(
        withLatestFrom(midnightAccounts$),
        switchMap(([_, midnightAccounts]) =>
          from([
            ...midnightAccounts.map(({ accountId }) =>
              actions.sync.addSyncOperation({
                accountId,
                operation: {
                  operationId: `${accountId}-midnight-sync`,
                  status: 'Pending',
                  description: 'sync.operation.midnight-resync',
                  startedAt: Timestamp(Date.now()),
                },
              }),
            ),
            actions.midnightSync.resync(),
          ]),
        ),
      );
    },
);

export const createDeleteWalletSideEffect =
  (storage: CollectionStorage<SerializedMidnightWallet>): SideEffect =>
  (
    { wallets: { removeWallet$ } },
    { wallets: { selectAll$ } },
    { stopMidnightWallet, actions, logger },
  ) =>
    removeWallet$.pipe(
      withLatestFrom(
        selectAll$.pipe(map(wallets => wallets.filter(hasMidnightAccount))),
      ),
      switchMap(([{ payload }, midnightWallets]) => {
        const walletId =
          typeof payload === 'string' ? payload : payload.walletId;

        const targetWallet = midnightWallets.find(w => w.walletId === walletId);
        if (!targetWallet) return EMPTY;

        const allMidnightAccounts = targetWallet.accounts.filter(
          isInMemoryMidnightAccount,
        );

        const stopWallets$ =
          allMidnightAccounts.length > 0
            ? forkJoin(
                allMidnightAccounts.map(({ accountId }) =>
                  stopMidnightWallet(accountId),
                ),
              )
            : of([]);

        return stopWallets$.pipe(
          switchMap(() =>
            storage
              .removeWhere(wallet => wallet.walletId === walletId)
              .pipe(
                defaultIfEmpty(undefined),
                // The wallet is already gone from the repo, so the resets below
                // must still run; and an uncaught throw here would error the
                // merged root epic, stopping every side effect app-wide.
                catchError(error => {
                  logger.error(
                    'Midnight delete wallet: state wipe failed',
                    error,
                  );
                  return of(undefined);
                }),
              ),
          ),
          mergeMap(() =>
            allMidnightAccounts.flatMap(({ accountId }) => [
              actions.addresses.resetAddresses({
                accountId,
              }),
              actions.tokens.resetAccountTokens({
                accountId,
              }),
              actions.activities.resetActivities({
                accountId,
              }),
            ]),
          ),
        );
      }),
    );

/**
 * Per-account "reset sync state": clears one Midnight account's persisted SDK
 * wallet state plus its sync-derived redux caches, then reloads the app so the
 * SDK re-initialises from scratch. Scoped to a single account, unlike
 * `createClearWalletStateOnResync`, which wipes the whole chain.
 *
 * The reload is emitted LAST, after the storage write settles: sequencing it
 * inside this chain (rather than firing it from a separate UI tap) is what stops
 * a hard reload from preempting the wipe and leaving the old SDK document to
 * restore from.
 */
export const createResetSyncStateSideEffect = (
  store: CollectionStorage<SerializedMidnightWallet>,
): SideEffect =>
  withMidnightAccounts(
    midnightAccounts$ =>
      (
        { midnightContext: { resetSyncState$ } },
        _,
        { actions, stopMidnightWallet, logger },
      ) =>
        resetSyncState$.pipe(
          withLatestFrom(midnightAccounts$),
          // switchMap, not exhaustMap: if stop() hangs — the wedged-wallet case this
          // control exists to rescue — exhaustMap would ignore every later reset for
          // the session, while a repeat press supersedes it and skips the hung stop.
          switchMap(([{ payload }, midnightAccounts]) => {
            const account = midnightAccounts.find(
              ({ accountId }) => accountId === payload.accountId,
            );
            if (!account) return EMPTY;

            const { accountId } = account;
            // Stop the wallet (which halts persistence) BEFORE wiping storage,
            // or an in-flight throttled persist write could revive the cleared
            // state. Mirrors createDeleteWalletSideEffect.
            return stopMidnightWallet(accountId).pipe(
              // Both failures below only log: the account is deregistered before
              // stop() can fail, so aborting would strand it until the user
              // retries, and stop() halts persistence before it can fail anyway.
              catchError(error => {
                logger.error('Midnight reset sync state: stop failed', error);
                return of(void 0);
              }),
              switchMap(() =>
                // removeWhere, not read-then-setAll: it touches only the keys it
                // names, so it cannot delete another account's document. A read
                // failure now propagates and is caught below, rather than
                // reading as an empty collection.
                //
                // Issue order is load-bearing: an already-issued persist write
                // cannot be cancelled, so this wipe only wins by being issued
                // later. An adapter that batches or coalesces writes breaks it.
                store
                  .removeWhere(wallet => wallet.accountId === accountId)
                  .pipe(
                    defaultIfEmpty(undefined),
                    catchError(error => {
                      logger.error(
                        'Midnight reset sync state: wipe failed',
                        error,
                      );
                      return of(void 0);
                    }),
                  ),
              ),
              mergeMap(() => [
                actions.addresses.resetAddresses({ accountId }),
                actions.tokens.resetAccountTokens({ accountId }),
                actions.activities.resetActivities({ accountId }),
                // Guaranteed a Midnight account by withMidnightAccounts, so its
                // id is a MidnightAccountId (the dust caches' key type).
                actions.midnightContext.resetAccountDust({
                  accountId: accountId as MidnightAccountId,
                }),
                actions.sync.resetAccountSyncStatus({ accountId }),
                actions.app.reloadApplication(),
              ]),
            );
          }),
        ),
  );
