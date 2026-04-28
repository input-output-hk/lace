import type { FeatureFlagKey } from './value-objects';
import type { Environment, LaceModule } from '@lace-contract/module';
import type { JsonType } from '@lace-lib/util-store';
import type { Observable } from 'rxjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FeatureFlag<T extends JsonType = any> = T extends undefined
  ? {
      key: FeatureFlagKey;
    }
  : {
      key: FeatureFlagKey;
      payload: T;
    };

export type FeatureMetadata = {
  description: string;
  name: string;
};

export type Feature = {
  metadata: FeatureMetadata;
  willLoad: (
    featureFlags: readonly FeatureFlag[],
    environment: Environment,
  ) => boolean;
};

type FeatureModule = Pick<LaceModule, 'moduleName'> & {
  feature?: Pick<Required<LaceModule>['feature'], 'metadata'>;
};

export type Features = {
  featureFlags: FeatureFlag[];
  modules: FeatureModule[];
};

export type RuntimeFeatures = {
  availableModules: LaceModule[];
  loaded: Features;
};

export type FeatureFlagProvider = {
  featureFlags$: Observable<FeatureFlag[]>;
};
