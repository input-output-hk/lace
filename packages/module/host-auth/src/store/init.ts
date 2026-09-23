import { NEVER, of } from 'rxjs';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffectDependencies: {
    // Host owns auth (ADR 34): the guest holds no lock state, so the wallet is
    // permanently active and no lock/unlock transitions ever occur —
    // `walletResumed$` (a resume event, not a state) never emits.
    isWalletActive$: of(true),
    walletResumed$: NEVER,
  },
});

export default store;
