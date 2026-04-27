import { FEATURE_FLAGS_CHANNEL } from '@lace-contract/dapp-connector';
import {
  authenticatorApiProperties,
  injectGlobal,
} from '@lace-sdk/dapp-connector';
import {
  consumeRemoteApi,
  RemoteApiPropertyType,
} from '@lace-sdk/extension-messaging';
import { v4 as uuidv4 } from 'uuid';

import { APIError } from './api-error';
import { WALLET_ICON, WalletApiMethodNames } from './const';
import {
  AUTHENTICATOR_API_CHANNEL,
  MIDNIGHT_SUPPORTED_NETWORKS_CHANNEL,
  WALLET_API_CHANNEL,
} from './messaging';
import { MidnightWalletApi } from './midnight-wallet-api';
import { supportedNetworksChannelProperties } from './supported-network-ids-channel';

import type { ExtendedDAppConnectorWalletAPI } from './types';
import type { ErrorClass, Shutdown } from '@cardano-sdk/util';
import type {
  DappConnectorApi,
  FeatureFlagProbe,
  InjectDependencies,
} from '@lace-contract/dapp-connector';
import type { RemoteAuthenticator } from '@lace-sdk/dapp-connector';
import type { RemoteApiProperties } from '@lace-sdk/extension-messaging';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

export const midnightDappConnectorWalletApiProperties: RemoteApiProperties<ExtendedDAppConnectorWalletAPI> =
  Object.fromEntries(
    WalletApiMethodNames.map(name => [
      name,
      RemoteApiPropertyType.MethodReturningPromise,
    ]),
  ) as RemoteApiProperties<ExtendedDAppConnectorWalletAPI>;

export const midnightDappConnectorWalletApiErrors: ErrorClass[] = [APIError];

const injectDappConnector = ({ logger, runtime }: InjectDependencies) => {
  const authenticator = consumeRemoteApi(
    {
      baseChannel: AUTHENTICATOR_API_CHANNEL,
      lazy: true,
      properties: authenticatorApiProperties,
    },
    { logger, runtime },
  );
  const walletApi = consumeRemoteApi<ExtendedDAppConnectorWalletAPI & Shutdown>(
    {
      baseChannel: WALLET_API_CHANNEL,
      errorTypes: midnightDappConnectorWalletApiErrors,
      lazy: true,
      properties: midnightDappConnectorWalletApiProperties,
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

  const wallet = new MidnightWalletApi(
    { name: 'lace', icon: WALLET_ICON },
    { logger, authenticator, api: walletApi, featureFlagProbe },
  );

  injectGlobal(
    {
      namespace: 'midnight',
      walletName: uuidv4(),
      wallet,
      rdns: 'io.lace.wallet',
    },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    { logger, window: window as any },
  );
};

export const dappConnectorApi: DappConnectorApi<
  ConnectedAPI | RemoteAuthenticator
> = {
  inject: injectDappConnector,
  proxy: [
    {
      baseChannel: WALLET_API_CHANNEL,
      properties: midnightDappConnectorWalletApiProperties,
      errorTypes: midnightDappConnectorWalletApiErrors,
    },
    {
      baseChannel: MIDNIGHT_SUPPORTED_NETWORKS_CHANNEL,
      properties: supportedNetworksChannelProperties,
    },
  ],
  authenticator: {
    baseChannelName: AUTHENTICATOR_API_CHANNEL,
    blockchainName: 'Midnight',
  },
};
