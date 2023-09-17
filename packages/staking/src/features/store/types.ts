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

export interface DrawerSectionConfig {
  currentSection: Sections;
  nextSection?: Sections;
  prevSection?: Sections;
}

export interface StakePoolDetails {
  // setSection: (section?: DrawerSectionConfig) => void;
  activePage: Page;
  setActivePage: (page: Page) => void;
  // setPrevSection: () => void;
  resetStates: () => void;
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
  displayData: Wallet.util.StakePool & {
    lastReward: bigint;
    totalRewards: bigint;
  };
  stakePool: Wallet.Cardano.StakePool;
  value: bigint;
};

export enum PortfolioManagementProcess {
  None = 'None',
  Details = 'Details', // re-consider
  NewPortfolio = 'NewPortfolio',
  CurrentPortfolio = 'CurrentPortfolio',
}

export type DelegationPortfolioState = {
  activeManagementProcess: PortfolioManagementProcess;
  currentPortfolio: CurrentPortfolioStakePool[];
  draftPortfolio: DraftPortfolioStakePool[];
  selections: DraftPortfolioStakePool[];
} & (
  | {
      drawerVisible: true;
      drawerSectionConfig: DrawerSectionConfig;
    }
  | {
      drawerVisible: false;
      // TODO: maybe use null
      drawerSectionConfig?: never;
    }
);

export type DelegationPortfolioQueries = {
  isPoolSelected: (hexId: Wallet.Cardano.PoolIdHex) => boolean;
  selectionsFull: () => boolean;
  // rework
  isDrawerVisible: () => boolean;
};

type DelegationPortfolioMutators = {
  setCurrentPortfolio: (params: {
    delegationDistribution: DelegatedStake[];
    cardanoCoin: Wallet.CoinId;
    currentEpoch: Wallet.EpochInfo;
    delegationRewardsHistory: Wallet.RewardsHistory;
  }) => Promise<void>;
  selectPool: (pool: DraftPortfolioStakePool) => void;
  unselectPool: (params: Pick<DraftPortfolioStakePool, 'id'>) => void;
  clearSelections: () => void;
  beginManagementProcess: (
    process:
      | PortfolioManagementProcess.NewPortfolio
      | PortfolioManagementProcess.CurrentPortfolio
      | PortfolioManagementProcess.Details
  ) => void;
  transition: (
    action:
      | 'previous'
      | 'next'
      | 'forceConfirmationHardwareWalletSkipToSuccess'
      | 'forceConfirmationHardwareWalletSkipToFailure'
  ) => void;
  cancelManagementProcess: (params?: { dumpDraftToSelections: boolean }) => void;
  removePoolInManagementProcess: (params: Pick<DraftPortfolioStakePool, 'id'>) => void;
};

export type DelegationPortfolioStore = DelegationPortfolioState & {
  mutators: DelegationPortfolioMutators;
  queries: DelegationPortfolioQueries;
};

export enum Page {
  overview = 'overview',
  browsePools = 'browsePools',
}
