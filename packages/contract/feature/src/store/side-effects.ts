import { deepEquals } from '@cardano-sdk/util';
import isEqual from 'lodash/isEqual';
import { distinctUntilChanged, filter, map, switchMap } from 'rxjs';

import { createFeatureFlagStorage, featureFlagsToFeatures } from '../util';

import type { ActionCreators, Selectors } from '../contract';
import type { FeatureFlag, RuntimeFeatures } from '../types';
import type { FeatureFlagKey } from '../value-objects';
import type { LaceInit, LaceSideEffect, Runtime } from '@lace-contract/module';

type SideEffect = LaceSideEffect<Selectors, ActionCreators>;

const featureFlagEquals = (
  f1: Readonly<FeatureFlag>,
  f2: Readonly<FeatureFlag>,
) => isEqual(f1, f2);

const withoutExtraFeatureFlags =
  (extraFeatureFlags: FeatureFlagKey[]) => (featureFlags: FeatureFlag[]) =>
    featureFlags.filter(({ key }) => !extraFeatureFlags.includes(key));

const featureFlagsChanged =
  (loadedFeatureFlags: FeatureFlag[]) => (newFeatureFlags: FeatureFlag[]) =>
    newFeatureFlags.length !== loadedFeatureFlags.length ||
    newFeatureFlags.some(
      newFeatureFlag =>
        !loadedFeatureFlags.some(loadedFeatureFlag =>
          featureFlagEquals(newFeatureFlag, loadedFeatureFlag),
        ),
    );

export const updateFeatures =
  (
    { availableModules, loaded }: Readonly<RuntimeFeatures>,
    { env, config: { extraFeatureFlags } }: Pick<Runtime, 'config' | 'env'>,
  ): SideEffect =>
  (_, __, { featureFlags$, createDocumentStorage, actions }) => {
    const storage = createFeatureFlagStorage(createDocumentStorage);
    const loadedFeatureFlagsWithoutExtra = withoutExtraFeatureFlags(
      extraFeatureFlags,
    )(loaded.featureFlags);
    return featureFlags$.pipe(
      map(withoutExtraFeatureFlags(extraFeatureFlags)),
      filter(featureFlagsChanged(loadedFeatureFlagsWithoutExtra)),
      switchMap(featureFlags =>
        storage.set({ featureFlags }).pipe(map(() => featureFlags)),
      ),
      map(featureFlags => {
        return featureFlagsToFeatures(availableModules)(featureFlags, env);
      }),
      map(actions.features.updateFeatures),
      distinctUntilChanged(deepEquals),
    );
  };

export const initializeFeatureSideEffects: LaceInit<SideEffect[]> = props => [
  updateFeatures(props.runtime.features, props.runtime),
];
