import { initializeDependencies } from './dependencies';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const redux: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  sideEffectDependencies: await initializeDependencies(props, dependencies),
});

export default redux;
