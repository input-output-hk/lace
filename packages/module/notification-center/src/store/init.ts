import { initializeDependencies } from './dependencies';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const redux: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => {
  const extensionSideEffects =
    props.runtime.app !== 'lace-mobile'
      ? (await import('./side-effects')).initializeSideEffects()
      : [];

  return {
    sideEffects: extensionSideEffects,
    sideEffectDependencies: await initializeDependencies(props, dependencies),
  };
};

export default redux;
