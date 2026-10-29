import { custodyTransactionSideEffects } from './build-side-effect';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const init: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffects: custodyTransactionSideEffects,
});

export default init;
