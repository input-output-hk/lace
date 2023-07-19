import { WalletProvidersDependencies } from './cardano-wallet';
import { AxiosAdapter } from 'axios';
import {
  AssetProvider,
  ChainHistoryProvider,
  NetworkInfoProvider,
  RewardsProvider,
  StakePoolProvider,
  TxSubmitProvider,
  UtxoProvider
} from '@cardano-sdk/core';

import {
  assetInfoHttpProvider,
  chainHistoryHttpProvider,
  networkInfoHttpProvider,
  rewardsHttpProvider,
  stakePoolHttpProvider,
  txSubmitHttpProvider,
  utxoHttpProvider
} from '@cardano-sdk/cardano-services-client';

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
  httpProviders: Partial<Record<keyof AllProviders, string>>;
}

export const createProviders = ({ axiosAdapter, httpProviders }: ProvidersConfig): WalletProvidersDependencies => {
  const httpProviderConfig = (baseUrl: string) => ({
    baseUrl,
    logger: console,
    adapter: axiosAdapter,
    // See openApi.json in @cardano-sdk/cardano-services
    version: { software: '3.0.0', api: '1.0.0' }
  });

  return {
    assetProvider: assetInfoHttpProvider(httpProviderConfig(httpProviders.assetProvider)),
    networkInfoProvider: networkInfoHttpProvider(httpProviderConfig(httpProviders.networkInfoProvider)),
    txSubmitProvider: txSubmitHttpProvider(httpProviderConfig(httpProviders.txSubmitProvider)),
    stakePoolProvider: stakePoolHttpProvider(httpProviderConfig(httpProviders.stakePoolProvider)),
    utxoProvider: utxoHttpProvider(httpProviderConfig(httpProviders.utxoProvider)),
    chainHistoryProvider: chainHistoryHttpProvider(httpProviderConfig(httpProviders.chainHistoryProvider)),
    rewardsProvider: rewardsHttpProvider(httpProviderConfig(httpProviders.rewardsProvider))
  };
};
