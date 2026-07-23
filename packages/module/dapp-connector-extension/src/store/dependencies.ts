import {
  AuthenticatorError,
  AuthenticatorErrorCode,
  DappId,
} from '@lace-contract/dapp-connector';
import { exposeAuthenticatorApi, senderOrigin } from '@lace-lib/dapp-connector';
import {
  BehaviorSubject,
  filter,
  firstValueFrom,
  map,
  mergeMap,
  Observable,
  Subject,
  take,
  tap,
} from 'rxjs';
import { runtime } from 'webextension-polyfill';

import { ExtensionConnectionContextId } from '../value-objects';

import type {
  AccessRequest,
  DappConnection,
  DappConnectorPlatformDependencies,
} from '@lace-contract/dapp-connector';
import type { LaceInitSync } from '@lace-contract/module';
import type { AuthenticatorApi } from '@lace-lib/dapp-connector';
import type {
  ChannelName,
  MinimalRuntime,
} from '@lace-lib/extension-messaging';
import type { BlockchainName } from '@lace-lib/util-store';
import type { Logger } from 'ts-log';

type ConnectAuthenticator = {
  dappConnected$: Subject<DappConnection>;
  dappDisconnected$: Subject<ReturnType<typeof ExtensionConnectionContextId>>;
  logger: Logger;
  runtime: MinimalRuntime;
};

const createConnectAuthenticator =
  ({
    dappConnected$,
    dappDisconnected$,
    logger,
    runtime,
  }: ConnectAuthenticator) =>
  ({
    baseChannelName,
    blockchainName,
    authorizedDapps$,
    hasAccounts,
  }: {
    baseChannelName: ChannelName;
    blockchainName: BlockchainName;
    authorizedDapps$: Observable<{ id: string }[]>;
    hasAccounts: () => Promise<boolean>;
  }) => {
    const emitDappConnected = (
      origin: string,
      tabId: number | undefined,
      frameId: number | undefined,
    ) => {
      if (tabId === undefined || frameId === undefined) {
        logger.warn('Missing required connection data for dapp connection');
        return;
      }

      dappConnected$.next({
        blockchainName,
        source: {
          url: origin,
          contextId: ExtensionConnectionContextId(tabId, frameId),
        },
      });
    };

    const assertHasAccounts = async () => {
      if (!(await hasAccounts())) {
        throw new AuthenticatorError(
          AuthenticatorErrorCode.NoWalletAvailable,
          `No wallet available for ${blockchainName}`,
        );
      }
    };

    return new Observable<AccessRequest>(subscriber => {
      // Connected ports (tab+frame) → connection epoch. cancelled$ compares the
      // captured epoch, not membership, so a refresh (reconnect under the same
      // contextId, new epoch) still cancels the stale queued request.
      const connectedContexts$ = new BehaviorSubject<
        Map<ReturnType<typeof ExtensionConnectionContextId>, number>
      >(new Map());
      let connectionEpoch = 0;
      // Returns the epoch the context is connected under, assigning a fresh one
      // if it is not currently tracked. A reconnect therefore never reuses a
      // prior request's captured epoch.
      const markConnected = (
        contextId: ReturnType<typeof ExtensionConnectionContextId>,
      ): number => {
        const existing = connectedContexts$.value.get(contextId);
        if (existing !== undefined) return existing;
        connectionEpoch += 1;
        const epoch = connectionEpoch;
        connectedContexts$.next(
          new Map(connectedContexts$.value).set(contextId, epoch),
        );
        return epoch;
      };
      const markDisconnected = (
        contextId: ReturnType<typeof ExtensionConnectionContextId>,
      ) => {
        if (!connectedContexts$.value.has(contextId)) return;
        const next = new Map(connectedContexts$.value);
        next.delete(contextId);
        connectedContexts$.next(next);
      };

      const authenticator: AuthenticatorApi = {
        haveAccess: async sender => {
          if (!(await hasAccounts())) return false;
          const origin = senderOrigin(sender);
          const authorizedDapps = await firstValueFrom(authorizedDapps$);
          return authorizedDapps.some(dapp => dapp.id === origin);
        },
        requestAccess: async sender => {
          // No haveAccess shortcut: each blockchain's side effect decides
          // auto-confirm vs UI and populates per-dapp session state.
          const dappOrigin = senderOrigin(sender) || '';
          if (!dappOrigin) throw new Error('Unknown dapp origin');

          // Capture the epoch BEFORE assertHasAccounts(): a disconnect during
          // the await must win. Capturing after would re-add the gone port under
          // a fresh epoch and mask the drop, wedging the queue. (See
          // AccessRequest.cancelled$.)
          const senderTabId = sender.tab?.id;
          const senderFrameId = sender.frameId;
          let cancelled$: Observable<void> | undefined;
          if (senderTabId !== undefined && senderFrameId !== undefined) {
            const contextId = ExtensionConnectionContextId(
              senderTabId,
              senderFrameId,
            );
            const epoch = markConnected(contextId);
            cancelled$ = connectedContexts$.pipe(
              filter(connected => connected.get(contextId) !== epoch),
              take(1),
              map(() => undefined),
            );
          }

          await assertHasAccounts();

          return new Promise(resolve => {
            subscriber.next({
              dapp: {
                id: DappId(dappOrigin),
                // There *might* be a bug when authenticator is called
                // before dapp title/image is available. It can be resolved
                // by querying up-to-date info via extension 'tabs' API.
                // However this approach would slow down dapp connector,
                // so it's best to avoid. Maybe fetch it only if undefined.
                name: sender.tab?.title || '',
                origin: dappOrigin,
                imageUrl: sender.tab?.favIconUrl || '',
              },
              windowId: sender.tab?.windowId,
              cancelled$,
              done: (granted: boolean) => {
                if (granted) {
                  emitDappConnected(dappOrigin, sender.tab?.id, sender.frameId);
                }
                resolve(granted);
              },
            });
          });
        },
      };

      let api: ReturnType<typeof exposeAuthenticatorApi>;
      let disconnectSubscription: ReturnType<
        typeof Observable.prototype.subscribe
      >;
      let connectSubscription: ReturnType<
        typeof Observable.prototype.subscribe
      >;

      try {
        api = exposeAuthenticatorApi(
          { baseChannel: baseChannelName },
          { authenticator, logger, runtime },
        );

        // Subscribe to port connections and emit connection events for authorized dapps
        connectSubscription = api.messenger.connect$
          .pipe(
            tap(port => {
              // Track every connected port (authorized or not) so a later
              // authorize request from it can detect its own disconnect.
              const tabId = port.sender?.tab?.id;
              const frameId = port.sender?.frameId;
              if (tabId !== undefined && frameId !== undefined) {
                markConnected(ExtensionConnectionContextId(tabId, frameId));
              }
            }),
            mergeMap(async port => {
              if (!port.sender) {
                logger.warn('Missing sender on port connect');
                return;
              }

              const tabId = port.sender.tab?.id;
              const frameId = port.sender.frameId;
              const origin = senderOrigin(port.sender);

              if (tabId === undefined || frameId === undefined || !origin) {
                logger.warn('Missing connection data on port connect', {
                  tabId,
                  frameId,
                  origin,
                });
                return;
              }

              const isAuthorized = await authenticator.haveAccess(port.sender);
              if (isAuthorized) {
                emitDappConnected(origin, tabId, frameId);
              }
            }),
          )
          .subscribe();

        // Subscribe to port disconnections and emit disconnection events
        disconnectSubscription = api.messenger.disconnect$
          .pipe(
            tap(({ disconnected }) => {
              const tabId = disconnected.sender?.tab?.id;
              const frameId = disconnected.sender?.frameId;
              if (tabId === undefined || frameId === undefined) {
                logger.warn('Missing required connection data on disconnect');
                return;
              }

              const contextId = ExtensionConnectionContextId(tabId, frameId);
              // Drop from the connected map so any request pending on this port
              // (active or still queued) cancels when it is next observed.
              markDisconnected(contextId);
              dappDisconnected$.next(contextId);
            }),
          )
          .subscribe();
      } catch (error) {
        logger.error('Failed to initialize authenticator', error);
        throw error;
      }

      return () => {
        connectSubscription?.unsubscribe();
        disconnectSubscription?.unsubscribe();
        connectedContexts$.complete();
        api?.shutdown();
      };
    });
  };

export const initializeSideEffectDependencies: LaceInitSync<
  DappConnectorPlatformDependencies
> = (_, { logger }) => {
  const dappConnected$ = new Subject<DappConnection>();

  const dappDisconnected$ = new Subject<
    ReturnType<typeof ExtensionConnectionContextId>
  >();

  return {
    connectAuthenticator: createConnectAuthenticator({
      dappConnected$,
      dappDisconnected$,
      logger,
      runtime,
    }),
    dappConnected$: dappConnected$.asObservable(),
    dappDisconnected$: dappDisconnected$.asObservable(),
  };
};
