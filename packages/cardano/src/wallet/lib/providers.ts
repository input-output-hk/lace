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
}

export const createProviders = ({
  axiosAdapter,
  baseUrl,
  customSubmitTxUrl
}: ProvidersConfig): WalletProvidersDependencies => {
  const httpProviderConfig: CreateHttpProviderConfig<Provider> = {
    baseUrl,
    logger: console,
    adapter: axiosAdapter
  };

  return {
    assetProvider: assetInfoHttpProvider(httpProviderConfig),
    networkInfoProvider: networkInfoHttpProvider(httpProviderConfig),
    txSubmitProvider: createTxSubmitProvider(httpProviderConfig, customSubmitTxUrl),
    stakePoolProvider: stakePoolHttpProvider(httpProviderConfig),
    utxoProvider: utxoHttpProvider(httpProviderConfig),
    // TODO: remove apiVersion override once the back-ends are all updated to P2P (Node 8.9.2)
    chainHistoryProvider: chainHistoryHttpProvider({ ...httpProviderConfig, apiVersion: '3.0.1' }),
    rewardsProvider: rewardsHttpProvider(httpProviderConfig)
  };
};
