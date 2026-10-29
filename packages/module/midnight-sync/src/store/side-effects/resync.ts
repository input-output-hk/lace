import { deepEquals } from '@cardano-sdk/util';
import {
  hasMidnightAccount,
  isInMemoryMidnightAccount,
  midnightAccounts$,
} from '@lace-contract/midnight-context';
import { Timestamp } from '@lace-lib/util';
import {
  catchError,
  concat,
  defaultIfEmpty,
  defer,
  distinctUntilChanged,
  EMPTY,
  exhaustMap,
  filter,
  forkJoin,
  from,
  groupBy,
  map,
  merge,
  mergeMap,
  of,
  switchMap,
  take,
  throwError,
  throwIfEmpty,
  withLatestFrom,
} from 'rxjs';

import type { ActionCreators, SideEffect } from '../../context';
import type {
  MidnightAccountId,
  MidnightAccountProps,
  SerializedMidnightWallet,
} from '@lace-contract/midnight-context';
import type { CollectionStorage } from '@lace-contract/storage';
import type {
  AccountId,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
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
              catchError((error: unknown) => {
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
                  catchError((error: unknown) => {
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
                catchError((error: unknown) => {
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
 * Stops one Midnight account's wallet, wipes that account's persisted SDK
 * state, then emits the actions that clear every redux cache the wiped state
 * fed. Scoped to a single account, unlike `createClearWalletStateOnResync`,
 * which wipes the whole chain.
 *
 * A step that errors or completes without emitting is handed to
 * `onStepFailure`: return an observable that emits to carry on with the next
 * step, or one that errors to abort the reset with that error.
 */
export const stopAndWipeAccountState$ = ({
  accountId,
  actions,
  store,
  stop$,
  onStepFailure,
}: {
  accountId: AccountId;
  actions: ActionCreators;
  store: CollectionStorage<SerializedMidnightWallet>;
  /** Halts the account's persistence and emits once it has. */
  stop$: Observable<unknown>;
  onStepFailure: (step: 'stop' | 'wipe', error: unknown) => Observable<unknown>;
}) =>
  // Stop the wallet (which halts persistence) BEFORE wiping storage, or an
  // in-flight throttled persist write could revive the cleared state.
  // Mirrors createDeleteWalletSideEffect.
  stop$.pipe(
    take(1),
    throwIfEmpty(
      () => new Error('Midnight account stop did not acknowledge completion'),
    ),
    catchError((error: unknown) => onStepFailure('stop', error)),
    switchMap(() =>
      // removeWhere, not read-then-setAll: it touches only the keys it names,
      // so it cannot delete another account's document.
      //
      // Issue order is load-bearing: an already-issued persist write cannot be
      // cancelled, so this wipe only wins by being issued later. An adapter
      // that batches or coalesces writes breaks it.
      store
        .removeWhere(wallet => wallet?.accountId === accountId)
        .pipe(
          throwIfEmpty(
            () =>
              new Error(
                'Midnight account storage wipe did not acknowledge completion',
              ),
          ),
          catchError((error: unknown) => onStepFailure('wipe', error)),
        ),
    ),
    mergeMap(() => [
      actions.addresses.resetAddresses({ accountId }),
      actions.tokens.resetAccountTokens({ accountId }),
      actions.activities.resetActivities({ accountId }),
      // Callers pass accounts from midnightAccounts$, so the id is a
      // MidnightAccountId (the dust caches' key type).
      actions.midnightContext.resetAccountDust({
        accountId: accountId as MidnightAccountId,
      }),
      actions.sync.resetAccountSyncStatus({ accountId }),
    ]),
  );

/**
 * The extension's per-account "reset sync state": stops and wipes the account,
 * then reloads the app so every engine restarts from empty state. Stop and wipe
 * failures are logged and the reset carries on, because the reload is what
 * recovers the account.
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
            return concat(
              stopAndWipeAccountState$({
                accountId,
                actions,
                store,
                stop$: stopMidnightWallet(accountId),
                // Both failures only log: the account is deregistered before
                // stop() can fail, so aborting would strand it until the user
                // retries, and stop() halts persistence before it can fail.
                onStepFailure: (step, error) => {
                  logger.error(
                    `Midnight reset sync state: ${step} failed`,
                    error,
                  );
                  return of(void 0);
                },
              }),
              of(actions.app.reloadApplication()),
            );
          }),
        ),
  );

/**
 * The headless per-account "reset sync state": stops and wipes the account,
 * then restarts that account's watcher in place, since a headless runtime has
 * no application to reload. The account's sync operation reads Pending while
 * the reset runs and Failed if a stop or wipe fails, so the caller can observe
 * the outcome and retry.
 */
export const createHeadlessResetSyncStateSideEffect = (
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
          groupBy(([{ payload }]) => payload.accountId),
          mergeMap(requests$ =>
            requests$.pipe(
              // exhaustMap: two wipes of one account must not overlap. A repeat
              // request while a stop hangs retries the stop below instead.
              exhaustMap(([{ payload }, midnightAccounts]) => {
                const account = midnightAccounts.find(
                  ({ accountId }) => accountId === payload.accountId,
                );
                if (!account) return EMPTY;

                const { accountId } = account;
                const pendingOperation = () =>
                  actions.sync.addSyncOperation({
                    accountId,
                    operation: {
                      operationId: `${accountId}-midnight-sync`,
                      status: 'Pending',
                      description: 'sync.operation.midnight-resync',
                      startedAt: Timestamp(Date.now()),
                    },
                  });
                // A fresh request can rescue a hung stop. Unsubscription does
                // not cancel its promise; stop halts persistence synchronously
                // before waiting for the facade. Each attempt must acknowledge
                // on its own, or an empty stop would wait for another request.
                const stop$ = merge(of(undefined), requests$).pipe(
                  switchMap(() =>
                    defer(() => stopMidnightWallet(accountId)).pipe(
                      throwIfEmpty(
                        () =>
                          new Error(
                            'Midnight account stop did not acknowledge completion',
                          ),
                      ),
                    ),
                  ),
                );
                return concat(
                  of(pendingOperation()),
                  stopAndWipeAccountState$({
                    accountId,
                    actions,
                    store,
                    stop$,
                    onStepFailure: (step, error) => {
                      logger.error(
                        `Midnight reset sync state: ${step} failed`,
                        error,
                      );
                      return throwError(() => error);
                    },
                  }),
                  // The reset cleared the account's sync status, Pending
                  // included, so it is re-registered for the restarted watch.
                  defer(() =>
                    of(
                      pendingOperation(),
                      actions.midnightSync.restartAccountWatch({ accountId }),
                    ),
                  ),
                ).pipe(
                  catchError((error: unknown) => {
                    logger.error('Midnight account resync failed', error);
                    const failedAt = Timestamp(Date.now());
                    return of(
                      actions.sync.addSyncOperation({
                        accountId,
                        operation: {
                          operationId: `${accountId}-midnight-sync`,
                          status: 'Failed',
                          description: 'sync.operation.midnight-resync',
                          error: 'sync.error.midnight-sync-failed',
                          startedAt: failedAt,
                          failedAt,
                        },
                      }),
                    );
                  }),
                );
              }),
            ),
          ),
        ),
  );
