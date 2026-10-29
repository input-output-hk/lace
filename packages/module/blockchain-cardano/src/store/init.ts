import { composerFlowSideEffects } from './composer-flow-side-effects';
import { initializeDependencies } from './dependencies';
import { sdkExtensionSideEffects } from './sdk-extensions';
import { createCardanoSideEffects } from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const redux: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  sideEffects: [
    ...createCardanoSideEffects(props.runtime.config),
    ...composerFlowSideEffects,
    ...sdkExtensionSideEffects,
  ],
  sideEffectDependencies: await initializeDependencies(props, dependencies),
});

export default redux;
