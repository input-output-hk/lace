import { initializeDependencies } from './dependencies';
import { nightDesignationFlowSideEffects } from './night-designation-flow-side-effects';
import { createCardanoSideEffects } from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const redux: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  sideEffects: [
    ...createCardanoSideEffects(props.runtime.config),
    ...nightDesignationFlowSideEffects,
  ],
  sideEffectDependencies: await initializeDependencies(props, dependencies),
});

export default redux;
