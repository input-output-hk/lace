export enum ExperimentsConfigStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

export enum ExperimentName {
  COMBINED_PASSWORD_NAME_COMPONENT = 'combined-setup-name-password'
}

export type CombinedSetupNamePasswordVariants = readonly ['control', 'name-password-component'];
export type ExperimentsConfig = {
  [ExperimentName.COMBINED_PASSWORD_NAME_COMPONENT]: {
    variants: CombinedSetupNamePasswordVariants;
    defaultVariant: string;
  };
};
export type FallbackConfiguration = Record<ExperimentName, 'control'>;
