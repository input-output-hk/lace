import { ExperimentName, ExperimentsConfig, FallbackConfiguration } from './types';

export const fallbackConfiguration: FallbackConfiguration = {
  [ExperimentName.COMBINED_PASSWORD_NAME_COMPONENT]: 'control'
};

export const experiments: ExperimentsConfig = {
  [ExperimentName.COMBINED_PASSWORD_NAME_COMPONENT]: {
    variants: ['control', 'name-password-component'],
    defaultVariant: 'control'
  }
};
