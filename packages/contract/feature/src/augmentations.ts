import type { featuresReducers } from './store/slice';
import type {
  Feature,
  FeatureFlag,
  FeatureFlagProvider,
  RuntimeFeatures,
} from './types';
import type { FeatureFlagKey } from './value-objects';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface LaceModule {
    feature?: Feature;
  }
  interface Runtime {
    features: RuntimeFeatures;
  }
  interface AppConfig {
    defaultFeatureFlags: FeatureFlag[];
    extraFeatureFlags: FeatureFlagKey[];
  }
  interface State extends StateFromReducersMapObject<typeof featuresReducers> {}
  interface SideEffectDependencies extends FeatureFlagProvider {}
}
