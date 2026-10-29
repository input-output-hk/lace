import { EMPTY } from 'rxjs';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

/** Headless implementations of platform callbacks required by Cardano stores. */
const store: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffectDependencies: {
    performAppReload: () => EMPTY,
  },
});

export default store;
