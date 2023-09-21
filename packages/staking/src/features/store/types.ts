import { Wallet } from '@lace/cardano';

export type DraftPortfolioStakePool = Wallet.Cardano.Cip17Pool & {
  displayData: Wallet.util.StakePool;
};

export type CurrentPortfolioStakePool = DraftPortfolioStakePool & {
  displayData: Wallet.util.StakePool & {
    lastReward: bigint;
    totalRewards: bigint;
  };
  stakePool: Wallet.Cardano.StakePool;
  value: bigint;
};

export enum Page {
  overview = 'overview',
  browsePools = 'browsePools',
}

export type AdaSymbol = 'ADA' | 'tADA';
