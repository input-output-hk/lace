import {
  distinctUntilChanged,
  filter,
  map,
  skip,
  startWith,
  switchMap,
} from 'rxjs';

import {
  createFeatureFlagStorage,
  featureFlagSetEquals,
  featureFlagsToFeatures,
} from '../util';

import type { ActionCreators, Selectors } from '../contract';
import type { FeatureFlag, RuntimeFeatures } from '../types';
import type { FeatureFlagKey } from '../value-objects';
import type { LaceInit, LaceSideEffect, Runtime } from '@lace-contract/module';

type SideEffect = LaceSideEffect<Selectors, ActionCreators>;

const withoutExtraFeatureFlags =
  (extraFeatureFlags: FeatureFlagKey[]) => (featureFlags: FeatureFlag[]) =>
    featureFlags.filter(({ key }) => !extraFeatureFlags.includes(key));

export const updateFeatures =
  (
    { availableModules, loaded, fallback }: Readonly<RuntimeFeatures>,
    { env, config: { extraFeatureFlags } }: Pick<Runtime, 'config' | 'env'>,
  ): SideEffect =>
  (_, __, { featureFlags$, createDocumentStorage, actions }) => {
    const storage = createFeatureFlagStorage(createDocumentStorage);
    const loadedFeatureFlagsWithoutExtra = withoutExtraFeatureFlags(
      extraFeatureFlags,
    )(loaded.featureFlags);
    const fallbackFlagsWithoutExtra = fallback
      ? withoutExtraFeatureFlags(extraFeatureFlags)(fallback.incompatibleFlags)
      : undefined;
    return featureFlags$.pipe(
      map(withoutExtraFeatureFlags(extraFeatureFlags)),
      filter(
        featureFlags =>
          !featureFlagSetEquals(featureFlags, fallbackFlagsWithoutExtra),
      ),
      startWith(loadedFeatureFlagsWithoutExtra),
      distinctUntilChanged((previous, next) =>
        featureFlagSetEquals(previous, next),
      ),
      skip(1),
      switchMap(featureFlags =>
        storage.set({ featureFlags }).pipe(map(() => featureFlags)),
      ),
      map(featureFlags =>
        featureFlagsToFeatures(availableModules)(featureFlags, env),
      ),
      map(actions.features.updateFeatures),
    );
  };

export const initializeFeatureSideEffects: LaceInit<SideEffect[]> = props => [
  updateFeatures(props.runtime.features, props.runtime),
];
