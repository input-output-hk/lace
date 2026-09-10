import { makePoolSelectionConsumption } from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffects: [makePoolSelectionConsumption()],
});

export default store;
