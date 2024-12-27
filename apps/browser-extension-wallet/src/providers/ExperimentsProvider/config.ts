import { ExperimentName, ExperimentsConfig, FallbackConfiguration } from './types';

export const getDefaultFeatureFlags = (): FallbackConfiguration => ({
  [ExperimentName.CREATE_PAPER_WALLET]: false,
  [ExperimentName.RESTORE_PAPER_WALLET]: false,
  [ExperimentName.USE_SWITCH_TO_NAMI_MODE]: false,
  [ExperimentName.SHARED_WALLETS]: false,
  [ExperimentName.WEBSOCKET_API]: false,
  [ExperimentName.BLOCKFROST_ASSET_PROVIDER]: false,
  [ExperimentName.EXTENSION_STORAGE]: false,
  [ExperimentName.USE_DREP_PROVIDER_OVERRIDE]: false
});

export const experiments: ExperimentsConfig = {
  [ExperimentName.CREATE_PAPER_WALLET]: {
    value: false,
    default: false
  },
  [ExperimentName.RESTORE_PAPER_WALLET]: {
    value: false,
    default: false
  },
  [ExperimentName.USE_SWITCH_TO_NAMI_MODE]: {
    value: false,
    default: false
  },
  [ExperimentName.SHARED_WALLETS]: {
    value: false,
    default: false
  },
  [ExperimentName.WEBSOCKET_API]: {
    value: false,
    default: false
  },
  [ExperimentName.BLOCKFROST_ASSET_PROVIDER]: {
    value: false,
    default: false
  },
  [ExperimentName.EXTENSION_STORAGE]: {
    value: false,
    default: false
  },
  [ExperimentName.USE_DREP_PROVIDER_OVERRIDE]: {
    value: false,
    default: false
  }
};
