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
      ({ midnightSync: { resync$ } }, _, { actions, stopAllMidnightWallets }) =>
        resync$.pipe(
          withLatestFrom(midnightAccounts$),
          switchMap(([_, midnightAccounts]) =>
            stopAllMidnightWallets().pipe(
              switchMap(() => store.setAll([])),
              switchMap(() => [
                ...midnightAccounts.map(({ accountId }) =>
                  actions.tokens.resetAccountTokens({
                    accountId,
                  }),
                ),
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
    { stopMidnightWallet, actions },
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
            storage.getAll().pipe(
              defaultIfEmpty([]),
              take(1),
              switchMap(wallets => {
                const remainingWallets = wallets.filter(
                  wallet => wallet.walletId !== walletId,
                );
                return storage.setAll(remainingWallets);
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
                store.getAll().pipe(
                  // getAll completes without emitting on an empty collection.
                  defaultIfEmpty([]),
                  // Issue order is load-bearing: an already-issued persist write
                  // cannot be cancelled, so this wipe only wins by being issued
                  // later. An adapter that batches or coalesces writes breaks it.
                  switchMap(wallets =>
                    store.setAll(
                      wallets.filter(wallet => wallet.accountId !== accountId),
                    ),
                  ),
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
