import { isNotNil } from '@cardano-sdk/util';
import { toEmpty } from '@cardano-sdk/util-rxjs';
import {
  concatMap,
  EMPTY,
  filter,
  firstValueFrom,
  map,
  merge,
  of,
  take,
  takeUntil,
  tap,
} from 'rxjs';

import type { Dapp } from '../';
import type {
  ActionCreators,
  DappConnectorApiAuthenticator,
  Selectors,
} from '../contract';
import type { LaceInit, LaceSideEffect } from '@lace-contract/module';

type SideEffect = LaceSideEffect<Selectors, ActionCreators>;

const isSameDapp =
  <T extends { payload: { dapp: Dapp } }>(dapp: Dapp) =>
  ({ payload }: T) =>
    dapp.id === payload.dapp.id;

/**
 * Handles the process of authorizing dapps using pluggable authenticators.
 * Kicks-off the process to add a dapp (optionally persist in wallet metadata) on success
 */
export const createAuthorizeDappSideEffect =
  (authenticators: DappConnectorApiAuthenticator[]): SideEffect =>
  (
    { authorizeDapp },
    {
      dappConnector: { selectAuthorizedDapps$ },
      wallets: { selectActiveNetworkAccounts$ },
    },
    { connectAuthenticator, actions, logger },
  ) =>
    merge(
      ...authenticators.map(({ baseChannelName, blockchainName }) =>
        connectAuthenticator({
          baseChannelName,
          blockchainName,
          authorizedDapps$: selectAuthorizedDapps$.pipe(
            map(data => data[blockchainName]?.map(item => item.dapp) ?? []),
          ),
          hasAccounts: async () => {
            const accounts = await firstValueFrom(selectActiveNetworkAccounts$);
            return accounts.some(a => a.blockchainName === blockchainName);
          },
        }).pipe(map(request => ({ ...request, blockchainName }))),
      ),
    ).pipe(
      concatMap(({ done, ...request }) =>
        merge(
          of(actions.authorizeDapp.start(request)),
          authorizeDapp.completed$.pipe(
            filter(isSameDapp(request.dapp)),
            tap(({ payload: { authorized } }) => {
              done(authorized);
            }),
            take(1),
            toEmpty,
            takeUntil(
              authorizeDapp.failed$.pipe(
                filter(isSameDapp(request.dapp)),
                tap(({ payload: { reason } }) => {
                  logger.warn('Authorize dapp request failed:', reason);
                  done(false);
                }),
              ),
            ),
          ),
        ),
      ),
    );

export const trackConnectionsSideEffect: SideEffect = (
  _,
  __,
  { dappConnected$, dappDisconnected$, actions },
) => {
  if (!dappConnected$ || !dappDisconnected$) {
    return EMPTY;
  }

  return merge(
    dappConnected$.pipe(
      map(connection => actions.connectedDapps.dappConnected(connection)),
    ),
    dappDisconnected$.pipe(
      map(contextId => actions.connectedDapps.dappDisconnected(contextId)),
    ),
  );
};

export const initializeDappConnectorSideEffects: LaceInit<
  SideEffect[]
> = async ({ loadModules }) => {
  const dappConnectorApis = await loadModules('addons.dappConnectorApi');
  const authorizeDapp = createAuthorizeDappSideEffect(
    dappConnectorApis
      .map(({ authenticator }) => authenticator)
      .filter(isNotNil),
  );
  return [authorizeDapp, trackConnectionsSideEffect];
};
