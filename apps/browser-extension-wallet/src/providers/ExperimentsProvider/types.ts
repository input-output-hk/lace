export enum ExperimentsConfigStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

export enum ExperimentName {
  COMBINED_NAME_PASSWORD_ONBOARDING_SCREEN = 'combined-setup-name-password'
}

export type CombinedSetupNamePasswordVariants = readonly ['control', 'test'];
export type ExperimentsConfig = {
  [ExperimentName.COMBINED_NAME_PASSWORD_ONBOARDING_SCREEN]: {
    variants: CombinedSetupNamePasswordVariants;
    defaultVariant: string;
  };
};
export type FallbackConfiguration = Record<ExperimentName, 'control'>;
