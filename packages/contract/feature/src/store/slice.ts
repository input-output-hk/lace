import { isNotNil } from '@cardano-sdk/util';
import { createAction, createSelector, createSlice } from '@reduxjs/toolkit';
import { current } from 'immer';
import differenceBy from 'lodash/differenceBy';
import isEqual from 'lodash/isEqual';

import type { FeatureFlag, Features } from '../types';
import type { FeatureFlagKey } from '../value-objects';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';

export type FeaturesSliceState = {
  loaded: Features;
  next?: {
    added: Features;
    features: Features;
    removed: Features;
    updated: Features;
  };
};

const selectFeaturesMetadata = (features: Readonly<Features>) =>
  features.modules.map(m => m.feature?.metadata).filter(isNotNil);

const selectFeatures = (features: Readonly<Features>) =>
  features.featureFlags.filter(isNotNil);

export const initialState: FeaturesSliceState = {
  loaded: { modules: [], featureFlags: [] },
};

const slice = createSlice({
  name: 'features',
  initialState,
  reducers: {
    updateFeatures: (state, { payload }: Readonly<PayloadAction<Features>>) => {
      // Use current to unwrap proxies
      const currentLoaded = current(state.loaded);

      // Handle identical payloads to avoid unnecessary work
      if (isEqual(payload, currentLoaded)) {
        return;
      }

      const added: Features = {
        featureFlags: differenceBy(
          payload.featureFlags,
          currentLoaded.featureFlags,
          featureFlag => featureFlag.key,
        ),
        modules: differenceBy(
          payload.modules,
          currentLoaded.modules,
          module => module.moduleName,
        ),
      };
      const removed: Features = {
        featureFlags: differenceBy(
          currentLoaded.featureFlags,
          payload.featureFlags,
          featureFlag => featureFlag.key,
        ),
        modules: differenceBy(
          currentLoaded.modules,
          payload.modules,
          module => module.moduleName,
        ),
      };

      // Determine updated features (same key but different payload)
      const updatedFeatureFlags = payload.featureFlags.filter(feature => {
        const existingFeature = currentLoaded.featureFlags.find(
          f => f.key === feature.key,
        );
        return existingFeature && !isEqual(existingFeature, feature);
      });

      state.next = {
        features: payload,
        added,
        removed,
        updated: { featureFlags: updatedFeatureFlags, modules: [] },
      };
    },
  },
  selectors: {
    selectLoadedFeatures: (state: Readonly<FeaturesSliceState>) => state.loaded,
    selectNextFeatureFlags: createSelector(
      (state: Readonly<FeaturesSliceState>) => state.next,
      next =>
        next
          ? {
              added: selectFeatures(next.added),
              features: selectFeatures(next.features),
              removed: selectFeatures(next.removed),
              updated: selectFeatures(next.updated),
            }
          : null,
    ),
    selectNextFeaturesMetadata: createSelector(
      (state: Readonly<FeaturesSliceState>) => state.next,
      next =>
        next
          ? {
              added: selectFeaturesMetadata(next.added),
              features: selectFeaturesMetadata(next.features),
              removed: selectFeaturesMetadata(next.removed),
              updated: selectFeaturesMetadata(next.updated),
            }
          : null,
    ),
  },
});

export const featuresReducers = {
  [slice.name]: slice.reducer,
};

const loadFeatureFlags = createAction(
  'features/loadFeatureFlags',
  (payload: readonly FeatureFlag[]) => ({
    payload,
  }),
);

const featureView = createAction(
  'features/featureView',
  (payload: FeatureFlagKey) => ({
    payload,
  }),
);

const featureInteraction = createAction(
  'features/featureInteraction',
  (payload: FeatureFlagKey) => ({
    payload,
  }),
);

/** Direct import of this is an anti-pattern. OK for tests. */
export const featuresActions = {
  features: {
    ...slice.actions,
    loadFeatureFlags,
    featureView,
    featureInteraction,
  },
};

/** Direct import of this is an anti-pattern. OK for tests. */
export const featuresSelectors = { features: slice.selectors };

export type FeaturesStoreState = StateFromReducersMapObject<
  typeof featuresReducers
>;
