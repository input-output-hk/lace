import { vaultReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

// The launch-pending flag is the whole of this store's state; no side effects,
// those live in the module implementing the ceremony store contract. Not
// persisted on purpose — a launch cannot outlive the process that started it.
const store: LaceInit<LaceModuleStoreInit> = () => ({
  reducers: vaultReducers,
});

export default store;
