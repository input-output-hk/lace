import { StakePoolSortOptions } from '@cardano-sdk/core';
import { DelegatedStake } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';
import { SortField } from 'features/BrowsePools';
import { BrowsePoolsView } from 'features/BrowsePools/types';
import { StakingBrowserPreferences } from 'features/outside-handles-provider';
import { ExecuteCommand, State } from './stateMachine';

export type AdaSymbol = 'ADA' | 'tADA';

export type DelegationPortfolioState = State & {
  view?: 'popup' | 'expanded';
  sortField: SortField;
  sortOrder: 'desc' | 'asc';
  searchQuery?: string;
  poolsView: BrowsePoolsView;
};

export type DelegationPortfolioStore = DelegationPortfolioState & {
  mutators: {
    executeCommand: ExecuteCommand;
    forceAbortFlows: () => void;
    setCardanoCoinSymbol: (currentChain: Wallet.Cardano.ChainId) => void;
    setCurrentPortfolio: (params: {
      delegationDistribution: DelegatedStake[];
      currentEpoch: Wallet.EpochInfo;
      delegationRewardsHistory: Wallet.RewardsHistory;
      delegationPortfolio: Wallet.Cardano.Cip17DelegationPortfolio | null;
    }) => Promise<void>;
    setView: (view: 'popup' | 'expanded') => void;
    setBrowserPreferences: (params: Omit<StakingBrowserPreferences, 'selectedPoolsIds'>) => void;
  };
};

export type StakePoolDetails = {
  delegators?: number | string;
  description: string;
  hexId: string;
  id: string;
  logo?: string;
  margin: number | string;
  name?: string;
  owners: string[];
  saturation?: string;
  liveStake: { number: string; unit?: string };
  activeStake: { number: string; unit?: string };
  ticker: string;
  ros?: string;
  status: Wallet.Cardano.StakePool['status'];
  contact: Wallet.Cardano.PoolContactData;
  blocks?: string;
  pledge: { number: string; unit?: string };
  cost: { number: string; unit?: string };
};

// TODO consider using SDK type
export enum PoolsFilter {
  Saturation = 'Saturation',
  ProfitMargin = 'ProfitMargin',
  Performance = 'Performance',
  Ros = 'Ros',
}

export interface QueryStakePoolsFilters {
  [PoolsFilter.Saturation]: [string, string];
  [PoolsFilter.ProfitMargin]: [string, string];
  [PoolsFilter.Performance]: [string, string];
  [PoolsFilter.Ros]: [string];
}

export type QueryStakePoolsArgs = {
  sort: StakePoolSortOptions;
  filters?: QueryStakePoolsFilters;
};
