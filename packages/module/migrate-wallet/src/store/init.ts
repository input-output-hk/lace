import { initializeSideEffects } from './side-effects';
import { migrateWalletReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const redux: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  reducers: migrateWalletReducers,
  sideEffects: await initializeSideEffects(props, dependencies),
});

export default redux;
