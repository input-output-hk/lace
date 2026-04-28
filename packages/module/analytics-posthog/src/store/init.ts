import { initializeDependencies } from './dependencies';
import { posthogSideEffects } from './side-effects';

import type { LaceInitSync, LaceModuleStoreInit } from '@lace-contract/module';

export type { PostHogAnalyticsDependencies } from './dependencies';

const initializeModuleStore: LaceInitSync<LaceModuleStoreInit> = (
  props,
  dependencies,
) => ({
  sideEffects: posthogSideEffects,
  sideEffectDependencies: initializeDependencies(props, dependencies),
});

export default initializeModuleStore;
