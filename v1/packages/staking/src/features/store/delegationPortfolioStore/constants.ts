import { Wallet } from '@lace/cardano';
import { StakingPage } from '../../staking/types';
import { DelegationFlow } from './stateMachine';
import { AdaSymbol } from './types';

export const MAX_POOLS_COUNT = 10;
export const LAST_STABLE_EPOCH = 2;
export const PERCENTAGE_SCALE_MAX = 100; // 0-100

export const CARDANO_COIN_SYMBOL_BY_NETWORK: Record<Wallet.Cardano.NetworkId, AdaSymbol> = {
  [Wallet.Cardano.NetworkId.Mainnet]: 'ADA',
  [Wallet.Cardano.NetworkId.Testnet]: 'tADA',
};

export const STAKING_PAGE_BY_FLOW: Record<DelegationFlow, StakingPage> = {
  [DelegationFlow.Activity]: StakingPage.activity,
  [DelegationFlow.Overview]: StakingPage.overview,
  [DelegationFlow.CurrentPoolDetails]: StakingPage.overview,
  [DelegationFlow.PortfolioManagement]: StakingPage.overview,
  [DelegationFlow.ChangingPreferences]: StakingPage.browsePools,
  [DelegationFlow.BrowsePools]: StakingPage.browsePools,
  [DelegationFlow.NewPortfolio]: StakingPage.browsePools,
  [DelegationFlow.PoolDetails]: StakingPage.browsePools,
};
