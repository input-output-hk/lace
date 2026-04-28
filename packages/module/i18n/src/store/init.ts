import { initializeDependencies } from './dependencies';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const redux: LaceInit<LaceModuleStoreInit> = (props, dependencies) => {
  const sideEffectDependencies = initializeDependencies(props, dependencies);
  return {
    sideEffectDependencies,
  };
};

export default redux;
