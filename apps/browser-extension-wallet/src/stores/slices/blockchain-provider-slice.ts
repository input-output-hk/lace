import { BlockchainProviderSlice, SliceCreator } from '../types';
import { Wallet } from '@lace/cardano';
import { getBaseUrlForChain } from '@src/utils/chain';
import axiosFetchAdapter from '@vespaiach/axios-fetch-adapter';
import { config } from '@src/config';

const { CHAIN } = config();

export interface IBlockchainProvider {
  stakePoolProvider: Wallet.StakePoolProvider;
  assetProvider: Wallet.AssetProvider;
  txSubmitProvider: Wallet.TxSubmitProvider;
  networkInfoProvider: Wallet.NetworkInfoProvider;
  utxoProvider: Wallet.UtxoProvider;
  chainHistoryProvider: Wallet.ChainHistoryProvider;
  rewardsProvider: Wallet.RewardsProvider;
}

export type BlockchainProviderFactory = (chainName: Wallet.ChainName) => IBlockchainProvider;

export const IBlockchainProvider = {
  toWalletProviders: (providers: IBlockchainProvider): Wallet.WalletProvidersDependencies => ({
    stakePoolProvider: providers.stakePoolProvider,
    assetProvider: providers.assetProvider,
    txSubmitProvider: providers.txSubmitProvider,
    networkInfoProvider: providers.networkInfoProvider,
    utxoProvider: providers.utxoProvider,
    rewardsProvider: providers.rewardsProvider,
    chainHistoryProvider: providers.chainHistoryProvider
  }),
  fromWalletProviders: (providers: Wallet.WalletProvidersDependencies): IBlockchainProvider => ({
    txSubmitProvider: providers.txSubmitProvider,
    assetProvider: providers.assetProvider,
    stakePoolProvider: providers.stakePoolProvider,
    networkInfoProvider: providers.networkInfoProvider,
    utxoProvider: providers.utxoProvider,
    rewardsProvider: providers.rewardsProvider,
    chainHistoryProvider: providers.chainHistoryProvider
  })
};

export const getProviderByChain: BlockchainProviderFactory = (chain = CHAIN) => {
  const baseCardanoServicesUrl = getBaseUrlForChain(chain);

  const providers = Wallet.createProviders({
    axiosAdapter: axiosFetchAdapter,
    baseUrl: baseCardanoServicesUrl
  });

  return IBlockchainProvider.fromWalletProviders(providers);
};

/**
 * has all wallet info related actions and states
 */
export const blockchainProviderSlice: SliceCreator<
  BlockchainProviderSlice,
  BlockchainProviderSlice,
  { currentChainName: Wallet.ChainName; blockchainProviderFactory?: BlockchainProviderFactory }
> = ({ set }, { currentChainName, blockchainProviderFactory = getProviderByChain }) => ({
  blockchainProvider: blockchainProviderFactory(currentChainName),
  setBlockchainProvider: (chain) => set({ blockchainProvider: blockchainProviderFactory(chain) })
});
