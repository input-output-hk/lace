import { sideEffects } from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

// Actions-only store (the vault ceremony contract carries the actions); this
// arm contributes only the side effects that proxy them to `window.lace`.
const store: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffects,
});

export default store;
