import { initializeSideEffects } from './side-effects';
import { cardanoUriLinkingReducers } from './slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const cardanoUriLinkingStore: LaceInit<LaceModuleStoreInit> = async () => ({
  reducers: cardanoUriLinkingReducers,
  sideEffects: initializeSideEffects(),
  persistConfig: {
    // The state will be in-memory only and cleared on app restart
  },
});

export default cardanoUriLinkingStore;
