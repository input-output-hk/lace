import { emip3decrypt, emip3encrypt } from '@cardano-sdk/key-management';
import { ByteArray, HexBytes } from '@lace-sdk/util';
import {
  catchError,
  filter,
  from,
  map,
  merge,
  mergeMap,
  of,
  Subject,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs';

import { verifyAuthSecretHook } from '../addons/auth-secret-verifier';
import { appLockSetupHook } from '../addons/setup-app-lock';

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

export const sideEffects: SideEffect[] = [
  makeSetupAppLock({ prepareSentinel: prepareEncryptedSentinel }),
  verifyAuthSecret,
  closePopupsOnLock,
];
