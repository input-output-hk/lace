import { appSideEffects } from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const analyticsStore: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffects: appSideEffects,
});

export default analyticsStore;
