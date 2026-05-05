import { WalletType } from '@lace-contract/wallet-repo';
import {
  EMPTY,
  catchError,
  filter,
  from,
  mergeMap,
  of,
  take,
  withLatestFrom,
} from 'rxjs';

import { initialiseSetupAuthenticationChannel } from '../setup-authentication-channel';

import { deleteLmpWalletsBackup } from './v1-data/extension-storage';
import { preparePreloadedState } from './v1-data/prepare-preloaded-state';

import type { SideEffect } from '..';
import type { OnSetupAuthentication } from '../setup-authentication-channel';
import type { SetupAppLock } from '@lace-contract/app-lock';
import type { LaceInit } from '@lace-contract/module';
import type { InMemoryWallet } from '@lace-contract/wallet-repo';

export const deleteWalletSideEffect: SideEffect = (
  { migrateV1: { walletDeleted$ } },
  { wallets: { selectWalletById$ } },
  { actions },
) =>
  walletDeleted$.pipe(
    withLatestFrom(selectWalletById$),
    mergeMap(([{ payload: walletId }, selectWalletById]) => {
      const wallet = selectWalletById(walletId);
      if (!wallet) return EMPTY;
      const accountIds = wallet.accounts.map(a => a.accountId);
      return of(actions.wallets.removeWallet(walletId, accountIds));
    }),
  );

export const cleanupOnCompletionSideEffect: SideEffect = (
  _actionObservables,
  { migrateV1: { selectPasswordMigrationStatus$ } },
  { actions },
) =>
  selectPasswordMigrationStatus$.pipe(
    filter(status => status === 'completed'),
    take(1),
    mergeMap(() =>
      from(deleteLmpWalletsBackup()).pipe(
        mergeMap(() => of(actions.wallets.setIsWalletRepoMigrating(false))),
      ),
    ),
  );

/**
 * Resets the wizard from V1 source when the user closes and reopens the tab
 * mid-migration. The service worker stays alive across this, so the boot-time
 * migration state read is not re-run.
 *
 * Skips the restart on the very first mount of a fresh service worker session
 * because at that point the slice was populated by preparePreloadedState and
 * matches V1 source already. The discriminator is whether the user has
 * touched anything yet: status pending with the full pending list intact
 * means a fresh boot, anything else means a real reopen.
 */
export const wizardMountedSideEffect: SideEffect = (
  { migrateV1: { wizardMounted$ } },
  {
    migrateV1: {
      selectPasswordMigrationStatus$,
      selectWalletsPendingActivation$,
      selectInitialWalletCount$,
    },
    wallets: { selectAll$ },
  },
  { actions },
) =>
  wizardMounted$.pipe(
    withLatestFrom(
      selectPasswordMigrationStatus$,
      selectWalletsPendingActivation$,
      selectInitialWalletCount$,
      selectAll$,
    ),
    filter(([_action, status, pending, initialCount]) => {
      const isFreshFirstMount =
        status === 'pending' && pending.length === initialCount;
      return !isFreshFirstMount;
    }),
    mergeMap(([_action, _status, _pending, _initial, currentWallets]) =>
      from(preparePreloadedState()).pipe(
        mergeMap(({ state }) => {
          const walletsState = state.wallets as
            | { entities: Record<string, InMemoryWallet>; ids: string[] }
            | undefined;
          const orderedIds = walletsState?.ids ?? [];
          const freshWallets = orderedIds
            .map(id => walletsState?.entities[id])
            .filter((w): w is InMemoryWallet => !!w);
          const freshInMemoryIds = freshWallets
            .filter(w => w.type === WalletType.InMemory)
            .map(w => w.walletId);
          return of(
            ...currentWallets.map(w =>
              actions.wallets.removeWallet(
                w.walletId,
                w.accounts.map(a => a.accountId),
              ),
            ),
            ...freshWallets.map(w => actions.wallets.addWallet(w)),
            actions.migrateV1.passwordMigrationDetected(freshInMemoryIds),
            actions.appLock.reset(),
          );
        }),
        catchError(() => EMPTY),
      ),
    ),
  );

export const makeHandleAuthenticationSetup =
  ({
    onSetupAuthentication,
    setupAppLock,
  }: {
    onSetupAuthentication: OnSetupAuthentication;
    setupAppLock: SetupAppLock;
  }): SideEffect =>
  () =>
    onSetupAuthentication(authSecret => setupAppLock(authSecret));

export const initializeSideEffects: LaceInit<SideEffect[]> = async (
  { loadModules },
  { logger },
) => {
  const { onSetupAuthentication } = initialiseSetupAuthenticationChannel({
    logger,
  });
  const [setupAppLock] = await loadModules('addons.loadSetupAppLock');

  if (!setupAppLock) {
    throw new Error('setupAppLock is not available');
  }

  return [
    deleteWalletSideEffect,
    cleanupOnCompletionSideEffect,
    wizardMountedSideEffect,
    makeHandleAuthenticationSetup({
      onSetupAuthentication,
      setupAppLock,
    }),
  ];
};
