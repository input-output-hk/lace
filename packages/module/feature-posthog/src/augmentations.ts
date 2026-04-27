import type { PostHogFeatureDependencies } from './store/dependencies';
import type { Seconds } from '@lace-sdk/util';

declare module '@lace-contract/module' {
  interface AppConfig {
    featureFlagCheckFrequency: Seconds;
  }
  interface SideEffectDependencies extends PostHogFeatureDependencies {}
}
