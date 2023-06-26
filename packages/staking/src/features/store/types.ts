import { Immutable } from 'immer';

// TODO: Replace with Cardano JS SDK types once feature LW-6702 is released
// TODO START
type PoolIdHex = string;
export interface Cip17Pool {
  id: PoolIdHex;
  weight: number;
  name?: string;
  ticker?: string;
}
export interface Cip17DelegationPortfolio {
  name: string;
  pools: Cip17Pool[];
  description?: string;
  author?: string;
}

export enum Sections {
  DETAIL = 'detail',
  CONFIRMATION = 'confirmation',
  SIGN = 'sign',
  SUCCESS_TX = 'success_tx',
  FAIL_TX = 'fail_tx',
}
// TODO END

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
  setSection: (section: SectionConfig) => void;
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

export type DelegationPortfolioState = Immutable<{
  delegationPortfolioPools: Cip17Pool[];
}>;

type DelegationPortfolioMutations = {
  addPoolToPortfolio: (pool: Cip17Pool) => void;
  removePoolFromPortfolio: ({ poolId }: { poolId: PoolIdHex }) => void;
  updatePoolWeight: ({ poolId, weight }: { poolId: PoolIdHex; weight: number }) => void;
  clearDelegationPortfolio: () => void;
};

export type DelegationPortfolioStore = DelegationPortfolioState & DelegationPortfolioMutations;
