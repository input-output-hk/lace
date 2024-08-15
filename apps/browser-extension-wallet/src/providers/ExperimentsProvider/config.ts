import { ExperimentName, ExperimentsConfig, FallbackConfiguration } from './types';

export const fallbackConfiguration: FallbackConfiguration = {
  [ExperimentName.COMBINED_NAME_PASSWORD_ONBOARDING_SCREEN]: 'control',
  [ExperimentName.CREATE_PAPER_WALLET]: false,
  [ExperimentName.RESTORE_PAPER_WALLET]: false
};

export const experiments: ExperimentsConfig = {
  [ExperimentName.COMBINED_NAME_PASSWORD_ONBOARDING_SCREEN]: {
    variants: ['control', 'test'],
    default: 'control'
  },
  [ExperimentName.CREATE_PAPER_WALLET]: {
    value: false,
    default: false
  },
  [ExperimentName.RESTORE_PAPER_WALLET]: {
    value: false,
    default: false
  }
};
