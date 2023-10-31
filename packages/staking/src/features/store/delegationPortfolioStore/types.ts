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
  saturation?: number | string;
  stake: { number: string; unit?: string };
  ticker: string;
  apy?: number | string;
  status: Wallet.Cardano.StakePool['status'];
  fee: number | string;
  contact: Wallet.Cardano.PoolContactData;
};
