import { map, merge, race, Subject, switchMap, throwError } from 'rxjs';

import { requestHWConnectionHook } from '../../addons/request-hw-connection-mobile';
import { HwConnectionCancelledError, HwSearchFailedError } from '../errors';

import type { ActionCreators, SideEffect } from '../..';
import type { ActionType } from '@lace-contract/module';

export const handleMobileConnectionRequest: SideEffect = (
  { hwConnectorMobile: { deviceSelected$, cancel$, errored$ } },
  _,
  { actions },
) => {
  const emittedActions$ = new Subject<ActionType<ActionCreators>>();
  return merge(
    emittedActions$.asObservable(),
    requestHWConnectionHook.onRequest(() => {
      emittedActions$.next(actions.hwConnectorMobile.connectionRequested());
      return race(
        deviceSelected$.pipe(map(a => a.payload.device)),
        cancel$.pipe(
          switchMap(() => throwError(() => new HwConnectionCancelledError())),
        ),
        errored$.pipe(
          switchMap(({ payload }) =>
            throwError(
              () => new HwSearchFailedError(payload.errorTranslationKey),
            ),
          ),
        ),
      );
    }),
  );
};
