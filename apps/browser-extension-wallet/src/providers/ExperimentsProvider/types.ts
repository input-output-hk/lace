import { ExperimentName } from '@lib/scripts/types/feature-flags';

export enum ExperimentsConfigStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

interface FeatureFlag {
  value: boolean;
  default: boolean;
}

export type ExperimentsConfig = {
  [key in ExperimentName]: FeatureFlag;
};
export type FallbackConfiguration = Record<ExperimentName, boolean>;
