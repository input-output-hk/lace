import { ModuleName } from '@lace-contract/module';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  featuresActions as actions,
  featuresSelectors as selectors,
} from '../../src';
import { FeatureFlagKey } from '../../src';
import { featuresReducers } from '../../src/store/slice';

import type { FeaturesSliceState } from '../../src';

describe('features slice', () => {
  let initialState: FeaturesSliceState = {
    loaded: { modules: [], featureFlags: [] },
  };

  beforeEach(() => {
    initialState = {
      loaded: { modules: [], featureFlags: [] },
    };
  });

  describe('reducers', () => {
    it('should correctly identify added features on update', () => {
      initialState = {
        loaded: {
          modules: [
            {
              moduleName: ModuleName('Module1'),
              feature: {
                metadata: {
                  name: 'feat1',
                  description: 'some-feature',
                },
              },
            },
          ],
          featureFlags: [{ key: FeatureFlagKey('feat1') }],
        },
      };

      const updatedFeatures = {
        modules: [
          {
            moduleName: ModuleName('Module1'),
            feature: {
              metadata: {
                name: 'feat1',
                description: 'some-feature',
              },
            },
          },
          {
            moduleName: ModuleName('Module2'),
            feature: {
              metadata: {
                name: 'feat2',
                description: 'some-feature',
              },
            },
          },
        ],
        featureFlags: [
          { key: FeatureFlagKey('feat1') },
          { key: FeatureFlagKey('feat2') },
        ],
      };

      const action = actions.features.updateFeatures(updatedFeatures);
      const state = featuresReducers.features(initialState, action);

      expect(state.next?.added).toEqual({
        featureFlags: [
          {
            key: 'feat2',
          },
        ],
        modules: [
          {
            feature: {
              metadata: {
                description: 'some-feature',
                name: 'feat2',
              },
            },
            moduleName: ModuleName('Module2'),
          },
        ],
      });
    });

    it('should correctly identify removed features on update', () => {
      initialState = {
        loaded: {
          modules: [
            {
              moduleName: ModuleName('Module1'),
              feature: {
                metadata: {
                  name: 'feat1',
                  description: 'some-feature',
                },
              },
            },
            {
              moduleName: ModuleName('Module2'),
              feature: {
                metadata: {
                  name: 'feat2',
                  description: 'some-feature',
                },
              },
            },
          ],
          featureFlags: [
            { key: FeatureFlagKey('feat1') },
            { key: FeatureFlagKey('feat2') },
          ],
        },
      };

      const updatedFeatures = {
        modules: [
          {
            moduleName: ModuleName('Module1'),
            feature: {
              metadata: {
                name: 'feat1',
                description: 'some-feature',
              },
            },
          },
        ],
        featureFlags: [{ key: FeatureFlagKey('feat1') }],
      };

      const action = actions.features.updateFeatures(updatedFeatures);
      const state = featuresReducers.features(initialState, action);

      expect(state.next?.removed).toEqual({
        featureFlags: [
          {
            key: 'feat2',
          },
        ],
        modules: [
          {
            feature: {
              metadata: {
                description: 'some-feature',
                name: 'feat2',
              },
            },
            moduleName: ModuleName('Module2'),
          },
        ],
      });
    });
  });

  describe('selectors', () => {
    it('should return loaded features correctly', () => {
      const initialState = {
        features: {
          loaded: {
            modules: [
              {
                moduleName: ModuleName('Module1'),
                feature: {
                  metadata: {
                    name: 'feat1',
                    description: 'Feature 1 Description',
                  },
                },
              },
            ],
            featureFlags: [{ key: FeatureFlagKey('feat1') }],
          },
        },
      };

      const loadedFeatures =
        selectors.features.selectLoadedFeatures(initialState);

      expect(loadedFeatures).toEqual({
        featureFlags: [
          {
            key: 'feat1',
          },
        ],
        modules: [
          {
            feature: {
              metadata: {
                description: 'Feature 1 Description',
                name: 'feat1',
              },
            },
            moduleName: ModuleName('Module1'),
          },
        ],
      });
    });

    it('should return null for selectNextFeatureFlags when next is undefined', () => {
      const state = {
        features: {
          loaded: { modules: [], featureFlags: [] },
        },
      };

      const result = selectors.features.selectNextFeatureFlags(state);
      expect(result).toBeNull();
    });

    it('should return null for selectNextFeaturesMetadata when next is undefined', () => {
      const state = {
        features: {
          loaded: { modules: [], featureFlags: [] },
        },
      };

      const result = selectors.features.selectNextFeaturesMetadata(state);
      expect(result).toBeNull();
    });

    it('should return metadata for next features correctly', () => {
      const stateWithNextFeatures = {
        features: {
          next: {
            features: {
              modules: [
                {
                  moduleName: ModuleName('Module2'),
                  feature: {
                    metadata: {
                      name: 'feat2',
                      description: 'Feature 2 Description',
                    },
                  },
                },
              ],
              featureFlags: [{ key: FeatureFlagKey('feat2') }],
            },
            added: {
              modules: [
                {
                  moduleName: ModuleName('Module2'),
                  feature: {
                    metadata: {
                      name: 'feat2',
                      description: 'Feature 2 Description',
                    },
                  },
                },
              ],
              featureFlags: [{ key: FeatureFlagKey('feat2') }],
            },
            removed: {
              modules: [],
              featureFlags: [],
            },
            updated: {
              modules: [],
              featureFlags: [],
            },
          },
          loaded: {
            modules: [
              {
                moduleName: ModuleName('Module2'),
                feature: {
                  metadata: {
                    name: 'feat2',
                    description: 'Feature 2 Description',
                  },
                },
              },
            ],
            featureFlags: [{ key: FeatureFlagKey('feat2') }],
          },
        },
      };

      const metadata = selectors.features.selectNextFeaturesMetadata(
        stateWithNextFeatures,
      );
      expect(metadata).toEqual({
        added: [
          {
            name: 'feat2',
            description: 'Feature 2 Description',
          },
        ],
        features: [
          {
            name: 'feat2',
            description: 'Feature 2 Description',
          },
        ],
        removed: [],
        updated: [],
      });
    });
  });
});
