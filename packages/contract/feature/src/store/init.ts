import { initializeFeatureSideEffects } from './side-effects';
import { featuresReducers, initialState } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const analyticsStore: LaceInit<LaceModuleStoreInit> = async (
  props,
  dependencies,
) => ({
  reducers: featuresReducers,
  preloadedState: {
    features: {
      ...initialState,
      loaded: props.runtime.features.loaded,
    },
  },
  sideEffects: await initializeFeatureSideEffects(props, dependencies),
});

export default analyticsStore;
