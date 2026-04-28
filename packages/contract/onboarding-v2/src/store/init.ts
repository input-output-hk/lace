import { initializeSideEffects } from './side-effects';
import { onboardingV2Reducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  sideEffects: await initializeSideEffects(props, dependencies),
  reducers: onboardingV2Reducers,
});

export default store;
