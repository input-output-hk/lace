import { NEVER, of } from 'rxjs';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffectDependencies: {
    // Headless SDK has no app-lock — wallet is permanently active and no
    // lock/unlock transitions ever occur, so `walletResumed$` (a
    // transition event, not a state) never emits.
    isWalletActive$: of(true),
    walletResumed$: NEVER,
  },
});

export default store;
