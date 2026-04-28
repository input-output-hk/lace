import { senderOrigin } from '@lace-sdk/dapp-connector';
import {
  exposeApi,
  RemoteApiPropertyType,
} from '@lace-sdk/extension-messaging';
import { ErrorCodes } from '@midnight-ntwrk/dapp-connector-api';
import { firstValueFrom, Observable, of } from 'rxjs';
// TODO: MOBILE hoist those side effect dependencies to extension-specific module
// This couples midnight module with web extension application
import { runtime } from 'webextension-polyfill';

import { APIError } from '../../api-error';
import { WalletApiMethodNames } from '../../const';
import {
  MIDNIGHT_SUPPORTED_NETWORKS_CHANNEL,
  WALLET_API_CHANNEL,
} from '../../messaging';
import { supportedNetworksChannelProperties } from '../../supported-network-ids-channel';

import { createConfirmationCallback } from './create-confirmation-callback';
import { MidnightDappConnectorApi } from './midnight-dapp-connector-api';

import type {
  ConfirmationRequest,
  RequestType,
} from './create-confirmation-callback';
import type { SupportedNetworkIdsChannel } from '../../supported-network-ids-channel';
import type {
  ExtendedDAppConnectorWalletAPI,
  WithSenderContext,
} from '../../types';
import type { AuthorizedDappsDataSlice } from '@lace-contract/dapp-connector';
import type {
  MidnightWalletsByAccountId,
  MidnightNetwork,
  MidnightSDKNetworkId,
} from '@lace-contract/midnight-context';
import type { RemoteApiProperties } from '@lace-sdk/extension-messaging';
import type { WithLogger } from '@lace-sdk/util';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { Runtime } from 'webextension-polyfill';

type ConnectMidnightDappConnectorParams<T> = {
  authorizedDapps$: Observable<AuthorizedDappsDataSlice>;
  handleRequests: <R extends RequestType>(
    request$: Observable<ConfirmationRequest<R>>,
  ) => Observable<T>;
  network$: Observable<MidnightNetwork>;
  wallets$: Observable<MidnightWalletsByAccountId>;
  supportedNetworksIds$: Observable<MidnightSDKNetworkId[]>;
  isUnlocked$: Observable<boolean>;
};

const ensureWalletUnlocked = async (isUnlocked$: Observable<boolean>) => {
  const isUnlocked = await firstValueFrom(isUnlocked$);
  if (isUnlocked) return;
  throw new APIError(
    ErrorCodes.Rejected,
    'Wallet is locked. Please unlock the wallet first.',
  );
};

const isAuthorizedRequest = (
  origin: string | null | undefined,
  midnightDappsOrigins?: string[],
) => origin && midnightDappsOrigins?.includes(origin);

export const handleRequestValidation = async (
  sender: Runtime.MessageSender | undefined,
  authorizedDapps$: Observable<AuthorizedDappsDataSlice>,
  isUnlocked$: Observable<boolean>,
) => {
  await ensureWalletUnlocked(isUnlocked$);
  const origin = sender && senderOrigin(sender);

  const authorizedDapps = await firstValueFrom(authorizedDapps$);
  const midnightDappsOrigins = authorizedDapps.Midnight?.map(
    data => data.dapp.origin,
  );

  if (!isAuthorizedRequest(origin, midnightDappsOrigins)) {
    throw new APIError(
      ErrorCodes.InvalidRequest,
      `Unauthorized request origin: ${origin}. Call midnight.{walletName}.enable() first`,
    );
  }
};

export const initializeMidnightDappConnectorSideEffectDependencies = ({
  logger,
}: WithLogger) => ({
  connectMidnightDappConnector: <T>({
    wallets$,
    authorizedDapps$,
    network$,
    handleRequests,
    supportedNetworksIds$,
    isUnlocked$,
  }: ConnectMidnightDappConnectorParams<T>): Observable<T> =>
    new Observable(_subscriber => {
      const walletApi: WithSenderContext<ConnectedAPI> =
        new MidnightDappConnectorApi({
          wallets$,
          network$,
          userConfirmTransaction: createConfirmationCallback(
            handleRequests,
            _subscriber,
          ),
          supportedNetworksIds$,
          isUnlocked$,
        });

      const api = exposeApi(
        {
          baseChannel: WALLET_API_CHANNEL,
          api$: of(walletApi),
          properties: Object.fromEntries(
            WalletApiMethodNames.map(methodName => [
              methodName,
              {
                propType: RemoteApiPropertyType.MethodReturningPromise,
                requestOptions:
                  'checkNetworkSupport' === methodName ||
                  'isLocked' === methodName
                    ? {}
                    : 'getNetworkId' === methodName
                    ? {
                        validate: async () => {
                          await ensureWalletUnlocked(isUnlocked$);
                        },
                      }
                    : {
                        validate: async (_, sender) =>
                          handleRequestValidation(
                            sender,
                            authorizedDapps$,
                            isUnlocked$,
                          ),
                        transform: ({ method, args }, sender) => {
                          if (!sender)
                            throw new APIError(
                              ErrorCodes.InternalError,
                              'Unknown sender',
                            );
                          return {
                            args: [...args, { sender }],
                            method,
                          };
                        },
                      },
              },
            ]),
          ) as RemoteApiProperties<ExtendedDAppConnectorWalletAPI>,
        },
        { logger, runtime },
      );

      const supportedNetworksChannel = exposeApi<SupportedNetworkIdsChannel>(
        {
          baseChannel: MIDNIGHT_SUPPORTED_NETWORKS_CHANNEL,
          api$: of({
            supportedNetworkIds$: supportedNetworksIds$,
          }),
          properties: supportedNetworksChannelProperties,
        },
        { logger, runtime },
      );

      return () => {
        logger.debug('Shutting down midnight dapp connector');
        api.shutdown();
        supportedNetworksChannel.shutdown();
      };
    }),
});
