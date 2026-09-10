import {
  debounceTime,
  filter,
  map,
  merge,
  mergeMap,
  of,
  race,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom,
} from 'rxjs';

import {
  BITCOIN_DAPP_CONNECT_LOCATION,
  BITCOIN_DAPP_CONNECT_SHEET_ROUTE,
} from '../const';

import { findTargetSidePanel } from './util';

import type { SideEffect } from '../index';
import type { AccountId } from '@lace-contract/wallet-repo';

const authorizeDappViewLocation = BITCOIN_DAPP_CONNECT_LOCATION;

/**
 * Drives the Bitcoin connect/authorize flow behind window.bitcoin.lace.enable().
 *
 * When the shared authorize job starts for a Bitcoin dApp it either auto-grants
 * (origin already authorized and exactly one Bitcoin account exists) or opens
 * the connect review so the user picks an account and authorizes or rejects.
 * The review is a side panel sheet when Lace is already open in the requesting
 * window and a popup window otherwise. On authorize it binds the picked account
 * to the authenticated sender origin and completes the job; a reject, a closed
 * popup or a dismissed sheet completes it unauthorized. A request the contract
 * drops closes the review without authorizing, since the job is already
 * resolved.
 *
 * The bound origin is always the authenticated sender's dapp.origin from the
 * start payload, never a value the confirming view supplies; only the account
 * is user-chosen.
 */
export const promptBitcoinAuthorizeDapp: SideEffect = (
  {
    authorizeDapp,
    bitcoinDappConnector: { confirmConnect$, rejectConnect$ },
    views: { viewConnected$, viewDisconnected$, locationChanged$ },
  },
  {
    dappConnector: { selectAuthorizedDapps$ },
    views: { selectOpenViews$ },
    wallets: { selectActiveNetworkAccounts$, selectAll$ },
  },
  { actions, logger },
) =>
  authorizeDapp.start$.pipe(
    tap(({ payload }) => {
      logger.debug(
        '[promptBitcoinAuthorizeDapp] authorizeDapp.start$ received:',
        payload.blockchainName,
        payload.dapp.origin,
      );
    }),
    filter(({ payload }) => payload.blockchainName === 'Bitcoin'),
    debounceTime(100),
    withLatestFrom(
      selectAuthorizedDapps$,
      selectActiveNetworkAccounts$,
      selectAll$,
    ),
    // switchMap, not concatMap: a fresh enable() must supersede a prompt that
    // can no longer resolve (the dApp disconnected mid-review), which concatMap
    // would queue behind it, hanging the dApp on reconnect. Safe because the
    // contract serializes starts, so a prompt still in use is never cancelled.
    switchMap(
      ([
        {
          payload: { dapp, windowId },
        },
        authorizedDapps,
        allAccounts,
        allWallets,
      ]) => {
        const isPersisted = (authorizedDapps.Bitcoin ?? []).some(
          data => data.dapp.origin === dapp.origin,
        );
        const bitcoinAccounts = allAccounts.filter(
          account => account.blockchainName === 'Bitcoin',
        );
        const autoGrantAccount =
          isPersisted && allWallets.length === 1 && bitcoinAccounts.length === 1
            ? bitcoinAccounts[0]
            : undefined;

        if (autoGrantAccount) {
          return of(
            actions.bitcoinDappConnector.setSessionAccountForOrigin({
              origin: dapp.origin,
              accountId: autoGrantAccount.accountId,
            }),
            actions.authorizeDapp.completed({
              authorized: true,
              dapp,
              blockchainName: 'Bitcoin',
            }),
          );
        }

        const stopAuthorizeDapp$ = merge(
          authorizeDapp.completed$,
          authorizeDapp.failed$,
        ).pipe(filter(({ payload }) => payload.dapp.id === dapp.id));

        const dropped$ = authorizeDapp.failed$.pipe(
          filter(({ payload }) => payload.dapp.id === dapp.id),
          take(1),
        );

        const grantActions = (accountId: AccountId) => [
          actions.bitcoinDappConnector.setSessionAccountForOrigin({
            origin: dapp.origin,
            accountId,
          }),
          actions.authorizeDapp.completed({
            authorized: true,
            dapp,
            blockchainName: 'Bitcoin',
          }),
        ];

        return selectOpenViews$.pipe(
          take(1),
          switchMap(openViews => {
            const targetSidePanel = findTargetSidePanel(openViews, windowId);

            if (targetSidePanel) {
              const sheetOutcome$ = race(
                confirmConnect$.pipe(
                  filter(({ payload }) => payload.dappId === dapp.id),
                  map(({ payload: { account } }) => ({
                    type: 'confirm' as const,
                    accountId: account.accountId,
                  })),
                ),
                rejectConnect$.pipe(map(() => ({ type: 'reject' as const }))),
                viewDisconnected$.pipe(
                  filter(({ payload }) => payload === targetSidePanel.id),
                  map(() => ({ type: 'reject' as const })),
                ),
              ).pipe(take(1));

              return merge(
                of(
                  actions.views.setActiveSheetPage({
                    route: BITCOIN_DAPP_CONNECT_SHEET_ROUTE,
                    params: {
                      dapp: {
                        icon: { type: 'uri', uri: dapp.imageUrl ?? '' },
                        name: dapp.name,
                        category: '',
                      },
                      dappOrigin: dapp.origin,
                    },
                    targetViewId: targetSidePanel.id,
                  }),
                ),
                // Dismiss the review of a dropped request; never authorize, the
                // contract already denied it. A merge sibling rather than an
                // outcome of the race below, whose takeUntil notifier would
                // otherwise complete the outcome before it could react.
                dropped$.pipe(
                  map(() => actions.views.setActiveSheetPage(null)),
                ),
                sheetOutcome$.pipe(
                  mergeMap(result => {
                    if (result.type === 'confirm') {
                      return [
                        actions.views.setActiveSheetPage(null),
                        ...grantActions(result.accountId),
                      ];
                    }
                    return [
                      actions.views.setActiveSheetPage(null),
                      actions.authorizeDapp.completed({
                        authorized: false,
                        dapp,
                      }),
                    ];
                  }),
                  takeUntil(stopAuthorizeDapp$),
                ),
              );
            }

            return merge(
              of(
                actions.views.openView({
                  type: 'popupWindow',
                  location: authorizeDappViewLocation,
                }),
              ),
              dropped$.pipe(
                switchMap(() =>
                  selectOpenViews$.pipe(
                    map(views =>
                      views.find(
                        view =>
                          view.type === 'popupWindow' &&
                          view.location === authorizeDappViewLocation,
                      ),
                    ),
                    filter(Boolean),
                    take(1),
                    map(view => actions.views.closeView(view.id)),
                  ),
                ),
              ),
              race(
                confirmConnect$.pipe(
                  filter(({ payload }) => payload.dappId === dapp.id),
                  take(1),
                  mergeMap(({ payload: { account } }) =>
                    grantActions(account.accountId),
                  ),
                ),
                rejectConnect$.pipe(
                  take(1),
                  map(() =>
                    actions.authorizeDapp.completed({
                      authorized: false,
                      dapp,
                    }),
                  ),
                ),
                viewConnected$.pipe(
                  filter(
                    ({ payload }) =>
                      payload.location === authorizeDappViewLocation,
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
          }),
        );
      },
    ),
  );
