import { isWalletActive$, walletResumed$ } from './observables';
import { sideEffects } from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const store: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffects,
  sideEffectDependencies: {
    isWalletActive$,
    walletResumed$,
  },
});

export default store;
