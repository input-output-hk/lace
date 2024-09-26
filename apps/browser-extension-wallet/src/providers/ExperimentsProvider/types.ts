export enum ExperimentsConfigStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

export enum ExperimentName {
  CREATE_PAPER_WALLET = 'create-paper-wallet',
  RESTORE_PAPER_WALLET = 'restore-paper-wallet',
  SHARED_WALLETS = 'shared-wallets'
}

interface FeatureFlag {
  value: boolean;
  default: boolean;
}

export type ExperimentsConfig = {
  [key in ExperimentName]: FeatureFlag;
};
export type FallbackConfiguration = Record<ExperimentName, boolean>;
