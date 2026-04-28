import {
  concatMap,
  debounceTime,
  filter,
  map,
  merge,
  mergeMap,
  of,
  take,
  takeUntil,
  tap,
} from 'rxjs';

import { MIDNIGHT_AUTHORIZE_DAPP_LOCATION } from '../const';

import type { SideEffect } from '../index';

const authorizeDappViewLocation = `/${MIDNIGHT_AUTHORIZE_DAPP_LOCATION}`;

export const promptMidnightAuthorizeDapp: SideEffect = (
  {
    authorizeDapp,
    views: { viewConnected$, viewDisconnected$, locationChanged$ },
  },
  _,
  { actions, logger },
) =>
  authorizeDapp.start$.pipe(
    tap(({ payload }) => {
      logger.debug(
        '[promptMidnightAuthorizeDapp] authorizeDapp.start$ received:',
        payload.blockchainName,
        payload.dapp.origin,
      );
    }),
    filter(({ payload }) => payload.blockchainName === 'Midnight'),
    debounceTime(100),
    concatMap(({ payload: { dapp } }) =>
      merge(
        of(
          actions.views.openView({
            type: 'popupWindow',
            location: authorizeDappViewLocation,
          }),
        ),
        viewConnected$.pipe(
          filter(
            ({ payload }) => payload.location === authorizeDappViewLocation,
          ),
          take(1),
          mergeMap(({ payload: { id } }) =>
            merge(
              viewDisconnected$.pipe(filter(({ payload }) => payload === id)),
              locationChanged$.pipe(
                filter(
                  ({ payload }) =>
                    payload.viewId === id &&
                    payload.location !== authorizeDappViewLocation,
                ),
              ),
            ).pipe(
              map(() =>
                actions.authorizeDapp.completed({
                  authorized: false,
                  dapp,
                }),
              ),
              take(1),
              takeUntil(
                merge(authorizeDapp.completed$, authorizeDapp.failed$).pipe(
                  filter(({ payload }) => payload.dapp.id === dapp.id),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
