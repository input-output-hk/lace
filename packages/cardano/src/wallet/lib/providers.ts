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
  baseUrl: string;
}

export const createProviders = ({ axiosAdapter, baseUrl }: ProvidersConfig): WalletProvidersDependencies => {
  const httpProviderConfig = {
    baseUrl,
    logger: console,
    adapter: axiosAdapter
  };

  return {
    assetProvider: assetInfoHttpProvider(httpProviderConfig),
    networkInfoProvider: networkInfoHttpProvider(httpProviderConfig),
    txSubmitProvider: txSubmitHttpProvider(httpProviderConfig),
    stakePoolProvider: stakePoolHttpProvider(httpProviderConfig),
    utxoProvider: utxoHttpProvider(httpProviderConfig),
    chainHistoryProvider: chainHistoryHttpProvider(httpProviderConfig),
    rewardsProvider: rewardsHttpProvider(httpProviderConfig)
  };
};
