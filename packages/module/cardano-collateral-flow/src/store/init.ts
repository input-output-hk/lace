import { createCollateralFlowSideEffects } from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffects: [createCollateralFlowSideEffects()],
});

export default store;
