import { selectModules } from '@lace-contract/feature';
import uniqBy from 'lodash/uniqBy';
import { describe, expect, it } from 'vitest';

import type { FeatureFlag } from '@lace-contract/feature';
import type { Environment, LaceModule } from '@lace-contract/module';

export const testFeatureFlagCompatibility = (
  modules: LaceModule[],
  defaultFeatureFlags: FeatureFlag[],
  experimentalFeatureFlags: FeatureFlag[],
  // if there are feature flags that replace other feature flags,
  // for example a new 'cardano-provider', add a new parameter here, like:
  // replacmentFeatureFlags: {[key: FeatureFlagKey]: FeatureFlag}
  // which could be used like {[oldFeatureFlag.key]: newFeatureFlag}
  // and a new it.each test which replaces the corresponding defaultFeatureFlags
) => {
  // breaking in any other environment is acceptable
  const environment: Environment = 'production';

  describe('feature flag compatibility', () => {
    it('selects compatible set of modules with default feature flags', () => {
      expect(() =>
        selectModules(modules, defaultFeatureFlags, environment),
      ).not.toThrow();
    });

    it.each(experimentalFeatureFlags)(
      'selects compatible set of modules with default and %s feature flag',
      flag => {
        const allFeatureFlags = uniqBy(
          [...defaultFeatureFlags, flag],
          ({ key }) => key,
        );
        expect(() =>
          selectModules(modules, allFeatureFlags, environment),
        ).not.toThrow();
      },
    );

    it('selects compatible set of modules with all default and all experimental feature flags', () => {
      const allFeatureFlags = uniqBy(
        [...defaultFeatureFlags, ...experimentalFeatureFlags],
        ({ key }) => key,
      );
      expect(() =>
        selectModules(modules, allFeatureFlags, environment),
      ).not.toThrow();
    });
  });
};
