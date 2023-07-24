import { Wallet } from '@lace/cardano';
import { Immutable } from 'immer';

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

export type DelegationPortfolioStakePool = Wallet.Cardano.Cip17Pool & {
  displayData: Wallet.util.StakePool;
};

export type DelegationPortfolioState = Immutable<{
  currentPortfolio: DelegationPortfolioStakePool[];
  draftPortfolio: DelegationPortfolioStakePool[];
}>;

type DelegationPortfolioMutators = {
  setCurrentPortfolio: (params: {
    rewardAccountInfo?: Wallet.Cardano.RewardAccountInfo[];
    cardanoCoin: Wallet.CoinId;
  }) => Promise<void>;
  addPoolToDraft: (pool: DelegationPortfolioStakePool) => void;
  removePoolFromDraft: (params: Pick<DelegationPortfolioStakePool, 'id'>) => void;
  updatePoolWeight: (params: Pick<DelegationPortfolioStakePool, 'id' | 'weight'>) => void;
  clearDraft: () => void;
};

export type DelegationPortfolioStore = DelegationPortfolioState & {
  mutators: DelegationPortfolioMutators;
};

export enum Page {
  overview = 'overview',
  browsePools = 'browsePools',
}
