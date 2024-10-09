/* eslint-disable no-new */
import { WalletProvidersDependencies } from '@src/wallet';
import { AxiosAdapter } from 'axios';
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
  useWebSocket?: boolean;
}

export const createProviders = ({
  axiosAdapter,
  baseUrl,
  customSubmitTxUrl,
  useWebSocket
}: ProvidersConfig): WalletProvidersDependencies => {
  const httpProviderConfig: CreateHttpProviderConfig<Provider> = {
    baseUrl,
    logger: console,
    adapter: axiosAdapter
  };

  const assetProvider = assetInfoHttpProvider(httpProviderConfig);
  const chainHistoryProvider = chainHistoryHttpProvider(httpProviderConfig);
  const rewardsProvider = rewardsHttpProvider(httpProviderConfig);
  const stakePoolProvider = stakePoolHttpProvider(httpProviderConfig);
  const txSubmitProvider = createTxSubmitProvider(httpProviderConfig, customSubmitTxUrl);

  if (useWebSocket) {
    const url = new URL(baseUrl);

    url.pathname = '/ws';
    url.protocol = url.protocol === 'https' ? 'wss' : 'ws';

    const wsProvider = new CardanoWsClient({ chainHistoryProvider, logger: console }, { url });

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
