import { ExperimentName, ExperimentsConfig, FallbackConfiguration } from './types';

export const fallbackConfiguration: FallbackConfiguration = {
  [ExperimentName.COMBINED_NAME_PASSWORD_ONBOARDING_SCREEN]: 'control'
};

export const experiments: ExperimentsConfig = {
  [ExperimentName.COMBINED_NAME_PASSWORD_ONBOARDING_SCREEN]: {
    variants: ['control', 'test'],
    defaultVariant: 'control'
  }
};
