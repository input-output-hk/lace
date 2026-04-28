import { initializeDependencies } from './dependencies';
import { createCardanoSideEffects } from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const redux: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  sideEffects: createCardanoSideEffects(props.runtime.config),
  sideEffectDependencies: await initializeDependencies(props, dependencies),
});

export default redux;
