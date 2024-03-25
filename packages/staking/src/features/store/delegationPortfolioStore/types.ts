import { DelegatedStake } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';
import { ExecuteCommand, State } from './stateMachine';

export type AdaSymbol = 'ADA' | 'tADA';

export type DelegationPortfolioState = State & {
  view?: 'popup' | 'expanded';
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
  };
};

export type StakePoolDetails = {
  activeStake: { number: string; unit: string };
  blocks: string;
  contact: Wallet.Cardano.PoolContactData;
  cost: { number: string; unit: string };
  delegators: string;
  description: string;
  hexId: Wallet.Cardano.PoolIdHex;
  id: string;
  liveStake: { number: string; unit: string };
  logo: string;
  margin: string;
  name: string;
  owners: string[];
  pledge: { number: string; unit: string };
  retired: boolean;
  ros: string;
  saturation: string;
  stakePool: Wallet.Cardano.StakePool;
  status: Wallet.Cardano.StakePoolStatus;
  ticker: string;
};

// TODO consider using SDK type; https://input-output.atlassian.net/browse/LW-9242
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
