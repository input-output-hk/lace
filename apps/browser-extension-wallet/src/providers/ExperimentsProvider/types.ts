export enum ExperimentsConfigStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

export enum ExperimentName {
  CREATE_PAPER_WALLET = 'create-paper-wallet',
  RESTORE_PAPER_WALLET = 'restore-paper-wallet',
  USE_SWITCH_TO_NAMI_MODE = 'use-switch-to-nami-mode',
  SHARED_WALLETS = 'shared-wallets',
  WEBSOCKET_API = 'websocket-api',
  BLOCKFROST_ASSET_PROVIDER = 'blockfrost-asset-provider'
}

interface FeatureFlag {
  value: boolean;
  default: boolean;
}

export type ExperimentsConfig = {
  [key in ExperimentName]: FeatureFlag;
};
export type FallbackConfiguration = Record<ExperimentName, boolean>;
