export enum Sections {
  DETAIL = 'detail',
  CONFIRMATION = 'confirmation',
  SIGN = 'sign',
  SUCCESS_TX = 'success_tx',
  FAIL_TX = 'fail_tx'
}

export enum StakingError {
  UTXO_FULLY_DEPLETED = 'UTXO_FULLY_DEPLETED',
  UTXO_BALANCE_INSUFFICIENT = 'UTXO_BALANCE_INSUFFICIENT'
}

export interface SectionConfig {
  currentSection: Sections;
  nextSection?: Sections;
  prevSection?: Sections;
}

export type SimpleSectionsConfig = Partial<Record<Sections, SectionConfig>>;

export interface StakePoolDetails {
  simpleSendConfig: SectionConfig;
  setSection: (section?: SectionConfig) => void;
  setPrevSection: () => void;
  resetStates: () => void;
  isDrawerVisible: boolean;
  setIsDrawerVisible: (visibility: boolean) => void;
  isStakeConfirmationVisible: boolean;
  setStakeConfirmationVisible: (visibility: boolean) => void;
  isRegisterAsDRepModalVisible: boolean;
  setIsRegisterAsDRepModalVisible: (visibility: boolean) => void;
  isExitStakingVisible: boolean;
  setExitStakingVisible: (visibility: boolean) => void;
  isNoFundsVisible: boolean;
  setNoFundsVisible: (visibility: boolean) => void;
  isBuildingTx: boolean;
  setIsBuildingTx: (visibility: boolean) => void;
  stakingError?: StakingError;
  setStakingError: (error?: StakingError) => void;
}
