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

export enum PortfolioState {
  Free = 'Free',
  ConfirmingNewPortfolio = 'ConfirmingNewPortfolio',
  ManagingCurrentPortfolio = 'ManagingCurrentPortfolio',
}

export type DelegationPortfolioState = {
  state: PortfolioState;
  currentPortfolio: CurrentPortfolioStakePool[];
  draftPortfolio: DraftPortfolioStakePool[];
  selections: DraftPortfolioStakePool[];
};

export type DelegationPortfolioQueries = {
  isPoolAlreadySelected: (id: Wallet.Cardano.PoolIdHex) => boolean;
};

type DelegationPortfolioMutators = {
  setCurrentPortfolio: (params: {
    delegationDistribution: DelegatedStake[];
    cardanoCoin: Wallet.CoinId;
  }) => Promise<void>;
  selectPool: (pool: DraftPortfolioStakePool) => void;
  unselectPool: (params: Pick<DraftPortfolioStakePool, 'id'>) => void;
  clearSelections: () => void;
  beginProcess: (process: PortfolioState.ConfirmingNewPortfolio | PortfolioState.ManagingCurrentPortfolio) => void;
  cancelProcess: () => void;
  finalizeProcess: () => void;
  moveFromManagingProcessToSelections: () => void;
};

export type DelegationPortfolioStore = DelegationPortfolioState & {
  mutators: DelegationPortfolioMutators;
  queries: DelegationPortfolioQueries;
};

export enum Page {
  overview = 'overview',
  browsePools = 'browsePools',
}
