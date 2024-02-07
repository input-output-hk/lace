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
  delegators?: number | string;
  description: string;
  hexId: string;
  id: string;
  logo?: string;
  margin: number | string;
  name: string;
  owners: string[];
  saturation?: string;
  liveStake: { number: string; unit?: string };
  activeStake: { number: string; unit?: string };
  ticker: string;
  apy?: string;
  status: Wallet.Cardano.StakePool['status'];
  contact: Wallet.Cardano.PoolContactData;
  blocks?: string;
  pledge: { number: string; unit?: string };
  cost: { number: string; unit?: string };
};
