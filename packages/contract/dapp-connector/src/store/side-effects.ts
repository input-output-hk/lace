import { isNotNil } from '@cardano-sdk/util';
import {
  concatMap,
  EMPTY,
  filter,
  firstValueFrom,
  ignoreElements,
  map,
  merge,
  mergeMap,
  of,
  take,
  tap,
  timer,
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
 * Window after a reject during which the same origin is auto-declined without
 * re-opening the connect prompt.
 *
 * Some dApps re-fire `enable()` immediately after the user rejects, which would
 * reopen the prompt right away (input-output-hk/lace-platform#2288). We can't
 * distinguish a genuine user retry from a dApp spamming requests, so we just
 * cool the origin off: within this window a repeat request is declined
 * silently; a request after it prompts again (the user can navigate away if
 * they don't want the dApp). 1s is enough to absorb a dApp that fires a couple
 * of requests in quick succession, without holding the origin off longer than
 * necessary.
 */
const REJECT_REPROMPT_COOLDOWN_MS = 1000;

/**
 * Handles the process of authorizing dapps using pluggable authenticators.
 * Kicks-off the process to add a dapp (optionally persist in wallet metadata) on success.
 *
 * The reject cooldown lives here (the shared layer) rather than in a single
 * connector so it covers every dApp connector — Cardano, Midnight, etc. — that
 * resolves through `authorizeDapp.start`/`completed`.
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
  ) => {
    // Origins currently in their post-reject cooldown window. Maintained by
    // `trackRejects$` (merged into the output so it lives for the side effect's
    // lifetime) and read when a new request is about to prompt. A plain Set is
    // enough: it's only mutated from these two co-located streams.
    const cooledDownOrigins = new Set<string>();

    const trackRejects$ = authorizeDapp.completed$.pipe(
      filter(({ payload }) => !payload.authorized),
      mergeMap(({ payload }) => {
        const { origin } = payload.dapp;
        cooledDownOrigins.add(origin);
        return timer(REJECT_REPROMPT_COOLDOWN_MS).pipe(
          tap(() => cooledDownOrigins.delete(origin)),
          ignoreElements(),
        );
      }),
    );

    const authorize$ = merge(
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
      concatMap(({ done, cancelled$, ...request }) => {
        // Recently rejected: decline without re-opening the prompt (#2288).
        if (cooledDownOrigins.has(request.dapp.origin)) {
          done(false);
          return EMPTY;
        }
        const cancelled = cancelled$ ?? EMPTY;

        // Probe synchronously and decline WITHOUT emitting start when already
        // cancelled: emitting start then dismissing via failed$ loses the race
        // (UIs subscribe to failed$ only after a debounced open; failed$ is hot).
        let isAlreadyCancelled = false;
        cancelled
          .pipe(take(1))
          .subscribe(() => {
            isAlreadyCancelled = true;
          })
          .unsubscribe();
        if (isAlreadyCancelled) {
          logger.warn(
            'Authorize dapp request cancelled before prompt: connection dropped',
            request.dapp.id,
          );
          done(false);
          return EMPTY;
        }

        return merge(
          of(actions.authorizeDapp.start(request)),
          // First of user-response / upstream-failure / connection-drop wins;
          // take(1) then advances the serialized queue. A drop also emits
          // failed (UIs dismiss); the rest resolve via the filtered sentinel.
          merge(
            authorizeDapp.completed$.pipe(
              filter(isSameDapp(request.dapp)),
              tap(({ payload: { authorized } }) => {
                done(authorized);
              }),
              map(() => undefined),
            ),
            authorizeDapp.failed$.pipe(
              filter(isSameDapp(request.dapp)),
              tap(({ payload: { reason } }) => {
                logger.warn('Authorize dapp request failed:', reason);
                done(false);
              }),
              map(() => undefined),
            ),
            cancelled.pipe(
              tap(() => {
                logger.warn(
                  'Authorize dapp request cancelled: connection dropped',
                  request.dapp.id,
                );
                done(false);
              }),
              map(() =>
                actions.authorizeDapp.failed({
                  dapp: request.dapp,
                  reason: 'connection dropped',
                }),
              ),
            ),
          ).pipe(take(1), filter(isNotNil)),
        );
      }),
    );

    return merge(trackRejects$, authorize$);
  };

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
