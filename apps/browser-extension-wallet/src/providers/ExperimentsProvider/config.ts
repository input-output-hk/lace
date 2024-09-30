import { ExperimentName, ExperimentsConfig, FallbackConfiguration } from './types';

export const getDefaultFeatureFlags = (): FallbackConfiguration => ({
  [ExperimentName.CREATE_PAPER_WALLET]: false,
  [ExperimentName.RESTORE_PAPER_WALLET]: false,
  [ExperimentName.USE_SWITCH_TO_NAMI_MODE]: false,
  [ExperimentName.SHARED_WALLETS]: false
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
  }
};
