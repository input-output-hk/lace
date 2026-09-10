import { FEATURE_FLAGS_CHANNEL } from '@lace-contract/dapp-connector';
import {
  authenticatorApiProperties,
  injectGlobal,
} from '@lace-lib/dapp-connector';
import {
  consumeRemoteApi,
  RemoteApiPropertyType,
} from '@lace-lib/extension-messaging';

import { BitcoinAPIError } from './api-error';
import { BitcoinDappWalletApi } from './bitcoin-wallet-api';
import { WALLET_ICON, WALLET_NAME, WalletApiMethodNames } from './const';
import {
  BITCOIN_AUTHENTICATOR_API_CHANNEL,
  BITCOIN_WALLET_API_CHANNEL,
} from './messaging';

import type { BitcoinWalletApi } from './types';
import type { ErrorClass } from '@cardano-sdk/util';
import type {
  DappConnectorApi,
  FeatureFlagProbe,
  InjectDependencies,
} from '@lace-contract/dapp-connector';
import type { RemoteAuthenticator } from '@lace-lib/dapp-connector';
import type { RemoteApiProperties } from '@lace-lib/extension-messaging';

/**
 * Remote API property table for the Bitcoin wallet API methods, generated
 * from WalletApiMethodNames so the channel configuration cannot drift from
 * the method list.
 */
export const bitcoinDappConnectorWalletApiProperties: RemoteApiProperties<BitcoinWalletApi> =
  Object.fromEntries(
    WalletApiMethodNames.map(name => [
      name,
      RemoteApiPropertyType.MethodReturningPromise,
    ]),
  ) as RemoteApiProperties<BitcoinWalletApi>;

/**
 * Error classes that must deserialize correctly across the extension
 * messaging boundary between the injected script and the service worker.
 */
export const bitcoinDappConnectorWalletApiErrors: ErrorClass[] = [
  BitcoinAPIError,
];

const injectDappConnector = ({ logger, runtime }: InjectDependencies) => {
  const authenticator = consumeRemoteApi(
    {
      baseChannel: BITCOIN_AUTHENTICATOR_API_CHANNEL,
      lazy: true,
      properties: authenticatorApiProperties,
    },
    { logger, runtime },
  );
  const walletApi = consumeRemoteApi<BitcoinWalletApi>(
    {
      baseChannel: BITCOIN_WALLET_API_CHANNEL,
      errorTypes: bitcoinDappConnectorWalletApiErrors,
      lazy: true,
      properties: bitcoinDappConnectorWalletApiProperties,
    },
    { logger, runtime },
  );

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

  const wallet = new BitcoinDappWalletApi(
    { name: WALLET_NAME, icon: WALLET_ICON },
    { logger, authenticator, api: walletApi, featureFlagProbe },
  );

  injectGlobal(
    {
      namespace: 'bitcoin',
      walletName: WALLET_NAME,
      wallet,
      rdns: 'io.lace.wallet',
    },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    { logger, window: window as any },
  );
};

/**
 * Addon contract implementation that lets content scripts auto-discover and
 * inject the Bitcoin wallet API into dApp pages, and proxy its channels
 * between the injected script and the service worker.
 */
export const dappConnectorApi: DappConnectorApi<
  BitcoinWalletApi | RemoteAuthenticator
> = {
  inject: injectDappConnector,
  proxy: [
    {
      baseChannel: BITCOIN_WALLET_API_CHANNEL,
      properties: bitcoinDappConnectorWalletApiProperties,
      errorTypes: bitcoinDappConnectorWalletApiErrors,
    },
  ],
  authenticator: {
    baseChannelName: BITCOIN_AUTHENTICATOR_API_CHANNEL,
    blockchainName: 'Bitcoin',
  },
};
