import { initializeDependencies } from './dependencies';
import { posthogSideEffects } from './side-effects';

import type { LaceInitSync, LaceModuleStoreInit } from '@lace-contract/module';

export type { PostHogFeatureDependencies } from './dependencies';

const redux: LaceInitSync<LaceModuleStoreInit> = (props, dependencies) => ({
  sideEffects: posthogSideEffects,
  sideEffectDependencies: initializeDependencies(props, dependencies),
});

export default redux;
