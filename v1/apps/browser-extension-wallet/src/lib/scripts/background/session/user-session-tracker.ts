import { Milliseconds } from '@cardano-sdk/core';
import {
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  filter,
  map,
  merge,
  Observable,
  share,
  startWith,
  switchMap,
  timer,
  Timestamp
} from 'rxjs';

export type UserSessionStatus = {
  isSessionActive: boolean;
  isLacePopupOpen: boolean;
  isLaceTabActive: boolean;
  lastDappConnectorActivityAt: Timestamp<void>;
};

export const createUserSessionTracker = (
  isLacePopupOpen$: Observable<boolean>,
  isLaceTabActive$: Observable<boolean>,
  dAppConnectorActivity$: Observable<void>,
  timeout: Milliseconds
): Observable<boolean> => {
  const sharedDappConnectorActivity$ = dAppConnectorActivity$.pipe(share());
  const isAnyUiActive$ = combineLatest([isLacePopupOpen$, isLaceTabActive$]).pipe(
    map(([isLacePopupOpen, isLaceTabActive]) => isLacePopupOpen || isLaceTabActive),
    distinctUntilChanged(),
    share()
  );
  const on$ = merge(isAnyUiActive$.pipe(filter(Boolean)), sharedDappConnectorActivity$.pipe(map(() => true)));
  const off$ = isAnyUiActive$.pipe(
    switchMap((isAnyUiActive) => {
      if (isAnyUiActive) {
        // never go inactive while any UI is active
        return EMPTY;
      }
      return sharedDappConnectorActivity$.pipe(
        startWith(void 0),
        switchMap(() => timer(timeout)),
        map(() => false)
      );
    })
  );

  return merge(on$, off$).pipe(startWith(false), distinctUntilChanged());
};
