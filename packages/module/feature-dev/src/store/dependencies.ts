import { BehaviorSubject } from 'rxjs';

import type { FeatureFlag, FeatureFlagProvider } from '@lace-contract/feature';
import type { LaceInitSync } from '@lace-contract/module';

export type FeatureFlagsObservableType = BehaviorSubject<FeatureFlag[]>;

export const initializeDependencies: LaceInitSync<FeatureFlagProvider> = ({
  runtime: {
    features: {
      loaded: { featureFlags },
    },
  },
}) => {
  const featureFlags$: FeatureFlagsObservableType = new BehaviorSubject(
    featureFlags,
  );
  return {
    featureFlags$,
  };
};
