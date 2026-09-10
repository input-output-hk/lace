import { initializeDependencies } from './dependencies';
import { hydrateAuthorizedDapps } from './side-effects/hydrate';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const redux: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffects: [hydrateAuthorizedDapps],
  sideEffectDependencies: initializeDependencies(),
});

export default redux;
