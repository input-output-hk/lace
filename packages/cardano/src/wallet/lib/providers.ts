/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-new, complexity, sonarjs/cognitive-complexity */
import { Storage } from 'webextension-polyfill';
import { AxiosAdapter } from 'axios';
import { Logger } from 'ts-log';
import {
  AssetProvider,
  ChainHistoryProvider,
  DRepProvider,
  Milliseconds,
  NetworkInfoProvider,
  Provider,
  RewardAccountInfoProvider,
  RewardsProvider,
  StakePoolProvider,
  TxSubmitProvider,
  UtxoProvider
} from '@cardano-sdk/core';

import {
  CardanoWsClient,
  CreateHttpProviderConfig,
  stakePoolHttpProvider,
  TxSubmitApiProvider,
  BlockfrostClientConfig,
  RateLimiter,
  BlockfrostClient,
  BlockfrostAssetProvider,
  BlockfrostChainHistoryProvider,
  BlockfrostDRepProvider,
  BlockfrostUtxoProvider,
  BlockfrostRewardsProvider,
  BlockfrostTxSubmitProvider,
  BlockfrostNetworkInfoProvider,
  BlockfrostRewardAccountInfoProvider
} from '@cardano-sdk/cardano-services-client';
import { RemoteApiProperties, RemoteApiPropertyType, createPersistentCacheStorage } from '@cardano-sdk/web-extension';
import { BlockfrostAddressDiscovery } from '@wallet/lib/blockfrost-address-discovery';
import { WalletProvidersDependencies } from './cardano-wallet';
import { BlockfrostInputResolver } from './blockfrost-input-resolver';

const createTxSubmitProvider = (
  blockfrostClient: BlockfrostClient,
  httpProviderConfig: CreateHttpProviderConfig<Provider>,
  customSubmitTxUrl?: string
): TxSubmitProvider => {
  if (customSubmitTxUrl) {
    httpProviderConfig.logger.debug(`Using custom TxSubmit api URL ${customSubmitTxUrl}`);

    const url = new URL(customSubmitTxUrl);

    return new TxSubmitApiProvider(
      { baseUrl: url, path: url.pathname },
      { logger: httpProviderConfig.logger, adapter: httpProviderConfig.adapter }
    );
  }

  return new BlockfrostTxSubmitProvider(blockfrostClient, httpProviderConfig.logger);
};

export type AllProviders = {
  assetProvider: AssetProvider;
  networkInfoProvider: NetworkInfoProvider;
  txSubmitProvider: TxSubmitProvider;
  stakePoolProvider: StakePoolProvider;
  utxoProvider: UtxoProvider;
  chainHistoryProvider: ChainHistoryProvider;
  rewardAccountInfoProvider: RewardAccountInfoProvider;
  rewardsProvider: RewardsProvider;
  drepProvider: DRepProvider;
};

export type RateLimiterConfig = {
  size: number;
  increaseInterval: Milliseconds;
  increaseAmount: number;
};

interface ProvidersConfig {
  axiosAdapter?: AxiosAdapter;
  env: {
    baseCardanoServicesUrl: string;
    customSubmitTxUrl?: string;
    blockfrostConfig: BlockfrostClientConfig & { rateLimiter: RateLimiter };
  };
  logger: Logger;
  experiments: {
    useWebSocket?: boolean;
  };
  extensionLocalStorage: Storage.LocalStorageArea;
}

/**
 * Only one instance must be alive.
 *
 * If a new one needs to be created (ex. on network change) the previous instance needs to be closed. */
let wsProvider: CardanoWsClient;

enum CacheName {
  chainHistoryProvider = 'chain-history-provider-cache',
  inputResolver = 'input-resolver-cache',
  utxoProvider = 'utxo-provider-cache'
}

// eslint-disable-next-line no-magic-numbers
const sizeOf1mb = 1024 * 1024;

// The count values have been calculated by filling the cache by impersonating a few
// rich wallets and then getting the average size of a single item per each cache collection
const cacheAssignment: Record<CacheName, { count: number; size: number }> = {
  [CacheName.chainHistoryProvider]: {
    count: 5_180_160_021,
    // eslint-disable-next-line no-magic-numbers
    size: 30 * sizeOf1mb
  },
  [CacheName.inputResolver]: {
    count: 65_529_512_340,
    // eslint-disable-next-line no-magic-numbers
    size: 30 * sizeOf1mb
  },
  [CacheName.utxoProvider]: {
    count: 6_530_251_302,
    // eslint-disable-next-line no-magic-numbers
    size: 30 * sizeOf1mb
  }
};

export const createProviders = ({
  axiosAdapter,
  env: { baseCardanoServicesUrl: baseUrl, customSubmitTxUrl, blockfrostConfig },
  logger,
  experiments: { useWebSocket },
  extensionLocalStorage
}: ProvidersConfig): WalletProvidersDependencies => {
  const httpProviderConfig: CreateHttpProviderConfig<Provider> = { baseUrl, logger, adapter: axiosAdapter };

  const blockfrostClient = new BlockfrostClient(blockfrostConfig, {
    rateLimiter: blockfrostConfig.rateLimiter
  });
  const assetProvider = new BlockfrostAssetProvider(blockfrostClient, logger);
  const networkInfoProvider = new BlockfrostNetworkInfoProvider(blockfrostClient, logger);
  const chainHistoryProvider = new BlockfrostChainHistoryProvider({
    client: blockfrostClient,
    cache: createPersistentCacheStorage({
      extensionLocalStorage,
      fallbackMaxCollectionItemsGuard: cacheAssignment[CacheName.chainHistoryProvider].count,
      resourceName: CacheName.chainHistoryProvider,
      quotaInBytes: cacheAssignment[CacheName.chainHistoryProvider].size
    }),
    networkInfoProvider,
    logger
  });
  const rewardsProvider = new BlockfrostRewardsProvider(blockfrostClient, logger);
  const stakePoolProvider = stakePoolHttpProvider(httpProviderConfig);
  const txSubmitProvider = createTxSubmitProvider(blockfrostClient, httpProviderConfig, customSubmitTxUrl);
  const dRepProvider = new BlockfrostDRepProvider(blockfrostClient, logger);

  const addressDiscovery = new BlockfrostAddressDiscovery(blockfrostClient, logger);

  const rewardAccountInfoProvider = new BlockfrostRewardAccountInfoProvider({
    client: blockfrostClient,
    dRepProvider,
    logger,
    stakePoolProvider
  });

  const inputResolver = new BlockfrostInputResolver({
    cache: createPersistentCacheStorage({
      extensionLocalStorage,
      fallbackMaxCollectionItemsGuard: cacheAssignment[CacheName.inputResolver].count,
      resourceName: CacheName.inputResolver,
      quotaInBytes: cacheAssignment[CacheName.inputResolver].size
    }),
    client: blockfrostClient,
    logger
  });

  if (useWebSocket) {
    const url = new URL(baseUrl);

    url.pathname = '/ws';
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

    // On network change this logs an error line as follows but it is expected as long as this function is called twice
    // 'Async error from WebSocket client' 'not-connected'
    if (wsProvider) wsProvider.close().catch((error) => logger.warn(error, 'While closing wsProvider'));

    wsProvider = new CardanoWsClient({ chainHistoryProvider, logger }, { url });

    return {
      assetProvider,
      networkInfoProvider: wsProvider.networkInfoProvider,
      txSubmitProvider,
      stakePoolProvider,
      utxoProvider: wsProvider.utxoProvider,
      chainHistoryProvider: wsProvider.chainHistoryProvider,
      rewardAccountInfoProvider,
      rewardsProvider,
      wsProvider,
      addressDiscovery,
      inputResolver,
      drepProvider: dRepProvider
    };
  }

  const utxoProvider = new BlockfrostUtxoProvider({
    cache: createPersistentCacheStorage({
      extensionLocalStorage,
      fallbackMaxCollectionItemsGuard: cacheAssignment[CacheName.utxoProvider].count,
      resourceName: CacheName.utxoProvider,
      quotaInBytes: cacheAssignment[CacheName.utxoProvider].size
    }),
    client: blockfrostClient,
    logger
  });

  return {
    assetProvider,
    networkInfoProvider,
    txSubmitProvider,
    stakePoolProvider,
    utxoProvider,
    chainHistoryProvider,
    rewardAccountInfoProvider,
    rewardsProvider,
    addressDiscovery,
    inputResolver,
    drepProvider: dRepProvider
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
  rewardAccountInfoProvider: {
    delegationPortfolio: RemoteApiPropertyType.MethodReturningPromise,
    healthCheck: RemoteApiPropertyType.MethodReturningPromise,
    rewardAccountInfo: RemoteApiPropertyType.MethodReturningPromise
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
  },
  inputResolver: {
    resolveInput: RemoteApiPropertyType.MethodReturningPromise
  }
};
