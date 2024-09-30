export enum ExperimentsConfigStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

export enum ExperimentName {
  COMBINED_NAME_PASSWORD_ONBOARDING_SCREEN = 'combined-setup-name-password',
  CREATE_PAPER_WALLET = 'create-paper-wallet',
  RESTORE_PAPER_WALLET = 'restore-paper-wallet',
  USE_SWITCH_TO_NAMI_MODE = 'use-switch-to-nami-mode'
}

interface FeatureFlag {
  value: boolean;
  default: boolean;
}

type Variant = ReadonlyArray<string>;

interface ExperiementVariant {
  variants: Variant;
  default: string;
}

export type CombinedSetupNamePasswordVariants = readonly ['control', 'test'];

export type ExperimentsConfig = {
  [key in ExperimentName]: FeatureFlag | ExperiementVariant;
};
export type FallbackConfiguration = Record<ExperimentName, 'control' | boolean>;
