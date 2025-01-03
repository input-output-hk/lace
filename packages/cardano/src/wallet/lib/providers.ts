/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-new */
import { WalletProvidersDependencies } from '@src/wallet';
import { AxiosAdapter } from 'axios';
import { Logger } from 'ts-log';
import {
  AssetProvider,
  ChainHistoryProvider,
  DRepProvider,
  Milliseconds,
  NetworkInfoProvider,
  Provider,
  RewardsProvider,
  StakePoolProvider,
  TxSubmitProvider,
  UtxoProvider
} from '@cardano-sdk/core';
import type { DRepInfo } from '@cardano-sdk/core';

import {
  CardanoWsClient,
  CreateHttpProviderConfig,
  assetInfoHttpProvider,
  chainHistoryHttpProvider,
  networkInfoHttpProvider,
  rewardsHttpProvider,
  stakePoolHttpProvider,
  utxoHttpProvider,
  TxSubmitApiProvider,
  txSubmitHttpProvider,
  BlockfrostClientConfig,
  RateLimiter,
  BlockfrostClient,
  BlockfrostAssetProvider,
  BlockfrostChainHistoryProvider,
  BlockfrostDRepProvider,
  BlockfrostUtxoProvider,
  BlockfrostRewardsProvider,
  BlockfrostTxSubmitProvider,
  BlockfrostNetworkInfoProvider
} from '@cardano-sdk/cardano-services-client';
import { RemoteApiProperties, RemoteApiPropertyType } from '@cardano-sdk/web-extension';

const createTxSubmitProvider = (
  httpProviderConfig: CreateHttpProviderConfig<Provider>,
  customSubmitTxUrl?: string
): TxSubmitProvider => {
  if (customSubmitTxUrl) {
    httpProviderConfig.logger.info(`Using custom TxSubmit api URL ${customSubmitTxUrl}`);

    const url = new URL(customSubmitTxUrl);

    return new TxSubmitApiProvider(
      { baseUrl: url, path: url.pathname },
      { logger: httpProviderConfig.logger, adapter: httpProviderConfig.adapter }
    );
  }

  return txSubmitHttpProvider(httpProviderConfig);
};

export type AllProviders = {
  assetProvider: AssetProvider;
  networkInfoProvider: NetworkInfoProvider;
  txSubmitProvider: TxSubmitProvider;
  stakePoolProvider: StakePoolProvider;
  utxoProvider: UtxoProvider;
  chainHistoryProvider: ChainHistoryProvider;
  rewardsProvider: RewardsProvider;
  drepProvider: DRepProvider;
};

export type RateLimiterConfig = {
  size: number;
  increaseInterval: Milliseconds;
  increaseAmount: number;
};

export interface ProvidersConfig {
  axiosAdapter?: AxiosAdapter;
  env: {
    baseCardanoServicesUrl: string;
    customSubmitTxUrl?: string;
    blockfrostConfig: BlockfrostClientConfig & { rateLimiter: RateLimiter };
  };
  logger?: Logger;
  experiments: {
    useWebSocket?: boolean;
    useBlockfrostAssetProvider?: boolean;
    useBlockfrostChainHistoryProvider?: boolean;
    useBlockfrostNetworkInfoProvider?: boolean;
    useBlockfrostRewardsProvider?: boolean;
    useBlockfrostTxSubmitProvider?: boolean;
    useBlockfrostUtxoProvider?: boolean;
    useDrepProviderOverrideActiveStatus?: boolean;
  };
}

/**
 * Only one instance must be alive.
 *
 * If a new one needs to be created (ex. on network change) the previous instance needs to be closed. */
let wsProvider: CardanoWsClient;

// eslint-disable-next-line complexity
export const createProviders = ({
  axiosAdapter,
  env: { baseCardanoServicesUrl: baseUrl, customSubmitTxUrl, blockfrostConfig },
  logger,
  experiments: {
    useBlockfrostAssetProvider,
    useBlockfrostChainHistoryProvider,
    useBlockfrostNetworkInfoProvider,
    useBlockfrostRewardsProvider,
    useBlockfrostTxSubmitProvider,
    useBlockfrostUtxoProvider,
    useDrepProviderOverrideActiveStatus,
    useWebSocket
  }
}: ProvidersConfig): WalletProvidersDependencies => {
  if (!logger) logger = console;

  const httpProviderConfig: CreateHttpProviderConfig<Provider> = { baseUrl, logger, adapter: axiosAdapter };

  const blockfrostClient = new BlockfrostClient(blockfrostConfig, {
    rateLimiter: blockfrostConfig.rateLimiter
  });
  const assetProvider = useBlockfrostAssetProvider
    ? new BlockfrostAssetProvider(blockfrostClient, logger)
    : assetInfoHttpProvider(httpProviderConfig);
  const networkInfoProvider = useBlockfrostNetworkInfoProvider
    ? new BlockfrostNetworkInfoProvider(blockfrostClient, logger)
    : networkInfoHttpProvider(httpProviderConfig);
  const chainHistoryProvider = useBlockfrostChainHistoryProvider
    ? new BlockfrostChainHistoryProvider(blockfrostClient, networkInfoProvider, logger)
    : chainHistoryHttpProvider(httpProviderConfig);
  const rewardsProvider = useBlockfrostRewardsProvider
    ? new BlockfrostRewardsProvider(blockfrostClient, logger)
    : rewardsHttpProvider(httpProviderConfig);
  const stakePoolProvider = stakePoolHttpProvider(httpProviderConfig);
  const txSubmitProvider = useBlockfrostTxSubmitProvider
    ? new BlockfrostTxSubmitProvider(blockfrostClient, logger)
    : createTxSubmitProvider(httpProviderConfig, customSubmitTxUrl);
  const drepProvider = new BlockfrostDRepProvider(blockfrostClient, logger);

  // Temporary proxy for drepProvider to overwrite the 'active' property to always be true
  const drepProviderOverrideActiveStatus = new Proxy(drepProvider, {
    get(target, property, receiver) {
      const original = Reflect.get(target, property, receiver);
      if (property === 'getDRepInfo') {
        return async function (...args: any[]) {
          const response: DRepInfo = await original.apply(target, args);
          return {
            ...response,
            active: true
          };
        };
      }

      if (property === 'getDRepsInfo') {
        return async function (...args: any[]) {
          const response: DRepInfo[] = await original.apply(target, args);
          return response.map((drepInfo) => ({
            ...drepInfo,
            active: true
          }));
        };
      }

      return original;
    }
  });

  if (useWebSocket) {
    const url = new URL(baseUrl);

    url.pathname = '/ws';
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

    // On network change this logs an error line as follows but it is expected as long as this function is called twice
    // 'Async error from WebSocket client' 'not-connected'
    if (wsProvider) wsProvider.close().catch((error) => console.error(error, 'While closing wsProvider'));

    wsProvider = new CardanoWsClient({ chainHistoryProvider, logger }, { url });

    return {
      assetProvider,
      networkInfoProvider: wsProvider.networkInfoProvider,
      txSubmitProvider,
      stakePoolProvider,
      utxoProvider: wsProvider.utxoProvider,
      chainHistoryProvider: wsProvider.chainHistoryProvider,
      rewardsProvider,
      wsProvider,
      drepProvider: useDrepProviderOverrideActiveStatus ? drepProviderOverrideActiveStatus : drepProvider
    };
  }

  const utxoProvider = useBlockfrostUtxoProvider
    ? new BlockfrostUtxoProvider(blockfrostClient, logger)
    : utxoHttpProvider(httpProviderConfig);

  return {
    assetProvider,
    networkInfoProvider,
    txSubmitProvider,
    stakePoolProvider,
    utxoProvider,
    chainHistoryProvider,
    rewardsProvider,
    drepProvider: useDrepProviderOverrideActiveStatus ? drepProviderOverrideActiveStatus : drepProvider
  };
};

export const walletProvidersChannel = (walletName: string): string => `${walletName}-providers`;
export const walletProvidersProperties: RemoteApiProperties<WalletProvidersDependencies> = {
  stakePoolProvider: {
    queryStakePools: RemoteApiPropertyType.MethodReturningPromise,
    stakePoolStats: RemoteApiPropertyType.MethodReturningPromise,
    healthCheck: RemoteApiPropertyType.MethodReturningPromise
  },
  assetProvider: {
    getAsset: RemoteApiPropertyType.MethodReturningPromise,
    getAssets: RemoteApiPropertyType.MethodReturningPromise,
    healthCheck: RemoteApiPropertyType.MethodReturningPromise
  },
  txSubmitProvider: {
    submitTx: RemoteApiPropertyType.MethodReturningPromise,
    healthCheck: RemoteApiPropertyType.MethodReturningPromise
  },
  networkInfoProvider: {
    ledgerTip: RemoteApiPropertyType.MethodReturningPromise,
    protocolParameters: RemoteApiPropertyType.MethodReturningPromise,
    genesisParameters: RemoteApiPropertyType.MethodReturningPromise,
    lovelaceSupply: RemoteApiPropertyType.MethodReturningPromise,
    stake: RemoteApiPropertyType.MethodReturningPromise,
    eraSummaries: RemoteApiPropertyType.MethodReturningPromise,
    healthCheck: RemoteApiPropertyType.MethodReturningPromise
  },
  utxoProvider: {
    utxoByAddresses: RemoteApiPropertyType.MethodReturningPromise,
    healthCheck: RemoteApiPropertyType.MethodReturningPromise
  },
  rewardsProvider: {
    rewardsHistory: RemoteApiPropertyType.MethodReturningPromise,
    rewardAccountBalance: RemoteApiPropertyType.MethodReturningPromise,
    healthCheck: RemoteApiPropertyType.MethodReturningPromise
  },
  chainHistoryProvider: {
    transactionsByAddresses: RemoteApiPropertyType.MethodReturningPromise,
    transactionsByHashes: RemoteApiPropertyType.MethodReturningPromise,
    blocksByHashes: RemoteApiPropertyType.MethodReturningPromise,
    healthCheck: RemoteApiPropertyType.MethodReturningPromise
  },
  drepProvider: {
    getDRepInfo: RemoteApiPropertyType.MethodReturningPromise,
    getDRepsInfo: RemoteApiPropertyType.MethodReturningPromise,
    healthCheck: RemoteApiPropertyType.MethodReturningPromise
  }
};
