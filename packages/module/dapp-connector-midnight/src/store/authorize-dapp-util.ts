import {
  concatMap,
  debounceTime,
  filter,
  map,
  merge,
  mergeMap,
  of,
  race,
  take,
  takeUntil,
  tap,
  withLatestFrom,
} from 'rxjs';

import { MIDNIGHT_AUTHORIZE_DAPP_LOCATION } from '../const';

import type { SideEffect } from '../index';

const authorizeDappViewLocation = `/${MIDNIGHT_AUTHORIZE_DAPP_LOCATION}`;

export const promptMidnightAuthorizeDapp: SideEffect = (
  {
    authorizeDapp,
    midnightDappConnector: { confirmConnect$ },
    views: { viewConnected$, viewDisconnected$, locationChanged$ },
  },
  {
    dappConnector: { selectAuthorizedDapps$ },
    wallets: { selectActiveNetworkAccounts$, selectAll$ },
  },
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
    withLatestFrom(
      selectAuthorizedDapps$,
      selectActiveNetworkAccounts$,
      selectAll$,
    ),
    concatMap(
      ([
        {
          payload: { dapp },
        },
        authorizedDapps,
        allAccounts,
        allWallets,
      ]) => {
        const isPersisted = (authorizedDapps.Midnight ?? []).some(
          data => data.dapp.origin === dapp.origin,
        );
        const midnightAccounts = allAccounts.filter(
          account => account.blockchainName === 'Midnight',
        );
        // Auto-grant only with exactly 1 wallet and 1 Midnight account for a
        // persisted dapp; otherwise the user must pick which account to connect.
        const autoGrantAccount =
          isPersisted &&
          allWallets.length === 1 &&
          midnightAccounts.length === 1
            ? midnightAccounts[0]
            : undefined;

        if (autoGrantAccount) {
          return of(
            actions.midnightDappConnector.setSessionAccountForOrigin({
              origin: dapp.origin,
              accountId: autoGrantAccount.accountId,
            }),
            actions.authorizeDapp.completed({
              authorized: true,
              dapp,
              blockchainName: 'Midnight',
            }),
          );
        }

        const stopAuthorizeDapp$ = merge(
          authorizeDapp.completed$,
          authorizeDapp.failed$,
        ).pipe(filter(({ payload }) => payload.dapp.id === dapp.id));

        return merge(
          of(
            actions.views.openView({
              type: 'popupWindow',
              location: authorizeDappViewLocation,
            }),
          ),
          // race subscribes to both sources immediately, so an Authorize click
          // is not lost if it lands before the popup view connects, and the
          // first emitter wins -- listing confirm first lets it take priority
          // over a simultaneous popup close. confirm is matched on dappId so a
          // stale confirmConnect from another flow cannot complete this one.
          race(
            confirmConnect$.pipe(
              filter(({ payload }) => payload.dappId === dapp.id),
              take(1),
              mergeMap(({ payload: { account } }) => [
                actions.midnightDappConnector.setSessionAccountForOrigin({
                  origin: dapp.origin,
                  accountId: account.accountId,
                }),
                actions.authorizeDapp.completed({
                  authorized: true,
                  dapp,
                  blockchainName: 'Midnight',
                }),
              ]),
            ),
            viewConnected$.pipe(
              filter(
                ({ payload }) => payload.location === authorizeDappViewLocation,
              ),
              take(1),
              mergeMap(({ payload: { id } }) =>
                merge(
                  viewDisconnected$.pipe(
                    filter(({ payload }) => payload === id),
                  ),
                  locationChanged$.pipe(
                    filter(
                      ({ payload }) =>
                        payload.viewId === id &&
                        payload.location !== authorizeDappViewLocation,
                    ),
                  ),
                ).pipe(
                  take(1),
                  map(() =>
                    actions.authorizeDapp.completed({
                      authorized: false,
                      dapp,
                    }),
                  ),
                ),
              ),
            ),
          ).pipe(takeUntil(stopAuthorizeDapp$)),
        );
      },
    ),
  );
