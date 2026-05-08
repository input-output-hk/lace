import { firstStateOfStatus } from '@lace-lib/util-store';
import {
  NEVER,
  combineLatest,
  debounce,
  filter,
  map,
  merge,
  of,
  pairwise,
  switchMap,
  timer,
  withLatestFrom,
} from 'rxjs';

import {
  DEFAULT_INACTIVITY_TIMEOUT_MS,
  INDEFINITE_INACTIVITY_TIMEOUT_MS,
} from '../const';
import { initialiseActivityChannel } from '../report-activity-channel';

import type { SideEffect } from '../contract';
import type { LaceInit } from '@lace-contract/module';
import type { Milliseconds } from '@lace-sdk/util';
import type { Observable } from 'rxjs';

export const preparing: SideEffect = (
  _,
  { appLock: { selectLockState$, selectEncryptedSentinel$ } },
  { actions },
) =>
  firstStateOfStatus(selectLockState$, 'Preparing').pipe(
    withLatestFrom(selectEncryptedSentinel$),
    map(([_, sentinel]) =>
      !sentinel
        ? actions.appLock.initialSetupRequired()
        : actions.appLock.noSetupRequired(),
    ),
  );

export const resetOnLastWalletRemoved: SideEffect = (
  _,
  { wallets: { selectTotal$, selectIsWalletRepoMigrating$ } },
  { actions },
) =>
  selectTotal$.pipe(
    pairwise(),
    withLatestFrom(selectIsWalletRepoMigrating$),
    filter(
      ([[previousWalletsCount, currentWalletsCount], isWalletRepoMigrating]) =>
        previousWalletsCount === 1 &&
        currentWalletsCount === 0 &&
        !isWalletRepoMigrating,
    ),
    switchMap(() => [
      actions.appLock.reset(),
      actions.authenticationPrompt.setDeviceAuthReady({
        deviceAuthReady: false,
      }),
    ]),
  );

export const startUnlocking: SideEffect = (
  _,
  { appLock: { selectLockState$ } },
  { actions, authenticate, logger },
) =>
  firstStateOfStatus(selectLockState$, 'Locked').pipe(
    switchMap(() =>
      merge(
        of(actions.appLock.startUnlocking()),
        authenticate({
          purpose: 'wallet-unlock',
          cancellable: false,
          message: 'authentication-prompt.message.wallet-lock',
          confirmButtonLabel: 'authentication-prompt.confirm-button-label',
        }).pipe(
          filter(success => {
            if (!success) {
              logger.error(
                'Authentication of the App Lock should not be possible to be closed',
              );
            }
            return success;
          }),
          map(() => actions.appLock.unlockingSucceeded()),
        ),
      ),
    ),
  );

export const makeLockAfterInactivityTimeout =
  (
    activity$: Observable<void>,
    defaultInactivityTimeoutMs: ReturnType<
      typeof Milliseconds
    > = DEFAULT_INACTIVITY_TIMEOUT_MS,
  ): SideEffect =>
  (_, { appLock: { isUnlocked$, selectInactivityTimeout$ } }, { actions }) =>
    isUnlocked$.pipe(
      switchMap(isUnlocked =>
        combineLatest([
          merge(activity$, of(void 0)),
          selectInactivityTimeout$,
        ]).pipe(
          filter(() => isUnlocked),
          debounce(([, storedTimeoutMs]) => {
            const timeoutMs = storedTimeoutMs ?? defaultInactivityTimeoutMs;
            return timeoutMs === INDEFINITE_INACTIVITY_TIMEOUT_MS
              ? NEVER
              : timer(timeoutMs);
          }),
          map(() => actions.appLock.locked()),
        ),
      ),
    );

export const initializeAppLockSideEffects: LaceInit<SideEffect[]> = async ({
  loadModules,
}) => {
  const [activityChannel] = await loadModules('addons.loadActivityChannel');
  const { activity$ } = initialiseActivityChannel({
    exposeChannel: activityChannel?.exposeActivityChannel,
  });

  return [
    preparing,
    resetOnLastWalletRemoved,
    startUnlocking,
    makeLockAfterInactivityTimeout(
      activity$,
      activityChannel?.defaultInactivityTimeoutMs,
    ),
  ];
};
