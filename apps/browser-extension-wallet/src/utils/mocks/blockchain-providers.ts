import { IWalletProvider } from '@lib/wallet-provider';
import { Wallet } from '@lace/cardano';
import { IBlockchainProvider } from '@src/stores/slices';

/**
 * Wallet Provider mock
 * @param provider override provider values and methods for specific uses
 */
export const mockWalletProvider = (provider?: Partial<IWalletProvider>): IWalletProvider => ({
  ...Wallet.mockUtils.mockWalletProvider(),
  ...provider
});

/**
 * Stake Pool search provider mock
 * @param stakePools override default mocked stake pools
 */
export const mockStakePoolSearchProvider = (stakePools?: Wallet.Cardano.StakePool[]): Wallet.StakePoolProvider =>
  Wallet.mockUtils.stakepoolSearchProviderStub(stakePools);

/**
 * Network Info search provider mock
 */
export const mockNetworkInfoProvider = (): Wallet.NetworkInfoProvider => Wallet.mockUtils.networkInfoProviderStub();

/**
 * Asset Provider mock
 * @param assets override default mocked stake pools
 */
export const mockAssetProvider = (assets?: Wallet.Asset.AssetInfo[]): Wallet.AssetProvider =>
  Wallet.mockUtils.assetsProviderStub(assets);

/**
 * Utxo Provider mock
 */
export const mockUtxoProvider = (): Wallet.UtxoProvider => Wallet.mockUtils.utxoProviderStub();

/**
 * Rewards Provider mock
 */
export const mockRewardsProvider = (): Wallet.RewardsProvider => Wallet.mockUtils.rewardsHistoryProviderStub();

/**
 * Chain History Provider mock
 */
export const mockChainHistoryProvider = (): Wallet.ChainHistoryProvider => Wallet.mockUtils.chainHistoryProviderStub();

export const mockBlockchainProviders = (blockchainProviders?: Partial<IBlockchainProvider>): IBlockchainProvider => ({
  assetProvider: mockAssetProvider(),
  networkInfoProvider: mockNetworkInfoProvider(),
  stakePoolProvider: mockStakePoolSearchProvider(),
  txSubmitProvider: Wallet.mockUtils.TxSubmitProviderFake.make(),
  utxoProvider: mockUtxoProvider(),
  rewardsProvider: mockRewardsProvider(),
  chainHistoryProvider: mockChainHistoryProvider(),
  ...blockchainProviders
});
