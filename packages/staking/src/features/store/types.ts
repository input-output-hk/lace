import { DelegatedStake } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';

export enum Sections {
  DETAIL = 'detail',
  PREFERENCES = 'preferences',
  CONFIRMATION = 'confirmation',
  SIGN = 'sign',
  SUCCESS_TX = 'success_tx',
  FAIL_TX = 'fail_tx',
}

export enum StakingError {
  UTXO_FULLY_DEPLETED = 'UTXO_FULLY_DEPLETED',
  UTXO_BALANCE_INSUFFICIENT = 'UTXO_BALANCE_INSUFFICIENT',
}

export interface SectionConfig {
  currentSection: Sections;
  nextSection?: Sections;
  prevSection?: Sections;
}

export interface StakePoolDetails {
  simpleSendConfig: SectionConfig;
  setSection: (section?: SectionConfig) => void;
  activePage: Page;
  setActivePage: (page: Page) => void;
  setPrevSection: () => void;
  resetStates: () => void;
  isDrawerVisible: boolean;
  setIsDrawerVisible: (visibility: boolean) => void;
  isStakeConfirmationVisible: boolean;
  setStakeConfirmationVisible: (visibility: boolean) => void;
  isExitStakingVisible: boolean;
  setExitStakingVisible: (visibility: boolean) => void;
  isNoFundsVisible: boolean;
  setNoFundsVisible: (visibility: boolean) => void;
  isBuildingTx: boolean;
  setIsBuildingTx: (visibility: boolean) => void;
  stakingError?: StakingError;
  setStakingError: (error?: StakingError) => void;
}

export type DraftPortfolioStakePool = Wallet.Cardano.Cip17Pool & {
  displayData: Wallet.util.StakePool;
};

export type CurrentPortfolioStakePool = DraftPortfolioStakePool & {
  stakePool: Wallet.Cardano.StakePool;
  value: bigint;
};

export type DelegationPortfolioState = {
  currentPortfolio: CurrentPortfolioStakePool[];
  draftPortfolio: DraftPortfolioStakePool[];
};

export type DelegationPortfolioQueries = {
  poolIncludedInDraft: (id: Wallet.Cardano.PoolIdHex) => boolean;
};

type DelegationPortfolioMutators = {
  setCurrentPortfolio: (params: {
    delegationDistribution: DelegatedStake[];
    cardanoCoin: Wallet.CoinId;
  }) => Promise<void>;
  addPoolToDraft: (pool: DraftPortfolioStakePool) => void;
  removePoolFromDraft: (params: Pick<DraftPortfolioStakePool, 'id'>) => void;
  updatePoolWeight: (params: Pick<DraftPortfolioStakePool, 'id' | 'weight'>) => void;
  clearDraft: () => void;
};

export type DelegationPortfolioStore = DelegationPortfolioState &
  DelegationPortfolioQueries & {
    mutators: DelegationPortfolioMutators;
  };

export enum Page {
  overview = 'overview',
  browsePools = 'browsePools',
}
