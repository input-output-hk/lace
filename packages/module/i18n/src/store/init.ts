import { initializeDependencies } from './dependencies';
import { pushLanguage } from './side-effects/push-language';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const redux: LaceInit<LaceModuleStoreInit> = (props, dependencies) => {
  const sideEffectDependencies = initializeDependencies(props, dependencies);
  return {
    sideEffects: [pushLanguage],
    sideEffectDependencies,
  };
};

export default redux;
