import { FEATURE_FLAGS_CHANNEL } from '@lace-contract/dapp-connector';
import {
  authenticatorApiProperties,
  injectGlobal,
} from '@lace-sdk/dapp-connector';
import {
  consumeRemoteApi,
  RemoteApiPropertyType,
} from '@lace-sdk/extension-messaging';

import { APIError } from '../common/api-error';

import { createCardanoWalletApi } from './cardano-wallet-api';
import { CIP30_API_METHODS } from './const';
import {
  CARDANO_AUTHENTICATOR_API_CHANNEL,
  CARDANO_WALLET_API_CHANNEL,
} from './messaging';

import type { Cip30FullWalletApi, Cip30WalletApi } from './types';
import type { ErrorClass, Shutdown } from '@cardano-sdk/util';
import type {
  DappConnectorApi,
  FeatureFlagProbe,
  InjectDependencies,
} from '@lace-contract/dapp-connector';
import type { RemoteAuthenticator } from '@lace-sdk/dapp-connector';
import type { RemoteApiProperties } from '@lace-sdk/extension-messaging';

/**
 * Remote API properties configuration for CIP-30 wallet methods.
 * Maps each method name to its property type for extension messaging.
 *
 * This is used by consumeRemoteApi to create the proxy object that
 * communicates with the service worker.
 */
export const cardanoWalletApiProperties: RemoteApiProperties<Cip30FullWalletApi> =
  Object.fromEntries(
    CIP30_API_METHODS.map(name => [
      name,
      RemoteApiPropertyType.MethodReturningPromise,
    ]),
  ) as RemoteApiProperties<Cip30FullWalletApi>;

/**
 * Error classes that can be thrown by the Cardano wallet API.
 * Used by extension messaging to properly serialize/deserialize errors.
 */
export const cardanoWalletApiErrors: ErrorClass[] = [APIError];

/**
 * Injects the Cardano dApp connector into the page.
 *
 * This function is called from the injected script (MAIN world) to set up
 * `window.cardano.lace`.
 *
 * @param dependencies - Logger and runtime from webextension-polyfill
 */
const injectDappConnector = ({ logger, runtime }: InjectDependencies) => {
  const authenticator = consumeRemoteApi<RemoteAuthenticator>(
    {
      baseChannel: CARDANO_AUTHENTICATOR_API_CHANNEL,
      lazy: true,
      properties: authenticatorApiProperties,
    },
    { logger, runtime },
  );

  const walletApi = consumeRemoteApi<Cip30FullWalletApi & Shutdown>(
    {
      baseChannel: CARDANO_WALLET_API_CHANNEL,
      errorTypes: cardanoWalletApiErrors,
      lazy: true,
      properties: cardanoWalletApiProperties,
    },
    { logger, runtime },
  );

  // Query feature flags from the SW before calling
  // authenticator.requestAccess() to ensure the SW-side module is loaded.
  const featureFlagProbe = consumeRemoteApi<FeatureFlagProbe>(
    {
      baseChannel: FEATURE_FLAGS_CHANNEL,
      lazy: true,
      properties: {
        getFeatureFlags: RemoteApiPropertyType.MethodReturningPromise,
      },
    },
    { logger, runtime },
  );

  const wallet = createCardanoWalletApi(
    { name: 'lace' },
    { logger, authenticator, api: walletApi, featureFlagProbe },
  );

  injectGlobal(
    { namespace: 'cardano', walletName: 'lace', wallet },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    { logger, window: window as any },
  );
};

/**
 * Cardano dApp connector API addon.
 */
export const cardanoDappConnectorApi: DappConnectorApi<
  Cip30WalletApi | RemoteAuthenticator
> = {
  inject: injectDappConnector,
  proxy: [
    {
      baseChannel: CARDANO_WALLET_API_CHANNEL,
      properties: cardanoWalletApiProperties,
      errorTypes: cardanoWalletApiErrors,
    },
  ],
  authenticator: {
    baseChannelName: CARDANO_AUTHENTICATOR_API_CHANNEL,
    blockchainName: 'Cardano',
  },
};
