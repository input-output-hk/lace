import { initializeDependencies } from './dependencies';
import { posthogSideEffects } from './side-effects';
import { posthogAnalyticsReducers } from './slice';

import type { LaceInitSync, LaceModuleStoreInit } from '@lace-contract/module';

export type { PostHogAnalyticsDependencies } from './dependencies';

const initializeModuleStore: LaceInitSync<LaceModuleStoreInit> = (
  props,
  dependencies,
) => ({
  reducers: posthogAnalyticsReducers,
  persistConfig: {
    posthogAnalytics: { version: 1 },
  },
  sideEffects: posthogSideEffects,
  sideEffectDependencies: initializeDependencies(props, dependencies),
});

export default initializeModuleStore;
