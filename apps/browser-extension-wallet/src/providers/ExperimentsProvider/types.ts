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
  BLOCKFROST_ASSET_PROVIDER = 'blockfrost-asset-provider',
  BLOCKFROST_CHAIN_HISTORY_PROVIDER = 'blockfrost-chain-history-provider',
  BLOCKFROST_NETWORK_INFO_PROVIDER = 'blockfrost-network-info-provider',
  BLOCKFROST_REWARDS_PROVIDER = 'blockfrost-rewards-provider',
  BLOCKFROST_TX_SUBMIT_PROVIDER = 'blockfrost-tx-submit-provider',
  BLOCKFROST_UTXO_PROVIDER = 'blockfrost-utxo-provider',
  EXTENSION_STORAGE = 'extension-storage',
  USE_DREP_PROVIDER_OVERRIDE = 'use-drep-provider-override',
  DAPP_EXPLORER = 'dapp-explorer'
}

interface FeatureFlag {
  value: boolean;
  default: boolean;
}

export type ExperimentsConfig = {
  [key in ExperimentName]: FeatureFlag;
};
export type FallbackConfiguration = Record<ExperimentName, boolean>;
