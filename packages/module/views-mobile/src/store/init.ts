import { initializeSideEffects } from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const redux: LaceInit<LaceModuleStoreInit> = (props, dependencies) => {
  return {
    sideEffects: initializeSideEffects(props, dependencies),
  };
};

export default redux;
