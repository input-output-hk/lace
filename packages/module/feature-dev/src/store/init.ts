import { initializeDependencies } from './dependencies';
import { featureSideEffects } from './side-effects';

import type { LaceInitSync, LaceModuleStoreInit } from '@lace-contract/module';

const redux: LaceInitSync<LaceModuleStoreInit> = (props, dependencies) => ({
  sideEffects: featureSideEffects,
  sideEffectDependencies: initializeDependencies(props, dependencies),
});

export default redux;
