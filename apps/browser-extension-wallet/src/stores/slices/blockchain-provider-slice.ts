import { BitcoinBlockchainProviderSlice, BlockchainProviderSlice, SliceCreator } from '../types';
import { Wallet } from '@lace/cardano';
import { consumeRemoteApi } from '@cardano-sdk/web-extension';
import { runtime } from 'webextension-polyfill';
import { Cardano, DRepProvider } from '@cardano-sdk/core';
import { logger } from '@lace/common';
import { Bitcoin } from '@lace/bitcoin';
import { bitcoinProviderProperties } from '@lib/scripts/background/bitcoinWalletManager';

export interface IBlockchainProvider {
  stakePoolProvider: Wallet.StakePoolProvider;
  assetProvider: Wallet.AssetProvider;
  txSubmitProvider: Wallet.TxSubmitProvider;
  networkInfoProvider: Wallet.NetworkInfoProvider;
  utxoProvider: Wallet.UtxoProvider;
  chainHistoryProvider: Wallet.ChainHistoryProvider;
  rewardAccountInfoProvider: Wallet.RewardAccountInfoProvider;
  rewardsProvider: Wallet.RewardsProvider;
  handleProvider: Wallet.HandleProvider;
  drepProvider?: DRepProvider;
  inputResolver: Cardano.InputResolver;
  bitcoinProvider?: Bitcoin.BlockchainDataProvider;
}

export type BlockchainProviderFactory = () => IBlockchainProvider;

export const IBlockchainProvider = {
  toWalletProviders: (providers: IBlockchainProvider): Wallet.WalletProvidersDependencies => ({
    stakePoolProvider: providers?.stakePoolProvider,
    assetProvider: providers?.assetProvider,
    txSubmitProvider: providers?.txSubmitProvider,
    networkInfoProvider: providers?.networkInfoProvider,
    utxoProvider: providers?.utxoProvider,
    rewardAccountInfoProvider: providers?.rewardAccountInfoProvider,
    rewardsProvider: providers?.rewardsProvider,
    handleProvider: providers?.handleProvider,
    chainHistoryProvider: providers?.chainHistoryProvider,
    drepProvider: providers?.drepProvider,
    inputResolver: providers?.inputResolver
  }),
  fromWalletProviders: (providers: Wallet.WalletProvidersDependencies): IBlockchainProvider => ({
    txSubmitProvider: providers?.txSubmitProvider,
    assetProvider: providers?.assetProvider,
    stakePoolProvider: providers?.stakePoolProvider,
    networkInfoProvider: providers?.networkInfoProvider,
    utxoProvider: providers?.utxoProvider,
    rewardAccountInfoProvider: providers?.rewardAccountInfoProvider,
    rewardsProvider: providers?.rewardsProvider,
    handleProvider: providers?.handleProvider,
    chainHistoryProvider: providers?.chainHistoryProvider,
    drepProvider: providers?.drepProvider,
    inputResolver: providers?.inputResolver
  })
};

const providers = consumeRemoteApi<Wallet.WalletProvidersDependencies>(
  {
    baseChannel: Wallet.walletProvidersChannel(process.env.WALLET_NAME),
    properties: Wallet.walletProvidersProperties
  },
  { logger, runtime }
);

export const bitcoinProvider = consumeRemoteApi<Bitcoin.BlockchainDataProvider>(
  {
    baseChannel: 'bitcoin-wallet-providers',
    properties: bitcoinProviderProperties
  },
  { logger, runtime }
);

export const getProviders: BlockchainProviderFactory = () => IBlockchainProvider.fromWalletProviders(providers);

/**
 * has all wallet info related actions and states
 */
export const blockchainProviderSlice: SliceCreator<
  BlockchainProviderSlice,
  BlockchainProviderSlice,
  { currentChainName: Wallet.ChainName; blockchainProviderFactory?: BlockchainProviderFactory }
> = ({ set }, { blockchainProviderFactory = getProviders }) => ({
  blockchainProvider: blockchainProviderFactory(),
  setBlockchainProvider: () => set({ blockchainProvider: blockchainProviderFactory() })
});

export const bitcoinBlockchainProviderSlice: SliceCreator<
  BitcoinBlockchainProviderSlice,
  BitcoinBlockchainProviderSlice,
  { provider?: Bitcoin.BlockchainDataProvider }
> = ({ set }, { provider = bitcoinProvider }) => ({
  bitcoinBlockchainProvider: provider,
  setBitcoinBlockchainProvider: () => set({ bitcoinBlockchainProvider: provider })
});
