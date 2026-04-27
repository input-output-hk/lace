import { trackOwnHandleAliases } from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffects: [trackOwnHandleAliases],
});

export default store;
