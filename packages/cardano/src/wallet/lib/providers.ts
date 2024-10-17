/* eslint-disable no-new */
import { WalletProvidersDependencies } from '@src/wallet';
import { AxiosAdapter } from 'axios';
import { Logger } from 'ts-log';
import {
  AssetProvider,
  ChainHistoryProvider,
  NetworkInfoProvider,
  Provider,
  RewardsProvider,
  StakePoolProvider,
  TxSubmitProvider,
  UtxoProvider
} from '@cardano-sdk/core';

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
  txSubmitHttpProvider
} from '@cardano-sdk/cardano-services-client';

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
};

export interface ProvidersConfig {
  axiosAdapter?: AxiosAdapter;
  baseUrl: string;
  customSubmitTxUrl?: string;
  logger?: Logger;
  useWebSocket?: boolean;
}

/**
 * Only one instance must be alive.
 *
 * If a new one needs to be created (ex. on network change) the previous instance needs to be closed. */
let wsProvider: CardanoWsClient;

export const createProviders = ({
  axiosAdapter,
  baseUrl,
  customSubmitTxUrl,
  logger,
  useWebSocket
}: ProvidersConfig): WalletProvidersDependencies => {
  if (!logger) logger = console;

  const httpProviderConfig: CreateHttpProviderConfig<Provider> = { baseUrl, logger, adapter: axiosAdapter };

  const assetProvider = assetInfoHttpProvider(httpProviderConfig);
  const chainHistoryProvider = chainHistoryHttpProvider(httpProviderConfig);
  const rewardsProvider = rewardsHttpProvider(httpProviderConfig);
  const stakePoolProvider = stakePoolHttpProvider(httpProviderConfig);
  const txSubmitProvider = createTxSubmitProvider(httpProviderConfig, customSubmitTxUrl);

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
      rewardsProvider
    };
  }

  return {
    assetProvider,
    networkInfoProvider: networkInfoHttpProvider(httpProviderConfig),
    txSubmitProvider,
    stakePoolProvider,
    utxoProvider: utxoHttpProvider(httpProviderConfig),
    chainHistoryProvider,
    rewardsProvider
  };
};
