import type { FeatureFlag } from '@lace-contract/feature';

declare module '@lace-contract/dev' {
  interface DevelopmentGlobalApi {
    setFeatureFlags: (featureFlags: FeatureFlag[]) => Promise<void>;
  }
}
