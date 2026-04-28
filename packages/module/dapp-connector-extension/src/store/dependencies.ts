import {
  AuthenticatorError,
  AuthenticatorErrorCode,
  DappId,
} from '@lace-contract/dapp-connector';
import { exposeAuthenticatorApi, senderOrigin } from '@lace-sdk/dapp-connector';
import { firstValueFrom, Observable, Subject } from 'rxjs';
import { mergeMap, tap } from 'rxjs';
import { runtime } from 'webextension-polyfill';

import { ExtensionConnectionContextId } from '../value-objects';

import type {
  AccessRequest,
  DappConnection,
  DappConnectorPlatformDependencies,
} from '@lace-contract/dapp-connector';
import type { LaceInitSync } from '@lace-contract/module';
import type { BlockchainName } from '@lace-lib/util-store';
import type {
  AuthenticatorApi,
  RequestAccessOptions,
} from '@lace-sdk/dapp-connector';
import type {
  ChannelName,
  MinimalRuntime,
} from '@lace-sdk/extension-messaging';
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
      const authenticator: AuthenticatorApi = {
        haveAccess: async sender => {
          if (!(await hasAccounts())) return false;
          const origin = senderOrigin(sender);
          const authorizedDapps = await firstValueFrom(authorizedDapps$);
          return authorizedDapps.some(dapp => dapp.id === origin);
        },
        async requestAccess(sender, options?: RequestAccessOptions) {
          const dappOrigin = senderOrigin(sender) || '';
          if (!dappOrigin) throw new Error('Unknown dapp origin');

          if (!options?.forceReauth && (await this.haveAccess(sender))) {
            return true;
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

              dappDisconnected$.next(
                ExtensionConnectionContextId(tabId, frameId),
              );
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
