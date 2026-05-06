import { firstStateOfStatus } from '@lace-lib/util-store';
import { Milliseconds } from '@lace-sdk/util';
import {
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
  FEATURE_FLAG_APP_LOCK_INACTIVITY_TIMEOUT,
} from '../const';
import { initialiseActivityChannel } from '../report-activity-channel';

import type { SideEffect } from '../contract';
import type { FeatureFlag } from '@lace-contract/feature';
import type { LaceInit } from '@lace-contract/module';
import type { Observable } from 'rxjs';

export type AppLockInactivityTimeoutPayload = {
  timeoutMs?: number;
};

const getInactivityTimeout = (featureFlags: FeatureFlag[]) => {
  const flag = featureFlags.find(
    f => f.key === FEATURE_FLAG_APP_LOCK_INACTIVITY_TIMEOUT,
  ) as FeatureFlag<AppLockInactivityTimeoutPayload> | undefined;

  const timeoutMs = flag?.payload?.timeoutMs;
  if (typeof timeoutMs === 'number' && timeoutMs > 0) {
    return Milliseconds(timeoutMs);
  }
  return DEFAULT_INACTIVITY_TIMEOUT_MS;
};

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
  (activity$: Observable<void>): SideEffect =>
  (
    _,
    { appLock: { isUnlocked$ }, features: { selectLoadedFeatures$ } },
    { actions },
  ) =>
    isUnlocked$.pipe(
      switchMap(isUnlocked =>
        combineLatest([
          merge(activity$, of(void 0)),
          selectLoadedFeatures$,
        ]).pipe(
          filter(() => isUnlocked),
          debounce(([, { featureFlags }]) =>
            timer(getInactivityTimeout(featureFlags)),
          ),
          map(() => actions.appLock.locked()),
        ),
      ),
    );

export const initializeAppLockSideEffects: LaceInit<SideEffect[]> = async ({
  loadModules,
}) => {
  const [activityChannelExtension] = await loadModules(
    'addons.loadActivityChannelExtension',
  );
  const { activity$ } = initialiseActivityChannel({
    exposeChannel: activityChannelExtension?.exposeActivityChannel,
  });

  return [
    preparing,
    resetOnLastWalletRemoved,
    startUnlocking,
    makeLockAfterInactivityTimeout(activity$),
  ];
};
