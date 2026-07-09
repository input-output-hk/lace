import { emip3decrypt, emip3encrypt } from '@cardano-sdk/key-management';
import { PAUSE_NETWORK_POLLING_FEATURE_FLAG } from '@lace-contract/app-lock';
import { ByteArray, HexBytes } from '@lace-sdk/util';
import {
  catchError,
  distinctUntilChanged,
  EMPTY,
  filter,
  from,
  map,
  merge,
  mergeMap,
  of,
  pairwise,
  Subject,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs';

import { verifyAuthSecretHook } from '../addons/auth-secret-verifier';
import { appLockSetupHook } from '../addons/setup-app-lock';

import { isWalletActive$, walletResumed$ } from './observables';

import type { ActionCreators, SideEffect } from '../';
import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type { ActionType } from '@lace-contract/module';
import type { Observable } from 'rxjs';

const sentinelBytes = ByteArray.fromUTF8('Ada Lovelace');

type PrepareSentinel = (authSecret: AuthSecret) => Observable<HexBytes>;

// Extracting from(emip3encrypt(sentinelBytes, authSecret)) simplifies testing
//  of makeSetupAppLock
const prepareEncryptedSentinel: PrepareSentinel = authSecret =>
  from(emip3encrypt(sentinelBytes, authSecret)).pipe(
    map(ByteArray),
    map(HexBytes.fromByteArray),
  );

export const makeSetupAppLock =
  ({ prepareSentinel }: { prepareSentinel: PrepareSentinel }): SideEffect =>
  (
    _,
    { appLock: { isAwaitingSetup$, selectEncryptedSentinel$ } },
    { actions, logger, propagateAuthSecret },
  ) => {
    const emittedActions$ = new Subject<ActionType<ActionCreators>>();
    return merge(
      emittedActions$.asObservable(),
      appLockSetupHook.onRequest(authSecret =>
        isAwaitingSetup$.pipe(
          take(1),
          tap(isAwaitingSetup => {
            if (isAwaitingSetup) return;
            throw new Error(
              'App Lock setup state mismatch: app lock is not awaiting setup',
            );
          }),
          switchMap(() => prepareSentinel(authSecret)),
          tap(encryptedSentinel => {
            emittedActions$.next(
              actions.appLock.setEncryptedSentinel(encryptedSentinel),
            );
          }),
          switchMap(encryptedSentinel =>
            // Guard: make sure sentinel is set
            selectEncryptedSentinel$.pipe(
              filter(
                selectedEncryptedSentinel =>
                  selectedEncryptedSentinel === encryptedSentinel,
              ),
              take(1),
            ),
          ),
          tap(() => {
            propagateAuthSecret(authSecret);
            emittedActions$.next(actions.appLock.setupCompleted());
          }),
          map(() => true),
          catchError(error => {
            logger.error(error);
            return of(false);
          }),
        ),
      ),
    );
  };

export const verifyAuthSecret: SideEffect = (
  _,
  { appLock: { selectEncryptedSentinel$ } },
) =>
  verifyAuthSecretHook.onRequest(({ authSecret }) =>
    selectEncryptedSentinel$.pipe(
      take(1),
      switchMap(sentinel => {
        if (!sentinel) return of(false);
        return from(
          emip3decrypt(ByteArray.fromHex(sentinel), authSecret)
            .then(() => true)
            .catch(() => false),
        );
      }),
    ),
  );

export const closePopupsOnLock: SideEffect = (
  _,
  { appLock: { selectLockState$ }, views: { selectOpenViews$ } },
  { actions },
) =>
  selectLockState$.pipe(
    filter(lockState => lockState.status === 'Locked'),
    withLatestFrom(selectOpenViews$),
    mergeMap(([, views]) =>
      from(
        views
          .filter(view => view.type === 'popupWindow')
          .map(view => actions.views.closeView(view.id)),
      ),
    ),
  );

/**
 * Wires the `appLock.isWalletActive$` redux selector to the module-level
 * `isWalletActive$` observable, which is provided to other contracts as a
 * side effect dependency via `walletActiveStateDependencyContract`. See the
 * comment on `isWalletActive$` and ADR 25.
 */
export const wireIsWalletActiveObservable: SideEffect = (
  _,
  { appLock: { isWalletActive$: selectIsWalletActive$ } },
) =>
  selectIsWalletActive$.pipe(
    distinctUntilChanged(),
    tap(isActive => {
      isWalletActive$.next(isActive);
    }),
    switchMap(() => EMPTY),
  );

/**
 * Drives the module-level `walletResumed$` subject on each
 * `Unlocking → Unlocked` lock state transition — the only state-machine
 * path that represents resuming from a genuine pause
 * (`Preparing → AwaitingSetup` and `AwaitingSetup → Unlocked` are
 * first-run boot/setup, no pause to resume from). Exposed as a side
 * effect dependency via `walletActiveStateDependencyContract`.
 *
 * Gated by `PAUSE_NETWORK_POLLING_FEATURE_FLAG`, mirroring the flag-aware
 * semantics of `isWalletActive$` (see the slice's `isWalletActive`
 * selector). With the flag disabled `whileActive` never pauses periodic
 * work, so there is no pause to resume from and downstream consumers of
 * `walletResumed$` have nothing to recover. Firing the subject in that
 * case would re-run resume-driven cleanup against state that was never
 * paused.
 */
export const emitWalletResumedObservable: SideEffect = (
  _,
  { appLock: { selectLockState$ }, features: { selectLoadedFeatures$ } },
) =>
  selectLockState$.pipe(
    pairwise(),
    filter(
      ([previous, current]) =>
        previous.status === 'Unlocking' && current.status === 'Unlocked',
    ),
    withLatestFrom(selectLoadedFeatures$),
    filter(([, loaded]) =>
      loaded.featureFlags.some(
        flag => flag.key === PAUSE_NETWORK_POLLING_FEATURE_FLAG,
      ),
    ),
    tap(() => {
      walletResumed$.next();
    }),
    switchMap(() => EMPTY),
  );

export const sideEffects: SideEffect[] = [
  makeSetupAppLock({ prepareSentinel: prepareEncryptedSentinel }),
  verifyAuthSecret,
  closePopupsOnLock,
  wireIsWalletActiveObservable,
  emitWalletResumedObservable,
];
